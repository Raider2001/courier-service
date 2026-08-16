/** Tiny helpers for building UPDATE statements from plain objects. */
import { query } from '../db.js';

/** Drop keys whose value is undefined, so a PATCH only touches what was sent. */
export function clean(object) {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined));
}

/**
 * Build and run an UPDATE from an object of column -> value.
 * Column names come from our own code, never from the request body.
 */
export async function applyUpdate(table, id, updates) {
  const keys = Object.keys(updates);
  if (!keys.length) return;

  const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
  const params = keys.map((key) => updates[key]);
  params.push(id);

  // jobs is the only table that tracks when it last changed.
  const touch = table === 'jobs' ? ', updated_at = NOW()' : '';

  await query(
    `UPDATE ${table} SET ${assignments.join(', ')}${touch} WHERE id = $${params.length}`,
    params
  );
}
