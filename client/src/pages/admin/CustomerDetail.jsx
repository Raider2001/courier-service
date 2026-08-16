import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Empty, Field, Loading, Message, Stat, StatusBadge } from '../../components.jsx';
import { addressLine, dateTime, miles, money } from '../../format.js';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([api.customer(id), api.jobs({ customerId: id, limit: 100 })])
      .then(([customerData, jobData]) => {
        setData(customerData);
        setJobs(jobData.jobs);
        setForm({
          name: customerData.customer.name || '',
          contact_name: customerData.customer.contact_name || '',
          email: customerData.customer.email || '',
          phone: customerData.customer.phone || '',
          rate_per_mile: customerData.customer.rate_per_mile ?? '',
          notes: customerData.customer.notes || '',
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { customer } = await api.updateCustomer(id, {
        ...form,
        rate_per_mile: form.rate_per_mile === '' ? null : Number(form.rate_per_mile),
      });
      setData((current) => ({ ...current, customer }));
      setNotice('Saved. New jobs will use this rate.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <Message error={error} />;
  if (!data || !form) return <Loading />;

  const { customer, addresses, totals } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="crumb">
            <Link to="/customers">← All customers</Link>
          </p>
          <h1>{customer.name}</h1>
          <p>
            {[customer.contact_name, customer.email, customer.phone].filter(Boolean).join(' · ') ||
              'No contact details yet.'}
          </p>
        </div>
      </div>

      <Message error={error} success={notice} />

      <div className="stats">
        <Stat label="Deliveries" value={totals.job_count} />
        <Stat label="Miles" value={miles(totals.total_miles)} />
        <Stat label="Billed" value={money(totals.total_billed)} />
        <Stat
          label="Outstanding"
          value={money(totals.outstanding)}
          tone={totals.outstanding > 0 ? 'warn' : undefined}
        />
      </div>

      <div className="grid grid-2">
        <Card title="Account">
          <form onSubmit={save}>
            <div className="row">
              <Field label="Company or account name">
                <input value={form.name} onChange={set('name')} required />
              </Field>
              <Field label="Main contact">
                <input value={form.contact_name} onChange={set('contact_name')} />
              </Field>
            </div>

            <div className="row">
              <Field label="Email">
                <input type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Rate per mile">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.rate_per_mile}
                  onChange={set('rate_per_mile')}
                />
              </Field>
            </div>

            <Field label="Notes" hint="Only you can see these.">
              <textarea rows={3} value={form.notes} onChange={set('notes')} />
            </Field>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save customer'}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Saved addresses" action={<span className="muted small">{addresses.length}</span>}>
          {!addresses.length ? (
            <Empty>None saved yet — they will build up as jobs are booked.</Empty>
          ) : (
            <ul className="plain">
              {addresses.map((address) => (
                <li key={address.id}>
                  <strong>{address.label || address.line1}</strong>
                  <div className="address small">{addressLine(address)}</div>
                  <div className="tags">
                    {address.is_default_pickup && <span className="tag">Usual pickup</span>}
                    {address.is_default_dropoff && <span className="tag">Usual drop-off</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Delivery history">
        {!jobs.length ? (
          <Empty>No deliveries booked yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>When</th>
                <th>Route</th>
                <th>Status</th>
                <th className="num">Miles</th>
                <th className="num">Value</th>
                <th>Billing</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="mono">
                    <Link to={`/jobs/${job.id}`}>{job.reference}</Link>
                  </td>
                  <td>{dateTime(job.scheduled_at || job.created_at)}</td>
                  <td>
                    {job.pickup_city || job.pickup_postcode} →{' '}
                    {job.dropoff_city || job.dropoff_postcode}
                  </td>
                  <td>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="num">{job.miles ? miles(job.miles) : '—'}</td>
                  <td className="num">{job.price ? money(job.price) : '—'}</td>
                  <td>
                    {job.status === 'delivered' ? (
                      <span className={`pill ${job.paid ? 'pill-paid' : 'pill-due'}`}>
                        {job.paid ? 'Paid' : job.invoiced ? 'Invoiced' : 'To invoice'}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
