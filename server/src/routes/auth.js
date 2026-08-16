import { Router } from 'express';
import { query, one } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} from '../auth.js';
import {
  asyncHandler,
  badRequest,
  requiredStr,
  str,
  isEmail,
} from '../lib/http.js';

const router = Router();

/** The shape of the signed-in user we hand to the client. */
async function currentUserPayload(user) {
  let customer = null;
  if (user.customer_id) {
    customer = await one(
      `SELECT id, name, contact_name, email, phone, rate_per_mile::float AS rate_per_mile
         FROM customers
        WHERE id = $1`,
      [user.customer_id]
    );
  }
  let driver = null;
  if (user.driver_id) {
    driver = await one(
      `SELECT id, name, phone, vehicle_reg FROM drivers WHERE id = $1`,
      [user.driver_id]
    );
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    customer,
    driver,
  };
}

/**
 * POST /api/auth/register
 * Customer self-signup. Creates the customer record and its login together,
 * so the very first booking already has somewhere to save addresses.
 * Always creates a 'customer' - admin accounts are made by the seed script.
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = requiredStr(req.body.name, 'Your name');
    const email = requiredStr(req.body.email, 'Email').toLowerCase();
    const password = requiredStr(req.body.password, 'Password');
    const businessName = str(req.body.business_name) || name;
    const phone = str(req.body.phone);

    if (!isEmail(email)) throw badRequest('That email address does not look right.');
    if (password.length < 8) {
      throw badRequest('Password must be at least 8 characters.');
    }

    const taken = await one('SELECT id FROM users WHERE email = $1', [email]);
    if (taken) {
      throw badRequest('An account with that email already exists. Try signing in.');
    }

    const customer = await one(
      `INSERT INTO customers (name, contact_name, email, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [businessName, name, email, phone]
    );

    const user = await one(
      `INSERT INTO users (email, password_hash, name, role, customer_id)
       VALUES ($1, $2, $3, 'customer', $4)
       RETURNING id, email, name, role, customer_id`,
      [email, await hashPassword(password), name, customer.id]
    );

    setAuthCookie(res, signToken(user));
    res.status(201).json({ user: await currentUserPayload(user) });
  })
);

/** POST /api/auth/login */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = requiredStr(req.body.email, 'Email').toLowerCase();
    const password = requiredStr(req.body.password, 'Password');

    const user = await one(
      `SELECT id, email, name, role, customer_id, driver_id, password_hash
         FROM users
        WHERE email = $1`,
      [email]
    );

    // Same message either way - do not reveal which accounts exist.
    const ok = user && (await verifyPassword(password, user.password_hash));
    if (!ok) throw badRequest('Email or password is incorrect.');

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    setAuthCookie(res, signToken(user));
    res.json({ user: await currentUserPayload(user) });
  })
);

/** POST /api/auth/logout */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/** GET /api/auth/me - who am I? Used by the client on every page load. */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: await currentUserPayload(req.user) });
  })
);

/** POST /api/auth/change-password */
router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentPassword = requiredStr(req.body.current_password, 'Current password');
    const newPassword = requiredStr(req.body.new_password, 'New password');

    if (newPassword.length < 8) {
      throw badRequest('New password must be at least 8 characters.');
    }

    const user = await one('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      throw badRequest('Current password is incorrect.');
    }

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      await hashPassword(newPassword),
      req.user.id,
    ]);
    res.json({ ok: true });
  })
);

export default router;
