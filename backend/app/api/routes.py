from pathlib import Path
from fastapi import APIRouter
from sqlalchemy import text
from app.database.connection import engine
from app.services.maintenance import group_tasks
from app.core.config import WARNING_RATIO

router = APIRouter(prefix='/api')
QUERIES = Path(__file__).resolve().parents[1] / 'queries'


@router.get('/health')
def health():
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    return {'status': 'ok'}


@router.get('/dashboard')
def dashboard():
    # One coherent, read-only snapshot for this small demonstration dataset.
    # Client-side filters/pagination operate on this snapshot, without truncation.
    with engine.connect().execution_options(isolation_level='REPEATABLE READ') as conn:
        with conn.begin():
            result = {name: [dict(r) for r in conn.execute(text(
                (QUERIES / f'{name}.sql').read_text(encoding='utf-8')
            )).mappings()] for name in ('aircrafts', 'flights', 'history', 'maintenance', 'routes')}
            result['evaluated_at'] = conn.execute(text('SELECT CURRENT_TIMESTAMP')).scalar_one()
    result['maintenance'] = group_tasks(result['maintenance'])
    tasks = result['maintenance']
    result['summary'] = {
        'aircrafts': len(result['aircrafts']),
        'completed_flights': sum(f['status'] == 'COMPLETED' for f in result['flights']),
        'urgent_tasks': sum(t['alert_status'] in ('OVERDUE', 'DUE') for t in tasks),
        'near_tasks': sum(t['alert_status'] == 'NEAR_LIMIT' for t in tasks),
        'review_tasks': sum(t['alert_status'] in ('DATA_ERROR', 'MISSING_INTERVAL') for t in tasks),
        'total_tasks': len(tasks),
    }
    result['warning_ratio'] = float(WARNING_RATIO)
    return result
