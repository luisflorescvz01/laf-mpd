import hashlib
import secrets
from datetime import timedelta
from pathlib import Path
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, model_validator
from sqlalchemy import text
from app.database.connection import flight_transaction

router = APIRouter(prefix='/api/flights', tags=['Vuelos'])
Quantity = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2, allow_inf_nan=False)]


class PlanFlight(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: UUID
    aircraft_id: str = Field(pattern=r'^LAF-737-00[1-8]$')
    route_id: str = Field(min_length=1, max_length=8)
    planned_departure_at: AwareDatetime


class CompleteFlight(BaseModel):
    model_config = ConfigDict(extra='forbid')
    actual_departure_at: AwareDatetime
    actual_arrival_at: AwareDatetime
    flight_distance_nm: Annotated[Decimal, Field(gt=0, max_digits=8, decimal_places=2, allow_inf_nan=False)]
    fuel_at_departure_kg: Quantity
    fuel_at_arrival_kg: Quantity
    passengers: Annotated[int, Field(ge=0, le=32767, strict=True)]
    payload_kg: Quantity

    @model_validator(mode='after')
    def chronological(self):
        if self.actual_arrival_at <= self.actual_departure_at:
            raise ValueError('El aterrizaje debe ser posterior al despegue.')
        if self.fuel_at_arrival_kg > self.fuel_at_departure_kg:
            raise ValueError('El combustible al aterrizaje no puede superar al del despegue.')
        return self


def reject(message, status=422):
    raise HTTPException(status_code=status, detail=message)


def validate_timeline(conn, aircraft_id, route_id, departure, arrival, exclude=''):
    route = conn.execute(text('SELECT * FROM flight_routes WHERE route_id=:id'), {'id':route_id}).mappings().first()
    if not route:
        reject('La ruta no existe.', 404)
    others = conn.execute(text("""SELECT f.flight_id, r.departure, r.arrival,
        COALESCE(actual_departure_at,planned_departure_at) AS start_at,
        COALESCE(actual_arrival_at,planned_arrival_at) AS end_at
        FROM flight_records f JOIN flight_routes r USING(route_id)
        WHERE aircraft_id=:aircraft AND flight_id<>:exclude AND status<>'CANCELLED'
        ORDER BY start_at"""), {'aircraft':aircraft_id,'exclude':exclude}).mappings().all()
    for f in others:
        if departure < f['end_at'] and arrival > f['start_at']:
            reject(f"El horario se superpone con el vuelo {f['flight_id']}.",409)
    prior = [f for f in others if f['end_at'] <= departure]
    following = [f for f in others if f['start_at'] >= arrival]
    if prior and prior[-1]['arrival'] != route['departure']:
        reject(f"La aeronave termina su vuelo anterior en {prior[-1]['arrival']}; la ruta debe salir de ese aeropuerto.",409)
    if following and following[0]['departure'] != route['arrival']:
        reject(f"El siguiente vuelo sale de {following[0]['departure']}; esta ruta debe llegar a ese aeropuerto.",409)


def lock_aircraft(conn, aircraft_id):
    row = conn.execute(text('SELECT * FROM aircrafts WHERE aircraft_id=:id FOR UPDATE'), {'id':aircraft_id}).mappings().first()
    if not row:
        reject('La aeronave no existe.',404)
    return row


@router.post('/{flight_id}/cancel')
def cancel_flight(flight_id: str, conn=Depends(flight_transaction, scope='function')):
    flight = conn.execute(text('SELECT * FROM flight_records WHERE flight_id=:id'), {'id':flight_id}).mappings().first()
    if not flight:
        reject('El vuelo no existe.',404)
    lock_aircraft(conn,flight['aircraft_id'])
    flight = conn.execute(text('SELECT * FROM flight_records WHERE flight_id=:id FOR UPDATE'), {'id':flight_id}).mappings().one()
    if flight['status'] == 'CANCELLED':
        return dict(flight)
    if flight['status'] != 'PLANNED':
        reject('Solo se pueden cancelar vuelos programados.',409)
    return dict(conn.execute(text("UPDATE flight_records SET status='CANCELLED' WHERE flight_id=:id RETURNING *"),
                             {'id':flight_id}).mappings().one())


@router.post('', status_code=201)
def create_flight(body: PlanFlight, conn=Depends(flight_transaction, scope='function')):
    fingerprint = hashlib.sha256(body.model_dump_json(exclude={'request_id'}).encode()).hexdigest()
    # Lock each request before checking it: concurrent retries return the same flight.
    conn.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))'), {'key':str(body.request_id)})
    prior = conn.execute(text('SELECT * FROM flight_creation_requests WHERE request_id=:id'), {'id':body.request_id}).mappings().first()
    if prior:
        if prior['payload_hash'] != fingerprint:
            reject('Esta solicitud ya se utilizó con otros datos. Inicia un nuevo registro.',409)
        return dict(conn.execute(text('SELECT * FROM flight_records WHERE flight_id=:id'), {'id':prior['flight_id']}).mappings().one())
    lock_aircraft(conn,body.aircraft_id)
    routes = conn.execute(text((Path(__file__).resolve().parents[1] / 'queries/routes.sql').read_text())).mappings().all()
    route = next((r for r in routes if r['route_id'] == body.route_id), None)
    if route is None:
        reject('La ruta no existe.',404)
    minutes = route['estimated_duration_minutes']
    if minutes is None:
        reject('La ruta no tiene vuelos completados para estimar su duración.')
    arrival = body.planned_departure_at + timedelta(minutes=minutes)
    validate_timeline(conn,body.aircraft_id,body.route_id,body.planned_departure_at,arrival)
    params = body.model_dump(exclude={'request_id'})
    params['planned_arrival_at'] = arrival
    for _ in range(100):
        params['flight_id'] = f'LAF{secrets.randbelow(100000):05}'
        row = conn.execute(text("""INSERT INTO flight_records
            (flight_id,aircraft_id,route_id,planned_departure_at,planned_arrival_at,status)
            VALUES (:flight_id,:aircraft_id,:route_id,:planned_departure_at,:planned_arrival_at,'PLANNED')
            ON CONFLICT (flight_id) DO NOTHING RETURNING *"""), params).mappings().first()
        if row:
            conn.execute(text('INSERT INTO flight_creation_requests(request_id,payload_hash,flight_id) VALUES (:id,:hash,:flight)'),
                         {'id':body.request_id,'hash':fingerprint,'flight':row['flight_id']})
            return dict(row)
    reject('No se pudo asignar un identificador de vuelo. Intenta nuevamente.',503)


