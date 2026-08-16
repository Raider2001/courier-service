# Courier Service

A small, fast web app for running a courier business: customers book deliveries
online, drivers work their runs from a phone, and the owner sees mileage, money
and every job in one place.

## The three sign-ins

| Role | What they see | Demo login |
|---|---|---|
| **Owner (admin)** | Today's board, all deliveries, customers, drivers, mileage, revenue, outstanding invoices | `admin@courier.local` / `changeme123` |
| **Customer** | Book a delivery, track their orders, saved addresses, spend | `demo@customer.local` / `demo1234` |
| **Driver** | Their assigned runs with tap-to-call numbers, one-tap "Picked up" / "Delivered", odometer entry, delivery history | `danny@courier.local` / `drive1234` |

Customers can self-register. Every address a customer uses is saved and offered
back next time, so returning customers never re-type anything. Odometer
readings turn into miles, and miles × the customer's rate turns into the price
— automatically.

> Change the demo passwords before showing this to real customers. The admin
> password comes from `ADMIN_PASSWORD` in `server/.env`.

## Run it locally

Needs **Node 20+**. Nothing else — the local database is
[PGlite](https://pglite.dev/) (real Postgres compiled to WebAssembly, stored in
`server/.data/`), so there is no database server to install.

```bash
npm install        # once
npm run db:setup   # creates tables + demo data (safe to re-run)
npm run dev        # API on :4000, app on http://localhost:5173
```

Other scripts:

```bash
npm run db:reset   # wipe and re-seed the database
npm run build      # build the React app into client/dist
npm start          # production mode: one server serves API + built app
```

## How it's put together

```
server/   Express API (ESM). JWT in an httpOnly cookie, bcrypt passwords,
          role-based access: admin / customer / driver.
  db/     schema.sql + setup.js (idempotent create + seed)
  src/    routes, auth, pricing rules
client/   Vite + React. /api is proxied to :4000 in dev; in production the
          API serves the built app itself, so it deploys as ONE service.
```

Design decisions worth knowing:

- **Pickup/dropoff details are snapshotted onto each job** — editing a saved
  address later never rewrites delivery history.
- **Nothing is hard-deleted.** Customers, addresses and drivers archive, so
  history always adds up.
- **Prices derive, never drift.** `fixed_price` wins if set; otherwise
  `miles × rate_per_mile`, recalculated on every change, on the server.

## Deploying (Render)

`render.yaml` is a ready-made blueprint: one web service + a managed Postgres
database. In the Render dashboard choose **New → Blueprint**, point it at this
repo, and set `ADMIN_EMAIL` / `ADMIN_PASSWORD` when prompted.

Switching from local PGlite to hosted Postgres is automatic — the server uses
real Postgres whenever `DATABASE_URL` is set. Railway or DigitalOcean work the
same way: build with `npm install && npm run build`, start with
`node server/db/setup.js && npm start`, and provide `DATABASE_URL`,
`JWT_SECRET`, `NODE_ENV=production`.
