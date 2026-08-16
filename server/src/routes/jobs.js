import { Router } from 'express';
import { query, one, many } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import {
  asyncHandler,
  badRequest,
  notFound,
  forbidden,
  str,
  requiredStr,
  num,
  timestamp,
  bool,
} from '../lib/http.js';
import { applyDerivedFields } from '../lib/pricing.js';
import { applyUpdate, clean } from '../lib/sql.js';

const router = Router();

const STATUSES = ['requested', 'scheduled', 'in_progress', 'delivered', 'cancelled'];

// Postgres hands NUMERIC back as a string, so every numeric column is cast
// after `j.*` — the later alias wins, and the client gets real numbers.
const JOB_SELECT = `
  SELECT j.*,
         j.miles::float            AS miles,
         j.price::float            AS price,
         j.rate_per_mile::float    AS rate_per_mile,
         j.fixed_price::float      AS fixed_price,
         j.parcel_weight_kg::float AS parcel_weight_kg,
         j.odometer_start::float   AS odometer_start,
         j.odometer_end::float     AS odometer_end,
         c.name                    AS customer_name,
         c.rate_per_mile::float    AS customer_rate_per_mile,
         d.name                    AS driver_name
    FROM jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN drivers d ON d.id = j.driver_id
`;

/**
 * Work out which customer a request may act on.
 * Customers are pinned to their own record; admins pick one explicitly.
 */
function resolveCustomerId(req, body = {}) {
  if (req.user.role === 'admin') {
    const id = num(body.customer_id ?? req.query.customerId, 'customer_id');
    if (!id) throw badRequest('customer_id is required.');
    return id;
  }
  if (!req.user.customer_id) {
    throw forbidden('This account is not linked to a customer record.');
  }
  return req.user.customer_id;
}

/**
 * Turn a pickup/dropoff section of the request into a snapshot for the job.
 *
 * Either:
 *   - `<side>_address_id` points at one of the customer's saved addresses, or
 *   - `<side>` carries a fresh address, which we save back to the address book
 *     (unless save === false) so it is offered next time.
 *
 * This is what stops a returning customer re-typing anything.
 */
async function resolveEndpoint(customerId, side, body) {
  const savedId = num(body[`${side}_address_id`], `${side}_address_id`);

  if (savedId) {
    const address = await one(
      `SELECT * FROM addresses WHERE id = $1 AND customer_id = $2 AND archived = FALSE`,
      [savedId, customerId]
    );
    if (!address) throw badRequest(`That saved ${side} address could not be found.`);
    return { addressId: address.id, snapshot: address };
  }

  const input = body[side];
  if (!input || typeof input !== 'object') {
    throw badRequest(`A ${side} address is required.`);
  }

  const snapshot = {
    contact_name: str(input.contact_name),
    phone: str(input.phone),
    line1: requiredStr(input.line1, `${side} address line 1`),
    line2: str(input.line2),
    city: str(input.city),
    postcode: str(input.postcode),
  };

  // Save it for next time unless explicitly told not to.
  if (bool(input.save, true)) {
    const saved = await one(
      `INSERT INTO addresses
         (customer_id, label, contact_name, phone, line1, line2, city, postcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        customerId,
        str(input.label) || snapshot.line1,
        snapshot.contact_name,
        snapshot.phone,
        snapshot.line1,
        snapshot.line2,
        snapshot.city,
        snapshot.postcode,
      ]
    );
    return { addressId: saved.id, snapshot };
  }

  return { addressId: null, snapshot };
}

/**
 * GET /api/jobs
 * Admins see everything and can filter; customers only ever see their own.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const where = [];
    const params = [];

    if (req.user.role === 'customer') {
      params.push(req.user.customer_id);
      where.push(`j.customer_id = $${params.length}`);
    } else if (req.user.role === 'driver') {
      params.push(req.user.driver_id);
      where.push(`j.driver_id = $${params.length}`);
    } else if (req.query.customerId) {
      params.push(Number(req.query.customerId));
      where.push(`j.customer_id = $${params.length}`);
    }

    if (req.query.status) {
      const statuses = String(req.query.status).split(',').filter((s) => STATUSES.includes(s));
      if (statuses.length) {
        params.push(statuses);
        where.push(`j.status = ANY($${params.length})`);
      }
    }

    if (req.query.from) {
      params.push(timestamp(req.query.from, 'from'));
      where.push(`COALESCE(j.scheduled_at, j.created_at) >= $${params.length}`);
    }

    if (req.query.to) {
      params.push(timestamp(req.query.to, 'to'));
      where.push(`COALESCE(j.scheduled_at, j.created_at) <= $${params.length}`);
    }

    if (req.query.q) {
      params.push(`%${String(req.query.q).trim()}%`);
      const p = `$${params.length}`;
      where.push(`(
        j.reference ILIKE ${p} OR c.name ILIKE ${p} OR
        j.parcel_description ILIKE ${p} OR
        j.pickup_postcode ILIKE ${p} OR j.dropoff_postcode ILIKE ${p} OR
        j.pickup_city ILIKE ${p} OR j.dropoff_city ILIKE ${p}
      )`);
    }

    if (req.query.unpaid === 'true') where.push('j.paid = FALSE');
    if (req.query.uninvoiced === 'true') where.push('j.invoiced = FALSE');

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    params.push(limit);

    const jobs = await many(
      `${JOB_SELECT}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(j.scheduled_at, j.created_at) DESC, j.id DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ jobs });
  })
);

