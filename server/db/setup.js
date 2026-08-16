/**
 * Creates the database schema and (on a fresh database) seeds demo data.
 *
 *   npm run db:setup    - create tables, seed only if empty
 *   npm run db:reset    - drop everything first, then recreate and re-seed
 *
 * Safe to run repeatedly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..');

// Make sure server/.env exists before anything reads process.env.
const envPath = path.join(SERVER_ROOT, '.env');
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(SERVER_ROOT, '.env.example'), envPath);
  console.log('Created server/.env from .env.example');
}

const { exec, query, one, driver } = await import('../src/db.js');
const { hashPassword } = await import('../src/auth.js');

const RESET = process.argv.includes('--reset');

async function main() {
  console.log(`Database engine: ${driver}`);

  if (RESET) {
    console.log('Dropping existing tables...');
    await exec(`
      DROP TABLE IF EXISTS jobs CASCADE;
      DROP TABLE IF EXISTS addresses CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS drivers CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP SEQUENCE IF EXISTS job_reference_seq;
    `);
  }

  console.log('Applying schema...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await exec(schema);

  await seedAdmin();

  const { rows } = await query('SELECT COUNT(*)::int AS count FROM jobs');
  if (rows[0].count > 0) {
    console.log(`Database already has ${rows[0].count} jobs - skipping demo data.`);
  } else {
    await seedDemoData();
  }

  console.log('\nDone. Start the app with:  npm run dev');
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@courier.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const name = process.env.ADMIN_NAME || 'Owner';

  const existing = await one('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
    return;
  }

  await query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'admin')`,
    [email, await hashPassword(password), name]
  );
  console.log(`Created admin account: ${email} / ${password}`);
}

async function seedDemoData() {
  console.log('Seeding demo data...');

  const customer = await one(
    `INSERT INTO customers (name, contact_name, email, phone, rate_per_mile, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, rate_per_mile`,
    [
      'Northgate Print Co.',
      'Sarah Whitfield',
      'demo@customer.local',
      '07700 900142',
      1.35,
      'Regular weekday runs. Invoice monthly.',
    ]
  );

  await query(
    `INSERT INTO users (email, password_hash, name, role, customer_id)
     VALUES ($1, $2, $3, 'customer', $4)`,
    [
      'demo@customer.local',
      await hashPassword('demo1234'),
      'Sarah Whitfield',
      customer.id,
    ]
  );
  console.log('Created demo customer login: demo@customer.local / demo1234');

  const secondCustomer = await one(
    `INSERT INTO customers (name, contact_name, email, phone, rate_per_mile)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, rate_per_mile`,
    ['Alderman Legal LLP', 'James Alderman', 'accounts@alderman.example', '07700 900318', 1.5]
  );

  const warehouse = await insertAddress(customer.id, {
    label: 'Print works (main)',
    contact_name: 'Goods in',
    phone: '07700 900142',
    line1: 'Unit 7, Northgate Industrial Estate',
    city: 'Leeds',
    postcode: 'LS11 5RD',
    is_default_pickup: true,
  });

  const shopfront = await insertAddress(customer.id, {
    label: 'City centre shop',
    contact_name: 'Front desk',
    line1: '14 Briggate',
    city: 'Leeds',
    postcode: 'LS1 6ER',
    is_default_dropoff: true,
  });

  const clientSite = await insertAddress(customer.id, {
    label: 'Harrogate client',
    line1: '3 Montpellier Parade',
    city: 'Harrogate',
    postcode: 'HG1 2TJ',
  });

  const legalOffice = await insertAddress(secondCustomer.id, {
    label: 'Head office',
    line1: '22 Park Square East',
    city: 'Leeds',
    postcode: 'LS1 2NE',
    is_default_pickup: true,
  });

  const courtAddress = await insertAddress(secondCustomer.id, {
    label: 'Combined Court',
    line1: 'Leeds Combined Court Centre, 1 Oxford Row',
    city: 'Leeds',
    postcode: 'LS1 3BG',
    is_default_dropoff: true,
  });

  const driver = await one(
    `INSERT INTO drivers (name, phone, email, vehicle_reg)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    ['Danny Foster', '07700 900771', 'danny@courier.local', 'YK21 XPL']
  );

  await query(
    `INSERT INTO users (email, password_hash, name, role, driver_id)
     VALUES ($1, $2, $3, 'driver', $4)`,
    ['danny@courier.local', await hashPassword('drive1234'), 'Danny Foster', driver.id]
  );
  console.log('Created demo driver login: danny@courier.local / drive1234');

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const at = (daysFromNow, hour) => {
    const date = new Date(now + daysFromNow * day);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  const jobs = [
    {
      customer, from: warehouse, to: shopfront, driver: driver.id,
      status: 'delivered', scheduled: at(-9, 9), miles: 6.2,
      parcel: '4 boxes of flyers', invoiced: true, paid: true,
    },
    {
      customer, from: warehouse, to: clientSite, driver: driver.id,
      status: 'delivered', scheduled: at(-7, 11), miles: 18.4,
      parcel: 'Exhibition banners', invoiced: true, paid: true,
    },
    {
      customer, from: warehouse, to: shopfront, driver: driver.id,
      status: 'delivered', scheduled: at(-4, 8), miles: 6.1,
      parcel: 'Business card reorder', invoiced: true, paid: false,
    },
    {
      customer: secondCustomer, from: legalOffice, to: courtAddress, driver: driver.id,
      status: 'delivered', scheduled: at(-3, 9), miles: 2.3,
      parcel: 'Sealed court bundle - urgent', invoiced: true, paid: false,
    },
    {
      customer, from: warehouse, to: clientSite, driver: driver.id,
      status: 'delivered', scheduled: at(-2, 14), miles: 18.9,
      parcel: 'Brochure delivery', invoiced: false, paid: false,
    },
    {
      customer: secondCustomer, from: legalOffice, to: courtAddress, driver: driver.id,
      status: 'delivered', scheduled: at(-1, 10), miles: 2.4,
      parcel: 'Document exchange', invoiced: false, paid: false,
    },
    {
      customer, from: warehouse, to: shopfront, driver: driver.id,
      status: 'in_progress', scheduled: at(0, 9), miles: 6.2,
      parcel: 'Poster run - collected 09:15',
    },
    {
      customer, from: warehouse, to: clientSite, driver: driver.id,
      status: 'scheduled', scheduled: at(0, 15), miles: 18.5,
      parcel: 'Wedding stationery, handle flat',
    },
    {
      customer: secondCustomer, from: legalOffice, to: courtAddress,
      status: 'requested', scheduled: at(1, 9),
      parcel: 'Contract pack for signing',
    },
    {
      customer, from: warehouse, to: shopfront,
      status: 'requested', scheduled: at(2, 10),
      parcel: 'Weekly stock top-up',
    },
  ];

  for (const job of jobs) await insertJob(job);

  console.log(`Seeded ${jobs.length} jobs, 2 customers, 1 driver.`);
}

async function insertAddress(customerId, address) {
  return one(
    `INSERT INTO addresses
       (customer_id, label, contact_name, phone, line1, line2, city, postcode,
        is_default_pickup, is_default_dropoff)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      customerId,
      address.label ?? null,
      address.contact_name ?? null,
      address.phone ?? null,
      address.line1,
      address.line2 ?? null,
      address.city ?? null,
      address.postcode ?? null,
      address.is_default_pickup ?? false,
      address.is_default_dropoff ?? false,
    ]
  );
}

async function insertJob(job) {
  const { rows } = await query("SELECT nextval('job_reference_seq') AS seq");
  const reference = `JOB-${rows[0].seq}`;

  const miles = job.miles ?? 0;
  const rate = Number(job.customer.rate_per_mile);
  const price = Math.round(miles * rate * 100) / 100;

  const collected = ['in_progress', 'delivered'].includes(job.status)
    ? job.scheduled
    : null;
  const delivered = job.status === 'delivered'
    ? new Date(new Date(job.scheduled).getTime() + 45 * 60 * 1000).toISOString()
    : null;

  await query(
    `INSERT INTO jobs (
       reference, customer_id, driver_id, status,
       pickup_address_id, pickup_name, pickup_phone, pickup_line1, pickup_city, pickup_postcode,
       dropoff_address_id, dropoff_name, dropoff_phone, dropoff_line1, dropoff_city, dropoff_postcode,
       parcel_description, scheduled_at, collected_at, delivered_at,
       miles, rate_per_mile, price, invoiced, paid
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15, $16,
       $17, $18, $19, $20,
       $21, $22, $23, $24, $25
     )`,
    [
      reference, job.customer.id, job.driver ?? null, job.status,
      job.from.id, job.from.contact_name, job.from.phone, job.from.line1, job.from.city, job.from.postcode,
      job.to.id, job.to.contact_name, job.to.phone, job.to.line1, job.to.city, job.to.postcode,
      job.parcel ?? null, job.scheduled, collected, delivered,
      miles, rate, price, job.invoiced ?? false, job.paid ?? false,
    ]
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nSetup failed:', error);
    process.exit(1);
  });
