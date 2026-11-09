BEGIN;

CREATE TABLE mpd_tasks (
    mpd_number TEXT PRIMARY KEY,
    ata_chapter TEXT NOT NULL,
    task_type TEXT NOT NULL,
    description_original TEXT NOT NULL,
    amm_references TEXT[] NOT NULL DEFAULT '{}',
    zones TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    labor_hours NUMERIC(10, 2),
    CONSTRAINT mpd_tasks_number_not_blank CHECK (btrim(mpd_number) <> ''),
    CONSTRAINT mpd_tasks_ata_format CHECK (ata_chapter ~ '^[0-9]{2}$'),
    CONSTRAINT mpd_tasks_type_not_blank CHECK (btrim(task_type) <> ''),
    CONSTRAINT mpd_tasks_description_not_blank CHECK (btrim(description_original) <> ''),
    CONSTRAINT mpd_tasks_labor_nonnegative CHECK (labor_hours >= 0)
);

CREATE TABLE task_intervals (
    mpd_number TEXT NOT NULL REFERENCES mpd_tasks (mpd_number)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    interval_type TEXT NOT NULL,
    interval_value NUMERIC(12, 2) NOT NULL,
    interval_unit TEXT NOT NULL,
    PRIMARY KEY (mpd_number, interval_type, interval_unit),
    CONSTRAINT task_intervals_type_valid
        CHECK (interval_type IN ('THRESHOLD', 'REPEAT')),
    CONSTRAINT task_intervals_unit_valid
        CHECK (interval_unit IN ('FH', 'FC', 'DY', 'HR')),
    CONSTRAINT task_intervals_value_positive CHECK (interval_value > 0),
    CONSTRAINT task_intervals_cycles_integer
        CHECK (interval_unit <> 'FC' OR interval_value = trunc(interval_value))
);

COMMIT;
