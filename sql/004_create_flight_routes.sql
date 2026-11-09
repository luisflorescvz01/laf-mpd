-- Approximate great-circle distances in nautical miles, approved for the demo.
-- Sources: https://www.greatcirclemapper.net/airport/MTY-MMMY-general-mariano-escobedo-international-airport
-- https://www.greatcirclemapper.net/route/MTY-GDL
-- https://www.greatcirclemapper.net/route/MTY-CUN
-- a = outbound from MTY; b = return to MTY. Not actual flown distances.
-- Run once. Creation and insertion are atomic; existing tables are not replaced.
BEGIN;

CREATE TABLE flight_routes (
    route_id VARCHAR(8) PRIMARY KEY
        CHECK (route_id ~ '^LAFr[0-9]{2}[ab]$'),
    departure VARCHAR(3) NOT NULL
        CHECK (departure ~ '^[A-Z]{3}$'),
    arrival VARCHAR(3) NOT NULL
        CHECK (arrival ~ '^[A-Z]{3}$'),
    distance_nm NUMERIC(8, 2)
        CHECK (distance_nm > 0),
    UNIQUE (departure, arrival),
    CHECK (departure <> arrival)
);

INSERT INTO flight_routes (route_id, departure, arrival, distance_nm) VALUES
('LAFr01a', 'MTY', 'MEX', 384),
('LAFr01b', 'MEX', 'MTY', 384),
('LAFr02a', 'MTY', 'GDL', 361),
('LAFr02b', 'GDL', 'MTY', 361),
('LAFr03a', 'MTY', 'CUN', 783),
('LAFr03b', 'CUN', 'MTY', 783);

COMMIT;
