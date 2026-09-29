-- 022_trip_indexes: dispatch board + history hot paths
CREATE INDEX IF NOT EXISTS trips_driver_idx ON trips (driver_id);
CREATE INDEX IF NOT EXISTS trips_rider_idx ON trips (rider_id);
CREATE INDEX IF NOT EXISTS trips_zone_idx ON trips (zone_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON trips (status);
