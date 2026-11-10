-- Fill only dashboard-created services with no recorded labor; preserve existing values.
BEGIN;
UPDATE maintenance_records m
SET actual_labor_hours = t.labor_hours,
    notes = concat_ws(' ', m.notes, 'Tiempo de trabajo tomado del estimado de la tarea.')
FROM mpd_tasks t
WHERE m.mpd_number=t.mpd_number
  AND m.actual_labor_hours IS NULL AND t.labor_hours IS NOT NULL
  AND EXISTS (SELECT 1 FROM maintenance_execution_requests r WHERE r.maintenance_id=m.maintenance_id);
COMMIT;
