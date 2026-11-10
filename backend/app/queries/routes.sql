SELECT r.*, h.estimated_duration_minutes
FROM public.flight_routes r
LEFT JOIN LATERAL (
    SELECT GREATEST(1, ROUND(AVG(flight_time_minutes)))::integer AS estimated_duration_minutes
    FROM public.flight_records f
    WHERE f.route_id=r.route_id AND f.status='COMPLETED'
      AND f.actual_arrival_at <= CURRENT_TIMESTAMP AND f.flight_time_minutes > 0
    HAVING count(*) > 0
) h ON TRUE
ORDER BY r.route_id;
