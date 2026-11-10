from uuid import uuid4
from decimal import Decimal
from sqlalchemy import text
from test_flights import session, usage


def payload():
    return {'request_id':str(uuid4()),'aircraft_id':'LAF-737-008','mpd_number':'32-080-00'}


def test_all_limits_reset_and_other_assignments_unchanged(session):
    client,conn = session
    before = usage(conn)
    other = conn.execute(text("SELECT * FROM maintenance_due WHERE aircraft_id='LAF-737-007' AND mpd_number='32-080-00'")).mappings().all()
    # Exercise all four supported units on one task, only inside this rollback.
    for kind in ('THRESHOLD','REPEAT'):
        conn.execute(text("INSERT INTO task_intervals VALUES ('32-080-00',:kind,600,'FH'),('32-080-00',:kind,48,'HR')"),{'kind':kind})
    body=payload()
    response=client.post('/api/maintenance',json=body)
    assert response.status_code==201,response.text
    row=response.json()
    assert row['actual_labor_hours'] is None
    assert Decimal(str(row['flight_hours_at_maintenance'])) == before['total_flight_hours']
    assert row['flight_cycles_at_maintenance'] == before['total_flight_cycles']
    assert client.post('/api/maintenance',json=body).json()['maintenance_id']==row['maintenance_id']
    assert client.post('/api/maintenance',json={**body,'mpd_number':'33-010-00'}).status_code==409
    assert usage(conn)==before
    # Production reads use a new transaction after commit. In the rollback fixture,
    # evaluate the view with the current clock instead of the older transaction start.
    definition=conn.execute(text("SELECT pg_get_viewdef('maintenance_due'::regclass,true)")).scalar_one()
    due=conn.execute(text(definition.replace('CURRENT_TIMESTAMP','clock_timestamp()'))).mappings().all()
    limits=[r for r in due if r['aircraft_id']=='LAF-737-008' and r['mpd_number']=='32-080-00']
    assert {r['interval_unit'] for r in limits}=={'FH','FC','DY','HR'}
    for r in limits:
        assert r['last_maintenance_id']==row['maintenance_id']
        assert r['interval_type']=='REPEAT'
        assert r['status']=='WITHIN_LIMIT'
        assert abs(r['remaining_value']-r['interval_value']) < Decimal('.01')
    # Compare original FC/DY limits for the other aircraft (extra fixture units excluded).
    other_after=conn.execute(text("SELECT * FROM maintenance_due WHERE aircraft_id='LAF-737-007' AND mpd_number='32-080-00' AND interval_unit IN ('FC','DY')")).mappings().all()
    assert other_after==other
    assert conn.execute(text('SELECT count(*) FROM maintenance_records WHERE maintenance_id=:id'),{'id':row['maintenance_id']}).scalar_one()==1


def test_missing_assignment_and_repeat_rejected(session):
    client,conn=session
    assert client.post('/api/maintenance',json={**payload(),'mpd_number':'missing'}).status_code==404
    conn.execute(text("DELETE FROM task_intervals WHERE mpd_number='32-080-00' AND interval_type='REPEAT' AND interval_unit='DY'"))
    assert client.post('/api/maintenance',json=payload()).status_code==409


def test_aircraft_in_flight_rejected(session):
    client,conn=session
    conn.execute(text("""UPDATE flight_records SET status='IN_PROGRESS',actual_arrival_at=NULL
        WHERE aircraft_id='LAF-737-008'"""))
    assert client.post('/api/maintenance',json=payload()).status_code==409