/** GET /api/jobs/:id */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await one(`${JOB_SELECT} WHERE j.id = $1`, [Number(req.params.id)]);
    if (!job) throw notFound('Job not found.');

    if (req.user.role === 'customer' && job.customer_id !== req.user.customer_id) {
      throw forbidden();
    }
    if (req.user.role === 'driver' && job.driver_id !== req.user.driver_id) {
      throw forbidden();
    }
    res.json({ job });
  })
);

/**
 * POST /api/jobs
 * The booking form. Customers book for themselves; admins book on behalf of a
 * customer by passing customer_id.
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const customerId = resolveCustomerId(req, req.body);

    const customer = await one('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (!customer) throw badRequest('Customer not found.');

    const pickup = await resolveEndpoint(customerId, 'pickup', req.body);
    const dropoff = await resolveEndpoint(customerId, 'dropoff', req.body);

    // Customers always create a request; admins may set the status directly.
    let status = 'requested';
    if (req.user.role === 'admin' && req.body.status) {
      if (!STATUSES.includes(req.body.status)) throw badRequest('Unknown status.');
      status = req.body.status;
    }

    const derived = applyDerivedFields(
      {
        odometer_start: num(req.body.odometer_start, 'odometer_start'),
        odometer_end: num(req.body.odometer_end, 'odometer_end'),
        miles: num(req.body.miles, 'miles'),
        fixed_price: req.user.role === 'admin' ? num(req.body.fixed_price, 'fixed_price') : null,
        rate_per_mile: customer.rate_per_mile,
      },
      customer.rate_per_mile
    );

    const { rows } = await query("SELECT nextval('job_reference_seq') AS seq");
    const reference = `JOB-${rows[0].seq}`;

    const job = await one(
      `INSERT INTO jobs (
         reference, customer_id, driver_id, created_by_user_id, status,
         pickup_address_id, pickup_name, pickup_phone, pickup_line1, pickup_line2, pickup_city, pickup_postcode,
         dropoff_address_id, dropoff_name, dropoff_phone, dropoff_line1, dropoff_line2, dropoff_city, dropoff_postcode,
         parcel_description, parcel_weight_kg, notes, scheduled_at,
         odometer_start, odometer_end, miles, rate_per_mile, fixed_price, price
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, $19,
         $20, $21, $22, $23,
         $24, $25, $26, $27, $28, $29
       )
       RETURNING id`,
      [
        reference,
        customerId,
        req.user.role === 'admin' ? num(req.body.driver_id, 'driver_id') : null,
        req.user.id,
        status,
        pickup.addressId, pickup.snapshot.contact_name, pickup.snapshot.phone,
        pickup.snapshot.line1, pickup.snapshot.line2, pickup.snapshot.city, pickup.snapshot.postcode,
        dropoff.addressId, dropoff.snapshot.contact_name, dropoff.snapshot.phone,
        dropoff.snapshot.line1, dropoff.snapshot.line2, dropoff.snapshot.city, dropoff.snapshot.postcode,
        str(req.body.parcel_description),
        num(req.body.parcel_weight_kg, 'parcel_weight_kg'),
        str(req.body.notes),
        timestamp(req.body.scheduled_at, 'scheduled_at'),
        derived.odometer_start, derived.odometer_end, derived.miles,
        customer.rate_per_mile, derived.fixed_price, derived.price,
      ]
    );

    const created = await one(`${JOB_SELECT} WHERE j.id = $1`, [job.id]);
    res.status(201).json({ job: created });
  })
);

/**
 * PATCH /api/jobs/:id
 * Admin may edit anything. A customer may only cancel a job that has not been
 * picked up yet, or adjust its notes.
 */
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await one('SELECT * FROM jobs WHERE id = $1', [id]);
    if (!existing) throw notFound('Job not found.');

    if (req.user.role === 'customer') {
      if (existing.customer_id !== req.user.customer_id) throw forbidden();
      return res.json({ job: await customerPatch(existing, req.body) });
    }

    if (req.user.role === 'driver') {
      if (existing.driver_id !== req.user.driver_id) throw forbidden();
      return res.json({ job: await driverPatch(existing, req.body) });
    }

    const customer = await one('SELECT * FROM customers WHERE id = $1', [existing.customer_id]);

    const fields = {
      status: pickStatus(req.body.status),
      driver_id: 'driver_id' in req.body ? num(req.body.driver_id, 'driver_id') : undefined,
      scheduled_at: 'scheduled_at' in req.body ? timestamp(req.body.scheduled_at, 'scheduled_at') : undefined,
      collected_at: 'collected_at' in req.body ? timestamp(req.body.collected_at, 'collected_at') : undefined,
      delivered_at: 'delivered_at' in req.body ? timestamp(req.body.delivered_at, 'delivered_at') : undefined,
      parcel_description: 'parcel_description' in req.body ? str(req.body.parcel_description) : undefined,
      parcel_weight_kg: 'parcel_weight_kg' in req.body ? num(req.body.parcel_weight_kg, 'parcel_weight_kg') : undefined,
      notes: 'notes' in req.body ? str(req.body.notes) : undefined,
      odometer_start: 'odometer_start' in req.body ? num(req.body.odometer_start, 'odometer_start') : undefined,
      odometer_end: 'odometer_end' in req.body ? num(req.body.odometer_end, 'odometer_end') : undefined,
      miles: 'miles' in req.body ? num(req.body.miles, 'miles') : undefined,
      rate_per_mile: 'rate_per_mile' in req.body ? num(req.body.rate_per_mile, 'rate_per_mile') : undefined,
      fixed_price: 'fixed_price' in req.body ? num(req.body.fixed_price, 'fixed_price') : undefined,
      invoiced: 'invoiced' in req.body ? bool(req.body.invoiced) : undefined,
      paid: 'paid' in req.body ? bool(req.body.paid) : undefined,
    };

    // Timestamps that should look after themselves.
    const merged = { ...existing, ...clean(fields) };
    if (merged.status === 'in_progress' && !merged.collected_at) {
      merged.collected_at = new Date().toISOString();
    }
    if (merged.status === 'delivered' && !merged.delivered_at) {
      merged.delivered_at = new Date().toISOString();
    }

    const derived = applyDerivedFields(merged, customer.rate_per_mile);

    const updates = clean({
      ...fields,
      collected_at: merged.collected_at,
      delivered_at: merged.delivered_at,
      miles: derived.miles,
      price: derived.price,
    });

    await applyUpdate('jobs', id, updates);
    const job = await one(`${JOB_SELECT} WHERE j.id = $1`, [id]);
    res.json({ job });
  })
);

