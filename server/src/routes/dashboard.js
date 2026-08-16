import { Router } from 'express';
import { one, many } from '../db.js';
import { requireAuth } from '../auth.js';
import { asyncHandler, forbidden } from '../lib/http.js';

const router = Router();

/**
 * GET /api/dashboard
 *
 * One request, one screen. The whole point is that the owner can open the app
 * between drops and know where the business stands without clicking anything.
 * Admins get the business view; customers get their own.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'admin') return res.json(await adminDashboard());
    if (req.user.role === 'driver') {
      if (!req.user.driver_id) throw forbidden('This account is not linked to a driver record.');
      return res.json(await driverDashboard(req.user.driver_id));
    }
    if (!req.user.customer_id) throw forbidden('This account is not linked to a customer record.');
    return res.json(await customerDashboard(req.user.customer_id));
  })
);

const JOB_SUMMARY = `
  SELECT j.id, j.reference, j.status, j.scheduled_at, j.created_at, j.delivered_at,
         j.pickup_city, j.pickup_postcode, j.dropoff_city, j.dropoff_postcode,
         j.parcel_description, j.miles::float AS miles, j.price::float AS price, j.invoiced, j.paid,
         c.name AS customer_name, d.name AS driver_name
    FROM jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN drivers d ON d.id = j.driver_id
`;

async function adminDashboard() {
  const totals = await one(`
    SELECT
      COUNT(*) FILTER (
        WHERE COALESCE(scheduled_at, created_at)::date = CURRENT_DATE
          AND status <> 'cancelled'
      )::int AS jobs_today,
      COUNT(*) FILTER (WHERE status = 'requested')::int   AS awaiting_scheduling,
      COUNT(*) FILTER (WHERE status = 'scheduled')::int    AS scheduled,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int  AS on_the_road,
      COALESCE(SUM(miles) FILTER (
        WHERE COALESCE(scheduled_at, created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          AND status = 'delivered'
      ), 0)::float AS miles_this_month,
      COALESCE(SUM(price) FILTER (
        WHERE COALESCE(scheduled_at, created_at) >= DATE_TRUNC('month', CURRENT_DATE)
          AND status = 'delivered'
      ), 0)::float AS revenue_this_month,
      COALESCE(SUM(price) FILTER (
        WHERE status = 'delivered' AND paid = FALSE
      ), 0)::float AS outstanding,
      COUNT(*) FILTER (WHERE status = 'delivered' AND invoiced = FALSE)::int AS awaiting_invoice,
      COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_total,
      (SELECT COUNT(*)::int FROM customers WHERE archived = FALSE) AS active_customers
    FROM jobs
  `);

  const today = await many(
    `${JOB_SUMMARY}
      WHERE COALESCE(j.scheduled_at, j.created_at)::date = CURRENT_DATE
        AND j.status <> 'cancelled'
      ORDER BY j.scheduled_at NULLS LAST, j.id`
  );

  const needsAttention = await many(
    `${JOB_SUMMARY}
      WHERE j.status = 'requested'
         OR (j.status = 'scheduled' AND j.driver_id IS NULL)
      ORDER BY j.scheduled_at NULLS LAST, j.id
      LIMIT 10`
  );

  const recent = await many(
    `${JOB_SUMMARY}
      WHERE j.status = 'delivered'
      ORDER BY COALESCE(j.delivered_at, j.scheduled_at, j.created_at) DESC
      LIMIT 8`
  );

  const topCustomers = await many(`
    SELECT c.id, c.name,
           COUNT(j.id)::int                AS job_count,
           COALESCE(SUM(j.miles), 0)::float AS miles,
           COALESCE(SUM(j.price), 0)::float AS billed
      FROM customers c
      JOIN jobs j ON j.customer_id = c.id
     WHERE j.status = 'delivered'
       AND COALESCE(j.scheduled_at, j.created_at) >= DATE_TRUNC('month', CURRENT_DATE)
     GROUP BY c.id, c.name
     ORDER BY billed DESC
     LIMIT 5
  `);

  return { role: 'admin', totals, today, needsAttention, recent, topCustomers };
}

async function customerDashboard(customerId) {
  const totals = await one(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('requested', 'scheduled', 'in_progress'))::int AS open_jobs,
       COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_total,
       COALESCE(SUM(miles) FILTER (
         WHERE status = 'delivered'
           AND COALESCE(scheduled_at, created_at) >= DATE_TRUNC('month', CURRENT_DATE)
       ), 0)::float AS miles_this_month,
       COALESCE(SUM(price) FILTER (
         WHERE status = 'delivered'
           AND COALESCE(scheduled_at, created_at) >= DATE_TRUNC('month', CURRENT_DATE)
       ), 0)::float AS spend_this_month,
       COALESCE(SUM(price) FILTER (
         WHERE status = 'delivered' AND paid = FALSE
       ), 0)::float AS outstanding
     FROM jobs
     WHERE customer_id = $1`,
    [customerId]
  );

  const upcoming = await many(
    `${JOB_SUMMARY}
      WHERE j.customer_id = $1
        AND j.status IN ('requested', 'scheduled', 'in_progress')
      ORDER BY j.scheduled_at NULLS LAST, j.id
      LIMIT 10`,
    [customerId]
  );

  const recent = await many(
    `${JOB_SUMMARY}
      WHERE j.customer_id = $1 AND j.status = 'delivered'
      ORDER BY COALESCE(j.delivered_at, j.scheduled_at, j.created_at) DESC
      LIMIT 8`,
    [customerId]
  );

  // Sent along so the booking form can pre-fill without a second request.
  const addresses = await many(
    `SELECT * FROM addresses
      WHERE customer_id = $1 AND archived = FALSE
      ORDER BY is_default_pickup DESC, is_default_dropoff DESC, label NULLS LAST, id`,
    [customerId]
  );

  const lastJob = await one(
    `SELECT * FROM jobs
      WHERE customer_id = $1 AND status <> 'cancelled'
      ORDER BY created_at DESC
      LIMIT 1`,
    [customerId]
  );

  return { role: 'customer', totals, upcoming, recent, addresses, lastJob };
}

async function driverDashboard(driverId) {
  const totals = await one(
    `SELECT
       COUNT(*) FILTER (
         WHERE status IN ('requested', 'scheduled', 'in_progress')
       )::int AS assigned_open,
       COUNT(*) FILTER (
         WHERE COALESCE(scheduled_at, created_at)::date = CURRENT_DATE
           AND status <> 'cancelled'
       )::int AS runs_today,
       COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered_total,
       COALESCE(SUM(miles) FILTER (
         WHERE status = 'delivered'
           AND COALESCE(scheduled_at, created_at) >= DATE_TRUNC('month', CURRENT_DATE)
       ), 0)::float AS miles_this_month
     FROM jobs
     WHERE driver_id = $1`,
    [driverId]
  );

  // Everything still to do, today's runs first. Unlike the summaries above,
  // the driver needs the full address snapshot and phone numbers to work from.
  const assigned = await many(
    `SELECT j.id, j.reference, j.status, j.scheduled_at, j.created_at,
            j.parcel_description, j.notes, j.miles::float AS miles,
            j.pickup_name, j.pickup_phone, j.pickup_line1, j.pickup_line2,
            j.pickup_city, j.pickup_postcode,
            j.dropoff_name, j.dropoff_phone, j.dropoff_line1, j.dropoff_line2,
            j.dropoff_city, j.dropoff_postcode,
            c.name AS customer_name
       FROM jobs j
       JOIN customers c ON c.id = j.customer_id
      WHERE j.driver_id = $1
        AND j.status IN ('requested', 'scheduled', 'in_progress')
      ORDER BY j.scheduled_at NULLS LAST, j.id`,
    [driverId]
  );

  const recent = await many(
    `${JOB_SUMMARY}
      WHERE j.driver_id = $1 AND j.status = 'delivered'
      ORDER BY COALESCE(j.delivered_at, j.scheduled_at, j.created_at) DESC
      LIMIT 8`,
    [driverId]
  );

  return { role: 'driver', totals, assigned, recent };
}

export default router;
