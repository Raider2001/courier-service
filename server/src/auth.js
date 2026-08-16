import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { one } from './db.js';

const TOKEN_COOKIE = 'courier_token';
const TOKEN_TTL_DAYS = 30;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value === 'change-me-to-a-long-random-string') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set to a strong value in production');
    }
    return 'local-dev-secret-change-before-deploying';
  }
  return value;
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, customerId: user.customer_id ?? null },
    secret(),
    { expiresIn: `${TOKEN_TTL_DAYS}d` }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, { path: '/' });
}

/**
 * Reads the auth cookie and attaches req.user when it is valid.
 * Never rejects - use requireAuth / requireAdmin to enforce access.
 */
export async function attachUser(req, _res, next) {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, secret());
    const user = await one(
      `SELECT id, email, name, role, customer_id, driver_id
         FROM users
        WHERE id = $1`,
      [payload.sub]
    );
    if (user) req.user = user;
  } catch {
    // Expired or tampered token - treat as signed out.
  }
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  return next();
}

/**
 * Customers may only ever touch their own data. Admin sees everything.
 * Returns the customer id a request is allowed to act on, or null for admins
 * who did not narrow the request to one customer.
 */
export function scopedCustomerId(req) {
  if (req.user.role === 'admin') {
    const raw = req.query.customerId ?? req.body?.customer_id;
    return raw ? Number(raw) : null;
  }
  return req.user.customer_id;
}
