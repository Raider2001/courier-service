import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Field, Loading, Message, StatusBadge } from '../../components.jsx';
import { STATUS_LABELS, addressLine, dateTime, miles, money, toLocalInput } from '../../format.js';

const STATUS_FLOW = ['requested', 'scheduled', 'in_progress', 'delivered', 'cancelled'];

/** Only send what changed — the API recomputes miles and price on every patch. */
function formFrom(job) {
  return {
    status: job.status,
    driver_id: job.driver_id ?? '',
    scheduled_at: toLocalInput(job.scheduled_at),
    parcel_description: job.parcel_description || '',
    parcel_weight_kg: job.parcel_weight_kg ?? '',
    odometer_start: job.odometer_start ?? '',
    odometer_end: job.odometer_end ?? '',
    miles: job.miles ?? '',
    rate_per_mile: job.rate_per_mile ?? '',
    fixed_price: job.fixed_price ?? '',
    notes: job.notes || '',
  };
}

export default function AdminJobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([api.job(id), api.drivers()])
      .then(([jobData, driverData]) => {
        setJob(jobData.job);
        setForm(formFrom(jobData.job));
        setDrivers(driverData.drivers);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  function apply(updated, message) {
    setJob(updated);
    setForm(formFrom(updated));
    setNotice(message);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const payload = {
        status: form.status,
        driver_id: form.driver_id === '' ? null : Number(form.driver_id),
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        parcel_description: form.parcel_description,
        parcel_weight_kg: form.parcel_weight_kg === '' ? null : Number(form.parcel_weight_kg),
        odometer_start: form.odometer_start === '' ? null : Number(form.odometer_start),
        odometer_end: form.odometer_end === '' ? null : Number(form.odometer_end),
        miles: form.miles === '' ? null : Number(form.miles),
        rate_per_mile: form.rate_per_mile === '' ? null : Number(form.rate_per_mile),
        fixed_price: form.fixed_price === '' ? null : Number(form.fixed_price),
        notes: form.notes,
      };
      const { job: updated } = await api.updateJob(id, payload);
      apply(updated, 'Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function quick(patch, message) {
    setError('');
    setNotice('');
    try {
      const { job: updated } = await api.updateJob(id, patch);
      apply(updated, message);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !job) return <Message error={error} />;
  if (!job || !form) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumb">
            <Link to="/jobs">← All deliveries</Link>
          </p>
          <h1>
            <span className="mono">{job.reference}</span> <StatusBadge status={job.status} />
          </h1>
          <p>
            <Link to={`/customers/${job.customer_id}`}>{job.customer_name}</Link> · booked{' '}
            {dateTime(job.created_at)}
          </p>
        </div>
      </div>

      <Message error={error} success={notice} />

      <div className="quick-actions">
        {job.status === 'requested' && (
          <button type="button" onClick={() => quick({ status: 'scheduled' }, 'Job scheduled.')}>
            Confirm &amp; schedule
          </button>
        )}
        {job.status === 'scheduled' && (
          <button type="button" onClick={() => quick({ status: 'in_progress' }, 'Marked collected.')}>
            Mark collected
          </button>
        )}
        {job.status === 'in_progress' && (
          <button type="button" onClick={() => quick({ status: 'delivered' }, 'Marked delivered.')}>
            Mark delivered
          </button>
        )}
        {job.status === 'delivered' && !job.invoiced && (
          <button type="button" onClick={() => quick({ invoiced: true }, 'Marked invoiced.')}>
            Mark invoiced
          </button>
        )}
        {job.status === 'delivered' && !job.paid && (
          <button type="button" onClick={() => quick({ paid: true }, 'Marked paid.')}>
            Mark paid
          </button>
        )}
      </div>

      <div className="grid grid-2">
        <Card title="Route">
          <h4>Pickup</h4>
          <p className="address">{addressLine(prefixed(job, 'pickup'))}</p>
          {(job.pickup_contact_name || job.pickup_phone) && (
            <p className="muted small">
              {[job.pickup_contact_name, job.pickup_phone].filter(Boolean).join(' · ')}
            </p>
          )}

          <h4>Drop-off</h4>
          <p className="address">{addressLine(prefixed(job, 'dropoff'))}</p>
          {(job.dropoff_contact_name || job.dropoff_phone) && (
            <p className="muted small">
              {[job.dropoff_contact_name, job.dropoff_phone].filter(Boolean).join(' · ')}
            </p>
          )}

          <dl className="facts">
            <div>
              <dt>Collected</dt>
              <dd>{dateTime(job.collected_at)}</dd>
            </div>
            <div>
              <dt>Delivered</dt>
              <dd>{dateTime(job.delivered_at)}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{job.miles ? miles(job.miles) : '—'}</dd>
            </div>
            <div>
              <dt>Charge</dt>
              <dd>{job.price ? money(job.price) : '—'}</dd>
            </div>
          </dl>

          {job.price > 0 && (
            <>
              <h4>Price breakdown</h4>
              <table>
                <tbody>
                  {job.fixed_price != null ? (
                    <tr>
                      <td>Fixed price</td>
                      <td className="num">{money(job.fixed_price)}</td>
                    </tr>
                  ) : (
                    <>
                      {job.base_fee > 0 && (
                        <tr>
                          <td>Base fee</td>
                          <td className="num">{money(job.base_fee)}</td>
                        </tr>
                      )}
                      <tr>
                        <td>
                          Mileage — {miles(job.miles)} × {money(job.rate_per_mile)}
                        </td>
                        <td className="num">
                          {money(job.price - job.base_fee - job.fuel_surcharge - job.tax_amount)}
                        </td>
                      </tr>
                      {job.fuel_surcharge > 0 && (
                        <tr>
                          <td>Fuel surcharge</td>
                          <td className="num">{money(job.fuel_surcharge)}</td>
                        </tr>
                      )}
                    </>
                  )}
                  {job.tax_amount > 0 && (
                    <tr>
                      <td>Tax</td>
                      <td className="num">{money(job.tax_amount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td className="num">
                      <strong>{money(job.price)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </Card>

        <Card title="Update job">
          <form onSubmit={save}>
            <div className="row">
              <Field label="Status">
                <select value={form.status} onChange={set('status')}>
                  {STATUS_FLOW.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Driver">
                <select value={form.driver_id} onChange={set('driver_id')}>
                  <option value="">Unassigned</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.vehicle_reg ? ` (${driver.vehicle_reg})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Collection time">
              <input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} />
            </Field>

            <div className="row">
              <Field label="What's being moved">
                <input value={form.parcel_description} onChange={set('parcel_description')} />
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.parcel_weight_kg}
                  onChange={set('parcel_weight_kg')}
                />
              </Field>
            </div>

            <div className="row">
              <Field label="Odometer start">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.odometer_start}
                  onChange={set('odometer_start')}
                />
              </Field>
              <Field label="Odometer end" hint="Miles fill in automatically.">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.odometer_end}
                  onChange={set('odometer_end')}
                />
              </Field>
            </div>

            <div className="row">
              <Field label="Miles" hint="Overridden by the odometer if both are set.">
                <input type="number" step="0.1" min="0" value={form.miles} onChange={set('miles')} />
              </Field>
              <Field label="Rate per mile" hint={`Customer default ${money(job.customer_rate_per_mile)}`}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.rate_per_mile}
                  onChange={set('rate_per_mile')}
                />
              </Field>
              <Field label="Fixed price" hint="Beats the per-mile rate.">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.fixed_price}
                  onChange={set('fixed_price')}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea rows={3} value={form.notes} onChange={set('notes')} />
            </Field>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <span className="muted small">
                {job.invoiced ? 'Invoiced' : 'Not invoiced'} · {job.paid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

/** Job rows carry pickup_* / dropoff_* columns; reshape one side for addressLine(). */
function prefixed(job, side) {
  return {
    line1: job[`${side}_line1`],
    line2: job[`${side}_line2`],
    city: job[`${side}_city`],
    postcode: job[`${side}_postcode`],
  };
}
