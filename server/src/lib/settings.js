import { one } from '../db.js';

/** The single business-settings row, with every NUMERIC cast to a real number. */
export function getSettings() {
  return one(
    `SELECT id,
            base_fee::float        AS base_fee,
            fuel_free_miles::float AS fuel_free_miles,
            fuel_per_mile::float   AS fuel_per_mile,
            tax_rate::float        AS tax_rate
       FROM settings
      WHERE id = 1`
  );
}
