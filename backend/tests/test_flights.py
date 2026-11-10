"""Integration tests run in a rolled-back transaction; no demo records persist."""
from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database.connection import write_engine, flight_transaction


@pytest.fixture
def session():
    with write_engine.connect() as conn:
        tx = conn.begin()
        def override():
            yield conn
        app.dependency_overrides[flight_transaction] = override
        try:
            # Isolate this aircraft inside the rollback, even after users add flights.
            conn.execute(text("DELETE FROM maintenance_records WHERE aircraft_id='LAF-737-008'"))
            conn.execute(text("DELETE FROM flight_records WHERE aircraft_id='LAF-737-008'"))
            conn.execute(text("""INSERT INTO flight_records
                (flight_id,aircraft_id,route_id,planned_departure_at,planned_arrival_at,
                 actual_departure_at,actual_arrival_at,status)
                SELECT 'LAF' || lpad(n::text,5,'0'),'LAF-737-008','LAFr01b',
                    CURRENT_TIMESTAMP-interval '49 hours',CURRENT_TIMESTAMP-interval '48 hours',
                    CURRENT_TIMESTAMP-interval '49 hours',CURRENT_TIMESTAMP-interval '48 hours','COMPLETED'
                FROM generate_series(0,99999) n
                WHERE NOT EXISTS(SELECT 1 FROM flight_records WHERE flight_id='LAF' || lpad(n::text,5,'0')) LIMIT 1"""))
            conn.execute(text("""INSERT INTO maintenance_records
                (maintenance_id,aircraft_id,mpd_number,performed_at,flight_hours_at_maintenance,flight_cycles_at_maintenance)
                SELECT 'MNT' || lpad(n::text,5,'0'),'LAF-737-008','33-010-00',CURRENT_TIMESTAMP-interval '24 hours',1,1
                FROM generate_series(0,99999) n
                WHERE NOT EXISTS(SELECT 1 FROM maintenance_records WHERE maintenance_id='MNT' || lpad(n::text,5,'0')) LIMIT 1"""))
            yield TestClient(app), conn
        finally:
            app.dependency_overrides.clear()
            tx.rollback()


def plan():
    return dict(request_id=str(uuid4()), aircraft_id='LAF-737-008', route_id='LAFr01a',
                planned_departure_at='2035-01-01T10:00:00-06:00')


def actual(conn):
    now = conn.execute(text('SELECT CURRENT_TIMESTAMP')).scalar_one()
    return dict(actual_departure_at=(now-timedelta(hours=2)).isoformat(),
                actual_arrival_at=(now-timedelta(hours=1)).isoformat(),
                flight_distance_nm=390, fuel_at_departure_kg=5000, fuel_at_arrival_kg=2500,
                passengers=150, payload_kg=15000)


def usage(conn):
    return conn.execute(text("SELECT * FROM aircraft_utilization WHERE aircraft_id='LAF-737-008'")).mappings().one()


def remaining(conn):
    return {r['interval_unit']:r['remaining_value'] for r in conn.execute(text("""
        SELECT interval_unit,remaining_value FROM maintenance_due WHERE aircraft_id='LAF-737-008'
        AND mpd_number IN ('27-132-00','33-010-00')""")).mappings()}


def test_lifecycle_idempotency_and_maintenance(session):
    client,conn = session
    before = usage(conn); limits = remaining(conn)
    payload = plan()
    created = client.post('/api/flights',json=payload)
    assert created.status_code == 201, created.text
    flight_id = created.json()['flight_id']
    assert client.post('/api/flights',json=payload).json()['flight_id'] == flight_id
    assert usage(conn) == before
    changed = {**payload,'route_id':'LAFr02a'}
    assert client.post('/api/flights',json=changed).status_code == 409
    completed = actual(conn)
    response = client.post(f'/api/flights/{flight_id}/complete',json=completed)
    assert response.status_code == 200, response.text
    assert response.json()['status'] == 'COMPLETED'
    after = usage(conn)
    assert after['total_flight_cycles'] == before['total_flight_cycles']+1
    assert after['total_flight_hours'] == before['total_flight_hours']+Decimal('1.00')
    after_limits = remaining(conn)
    assert after_limits['FH'] == limits['FH']-1
    assert after_limits['FC'] == limits['FC']-1
    assert client.post(f'/api/flights/{flight_id}/complete',json=completed).status_code == 200
    assert usage(conn) == after
    completed['passengers'] = 149
    assert client.post(f'/api/flights/{flight_id}/complete',json=completed).status_code == 409


@pytest.mark.parametrize('field,value,status', [
    ('passengers',190,422),('passengers',1.5,422),('payload_kg',20541,422),
    ('fuel_at_arrival_kg',-1,422),('fuel_at_arrival_kg',6000,422),
    ('fuel_at_departure_kg',50000,422),('flight_distance_nm',0,422),
    ('actual_arrival_at','2035-01-01T15:00:00-06:00',422),
    ('actual_arrival_at','2000-01-01T15:00:00-06:00',422),
    ('actual_departure_at','2026-01-01T12:00:00',422),
])
def test_invalid_completion_does_not_change_usage(session,field,value,status):
    client,conn = session
    flight = client.post('/api/flights',json=plan()).json()['flight_id']
    before = usage(conn)
    payload = actual(conn); payload[field] = value
    assert client.post(f'/api/flights/{flight}/complete',json=payload).status_code == status
    assert usage(conn) == before
    assert conn.execute(text('SELECT status FROM flight_records WHERE flight_id=:id'),{'id':flight}).scalar_one() == 'PLANNED'


