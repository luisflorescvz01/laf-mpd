-- Task assignments for the fictional fleet, not maintenance executions.
-- Tracking starts at the beginning of the demonstration, Monterrey UTC-06.
-- No stored utilization counters or remaining-time calculations.
BEGIN;

CREATE TABLE public.aircraft_maintenance_tasks (
    aircraft_id VARCHAR(11) NOT NULL
        REFERENCES public.aircrafts(aircraft_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    mpd_number TEXT NOT NULL
        REFERENCES public.mpd_tasks(mpd_number)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    tracking_start_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (aircraft_id, mpd_number)
);

INSERT INTO public.aircraft_maintenance_tasks (
    aircraft_id, mpd_number, tracking_start_at
)
SELECT a.aircraft_id, t.mpd_number,
       TIMESTAMPTZ '2026-11-01 00:00:00-06:00'
FROM public.aircrafts AS a
CROSS JOIN public.mpd_tasks AS t
WHERE a.aircraft_id IN (
    'LAF-737-001', 'LAF-737-002', 'LAF-737-003', 'LAF-737-004',
    'LAF-737-005', 'LAF-737-006', 'LAF-737-007', 'LAF-737-008'
)
AND t.mpd_number IN (
    '27-132-00', '29-070-00', '32-080-00', '32-350-00', '33-010-00'
);

COMMIT;
