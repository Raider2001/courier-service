import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.join(__dirname, '..');

// Load server/.env, then fall back to the repo-root .env if present.
dotenv.config({ path: path.join(SERVER_ROOT, '.env') });
dotenv.config({ path: path.join(SERVER_ROOT, '..', '.env') });

const DATABASE_URL = (process.env.DATABASE_URL || '').trim();

let runQuery;
let runExec;

/**
 * Which engine we ended up on. Both speak PostgreSQL, so every query in this
 * codebase is identical either way.
 *
 *  - 'postgres' : a real PostgreSQL server (set DATABASE_URL). Use in production.
 *  - 'pglite'   : embedded PostgreSQL stored in server/.data. Zero install,
 *                 used automatically when DATABASE_URL is empty.
 */
export let driver;

if (DATABASE_URL) {
  const { default: pg } = await import('pg');

  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL);
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    // Hosted PostgreSQL (Render, Railway, DigitalOcean, Neon) requires TLS.
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });

  runQuery = (text, params) => pool.query(text, params);
  runExec = (sql) => pool.query(sql);
  driver = 'postgres';
} else {
  const { PGlite } = await import('@electric-sql/pglite');

  const dataDir = path.join(SERVER_ROOT, '.data', 'courier');
  fs.mkdirSync(path.dirname(dataDir), { recursive: true });

  const db = new PGlite(dataDir);
  await db.waitReady;

  runQuery = (text, params = []) => db.query(text, params);
  runExec = (sql) => db.exec(sql);
  driver = 'pglite';
}

/** Run a parameterised query. Returns the full result object. */
export function query(text, params) {
  return runQuery(text, params);
}

/** Run raw SQL that may contain several statements (schema files, etc). */
export function exec(sql) {
  return runExec(sql);
}

/** Run a query and return the first row, or null. */
export async function one(text, params) {
  const result = await query(text, params);
  return result.rows[0] ?? null;
}

/** Run a query and return all rows. */
export async function many(text, params) {
  const result = await query(text, params);
  return result.rows;
}
