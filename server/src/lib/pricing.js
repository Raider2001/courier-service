/**
 * Mileage and pricing rules, kept in one place so the admin screens, the
 * customer booking form and any future automation all agree.
 */

/**
 * Work out the mileage for a job.
 * Odometer readings win when both are present - that is the figure that
 * survives an audit. Otherwise fall back to whatever was typed in.
 */
export function calculateMiles({ odometer_start, odometer_end, miles }) {
  const start = toNumber(odometer_start);
  const end = toNumber(odometer_end);

  if (start !== null && end !== null && end >= start) {
    return round(end - start, 1);
  }
  return round(toNumber(miles) ?? 0, 1);
}

/**
 * Work out what to charge.
 * A fixed price always wins; otherwise it is mileage x the rate on the job,
 * falling back to the customer's default rate.
 */
export function calculatePrice({ fixed_price, miles, rate_per_mile }, customerRate) {
  const fixed = toNumber(fixed_price);
  if (fixed !== null) return round(fixed, 2);

  const rate = toNumber(rate_per_mile) ?? toNumber(customerRate) ?? 0;
  const distance = toNumber(miles) ?? 0;
  return round(distance * rate, 2);
}

/**
 * Recalculate the derived fields (miles, price) for a job row.
 * Call this on every create and update so the numbers can never drift.
 */
export function applyDerivedFields(job, customerRate) {
  const miles = calculateMiles(job);
  const price = calculatePrice({ ...job, miles }, customerRate);
  return { ...job, miles, price };
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
