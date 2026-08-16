import { Router } from 'express';
import { query, one, many } from '../db.js';
import { requireAuth, scopedCustomerId } from '../auth.js';
import {
  asyncHandler,
  badRequest,
  notFound,
  forbidden,
  str,
  requiredStr,
  bool,
} from '../lib/http.js';
import { applyUpdate, clean } from '../lib/sql.js';

const router = Router();

/**
 * The customer's address book. This is what makes a repeat booking a
 * two-click job instead of a form-filling exercise.
 */

/** Only one address can be the default pickup (or dropoff) at a time. */
async function clearDefault(customerId, column, keepId) {
  await query(
    `UPDATE addresses SET ${column} = FALSE
      WHERE customer_id = $1 AND id <> $2`,
    [customerId, keepId ?? 0]
  );
}

async function loadOwned(req, id) {
  const address = await one('SELECT * FROM addresses WHERE id = $1', [id]);
  if (!address) throw notFound('Address not found.');
  if (req.user.role !== 'admin' && address.customer_id !== req.user.customer_id) {
    throw forbidden();
  }
  return address;
}

/** GET /api/addresses - the saved addresses to offer on the booking form. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const customerId = scopedCustomerId(req);
    if (!customerId) throw badRequest('customer_id is required.');

    const addresses = await many(
      `SELECT * FROM addresses
        WHERE customer_id = $1
          AND (archived = FALSE OR $2 = TRUE)
        ORDER BY is_default_pickup DESC, is_default_dropoff DESC, label NULLS LAST, id`,
      [customerId, bool(req.query.includeArchived)]
    );

    res.json({ addresses });
  })
);

/** POST /api/addresses */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const customerId = scopedCustomerId(req);
    if (!customerId) throw badRequest('customer_id is required.');

    const address = await one(
      `INSERT INTO addresses
         (customer_id, label, contact_name, phone, line1, line2, city, postcode,
          is_default_pickup, is_default_dropoff)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        customerId,
        str(req.body.label) || requiredStr(req.body.line1, 'Address line 1'),
        str(req.body.contact_name),
        str(req.body.phone),
        requiredStr(req.body.line1, 'Address line 1'),
        str(req.body.line2),
        str(req.body.city),
        str(req.body.postcode),
        bool(req.body.is_default_pickup),
        bool(req.body.is_default_dropoff),
      ]
    );

    if (address.is_default_pickup) await clearDefault(customerId, 'is_default_pickup', address.id);
    if (address.is_default_dropoff) await clearDefault(customerId, 'is_default_dropoff', address.id);

    res.status(201).json({ address });
  })
);

/** PATCH /api/addresses/:id */
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await loadOwned(req, Number(req.params.id));

    const updates = clean({
      label: 'label' in req.body ? str(req.body.label) : undefined,
      contact_name: 'contact_name' in req.body ? str(req.body.contact_name) : undefined,
      phone: 'phone' in req.body ? str(req.body.phone) : undefined,
      line1: 'line1' in req.body ? requiredStr(req.body.line1, 'Address line 1') : undefined,
      line2: 'line2' in req.body ? str(req.body.line2) : undefined,
      city: 'city' in req.body ? str(req.body.city) : undefined,
      postcode: 'postcode' in req.body ? str(req.body.postcode) : undefined,
      is_default_pickup:
        'is_default_pickup' in req.body ? bool(req.body.is_default_pickup) : undefined,
      is_default_dropoff:
        'is_default_dropoff' in req.body ? bool(req.body.is_default_dropoff) : undefined,
      archived: 'archived' in req.body ? bool(req.body.archived) : undefined,
    });

    await applyUpdate('addresses', existing.id, updates);

    if (updates.is_default_pickup) {
      await clearDefault(existing.customer_id, 'is_default_pickup', existing.id);
    }
    if (updates.is_default_dropoff) {
      await clearDefault(existing.customer_id, 'is_default_dropoff', existing.id);
    }

    res.json({ address: await one('SELECT * FROM addresses WHERE id = $1', [existing.id]) });
  })
);

/**
 * DELETE /api/addresses/:id
 * Archive rather than delete - past jobs keep their own copy of the address,
 * but we never want a delete to fail because history points at it.
 */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await loadOwned(req, Number(req.params.id));
    await query(
      `UPDATE addresses
          SET archived = TRUE, is_default_pickup = FALSE, is_default_dropoff = FALSE
        WHERE id = $1`,
      [existing.id]
    );
    res.json({ ok: true });
  })
);

export default router;
