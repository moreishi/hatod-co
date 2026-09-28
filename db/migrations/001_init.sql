-- 001_init: Hatod Gensan pilot schema (PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_fare INT NOT NULL CHECK (base_fare >= 0),
  per_km INT NOT NULL CHECK (per_km >= 0),
  per_min NUMERIC NOT NULL CHECK (per_min >= 0),
  minimum INT NOT NULL CHECK (minimum >= 0),
  cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  gcash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('moto','trike','sedan','suv')),
  plate_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','suspended','offline','online')),
  pa_expiry DATE NOT NULL,
  cpc_expiry DATE NOT NULL,
  license_no TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- High-write live positions, separated from driver profiles
CREATE TABLE drivers_live (
  driver_id TEXT PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX drivers_live_geom_idx ON drivers_live USING GIST (geom);

CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id),
  rider_name TEXT NOT NULL,
  driver_id TEXT REFERENCES drivers(id),
  status TEXT NOT NULL DEFAULT 'SEARCHING'
    CHECK (status IN ('SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED')),
  pickup TEXT NOT NULL,
  dropoff TEXT NOT NULL,
  distance_m INT NOT NULL CHECK (distance_m >= 0),
  duration_s INT NOT NULL CHECK (duration_s >= 0),
  fare_quote INT NOT NULL CHECK (fare_quote >= 0),
  payment TEXT NOT NULL CHECK (payment IN ('cash','gcash')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trips_status_idx ON trips (status);

-- Gensan pilot seed
INSERT INTO zones (id, name, base_fare, per_km, per_min, minimum, cash_enabled, gcash_enabled) VALUES
  ('gensan-downtown', 'Downtown Gensan', 40, 12, 2.0, 60, TRUE, TRUE),
  ('gensan-lagao', 'Lagao', 40, 13, 2.0, 60, TRUE, TRUE),
  ('gensan-airport', 'Airport Rd', 60, 14, 2.5, 90, TRUE, FALSE);