/** Customers get a deliberately small set of edits. */
async function customerPatch(existing, body) {
  const updates = {};

  if (body.status === 'cancelled') {
    if (!['requested', 'scheduled'].includes(existing.status)) {
      throw badRequest('This job is already on its way - please call to cancel.');
    }
    updates.status = 'cancelled';
  }

  if ('notes' in body) updates.notes = str(body.notes);

  if (!Object.keys(updates).length) {
    throw badRequest('Nothing to update.');
  }

  await applyUpdate('jobs', existing.id, updates);
  return one(`${JOB_SELECT} WHERE j.id = $1`, [existing.id]);
}

/**
 * Drivers work the job on the road: mark it picked up or delivered, and put
 * the odometer readings in. Miles and price recalculate exactly as they do
 * for the admin, so the owner never has to touch a completed run.
 */
async function driverPatch(existing, body) {
  const fields = clean({
    status: 'status' in body ? pickDriverStatus(existing, body.status) : undefined,
    odometer_start: 'odometer_start' in body ? num(body.odometer_start, 'odometer_start') : undefined,
    odometer_end: 'odometer_end' in body ? num(body.odometer_end, 'odometer_end') : undefined,
    miles: 'miles' in body ? num(body.miles, 'miles') : undefined,
    notes: 'notes' in body ? str(body.notes) : undefined,
  });

  if (!Object.keys(fields).length) {
    throw badRequest('Nothing to update.');
  }

  const customer = await one('SELECT rate_per_mile FROM customers WHERE id = $1', [
    existing.customer_id,
  ]);

  const merged = { ...existing, ...fields };
  if (merged.status === 'in_progress' && !merged.collected_at) {
    merged.collected_at = new Date().toISOString();
  }
  if (merged.status === 'delivered' && !merged.delivered_at) {
    merged.delivered_at = new Date().toISOString();
  }

  const derived = applyDerivedFields(merged, customer.rate_per_mile);

  const updates = clean({
    ...fields,
    collected_at: merged.collected_at,
    delivered_at: merged.delivered_at,
    miles: derived.miles,
    price: derived.price,
  });

  await applyUpdate('jobs', existing.id, updates);
  return one(`${JOB_SELECT} WHERE j.id = $1`, [existing.id]);
}

/** Drivers may only move a job forwards: assigned -> picked up -> delivered. */
function pickDriverStatus(existing, value) {
  if (value === 'in_progress') {
    if (!['requested', 'scheduled'].includes(existing.status)) {
      throw badRequest('This job has already been picked up.');
    }
    return value;
  }
  if (value === 'delivered') {
    if (!['requested', 'scheduled', 'in_progress'].includes(existing.status)) {
      throw badRequest('This job is already finished.');
    }
    return value;
  }
  throw badRequest('Drivers can only mark a job picked up or delivered.');
}

function pickStatus(value) {
  if (value === undefined) return undefined;
  if (!STATUSES.includes(value)) throw badRequest('Unknown status.');
  return value;
}

/** DELETE /api/jobs/:id - admin only. */
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM jobs WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

export default router;
