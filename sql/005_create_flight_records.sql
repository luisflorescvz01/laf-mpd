BEGIN;

CREATE TABLE flight_records (
    flight_id VARCHAR(8) PRIMARY KEY CHECK (flight_id ~ '^LAF[0-9]{5}$'),
    route_id VARCHAR(8) NOT NULL REFERENCES flight_routes(route_id),
    aircraft_id VARCHAR(11) NOT NULL REFERENCES aircrafts(aircraft_id),
    planned_departure_at TIMESTAMPTZ NOT NULL,
    planned_arrival_at TIMESTAMPTZ NOT NULL,
    actual_departure_at TIMESTAMPTZ,
    actual_arrival_at TIMESTAMPTZ,
    flight_time_minutes NUMERIC(10,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (actual_arrival_at - actual_departure_at)) / 60
    ) STORED,
    flight_distance_nm NUMERIC(8,2) CHECK (flight_distance_nm >= 0),
    fuel_at_departure_kg NUMERIC(10,2) CHECK (fuel_at_departure_kg >= 0),
    fuel_at_arrival_kg NUMERIC(10,2) CHECK (fuel_at_arrival_kg >= 0),
    passengers SMALLINT CHECK (passengers >= 0),
    payload_kg NUMERIC(10,2) CHECK (payload_kg >= 0),
    status TEXT NOT NULL DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CHECK (planned_arrival_at > planned_departure_at),
    CHECK (actual_arrival_at IS NULL OR
           (actual_departure_at IS NOT NULL AND actual_arrival_at > actual_departure_at)),
    CHECK (
        (status IN ('PLANNED', 'CANCELLED') AND actual_departure_at IS NULL AND actual_arrival_at IS NULL)
        OR (status = 'IN_PROGRESS' AND actual_departure_at IS NOT NULL AND actual_arrival_at IS NULL)
        OR (status = 'COMPLETED' AND actual_departure_at IS NOT NULL AND actual_arrival_at IS NOT NULL)
    )
);

COMMIT;
