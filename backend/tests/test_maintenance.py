from decimal import Decimal
from app.services.maintenance import classify, group_tasks


def test_warning_boundary_and_states():
    row = {'status': 'WITHIN_LIMIT', 'interval_value': Decimal('560'), 'remaining_value': Decimal('56')}
    assert classify(row) == 'NEAR_LIMIT'
    assert classify({**row, 'remaining_value': Decimal('56.01')}) == 'WITHIN_LIMIT'
    for state in ('OVERDUE', 'DUE', 'NOT_STARTED', 'DATA_ERROR', 'MISSING_INTERVAL'):
        assert classify({**row, 'status': state}) == state


def test_grouping_preserves_units_without_double_counting():
    row = {k: None for k in ('description_original', 'task_type', 'ata_chapter', 'amm_references',
        'zones', 'notes', 'labor_hours', 'last_maintenance_at', 'last_maintenance_id', 'interval_type', 'reference_at')}
    row.update(aircraft_id='LAF-737-001', mpd_number='32-080-00', status='WITHIN_LIMIT',
               interval_value=560, remaining_value=100, interval_unit='FC')
    rows = [row, {**row, 'interval_unit': 'DY', 'interval_value': 90, 'remaining_value': -1, 'status': 'OVERDUE'}]
    tasks = group_tasks(rows)
    assert len(tasks) == 1
    assert len(tasks[0]['limits']) == 2
    assert tasks[0]['alert_status'] == 'OVERDUE'
    assert rows[0]['status'] == 'WITHIN_LIMIT'
