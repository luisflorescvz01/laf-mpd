SELECT a.*, u.total_flights, u.total_flight_cycles, u.total_flight_hours,
       u.last_flight_at
FROM public.aircrafts a
JOIN public.aircraft_utilization u USING (aircraft_id)
ORDER BY a.aircraft_id;
