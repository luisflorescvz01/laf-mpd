SELECT m.*, t.description_original, t.task_type
FROM public.maintenance_records m
JOIN public.mpd_tasks t USING (mpd_number)
ORDER BY m.performed_at DESC, m.maintenance_id;
