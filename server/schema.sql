-- AgentAdvantage — PostgreSQL schema
-- Run once to set up the database, or let the server create it automatically on startup.
--
-- Recommended setup:
--   createdb agentadvantage
--   psql agentadvantage < schema.sql
--
-- Then add to your environment:
--   DATABASE_URL=postgresql://user:password@localhost:5432/agentadvantage

CREATE TABLE IF NOT EXISTS listings (
  id                  TEXT PRIMARY KEY,            -- MLS number or generated ID
  mls_number          TEXT NOT NULL,
  address             TEXT,
  street              TEXT,
  city                TEXT,
  state               TEXT,
  zip_code            TEXT,
  neighborhood        TEXT,
  subdivision         TEXT,
  school_district     TEXT,
  status              TEXT,                        -- Sold, Active, Pending, etc.
  list_price          NUMERIC,
  sold_price          NUMERIC,
  seller_concessions  NUMERIC,
  true_sold_price     NUMERIC,                     -- sold_price - seller_concessions
  price_per_sqft      NUMERIC,
  original_list_price NUMERIC,
  price_changes       INTEGER,
  sqft                INTEGER,
  lot_size            NUMERIC,                     -- acres
  bedrooms            INTEGER,
  bathrooms           NUMERIC,
  stories             INTEGER,
  year_built          INTEGER,
  new_construction    BOOLEAN DEFAULT FALSE,
  garage_spaces       INTEGER,
  days_on_market      INTEGER,
  list_date           DATE,
  sold_date           DATE,
  expiration_date     DATE,
  lat                 NUMERIC,
  lng                 NUMERIC,
  images              TEXT[],
  description         TEXT,
  -- All boolean amenity flags stored together for easy extensibility
  amenities           JSONB NOT NULL DEFAULT '{}',
  -- Tracks when this row was last synced from RETS/RESO
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the most common filter queries
CREATE INDEX IF NOT EXISTS listings_status          ON listings(status);
CREATE INDEX IF NOT EXISTS listings_zip_code        ON listings(zip_code);
CREATE INDEX IF NOT EXISTS listings_school_district ON listings(school_district);
CREATE INDEX IF NOT EXISTS listings_subdivision     ON listings(subdivision);
CREATE INDEX IF NOT EXISTS listings_sold_date       ON listings(sold_date);
CREATE INDEX IF NOT EXISTS listings_list_date       ON listings(list_date);
CREATE INDEX IF NOT EXISTS listings_mls_number      ON listings(mls_number);
CREATE INDEX IF NOT EXISTS listings_price           ON listings(list_price, true_sold_price);
CREATE INDEX IF NOT EXISTS listings_sqft            ON listings(sqft);
CREATE INDEX IF NOT EXISTS listings_geo             ON listings(lat, lng);

-- Useful view: only sold comps with complete data
CREATE OR REPLACE VIEW sold_comps AS
  SELECT *
  FROM listings
  WHERE status = 'Sold'
    AND true_sold_price > 0
    AND sqft > 0
    AND sold_date IS NOT NULL;

-- -------------------------------------------------------------------------
-- RESO/RETS sync notes
-- -------------------------------------------------------------------------
-- Your sync job should:
--   1. Pull listings updated since (NOW() - INTERVAL '12 hours') from your feed
--   2. Call POST /api/properties/import with the CSV, OR
--      call upsertProperties() directly from a Node.js script
--
-- The upsert uses mls_number as the natural key but id as the PK.
-- If your feed uses ListingKey as the stable ID, map it to `id`.
--
-- Example cron (runs every 12 hours):
--   0 */12 * * * node /path/to/sync-script.js >> /var/log/aa-sync.log 2>&1
