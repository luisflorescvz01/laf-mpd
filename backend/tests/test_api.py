from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database.connection import engine

client = TestClient(app)


def test_snapshot_matches_database_and_groups_assignments():
    response = client.get('/api/dashboard')
    assert response.status_code == 200
    data = response.json()
    with engine.connect() as conn:
        for name, table in [('aircrafts', 'aircrafts'), ('flights', 'flight_records'),
                            ('history', 'maintenance_records'), ('maintenance', 'aircraft_maintenance_tasks')]:
            assert len(data[name]) == conn.execute(text(f'SELECT count(*) FROM public.{table}')).scalar_one()
        assert conn.execute(text('SHOW transaction_read_only')).scalar_one() == 'on'
    keys = [(t['aircraft_id'], t['mpd_number']) for t in data['maintenance']]
    assert len(keys) == len(set(keys))
    assert data['summary']['urgent_tasks'] == sum(
        t['alert_status'] in ('DUE', 'OVERDUE') for t in data['maintenance'])
    assert 'POSTGRES_PASSWORD' not in response.text


def test_endpoints_do_not_accept_mutations():
    assert client.get('/api/health').json() == {'status': 'ok'}
    for method in ('post', 'put', 'patch', 'delete'):
        assert getattr(client, method)('/api/dashboard').status_code == 405
