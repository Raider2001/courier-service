import { Router } from 'express';
import { requireAuth, requireAdmin } from '../auth.js';
import { asyncHandler, num } from '../lib/http.js';
import { applyUpdate, clean } from '../lib/sql.js';
import { getSettings } from '../lib/settings.js';

const router = Router();

/**
 * GET /api/settings
 * Any signed-in user may read the pricing rules - the booking form uses them
 * to be upfront about what a delivery will cost.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettings() });
  })
);

/** PATCH /api/settings - only the owner changes the rules. */
router.patch(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const updates = clean({
      base_fee: 'base_fee' in req.body ? num(req.body.base_fee, 'base_fee') ?? 0 : undefined,
      fuel_free_miles:
        'fuel_free_miles' in req.body
          ? num(req.body.fuel_free_miles, 'fuel_free_miles') ?? 0
          : undefined,
      fuel_per_mile:
        'fuel_per_mile' in req.body ? num(req.body.fuel_per_mile, 'fuel_per_mile') ?? 0 : undefined,
      tax_rate: 'tax_rate' in req.body ? num(req.body.tax_rate, 'tax_rate') ?? 0 : undefined,
    });

    await applyUpdate('settings', 1, updates);
    res.json({ settings: await getSettings() });
  })
);

export default router;
