-- Utilization from recorded completed flights only, not lifetime totals.
-- A normal view recalculates results when queried. No stored counters.
BEGIN;

CREATE VIEW public.aircraft_utilization AS
SELECT
    a.aircraft_id,
    COUNT(f.flight_id) AS total_flights,
    COUNT(f.flight_id) AS total_flight_cycles,
    ROUND(COALESCE(SUM(f.flight_time_minutes), 0) / 60, 2)
        AS total_flight_hours,
    MAX(f.actual_arrival_at) AS last_flight_at
FROM public.aircrafts AS a
LEFT JOIN public.flight_records AS f
    ON f.aircraft_id = a.aircraft_id
    AND f.status = 'COMPLETED'
GROUP BY a.aircraft_id;

COMMIT;
