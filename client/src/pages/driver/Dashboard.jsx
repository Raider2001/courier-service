import { useEffect, useState } from 'react';

import { api } from '../../api.js';
import { Card, Empty, Field, Loading, Message, Stat, StatusBadge } from '../../components.jsx';
import { addressLine, dateTime, miles } from '../../format.js';

/**
 * The driver's day, built for a phone in one hand: each run is a card with
 * the two addresses, tap-to-call numbers, and one button that moves the job
 * forward - Picked up, then Delivered (with the odometer readings).
 */
export default function DriverDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    return api
      .dashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  if (error && !data) return <Message error={error} />;
  if (!data) return <Loading />;

  const { totals, assigned, recent } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My runs</h1>
          <p>
            {totals.assigned_open
              ? `${totals.assigned_open} ${totals.assigned_open === 1 ? 'delivery' : 'deliveries'} on your list.`
              : 'Nothing assigned right now.'}
          </p>
        </div>
      </div>

      <div className="stats">
        <Stat label="Today" value={totals.runs_today} hint="Runs booked today" />
        <Stat label="To do" value={totals.assigned_open} />
        <Stat label="Delivered" value={totals.delivered_total} hint="All time" />
        <Stat label="Miles this month" value={miles(totals.miles_this_month)} />
      </div>

      <Message error={error} success={notice} />

      {!assigned.length ? (
        <Card>
          <Empty>No deliveries assigned to you. Check back soon.</Empty>
        </Card>
      ) : (
        assigned.map((job) => (
          <RunCard
            key={job.id}
            job={job}
            onDone={(message) => {
              setNotice(message);
              setError('');
              load();
            }}
            onError={(message) => setError(message)}
          />
        ))
      )}

      <Card title="Recently delivered">
        {!recent.length ? (
          <Empty>Your completed runs will show here.</Empty>
        ) : (
          <ul className="plain">
            {recent.map((job) => (
              <li key={job.id}>
                <strong className="mono">{job.reference}</strong>{' '}
                <span className="muted small">
                  {job.pickup_city || job.pickup_postcode} →{' '}
                  {job.dropoff_city || job.dropoff_postcode} · {miles(job.miles)} ·{' '}
                  {dateTime(job.delivered_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function RunCard({ job, onDone, onError }) {
  const [odometer, setOdometer] = useState('');
  const [busy, setBusy] = useState(false);

  const pickedUp = job.status === 'in_progress';

  async function update(body, message) {
    setBusy(true);
    try {
      await api.updateJob(job.id, body);
      onDone(message);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function markPickedUp() {
    const body = { status: 'in_progress' };
    if (odometer !== '') body.odometer_start = Number(odometer);
    update(body, `${job.reference} picked up.`);
  }

  function markDelivered() {
    const body = { status: 'delivered' };
    if (odometer !== '') body.odometer_end = Number(odometer);
    update(body, `${job.reference} delivered. Nice one.`);
  }

  return (
    <Card className="run">
      <header className="card-head">
        <h2 className="mono">{job.reference}</h2>
        <StatusBadge status={job.status} />
      </header>

      <p className="muted small" style={{ margin: '0 0 10px' }}>
        {dateTime(job.scheduled_at || job.created_at)} · {job.customer_name}
        {job.parcel_description ? ` · ${job.parcel_description}` : ''}
      </p>

      <div className="grid grid-2">
        <div>
          <h4>Pick up</h4>
          <p className="address">
            {addressLine({
              line1: job.pickup_line1,
              line2: job.pickup_line2,
              city: job.pickup_city,
              postcode: job.pickup_postcode,
            })}
          </p>
          {job.pickup_phone && (
            <a href={`tel:${job.pickup_phone}`} className="small">
              Call {job.pickup_name || 'pickup'} · {job.pickup_phone}
            </a>
          )}
        </div>
        <div>
          <h4>Drop off</h4>
          <p className="address">
            {addressLine({
              line1: job.dropoff_line1,
              line2: job.dropoff_line2,
              city: job.dropoff_city,
              postcode: job.dropoff_postcode,
            })}
          </p>
          {job.dropoff_phone && (
            <a href={`tel:${job.dropoff_phone}`} className="small">
              Call {job.dropoff_name || 'dropoff'} · {job.dropoff_phone}
            </a>
          )}
        </div>
      </div>

      <div className="actions" style={{ marginTop: 14 }}>
        <Field label={pickedUp ? 'Odometer at drop-off' : 'Odometer at pick-up'}>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            placeholder="Optional"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
          />
        </Field>
        {pickedUp ? (
          <button type="button" disabled={busy} onClick={markDelivered}>
            {busy ? 'Saving…' : 'Delivered ✓'}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={markPickedUp}>
            {busy ? 'Saving…' : 'Picked up'}
          </button>
        )}
      </div>
    </Card>
  );
}
