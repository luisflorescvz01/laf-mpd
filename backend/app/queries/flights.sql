SELECT f.*, r.departure, r.arrival
FROM public.flight_records f
JOIN public.flight_routes r USING (route_id)
ORDER BY f.planned_departure_at DESC, f.flight_id;
