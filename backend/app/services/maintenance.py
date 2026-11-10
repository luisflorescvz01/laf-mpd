from decimal import Decimal
from app.core.config import WARNING_RATIO

PRIORITY = {'DATA_ERROR': 0, 'MISSING_INTERVAL': 0, 'OVERDUE': 1, 'DUE': 2,
            'NEAR_LIMIT': 3, 'WITHIN_LIMIT': 4, 'NOT_STARTED': 5}


def classify(row, ratio=WARNING_RATIO):
    status = row['status']
    if status != 'WITHIN_LIMIT':
        return status
    remaining, interval = row.get('remaining_value'), row.get('interval_value')
    if remaining is None or interval is None or Decimal(str(interval)) <= 0:
        return 'MISSING_INTERVAL'
    if Decimal(str(remaining)) <= Decimal(str(interval)) * ratio:
        return 'NEAR_LIMIT'
    return status


def group_tasks(rows):
    """One alert per aircraft/task; preserve every limit and its unit."""
    groups = {}
    for raw in rows:
        row = dict(raw)
        row['alert_status'] = classify(row)
        key = (row['aircraft_id'], row['mpd_number'])
        if key not in groups:
            groups[key] = {name: row[name] for name in (
                'aircraft_id', 'mpd_number', 'description_original', 'task_type',
                'ata_chapter', 'amm_references', 'zones', 'notes', 'labor_hours',
                'last_maintenance_at', 'last_maintenance_id', 'interval_type',
                'reference_at')}
            groups[key]['limits'] = []
        groups[key]['limits'].append(row)
    for task in groups.values():
        task['limits'].sort(key=lambda r: (PRIORITY.get(r['alert_status'], 0), r['interval_unit'] or ''))
        task['alert_status'] = task['limits'][0]['alert_status']
    return sorted(groups.values(), key=lambda t: (
        PRIORITY.get(t['alert_status'], 0), t['aircraft_id'], t['mpd_number']))
