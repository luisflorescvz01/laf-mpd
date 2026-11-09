-- Each row represents one completed maintenance task on one aircraft.
-- Utilization values are historical snapshots supplied at insertion time.
-- This script does not populate records or automatically calculate snapshots.
BEGIN;

CREATE TABLE public.maintenance_records (
    maintenance_id VARCHAR(8) PRIMARY KEY
        CHECK (maintenance_id ~ '^MNT[0-9]{5}$'),
    aircraft_id VARCHAR(11) NOT NULL
        REFERENCES public.aircrafts(aircraft_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    mpd_number TEXT NOT NULL
        REFERENCES public.mpd_tasks(mpd_number)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    performed_at TIMESTAMPTZ NOT NULL,
    flight_hours_at_maintenance NUMERIC(12,2) NOT NULL
        CHECK (flight_hours_at_maintenance >= 0),
    flight_cycles_at_maintenance BIGINT NOT NULL
        CHECK (flight_cycles_at_maintenance >= 0),
    actual_labor_hours NUMERIC(10,2)
        CHECK (actual_labor_hours >= 0),
    notes TEXT
);

COMMIT;
