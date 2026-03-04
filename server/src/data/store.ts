/**
 * Unified data store.
 *
 * Priority order:
 *   1. PostgreSQL  — when DATABASE_URL is set and reachable
 *   2. CSV import  — properties loaded via the /import endpoint
 *   3. Sample data — built-in generated data (development fallback)
 *
 * Switching to PostgreSQL requires zero code changes — just set DATABASE_URL.
 */

import { Property } from '../types';
import { getSampleData } from './sampleData';
import { isConnected, queryAllProperties, upsertProperties, initDb } from './db';

// In-memory store for CSV-imported data (lives for the lifetime of the process)
let _csvData: Property[] | null = null;

// Track whether we've already tried to init the DB
let _dbInitialised = false;
let _dbAvailable = false;

async function ensureDb(): Promise<boolean> {
  if (_dbInitialised) return _dbAvailable;
  if (!process.env.DATABASE_URL) {
    _dbInitialised = true;
    _dbAvailable = false;
    return false;
  }
  try {
    await initDb();
    _dbAvailable = await isConnected();
    if (_dbAvailable) console.log('[store] Using PostgreSQL data source');
  } catch (e) {
    console.warn('[store] PostgreSQL unavailable, falling back to in-memory:', (e as Error).message);
    _dbAvailable = false;
  }
  _dbInitialised = true;
  return _dbAvailable;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getProperties(): Promise<Property[]> {
  const dbReady = await ensureDb();
  if (dbReady) return queryAllProperties();
  if (_csvData) return _csvData;
  return getSampleData();
}

/** Called by the CSV import endpoint. Persists to DB if available, else memory. */
export async function importProperties(properties: Property[]): Promise<{ count: number; source: string }> {
  const dbReady = await ensureDb();
  if (dbReady) {
    const { inserted, updated } = await upsertProperties(properties);
    return { count: inserted + updated, source: 'postgresql' };
  }
  // Merge with existing CSV data, replacing by mlsNumber
  const existing = _csvData ?? [];
  const mlsMap = new Map(existing.map(p => [p.mlsNumber, p]));
  for (const p of properties) mlsMap.set(p.mlsNumber, p);
  _csvData = [...mlsMap.values()];
  return { count: properties.length, source: 'memory' };
}

export function getDataSourceInfo(): { source: 'postgresql' | 'csv' | 'sample'; count?: number } {
  if (_dbAvailable) return { source: 'postgresql' };
  if (_csvData) return { source: 'csv', count: _csvData.length };
  return { source: 'sample', count: getSampleData().length };
}
