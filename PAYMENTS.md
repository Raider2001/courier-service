# Payments — Design (agreed, awaiting Stripe account)

The owner's requirements, in their words:

1. Payment must be **verified before service** begins.
2. The transaction **completes only upon delivery** - money moves when the
   docs/parcels are delivered, not before.
3. The **assigned driver is paid after delivery, never before**.
4. Drivers set up **automatic deposit** themselves while logged in.
5. **No credit card kept on file.** Secure everything.

## How it maps to Stripe (the plan)

| Requirement | Mechanism |
| --- | --- |
| Verified before service | PaymentIntent with `capture_method: manual` created at booking for the verified quote. The card is authorized (held), not charged. Job cannot move past Pending without a successful hold. |
| Completes on delivery | Capture the PaymentIntent when the job status becomes `delivered`. Cancel the intent (release the hold) if the job is cancelled before pickup. |
| Driver paid after delivery | Stripe Connect (Express). After capture, create a Transfer to the driver's connected account for their cut. Platform keeps the remainder. |
| Automatic deposit setup | "Set up deposits" button on the driver dashboard -> Connect Express onboarding link. Stripe collects the driver's bank details directly; we store only the connected account id. |
| No card on file | Stripe Elements / Checkout collects the card client-side. Our server sees tokens and intent ids only. SAQ-A PCI scope. |

## Implementation checklist (when test keys arrive)

- [ ] `server/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; client: publishable key
- [ ] `payments` fields on jobs: `payment_intent_id`, `payment_status`
      (`none` -> `authorized` -> `captured` / `released`), `driver_transfer_id`
- [ ] `drivers.stripe_account_id` + onboarding endpoint + dashboard button
- [ ] Checkout step on the booking flow (customer sees verified quote, authorizes)
- [ ] Capture on delivered (server-side, in the same place `delivered_at` is set)
- [ ] Release on cancel
- [ ] Transfer to driver on capture; driver cut configurable on the Pricing page
- [ ] Webhooks: `payment_intent.canceled`, `charge.dispute.created`, `account.updated`
- [ ] Test-mode rehearsal with Stripe test cards, then swap to live keys

## Constraints acknowledged

- Card authorizations expire after ~7 days: authorize at booking for jobs
  inside the window, otherwise defer authorization to the pickup day (cron
  or on-schedule trigger).
- Fees: 2.9% + $0.30 per charge; ~$2/mo per active Express account;
  0.25% + $0.25 per payout. Price into rates.
- Jobs may also stay payable off-platform (check/invoice customers) - the
  existing `invoiced`/`paid` flags remain for those; card payment is a new,
  parallel path chosen at booking.
