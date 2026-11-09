-- Demonstration scheduling: one row per assignment and interval unit.
-- DY means 24 elapsed hours here, independent of session time zone.
-- Initial thresholds start at tracking_start_at, not aircraft manufacture.
-- Only flights and maintenance completed by the query time are considered.
BEGIN;

CREATE VIEW public.maintenance_due AS
WITH bases AS (
    SELECT a.aircraft_id, a.mpd_number, a.tracking_start_at,
           CURRENT_TIMESTAMP AS evaluated_at,
           m.maintenance_id AS last_maintenance_id,
           m.performed_at AS last_maintenance_at,
           COALESCE(m.performed_at, a.tracking_start_at) AS reference_at,
           CASE WHEN m.maintenance_id IS NULL THEN 'THRESHOLD' ELSE 'REPEAT' END AS interval_type,
           COALESCE(m.flight_hours_at_maintenance, initial.hours) AS reference_flight_hours,
           COALESCE(m.flight_cycles_at_maintenance, initial.cycles) AS reference_flight_cycles,
           current_usage.hours AS current_flight_hours,
           current_usage.cycles AS current_flight_cycles
    FROM public.aircraft_maintenance_tasks a
    LEFT JOIN LATERAL (
        SELECT r.* FROM public.maintenance_records r
        WHERE r.aircraft_id = a.aircraft_id AND r.mpd_number = a.mpd_number
          AND r.performed_at >= a.tracking_start_at
          AND r.performed_at <= CURRENT_TIMESTAMP
        ORDER BY r.performed_at DESC, r.maintenance_id DESC LIMIT 1
    ) m ON TRUE
    CROSS JOIN LATERAL (
        SELECT ROUND(COALESCE(SUM(f.flight_time_minutes), 0) / 60, 2) AS hours,
               COUNT(*) AS cycles
        FROM public.flight_records f
        WHERE f.aircraft_id = a.aircraft_id AND f.status = 'COMPLETED'
          AND f.actual_arrival_at <= a.tracking_start_at
    ) initial
    CROSS JOIN LATERAL (
        SELECT ROUND(COALESCE(SUM(f.flight_time_minutes), 0) / 60, 2) AS hours,
               COUNT(*) AS cycles
        FROM public.flight_records f
        WHERE f.aircraft_id = a.aircraft_id AND f.status = 'COMPLETED'
          AND f.actual_arrival_at <= CURRENT_TIMESTAMP
    ) current_usage
), limits AS (
    SELECT b.*, i.interval_unit, i.interval_value,
           CASE i.interval_unit
               WHEN 'FH' THEN b.current_flight_hours - b.reference_flight_hours
               WHEN 'FC' THEN b.current_flight_cycles - b.reference_flight_cycles
               WHEN 'HR' THEN EXTRACT(EPOCH FROM (b.evaluated_at - b.reference_at)) / 3600
               WHEN 'DY' THEN EXTRACT(EPOCH FROM (b.evaluated_at - b.reference_at)) / 86400
           END AS elapsed_value,
           CASE i.interval_unit
               WHEN 'FH' THEN b.reference_flight_hours + i.interval_value
               WHEN 'FC' THEN b.reference_flight_cycles + i.interval_value
           END AS due_at_usage,
           CASE i.interval_unit
               WHEN 'HR' THEN b.reference_at + i.interval_value::double precision * INTERVAL '1 hour'
               WHEN 'DY' THEN b.reference_at + i.interval_value::double precision * INTERVAL '24 hours'
           END AS due_at
    FROM bases b
    LEFT JOIN public.task_intervals i
      ON i.mpd_number = b.mpd_number AND i.interval_type = b.interval_type
)
SELECT aircraft_id, mpd_number, interval_type, interval_unit, interval_value,
       last_maintenance_id, last_maintenance_at, reference_at,
       reference_flight_hours, reference_flight_cycles,
       current_flight_hours, current_flight_cycles,
       ROUND(elapsed_value, 2) AS elapsed_value,
       ROUND(interval_value - elapsed_value, 2) AS remaining_value,
       due_at_usage, due_at,
       CASE
           WHEN tracking_start_at > evaluated_at THEN 'NOT_STARTED'
           WHEN interval_unit IS NULL THEN 'MISSING_INTERVAL'
           WHEN elapsed_value < 0 THEN 'DATA_ERROR'
           WHEN elapsed_value > interval_value THEN 'OVERDUE'
           WHEN elapsed_value = interval_value THEN 'DUE'
           ELSE 'WITHIN_LIMIT'
       END AS status,
       evaluated_at
FROM limits;

COMMIT;
