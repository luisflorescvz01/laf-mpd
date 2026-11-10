-- Durable idempotency for planned flight creation. Safe to apply again.
BEGIN;
CREATE TABLE IF NOT EXISTS flight_creation_requests (
    request_id UUID PRIMARY KEY,
    payload_hash TEXT NOT NULL,
    flight_id VARCHAR(8) NOT NULL UNIQUE REFERENCES flight_records(flight_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
