import { Router } from 'express';
import { query, one, many } from '../db.js';
import { requireAuth, requireAdmin, hashPassword } from '../auth.js';
import {
  asyncHandler,
  badRequest,
  notFound,
  forbidden,
  str,
  requiredStr,
  num,
  bool,
  isEmail,
} from '../lib/http.js';
import { applyUpdate, clean } from '../lib/sql.js';

const router = Router();

/**
 * GET /api/customers
 * Admin only. Each row carries the numbers the owner actually looks at, so
 * the customers screen needs no follow-up requests.
 */
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const customers = await many(
      `SELECT c.*,
              c.rate_per_mile::float             AS rate_per_mile,
              COALESCE(stats.job_count, 0)      AS job_count,
              COALESCE(stats.total_miles, 0)    AS total_miles,
              COALESCE(stats.total_billed, 0)   AS total_billed,
              COALESCE(stats.outstanding, 0)    AS outstanding,
              stats.last_job_at
         FROM customers c
         LEFT JOIN (
           SELECT customer_id,
                  COUNT(*)::int                                        AS job_count,
                  SUM(miles)::float                                    AS total_miles,
                  SUM(price)::float                                    AS total_billed,
                  SUM(CASE WHEN paid = FALSE THEN price ELSE 0 END)::float AS outstanding,
                  MAX(COALESCE(scheduled_at, created_at))              AS last_job_at
             FROM jobs
            WHERE status <> 'cancelled'
            GROUP BY customer_id
         ) stats ON stats.customer_id = c.id
        WHERE ($1 = TRUE OR c.archived = FALSE)
        ORDER BY c.name`,
      [bool(req.query.includeArchived)]
    );

    res.json({ customers });
  })
);

/** POST /api/customers - admin adds a customer (optionally with a login). */
router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const name = requiredStr(req.body.name, 'Customer name');
    const email = str(req.body.email)?.toLowerCase() ?? null;

    if (email && !isEmail(email)) throw badRequest('That email address does not look right.');

    const customer = await one(
      `INSERT INTO customers (name, contact_name, email, phone, rate_per_mile, notes)
       VALUES ($1, $2, $3, $4, COALESCE($5, 1.20), $6)
       RETURNING *, rate_per_mile::float AS rate_per_mile`,
      [
        name,
        str(req.body.contact_name),
        email,
        str(req.body.phone),
        num(req.body.rate_per_mile, 'rate_per_mile'),
        str(req.body.notes),
      ]
    );

    // Optionally create the customer's login at the same time.
    const password = str(req.body.password);
    if (password) {
      if (!email) throw badRequest('An email address is needed to create a login.');
      if (password.length < 8) throw badRequest('Password must be at least 8 characters.');

      const taken = await one('SELECT id FROM users WHERE email = $1', [email]);
      if (taken) throw badRequest('An account with that email already exists.');

      await query(
        `INSERT INTO users (email, password_hash, name, role, customer_id)
         VALUES ($1, $2, $3, 'customer', $4)`,
        [email, await hashPassword(password), str(req.body.contact_name) || name, customer.id]
      );
    }

    res.status(201).json({ customer });
  })
);

/** GET /api/customers/:id - admin, or the customer looking at themselves. */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (req.user.role !== 'admin' && req.user.customer_id !== id) throw forbidden();

    const customer = await one(
      'SELECT *, rate_per_mile::float AS rate_per_mile FROM customers WHERE id = $1',
      [id]
    );
    if (!customer) throw notFound('Customer not found.');

    const addresses = await many(
      `SELECT * FROM addresses
        WHERE customer_id = $1 AND archived = FALSE
        ORDER BY is_default_pickup DESC, is_default_dropoff DESC, label NULLS LAST, id`,
      [id]
    );

    const totals = await one(
      `SELECT COUNT(*)::int                                            AS job_count,
              COALESCE(SUM(miles), 0)::float                           AS total_miles,
              COALESCE(SUM(price), 0)::float                           AS total_billed,
              COALESCE(SUM(CASE WHEN paid = FALSE THEN price ELSE 0 END), 0)::float AS outstanding
         FROM jobs
        WHERE customer_id = $1 AND status <> 'cancelled'`,
      [id]
    );

    res.json({ customer, addresses, totals });
  })
);

/**
 * PATCH /api/customers/:id
 * Admins can change anything. A customer may correct their own contact
 * details, but never their rate.
 */
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && req.user.customer_id !== id) throw forbidden();

    const existing = await one('SELECT id FROM customers WHERE id = $1', [id]);
    if (!existing) throw notFound('Customer not found.');

    const email = 'email' in req.body ? str(req.body.email)?.toLowerCase() ?? null : undefined;
    if (email && !isEmail(email)) throw badRequest('That email address does not look right.');

    const updates = clean({
      name: 'name' in req.body ? requiredStr(req.body.name, 'Customer name') : undefined,
      contact_name: 'contact_name' in req.body ? str(req.body.contact_name) : undefined,
      email,
      phone: 'phone' in req.body ? str(req.body.phone) : undefined,
      // Admin-only fields.
      rate_per_mile:
        isAdmin && 'rate_per_mile' in req.body
          ? num(req.body.rate_per_mile, 'rate_per_mile')
          : undefined,
      notes: isAdmin && 'notes' in req.body ? str(req.body.notes) : undefined,
      archived: isAdmin && 'archived' in req.body ? bool(req.body.archived) : undefined,
    });

    await applyUpdate('customers', id, updates);
    const customer = await one(
      'SELECT *, rate_per_mile::float AS rate_per_mile FROM customers WHERE id = $1',
      [id]
    );
    res.json({ customer });
  })
);

/** DELETE /api/customers/:id - archive, so delivery history survives. */
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await query('UPDATE customers SET archived = TRUE WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

export default router;
