SELECT d.*, t.description_original, t.task_type, t.ata_chapter,
       t.amm_references, t.zones, t.notes, t.labor_hours
FROM public.maintenance_due d
JOIN public.mpd_tasks t USING (mpd_number)
ORDER BY d.aircraft_id, d.mpd_number, d.interval_unit;
