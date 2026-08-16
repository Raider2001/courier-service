/** Small helpers shared by the route modules. */

/** Wraps an async route so thrown errors reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'Not found.') => new HttpError(404, message);
export const forbidden = (message = 'Not allowed.') => new HttpError(403, message);

/** Trimmed string, or null when empty/absent. */
export function str(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/** Required trimmed string. */
export function requiredStr(value, field) {
  const result = str(value);
  if (!result) throw badRequest(`${field} is required.`);
  return result;
}

/** Number, or null when empty/absent. Rejects non-numeric input. */
export function num(value, field = 'value') {
  if (value === undefined || value === null || value === '') return null;
  const result = Number(value);
  if (!Number.isFinite(result)) throw badRequest(`${field} must be a number.`);
  return result;
}

/** ISO timestamp, or null. */
export function timestamp(value, field = 'date') {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest(`${field} is not a valid date.`);
  return date.toISOString();
}

export function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 1;
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
