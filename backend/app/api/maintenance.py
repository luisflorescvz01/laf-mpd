import secrets
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from app.database.connection import flight_transaction
from app.api.flights import lock_aircraft, reject

router = APIRouter(prefix='/api/maintenance', tags=['Mantenimiento'])


class ExecuteMaintenance(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: UUID
    aircraft_id: str = Field(min_length=1, max_length=11)
    mpd_number: str = Field(min_length=1, max_length=50)


@router.post('', status_code=201)
def execute_maintenance(body: ExecuteMaintenance, conn=Depends(flight_transaction, scope='function')):
    conn.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key,0))'), {'key':str(body.request_id)})
    previous = conn.execute(text('''SELECT m.* FROM maintenance_execution_requests r
        JOIN maintenance_records m USING(maintenance_id) WHERE r.request_id=:id'''), {'id':body.request_id}).mappings().first()
    if previous:
        if previous['aircraft_id'] != body.aircraft_id or previous['mpd_number'] != body.mpd_number:
            reject('La solicitud ya se utilizó para otra tarea o aeronave.',409)
        return dict(previous)
    lock_aircraft(conn,body.aircraft_id)
    params = {'aircraft':body.aircraft_id,'task':body.mpd_number}
    assignment = conn.execute(text('''SELECT * FROM aircraft_maintenance_tasks
        WHERE aircraft_id=:aircraft AND mpd_number=:task FOR UPDATE'''),params).mappings().first()
    if not assignment:
        reject('La tarea no está asignada a esta aeronave.',404)
    # Capture the time after waiting for the aircraft lock, not transaction start.
    now = conn.execute(text('SELECT clock_timestamp()')).scalar_one()
    params['now'] = now
    if assignment['tracking_start_at'] > now:
        reject('Todavía no comienza el seguimiento de esta tarea.',409)
    intervals = conn.execute(text('SELECT interval_type,interval_unit FROM task_intervals WHERE mpd_number=:task'),params).mappings().all()
    units = {r['interval_unit'] for r in intervals}
    repeat = {r['interval_unit'] for r in intervals if r['interval_type']=='REPEAT'}
    if not repeat or units != repeat:
        reject('Faltan intervalos repetitivos para uno o más límites de la tarea.',409)
    if conn.execute(text('''SELECT EXISTS(SELECT 1 FROM flight_records WHERE aircraft_id=:aircraft
        AND (status='IN_PROGRESS' OR (status='PLANNED' AND planned_departure_at<=:now AND planned_arrival_at>=:now)))'''),params).scalar_one():
        reject('La aeronave tiene un vuelo en curso o programado para este horario. Revisa su estado antes de realizar el mantenimiento.',409)
    if conn.execute(text('''SELECT EXISTS(SELECT 1 FROM maintenance_records WHERE aircraft_id=:aircraft
        AND mpd_number=:task AND performed_at>:now)'''),params).scalar_one():
        reject('Hay un mantenimiento futuro registrado para esta tarea. Revisa el historial.',409)
    usage = conn.execute(text('''SELECT round(coalesce(sum(flight_time_minutes),0)/60,2) AS hours,
        count(*) AS cycles FROM flight_records WHERE aircraft_id=:aircraft AND status='COMPLETED'
        AND actual_arrival_at<=:now'''),params).mappings().one()
    params.update(hours=usage['hours'],cycles=usage['cycles'])
    params['labor'] = conn.execute(text('SELECT labor_hours FROM mpd_tasks WHERE mpd_number=:task'), params).scalar_one()
    for _ in range(100):
        params['id'] = f'MNT{secrets.randbelow(100000):05}'
        record = conn.execute(text('''INSERT INTO maintenance_records
            (maintenance_id,aircraft_id,mpd_number,performed_at,flight_hours_at_maintenance,flight_cycles_at_maintenance,actual_labor_hours,notes)
            VALUES (:id,:aircraft,:task,:now,:hours,:cycles,:labor,'Ejecución de demostración registrada desde el dashboard. Tiempo de trabajo tomado del estimado de la tarea.')
            ON CONFLICT (maintenance_id) DO NOTHING RETURNING *'''),params).mappings().first()
        if record:
            conn.execute(text('INSERT INTO maintenance_execution_requests VALUES (:request,:maintenance)'),
                         {'request':body.request_id,'maintenance':record['maintenance_id']})
            return dict(record)
    reject('No fue posible asignar un identificador. Intenta nuevamente.',503)
