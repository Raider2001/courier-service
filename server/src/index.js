import path from 'node:path';
import fs from 'node:fs';

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// db.js loads the .env files and picks the database driver, so it must be
// imported before anything reads process.env for configuration.
import { driver, query, SERVER_ROOT } from './db.js';
import { attachUser } from './auth.js';
import { HttpError } from './lib/http.js';

import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import addressRoutes from './routes/addresses.js';
import jobRoutes from './routes/jobs.js';
import driverRoutes from './routes/drivers.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// The client sends its cookie with every request, so the origin must be
// named explicitly - a wildcard is not allowed with credentials.
app.use(
  cors({
    origin: CLIENT_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(attachUser);

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, database: driver });
  } catch (error) {
    res.status(503).json({ ok: false, database: driver, error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// In production the API also serves the built React app, so the whole thing
// deploys as a single service.
const clientDist = path.join(SERVER_ROOT, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Errors thrown anywhere in a route land here. Anything that is not one of
// ours is logged and reported as a generic failure.
app.use((error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({
    error: isProduction ? 'Something went wrong. Please try again.' : error.message,
  });
});

app.listen(PORT, () => {
  console.log(`Courier API listening on http://localhost:${PORT}`);
  console.log(`Database driver: ${driver}${driver === 'pglite' ? ' (local file, no install needed)' : ''}`);
  if (!isProduction) console.log(`Allowing requests from ${CLIENT_ORIGIN}`);
});

export default app;
