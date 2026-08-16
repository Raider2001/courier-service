-- Courier Service schema (PostgreSQL)
-- Runs unchanged on PGlite (local dev) and on hosted PostgreSQL (Render /
-- Railway / DigitalOcean). Safe to run repeatedly.

-- ---------------------------------------------------------------------------
-- Customers: the businesses / people who book deliveries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  contact_name   TEXT,
  email          TEXT,
  phone          TEXT,
  -- Default charge-out rate used to price this customer's jobs by mileage.
  rate_per_mile  NUMERIC(10, 2) NOT NULL DEFAULT 1.20,
  notes          TEXT,
  archived       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Drivers. (Created before users, which may reference a driver.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  vehicle_reg TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Users: login accounts. The owner is 'admin'; customers are linked to a row
-- in customers; drivers are linked to a row in drivers.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'customer'
                   CHECK (role IN ('admin', 'customer', 'driver')),
  customer_id    INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  driver_id      INTEGER REFERENCES drivers(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_customer_id_idx ON users (customer_id);
CREATE INDEX IF NOT EXISTS users_driver_id_idx ON users (driver_id);

-- ---------------------------------------------------------------------------
-- Saved addresses. This is what stops returning customers re-typing details:
-- every address they use is kept and offered back to them next time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  id                 SERIAL PRIMARY KEY,
  customer_id        INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label              TEXT,
  contact_name       TEXT,
  phone              TEXT,
  line1              TEXT NOT NULL,
  line2              TEXT,
  city               TEXT,
  postcode           TEXT,
  is_default_pickup  BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_dropoff BOOLEAN NOT NULL DEFAULT FALSE,
  archived           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS addresses_customer_id_idx ON addresses (customer_id);

-- ---------------------------------------------------------------------------
-- Jobs: one delivery. Pickup/dropoff details are copied onto the job as a
-- snapshot so editing a saved address later never rewrites delivery history.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS job_reference_seq START 1001;

CREATE TABLE IF NOT EXISTS jobs (
  id                 SERIAL PRIMARY KEY,
  reference          TEXT NOT NULL UNIQUE,
  customer_id        INTEGER NOT NULL REFERENCES customers(id),
  driver_id          INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  status             TEXT NOT NULL DEFAULT 'requested'
                       CHECK (status IN ('requested', 'scheduled', 'in_progress',
                                         'delivered', 'cancelled')),

  -- Pickup (snapshot + optional link back to the saved address)
  pickup_address_id  INTEGER REFERENCES addresses(id) ON DELETE SET NULL,
  pickup_name        TEXT,
  pickup_phone       TEXT,
  pickup_line1       TEXT,
  pickup_line2       TEXT,
  pickup_city        TEXT,
  pickup_postcode    TEXT,

  -- Drop-off (snapshot + optional link back to the saved address)
  dropoff_address_id INTEGER REFERENCES addresses(id) ON DELETE SET NULL,
  dropoff_name       TEXT,
  dropoff_phone      TEXT,
  dropoff_line1      TEXT,
  dropoff_line2      TEXT,
  dropoff_city       TEXT,
  dropoff_postcode   TEXT,

  parcel_description TEXT,
  parcel_weight_kg   NUMERIC(10, 2),
  notes              TEXT,

  scheduled_at       TIMESTAMPTZ,
  collected_at       TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,

  -- Mileage. Enter odometer readings and miles is worked out automatically,
  -- or type miles straight in.
  odometer_start     NUMERIC(10, 1),
  odometer_end       NUMERIC(10, 1),
  miles              NUMERIC(10, 1) NOT NULL DEFAULT 0,

  -- Money. fixed_price wins if set, otherwise miles * rate_per_mile.
  rate_per_mile      NUMERIC(10, 2),
  fixed_price        NUMERIC(10, 2),
  price              NUMERIC(10, 2) NOT NULL DEFAULT 0,

  invoiced           BOOLEAN NOT NULL DEFAULT FALSE,
  paid               BOOLEAN NOT NULL DEFAULT FALSE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_customer_id_idx   ON jobs (customer_id);
CREATE INDEX IF NOT EXISTS jobs_driver_id_idx     ON jobs (driver_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx        ON jobs (status);
CREATE INDEX IF NOT EXISTS jobs_scheduled_at_idx  ON jobs (scheduled_at);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx    ON jobs (created_at);
