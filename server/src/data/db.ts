/**
 * PostgreSQL data layer.
 *
 * Activate by setting DATABASE_URL in your environment:
 *   DATABASE_URL=postgresql://user:pass@host:5432/dbname
 *
 * The table is created automatically on first connection.
 * Your RESO/RETS sync job should call upsertProperties() every 12 hours.
 */

import { Pool, PoolConfig } from 'pg';
import { Property, Amenities } from '../types';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false'
        ? false
        : process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
    pool = new Pool(config);
    pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Schema bootstrap — runs once on startup
// ---------------------------------------------------------------------------
export async function initDb(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id                  TEXT PRIMARY KEY,
        mls_number          TEXT NOT NULL,
        address             TEXT,
        street              TEXT,
        city                TEXT,
        state               TEXT,
        zip_code            TEXT,
        neighborhood        TEXT,
        subdivision         TEXT,
        school_district     TEXT,
        status              TEXT,
        list_price          NUMERIC,
        sold_price          NUMERIC,
        seller_concessions  NUMERIC,
        true_sold_price     NUMERIC,
        price_per_sqft      NUMERIC,
        original_list_price NUMERIC,
        price_changes       INTEGER,
        sqft                INTEGER,
        lot_size            NUMERIC,
        bedrooms            INTEGER,
        bathrooms           NUMERIC,
        stories             INTEGER,
        year_built          INTEGER,
        new_construction    BOOLEAN,
        garage_spaces       INTEGER,
        days_on_market      INTEGER,
        list_date           DATE,
        sold_date           DATE,
        expiration_date     DATE,
        lat                 NUMERIC,
        lng                 NUMERIC,
        images              TEXT[],
        description         TEXT,
        amenities           JSONB NOT NULL DEFAULT '{}',
        synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS listings_status     ON listings(status);
      CREATE INDEX IF NOT EXISTS listings_zip_code   ON listings(zip_code);
      CREATE INDEX IF NOT EXISTS listings_sold_date  ON listings(sold_date);
      CREATE INDEX IF NOT EXISTS listings_list_date  ON listings(list_date);
      CREATE INDEX IF NOT EXISTS listings_mls_number ON listings(mls_number);
    `);
    console.log('[db] Schema ready');
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export async function queryAllProperties(): Promise<Property[]> {
  const { rows } = await getPool().query(`
    SELECT * FROM listings ORDER BY list_date DESC NULLS LAST
  `);
  return rows.map(rowToProperty);
}

export async function queryPropertyById(id: string): Promise<Property | null> {
  const { rows } = await getPool().query('SELECT * FROM listings WHERE id = $1', [id]);
  return rows.length ? rowToProperty(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Write — used by the RESO/RETS sync job and CSV import
// ---------------------------------------------------------------------------
export async function upsertProperties(properties: Property[]): Promise<{ inserted: number; updated: number }> {
  if (properties.length === 0) return { inserted: 0, updated: 0 };

  const client = await getPool().connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const p of properties) {
      const result = await client.query(
        `INSERT INTO listings (
          id, mls_number, address, street, city, state, zip_code,
          neighborhood, subdivision, school_district, status,
          list_price, sold_price, seller_concessions, true_sold_price,
          price_per_sqft, original_list_price, price_changes,
          sqft, lot_size, bedrooms, bathrooms, stories,
          year_built, new_construction, garage_spaces, days_on_market,
          list_date, sold_date, expiration_date, lat, lng,
          images, description, amenities, synced_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
          $29,$30,$31,$32,$33,$34,$35,NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          mls_number          = EXCLUDED.mls_number,
          address             = EXCLUDED.address,
          street              = EXCLUDED.street,
          city                = EXCLUDED.city,
          state               = EXCLUDED.state,
          zip_code            = EXCLUDED.zip_code,
          neighborhood        = EXCLUDED.neighborhood,
          subdivision         = EXCLUDED.subdivision,
          school_district     = EXCLUDED.school_district,
          status              = EXCLUDED.status,
          list_price          = EXCLUDED.list_price,
          sold_price          = EXCLUDED.sold_price,
          seller_concessions  = EXCLUDED.seller_concessions,
          true_sold_price     = EXCLUDED.true_sold_price,
          price_per_sqft      = EXCLUDED.price_per_sqft,
          original_list_price = EXCLUDED.original_list_price,
          price_changes       = EXCLUDED.price_changes,
          sqft                = EXCLUDED.sqft,
          lot_size            = EXCLUDED.lot_size,
          bedrooms            = EXCLUDED.bedrooms,
          bathrooms           = EXCLUDED.bathrooms,
          stories             = EXCLUDED.stories,
          year_built          = EXCLUDED.year_built,
          new_construction    = EXCLUDED.new_construction,
          garage_spaces       = EXCLUDED.garage_spaces,
          days_on_market      = EXCLUDED.days_on_market,
          list_date           = EXCLUDED.list_date,
          sold_date           = EXCLUDED.sold_date,
          expiration_date     = EXCLUDED.expiration_date,
          lat                 = EXCLUDED.lat,
          lng                 = EXCLUDED.lng,
          images              = EXCLUDED.images,
          description         = EXCLUDED.description,
          amenities           = EXCLUDED.amenities,
          synced_at           = NOW()
        RETURNING (xmax = 0) AS is_insert`,
        [
          p.id, p.mlsNumber, p.address, p.street, p.city, p.state, p.zipCode,
          p.neighborhood, p.subdivision, p.schoolDistrict, p.status,
          p.listPrice, p.soldPrice, p.sellerConcessions, p.trueSoldPrice,
          p.pricePerSqft, p.originalListPrice, p.priceChanges,
          p.sqft, p.lotSize, p.bedrooms, p.bathrooms, p.stories,
          p.yearBuilt, p.newConstruction, p.garageSpaces, p.daysOnMarket,
          p.listDate || null, p.soldDate, p.expirationDate,
          p.lat, p.lng,
          p.images, p.description,
          JSON.stringify(p.amenities),
        ]
      );
      if (result.rows[0]?.is_insert) inserted++; else updated++;
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { inserted, updated };
}

export async function isConnected(): Promise<boolean> {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Row → Property
// ---------------------------------------------------------------------------
function rowToProperty(row: Record<string, unknown>): Property {
  const amenities = (row.amenities ?? {}) as Amenities;
  return {
    id:                String(row.id),
    mlsNumber:         String(row.mls_number ?? ''),
    address:           String(row.address ?? ''),
    street:            String(row.street ?? ''),
    city:              String(row.city ?? ''),
    state:             String(row.state ?? ''),
    zipCode:           String(row.zip_code ?? ''),
    neighborhood:      String(row.neighborhood ?? ''),
    subdivision:       String(row.subdivision ?? ''),
    schoolDistrict:    String(row.school_district ?? ''),
    status:            String(row.status ?? 'Active') as Property['status'],
    listPrice:         Number(row.list_price ?? 0),
    soldPrice:         Number(row.sold_price ?? 0),
    sellerConcessions: Number(row.seller_concessions ?? 0),
    trueSoldPrice:     Number(row.true_sold_price ?? 0),
    pricePerSqft:      Number(row.price_per_sqft ?? 0),
    originalListPrice: Number(row.original_list_price ?? 0),
    priceChanges:      Number(row.price_changes ?? 0),
    sqft:              Number(row.sqft ?? 0),
    lotSize:           Number(row.lot_size ?? 0),
    bedrooms:          Number(row.bedrooms ?? 0),
    bathrooms:         Number(row.bathrooms ?? 0),
    stories:           Number(row.stories ?? 1),
    yearBuilt:         Number(row.year_built ?? 0),
    newConstruction:   Boolean(row.new_construction),
    garageSpaces:      Number(row.garage_spaces ?? 0),
    daysOnMarket:      Number(row.days_on_market ?? 0),
    listDate:          row.list_date ? String(row.list_date).split('T')[0] : '',
    soldDate:          row.sold_date ? String(row.sold_date).split('T')[0] : null,
    expirationDate:    row.expiration_date ? String(row.expiration_date).split('T')[0] : null,
    lat:               Number(row.lat ?? 0),
    lng:               Number(row.lng ?? 0),
    images:            Array.isArray(row.images) ? row.images : [],
    description:       String(row.description ?? ''),
    amenities: {
      pool:           Boolean(amenities.pool),
      adu:            Boolean(amenities.adu),
      shop:           Boolean(amenities.shop),
      pond:           Boolean(amenities.pond),
      fireplace:      Boolean(amenities.fireplace),
      hotTub:         Boolean(amenities.hotTub),
      solarPanels:    Boolean(amenities.solarPanels),
      coveredPatio:   Boolean(amenities.coveredPatio),
      outdoorKitchen: Boolean(amenities.outdoorKitchen),
      guestHouse:     Boolean(amenities.guestHouse),
      barnOrStable:   Boolean(amenities.barnOrStable),
      waterFeature:   Boolean(amenities.waterFeature),
      greenbeltView:  Boolean(amenities.greenbeltView),
      waterView:      Boolean(amenities.waterView),
    },
  };
}
