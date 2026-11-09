-- Demonstration data from D626A011, edition 2026-05-15.
-- Source: 01___056.PDF, printed pages 1.1-52, 1.1-73, 1.1-81,
-- 1.1-84 and 1.1-88. Pending aeronautical validation.
-- Run once. A duplicate key aborts the transaction without overwriting data.
BEGIN;

INSERT INTO mpd_tasks (
    mpd_number, ata_chapter, task_type, description_original,
    amm_references, zones, notes, labor_hours
) VALUES
('27-132-00', '27', 'SVC',
 'Check flap power drive unit oil level and service as required.',
 ARRAY['12-22-51-610'], ARRAY['133', '134'], NULL, 0.30),
('29-070-00', '29', 'RST',
 'Restore (Clean) the reservoir pressurization module filter.',
 ARRAY['29-09-01-000', '29-09-01-400'], ARRAY['192'], NULL, 0.20),
('32-080-00', '32', 'LUB',
 'Lubricate the nose landing gear assembly.',
 ARRAY['12-21-21-640'], ARRAY['713'], NULL, 0.40),
('32-350-00', '32', 'FNC',
 'Functionally check nose and main landing gear tires for proper inflation. Service as required.',
 ARRAY['12-15-51-610', '12-15-51-780'], ARRAY['713', '734', '744'], NULL, 0.07),
('33-010-00', '33', 'OPC',
 'Operationally check the emergency lights.',
 ARRAY['33-51-00-710'], ARRAY['200'], NULL, 0.01);

INSERT INTO task_intervals (
    mpd_number, interval_type, interval_value, interval_unit
) VALUES
('27-132-00', 'THRESHOLD', 5000, 'FC'),
('27-132-00', 'REPEAT', 5000, 'FC'),
('29-070-00', 'THRESHOLD', 4000, 'FH'),
('29-070-00', 'REPEAT', 4000, 'FH'),
('32-080-00', 'THRESHOLD', 560, 'FC'),
('32-080-00', 'THRESHOLD', 90, 'DY'),
('32-080-00', 'REPEAT', 560, 'FC'),
('32-080-00', 'REPEAT', 90, 'DY'),
('32-350-00', 'THRESHOLD', 48, 'HR'),
('32-350-00', 'REPEAT', 48, 'HR'),
('33-010-00', 'THRESHOLD', 600, 'FH'),
('33-010-00', 'REPEAT', 600, 'FH');

COMMIT;
