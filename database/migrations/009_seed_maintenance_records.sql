-- Fictional completed maintenance examples approved for the demonstration.
-- Historical FH/FC are calculated at insertion time, then stored as snapshots.
-- Run once. Duplicate IDs abort the transaction without overwriting records.
BEGIN;

WITH examples (maintenance_id, aircraft_id, mpd_number, performed_at,
               actual_labor_hours, notes) AS (
    VALUES
    ('MNT00001', 'LAF-737-001', '27-132-00', TIMESTAMPTZ '2026-11-06 08:00:00-06:00', 0.35,
     'Nivel de aceite de la unidad de accionamiento de flaps revisado.'),
    ('MNT00002', 'LAF-737-002', '29-070-00', TIMESTAMPTZ '2026-11-06 08:30:00-06:00', 0.25,
     'Limpieza del filtro del módulo de presurización realizada.'),
    ('MNT00003', 'LAF-737-003', '32-080-00', TIMESTAMPTZ '2026-11-06 09:00:00-06:00', 0.45,
     'Lubricación del tren de aterrizaje de nariz completada.'),
    ('MNT00004', 'LAF-737-004', '32-350-00', TIMESTAMPTZ '2026-11-06 09:30:00-06:00', 0.10,
     'Inflado de neumáticos comprobado y ajustado según necesidad.'),
    ('MNT00005', 'LAF-737-005', '33-010-00', TIMESTAMPTZ '2026-11-06 10:00:00-06:00', 0.05,
     'Funcionamiento de luces de emergencia comprobado.'),
    ('MNT00006', 'LAF-737-006', '27-132-00', TIMESTAMPTZ '2026-11-06 10:30:00-06:00', 0.30,
     'Nivel de aceite de la unidad de accionamiento de flaps revisado.'),
    ('MNT00007', 'LAF-737-007', '29-070-00', TIMESTAMPTZ '2026-11-06 11:00:00-06:00', 0.25,
     'Limpieza del filtro del módulo de presurización realizada.'),
    ('MNT00008', 'LAF-737-008', '32-080-00', TIMESTAMPTZ '2026-11-06 11:30:00-06:00', 0.50,
     'Lubricación del tren de aterrizaje de nariz completada.'),
    ('MNT00009', 'LAF-737-001', '32-350-00', TIMESTAMPTZ '2026-11-06 12:00:00-06:00', 0.10,
     'Inflado de neumáticos comprobado.'),
    ('MNT00010', 'LAF-737-002', '33-010-00', TIMESTAMPTZ '2026-11-06 12:30:00-06:00', 0.05,
     'Funcionamiento de luces de emergencia comprobado.')
)
INSERT INTO public.maintenance_records (
    maintenance_id, aircraft_id, mpd_number, performed_at,
    flight_hours_at_maintenance, flight_cycles_at_maintenance,
    actual_labor_hours, notes
)
SELECT e.maintenance_id, e.aircraft_id, e.mpd_number, e.performed_at,
       u.hours, u.cycles, e.actual_labor_hours, e.notes
FROM examples AS e
CROSS JOIN LATERAL (
    SELECT ROUND(COALESCE(SUM(f.flight_time_minutes), 0) / 60, 2) AS hours,
           COUNT(*) AS cycles
    FROM public.flight_records AS f
    WHERE f.aircraft_id = e.aircraft_id
      AND f.status = 'COMPLETED'
      AND f.actual_arrival_at <= e.performed_at
) AS u;

COMMIT;
