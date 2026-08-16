-- Courier Service schema (PostgreSQL)
-- Runs unchanged on PGlite (local dev) and on hosted PostgreSQL (Render /
-- Railway / DigitalOcean). Safe to run repeatedly.

-- ---------------------------------------------------------------------------
-- Business-wide pricing settings (single row). The owner tunes these in the
-- app; every new price calculation reads them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  -- Flat callout fee added to every per-mile job.
  base_fee         NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  -- Fuel is free inside this radius...
  fuel_free_miles  NUMERIC(10, 1) NOT NULL DEFAULT 25,
  -- ...then this much per mile beyond it. Lower it where fuel is cheap.
  fuel_per_mile    NUMERIC(10, 2) NOT NULL DEFAULT 0.30,
  -- Sales tax percent on the total. Keep 0 until an accountant says otherwise.
  tax_rate         NUMERIC(5, 2)  NOT NULL DEFAULT 0
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

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

  -- Money. fixed_price wins if set, otherwise base fee + miles * rate + fuel.
  -- The breakdown is snapshotted per job so later settings changes never
  -- rewrite an old invoice.
  rate_per_mile      NUMERIC(10, 2),
  fixed_price        NUMERIC(10, 2),
  base_fee           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fuel_surcharge     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax_amount         NUMERIC(10, 2) NOT NULL DEFAULT 0,
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

-- ---------------------------------------------------------------------------
-- Reviews. Anyone may submit; nothing shows publicly until the owner
-- approves it - a trust business cannot afford spam or sabotage.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  business    TEXT,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL,
  -- Set when the reviewer was signed in - lets us badge "verified customer".
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_approved_idx ON reviews (approved, created_at);
