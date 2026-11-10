-- Apply after 010_create_aircraft_maintenance_tasks.sql.
-- Existing rows are validated when the foreign key is added.
BEGIN;

ALTER TABLE public.maintenance_records
    ADD CONSTRAINT maintenance_records_assignment_fkey
    FOREIGN KEY (aircraft_id, mpd_number)
    REFERENCES public.aircraft_maintenance_tasks (aircraft_id, mpd_number)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

COMMIT;
