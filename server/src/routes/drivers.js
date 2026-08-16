import { Router } from 'express';
import { query, one, many } from '../db.js';
import { requireAdmin, hashPassword } from '../auth.js';
import {
  asyncHandler,
  badRequest,
  notFound,
  str,
  requiredStr,
  bool,
  isEmail,
} from '../lib/http.js';
import { applyUpdate, clean } from '../lib/sql.js';

const router = Router();

// Drivers are internal - only the owner ever sees this.
router.use(requireAdmin);

/** GET /api/drivers */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const drivers = await many(
      `SELECT d.*,
              COALESCE(stats.job_count, 0)   AS job_count,
              COALESCE(stats.total_miles, 0) AS total_miles
         FROM drivers d
         LEFT JOIN (
           SELECT driver_id,
                  COUNT(*)::int     AS job_count,
                  SUM(miles)::float AS total_miles
             FROM jobs
            WHERE status = 'delivered'
            GROUP BY driver_id
         ) stats ON stats.driver_id = d.id
        WHERE ($1 = TRUE OR d.active = TRUE)
        ORDER BY d.active DESC, d.name`,
      [bool(req.query.includeInactive)]
    );
    res.json({ drivers });
  })
);

/** POST /api/drivers - optionally creates the driver's login alongside. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = requiredStr(req.body.name, 'Driver name');
    const email = str(req.body.email)?.toLowerCase() ?? null;
    if (email && !isEmail(email)) throw badRequest('That email address does not look right.');

    const driver = await one(
      `INSERT INTO drivers (name, phone, email, vehicle_reg)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, str(req.body.phone), email, str(req.body.vehicle_reg)]
    );

    const password = str(req.body.password);
    if (password) {
      if (!email) throw badRequest('An email address is needed to create a login.');
      if (password.length < 8) throw badRequest('Password must be at least 8 characters.');

      const taken = await one('SELECT id FROM users WHERE email = $1', [email]);
      if (taken) throw badRequest('An account with that email already exists.');

      await query(
        `INSERT INTO users (email, password_hash, name, role, driver_id)
         VALUES ($1, $2, $3, 'driver', $4)`,
        [email, await hashPassword(password), name, driver.id]
      );
    }

    res.status(201).json({ driver });
  })
);

/** PATCH /api/drivers/:id */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await one('SELECT id FROM drivers WHERE id = $1', [id]);
    if (!existing) throw notFound('Driver not found.');

    await applyUpdate(
      'drivers',
      id,
      clean({
        name: 'name' in req.body ? requiredStr(req.body.name, 'Driver name') : undefined,
        phone: 'phone' in req.body ? str(req.body.phone) : undefined,
        email: 'email' in req.body ? str(req.body.email)?.toLowerCase() ?? null : undefined,
        vehicle_reg: 'vehicle_reg' in req.body ? str(req.body.vehicle_reg) : undefined,
        active: 'active' in req.body ? bool(req.body.active) : undefined,
      })
    );

    res.json({ driver: await one('SELECT * FROM drivers WHERE id = $1', [id]) });
  })
);

/** DELETE /api/drivers/:id - deactivate, so past jobs keep their driver. */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await query('UPDATE drivers SET active = FALSE WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

export default router;
