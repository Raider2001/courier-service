import { Router } from 'express';
import { query, one, many } from '../db.js';
import { requireAdmin } from '../auth.js';
import {
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
  str,
  requiredStr,
  num,
  bool,
} from '../lib/http.js';

const router = Router();

/**
 * GET /api/reviews - the public list: approved only, newest first.
 * GET /api/reviews?all=true - admin moderation view: everything.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (bool(req.query.all)) {
      if (!req.user || req.user.role !== 'admin') throw forbidden();
      const reviews = await many(
        `SELECT r.*, c.name AS customer_name
           FROM reviews r
           LEFT JOIN customers c ON c.id = r.customer_id
          ORDER BY r.approved, r.created_at DESC`
      );
      return res.json({ reviews });
    }

    // The signed-in customer's own reviews - used by the "How did we do?"
    // prompt so it only appears until they have left one.
    if (bool(req.query.mine)) {
      if (!req.user?.customer_id) throw forbidden();
      const reviews = await many(
        `SELECT id, rating, approved, created_at FROM reviews WHERE customer_id = $1`,
        [req.user.customer_id]
      );
      return res.json({ reviews });
    }

    const reviews = await many(
      `SELECT id, name, business, rating, comment, created_at,
              (customer_id IS NOT NULL) AS verified
         FROM reviews
        WHERE approved = TRUE
        ORDER BY created_at DESC
        LIMIT 50`
    );
    res.json({ reviews });
  })
);

/**
 * POST /api/reviews - anyone may submit. Nothing shows publicly until the
 * owner approves it. If the reviewer is signed in as a customer, the review
 * is linked so it can be badged "verified customer".
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = requiredStr(req.body.name, 'Your name');
    const comment = requiredStr(req.body.comment, 'Your review');
    const rating = Math.round(num(req.body.rating, 'rating') ?? 0);

    if (rating < 1 || rating > 5) throw badRequest('Rating must be 1 to 5 stars.');
    if (name.length > 80) throw badRequest('Please keep your name under 80 characters.');
    if (comment.length > 1000) throw badRequest('Please keep the review under 1,000 characters.');

    await query(
      `INSERT INTO reviews (name, business, rating, comment, customer_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, str(req.body.business), rating, comment, req.user?.customer_id ?? null]
    );

    res.status(201).json({ ok: true });
  })
);

/** PATCH /api/reviews/:id - the owner approves (or un-approves). */
router.patch(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await one('SELECT id FROM reviews WHERE id = $1', [id]);
    if (!existing) throw notFound('Review not found.');

    await query('UPDATE reviews SET approved = $1 WHERE id = $2', [bool(req.body.approved), id]);
    res.json({ ok: true });
  })
);

/** DELETE /api/reviews/:id - spam goes in the bin. */
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM reviews WHERE id = $1', [Number(req.params.id)]);
    res.json({ ok: true });
  })
);

export default router;
