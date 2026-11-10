BEGIN;
CREATE TABLE IF NOT EXISTS maintenance_execution_requests (
    request_id UUID PRIMARY KEY,
    maintenance_id VARCHAR(8) NOT NULL UNIQUE REFERENCES maintenance_records(maintenance_id) ON DELETE CASCADE
);
COMMIT;
