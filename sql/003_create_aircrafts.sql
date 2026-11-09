-- Fictional fleet specifications supplied by the user for this demonstration.
-- Run once; creation and insertion are atomic.
BEGIN;

CREATE TABLE aircrafts (
    aircraft_id VARCHAR(11) PRIMARY KEY
        CHECK (aircraft_id ~ '^LAF-737-[0-9]{3}$'),
    manufacturer TEXT NOT NULL,
    model TEXT NOT NULL,
    year_manufactured SMALLINT CHECK (year_manufactured > 0),
    engine_type TEXT,
    passenger_capacity SMALLINT CHECK (passenger_capacity >= 0),
    basic_empty_weight_kg NUMERIC(10, 2) CHECK (basic_empty_weight_kg > 0),
    operational_empty_weight_kg NUMERIC(10, 2) CHECK (operational_empty_weight_kg > 0),
    max_payload_kg NUMERIC(10, 2) CHECK (max_payload_kg >= 0),
    max_takeoff_weight_kg NUMERIC(10, 2) CHECK (max_takeoff_weight_kg > 0),
    cruise_speed_kmph NUMERIC(7, 2) CHECK (cruise_speed_kmph > 0),
    range_nm NUMERIC(8, 2) CHECK (range_nm > 0),
    ceiling_limit_ft INTEGER CHECK (ceiling_limit_ft > 0)
);

INSERT INTO aircrafts (
    aircraft_id, manufacturer, model, year_manufactured, engine_type,
    passenger_capacity, basic_empty_weight_kg, operational_empty_weight_kg,
    max_payload_kg, max_takeoff_weight_kg, cruise_speed_kmph, range_nm,
    ceiling_limit_ft
) VALUES
('LAF-737-001', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-002', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-003', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-004', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-005', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-006', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-007', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000),
('LAF-737-008', 'Boeing', '737-8', 1998, 'LEAP-1B', 189, 41140, 41413, 20540, 79000, 845, 2935, 41000);

COMMIT;
