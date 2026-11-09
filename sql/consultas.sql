-- LAF Aircraft Maintenance Intelligence
-- Conectar a laf_maintenance en VSCode.
-- Seleccionar una consulta para ejecutarla individualmente o ejecutar el archivo.
-- Todas las consultas son de lectura; no modifican datos.

-- 1. Catalogo de tareas de mantenimiento
SELECT *
FROM public.mpd_tasks
ORDER BY mpd_number;

-- 2. Umbrales e intervalos de las tareas
SELECT *
FROM public.task_intervals
ORDER BY mpd_number, interval_type, interval_unit;

-- 3. Aeronaves de la flota
SELECT *
FROM public.aircrafts
ORDER BY aircraft_id;

-- 4. Rutas disponibles (ida y regreso)
SELECT *
FROM public.flight_routes
ORDER BY route_id;

-- 5. Registros de vuelos
SELECT *
FROM public.flight_records
ORDER BY planned_departure_at, flight_id;

-- 6. Vista de utilizacion acumulada por aeronave
SELECT *
FROM public.aircraft_utilization
ORDER BY aircraft_id;

-- 7. Historial de tareas de mantenimiento completadas
SELECT *
FROM public.maintenance_records
ORDER BY performed_at, maintenance_id;

-- 8. Tareas asignadas a cada aeronave
SELECT *
FROM public.aircraft_maintenance_tasks
ORDER BY aircraft_id, mpd_number;

-- 9. Vencimientos por aeronave, tarea y unidad
SELECT *
FROM public.maintenance_due
ORDER BY aircraft_id, mpd_number, interval_unit;

-- 10. Limites de mantenimiento alcanzados o excedidos
SELECT *
FROM public.maintenance_due
WHERE status IN ('DUE', 'OVERDUE')
ORDER BY aircraft_id, mpd_number, interval_unit;