@router.post('/{flight_id}/complete')
def complete_flight(flight_id: str, body: CompleteFlight, conn=Depends(flight_transaction, scope='function')):
    flight = conn.execute(text('SELECT * FROM flight_records WHERE flight_id=:id'), {'id':flight_id}).mappings().first()
    if not flight:
        reject('El vuelo no existe.',404)
    aircraft = lock_aircraft(conn,flight['aircraft_id'])
    flight = conn.execute(text('SELECT * FROM flight_records WHERE flight_id=:id FOR UPDATE'), {'id':flight_id}).mappings().one()
    values = body.model_dump()
    if flight['status'] == 'COMPLETED':
        if all(flight[key] == value for key,value in values.items()):
            return dict(flight)
        reject('El vuelo ya está completado con otros datos. No se puede finalizar otra vez.',409)
    if flight['status'] != 'PLANNED':
        reject('Solo se pueden finalizar vuelos planeados.',409)
    now = conn.execute(text('SELECT CURRENT_TIMESTAMP')).scalar_one()
    if body.actual_arrival_at > now:
        reject('No se puede completar un vuelo con aterrizaje en el futuro.')
    for field,limit,label in [('passengers','passenger_capacity','pasajeros'),('payload_kg','max_payload_kg','carga útil')]:
        if aircraft[limit] is not None and values[field] > aircraft[limit]:
            reject(f'La cantidad de {label} supera la capacidad de la aeronave.')
    if aircraft['operational_empty_weight_kg'] is not None and aircraft['max_takeoff_weight_kg'] is not None:
        if aircraft['operational_empty_weight_kg'] + body.payload_kg + body.fuel_at_departure_kg > aircraft['max_takeoff_weight_kg']:
            reject('El peso al despegue (OEW + carga útil + combustible) supera el MTOW.')
    # Historical snapshots must not silently become invalid after backdated flights.
    latest = conn.execute(text('SELECT max(performed_at) FROM maintenance_records WHERE aircraft_id=:id'), {'id':flight['aircraft_id']}).scalar_one()
    if latest and body.actual_arrival_at <= latest:
        reject('El aterrizaje es anterior o igual al último mantenimiento registrado. Requiere una revisión del historial antes de agregar ese vuelo.',409)
    if conn.execute(text('SELECT EXISTS (SELECT 1 FROM maintenance_records WHERE aircraft_id=:id AND performed_at BETWEEN :departure AND :arrival)'),
                    {'id':flight['aircraft_id'],'departure':body.actual_departure_at,'arrival':body.actual_arrival_at}).scalar_one():
        reject('El horario real coincide con un mantenimiento registrado para la aeronave.',409)
    validate_timeline(conn,flight['aircraft_id'],flight['route_id'],body.actual_departure_at,body.actual_arrival_at,flight_id)
    values['id'] = flight_id
    return dict(conn.execute(text("""UPDATE flight_records SET
        actual_departure_at=:actual_departure_at,actual_arrival_at=:actual_arrival_at,
        flight_distance_nm=:flight_distance_nm,fuel_at_departure_kg=:fuel_at_departure_kg,
        fuel_at_arrival_kg=:fuel_at_arrival_kg,passengers=:passengers,payload_kg=:payload_kg,
        status='COMPLETED' WHERE flight_id=:id RETURNING *"""),values).mappings().one())