def test_overlap_route_and_completion_conflicts(session):
    client,conn = session
    first = plan()
    flight = client.post('/api/flights',json=first).json()['flight_id']
    assert client.post('/api/flights',json=plan()).status_code == 409
    disconnected = plan()
    disconnected.update(planned_departure_at='2035-01-01T12:00:00-06:00')
    assert client.post('/api/flights',json=disconnected).status_code == 409
    invalid = plan(); invalid['route_id']='missing'
    assert client.post('/api/flights',json=invalid).status_code == 404
    invalid = plan(); invalid['planned_departure_at']='invalid'
    assert client.post('/api/flights',json=invalid).status_code == 422
    assert client.post('/api/flights/NO-SUCH-FLIGHT/complete',json=actual(conn)).status_code == 404
    old = actual(conn)
    old.update(actual_departure_at='2026-01-01T10:00:00-06:00',actual_arrival_at='2026-01-01T11:00:00-06:00')
    assert client.post(f'/api/flights/{flight}/complete',json=old).status_code == 409
    during_service = actual(conn)
    now = conn.execute(text('SELECT CURRENT_TIMESTAMP')).scalar_one()
    during_service['actual_departure_at'] = (now-timedelta(hours=25)).isoformat()
    assert client.post(f'/api/flights/{flight}/complete',json=during_service).status_code == 409


def test_actual_overlap_rejected(session):
    client,conn = session
    flight = client.post('/api/flights',json=plan()).json()['flight_id']
    # Remove maintenance snapshots only inside this rolled-back test to reach overlap validation.
    conn.execute(text("DELETE FROM maintenance_records WHERE aircraft_id='LAF-737-008'"))
    existing = conn.execute(text("SELECT * FROM flight_records WHERE aircraft_id='LAF-737-008' AND status='COMPLETED' LIMIT 1")).mappings().one()
    payload = actual(conn)
    payload.update(actual_departure_at=existing['actual_departure_at'].isoformat(),actual_arrival_at=existing['actual_arrival_at'].isoformat())
    assert client.post(f'/api/flights/{flight}/complete',json=payload).status_code == 409


def test_automatic_arrival_and_midnight(session):
    from datetime import datetime
    client,conn = session
    payload = plan()
    payload['planned_departure_at'] = '2035-01-01T23:45:00-06:00'
    minutes = conn.execute(text("SELECT round(avg(flight_time_minutes)) FROM flight_records WHERE route_id='LAFr01a' AND status='COMPLETED' AND actual_arrival_at<=CURRENT_TIMESTAMP")).scalar_one()
    response = client.post('/api/flights',json=payload)
    assert response.status_code == 201, response.text
    arrival = datetime.fromisoformat(response.json()['planned_arrival_at'])
    assert arrival == datetime.fromisoformat(payload['planned_departure_at']) + timedelta(minutes=int(minutes))
    assert arrival.astimezone(datetime.fromisoformat(payload['planned_departure_at']).tzinfo).day == 2
    # Arrival is computed by the server, not accepted from a client.
    payload['request_id'] = str(uuid4())
    payload['planned_arrival_at'] = '2035-01-01T23:50:00-06:00'
    assert client.post('/api/flights',json=payload).status_code == 422


def test_cancel_planned_flight_idempotently(session):
    client,conn = session
    before = usage(conn); limits = remaining(conn)
    payload = plan()
    flight = client.post('/api/flights',json=payload).json()['flight_id']
    response = client.post(f'/api/flights/{flight}/cancel')
    assert response.status_code == 200
    assert response.json()['status'] == 'CANCELLED'
    assert response.json()['actual_departure_at'] is None
    assert client.post(f'/api/flights/{flight}/cancel').status_code == 200
    assert usage(conn) == before and remaining(conn) == limits
    assert client.post(f'/api/flights/{flight}/complete',json=actual(conn)).status_code == 409
    assert client.post('/api/flights',json=payload).json()['status'] == 'CANCELLED'
    # Cancelled flights no longer occupy the aircraft's schedule.
    assert client.post('/api/flights',json=plan()).status_code == 201


def test_cancel_rejects_other_states_and_missing_flight(session):
    client,conn = session
    existing = conn.execute(text("SELECT flight_id FROM flight_records WHERE aircraft_id='LAF-737-008' AND status='COMPLETED' LIMIT 1")).scalar_one()
    before = usage(conn)
    assert client.post(f'/api/flights/{existing}/cancel').status_code == 409
    assert usage(conn) == before
    assert client.post('/api/flights/NO-SUCH-FLIGHT/cancel').status_code == 404
    flight = client.post('/api/flights',json=plan()).json()['flight_id']
    conn.execute(text("UPDATE flight_records SET status='IN_PROGRESS',actual_departure_at=CURRENT_TIMESTAMP WHERE flight_id=:id"),{'id':flight})
    assert client.post(f'/api/flights/{flight}/cancel').status_code == 409
