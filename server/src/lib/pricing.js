/**
 * Mileage and pricing rules, kept in one place so the admin screens, the
 * customer booking form, the driver flow and any future automation all agree.
 *
 * A job is priced:
 *   base fee  +  miles x rate  +  fuel surcharge  =  subtotal
 *   subtotal  +  tax           =  price
 *
 * Fuel is the owner's honesty rule: free inside `fuel_free_miles`, then
 * `fuel_per_mile` for every mile beyond that - so a cross-town run never
 * pays fuel, and a long haul pays only for the long part.
 *
 * A fixed price replaces base + mileage + fuel entirely (tax still applies).
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
 * The full price breakdown for a job, using the business settings.
 * The returned values are snapshotted onto the job row, so changing the
 * settings later never rewrites an old invoice.
 */
export function priceBreakdown(job, customerRate, settings = {}) {
  const miles = calculateMiles(job);

  const baseFeeSetting = toNumber(settings.base_fee) ?? 0;
  const fuelFreeMiles = toNumber(settings.fuel_free_miles) ?? 25;
  const fuelPerMile = toNumber(settings.fuel_per_mile) ?? 0;
  const taxRate = toNumber(settings.tax_rate) ?? 0;

  const fixed = toNumber(job.fixed_price);

  let base_fee = 0;
  let fuel_surcharge = 0;
  let subtotal;

  if (fixed !== null) {
    // A fixed price is exactly that - no base fee or fuel on top.
    subtotal = round(fixed, 2);
  } else {
    base_fee = round(baseFeeSetting, 2);
    const rate = toNumber(job.rate_per_mile) ?? toNumber(customerRate) ?? 0;
    const mileageCharge = round(miles * rate, 2);
    const fuelMiles = Math.max(0, miles - fuelFreeMiles);
    fuel_surcharge = round(fuelMiles * fuelPerMile, 2);
    subtotal = round(base_fee + mileageCharge + fuel_surcharge, 2);
  }

  const tax_amount = round((subtotal * taxRate) / 100, 2);
  const price = round(subtotal + tax_amount, 2);

  return { miles, base_fee, fuel_surcharge, tax_amount, price };
}

/**
 * Recalculate the derived fields for a job row.
 * Call this on every create and update so the numbers can never drift.
 */
export function applyDerivedFields(job, customerRate, settings) {
  return { ...job, ...priceBreakdown(job, customerRate, settings) };
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
