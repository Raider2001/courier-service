import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Empty, Field, Loading, Message } from '../../components.jsx';
import { dateOnly, miles, money } from '../../format.js';

const BLANK = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  rate_per_mile: '1.20',
  notes: '',
  password: '',
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  function load() {
    return api
      .customers()
      .then((data) => setCustomers(data.customers))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function create(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { ...form, rate_per_mile: Number(form.rate_per_mile) };
      if (!payload.password) delete payload.password;
      const { customer } = await api.createCustomer(payload);
      setNotice(
        payload.password
          ? `${customer.name} added — they can log in with ${payload.email} straight away.`
          : `${customer.name} added.`
      );
      setForm(BLANK);
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Rates, totals and what each one still owes.</p>
        </div>
        <button type="button" onClick={() => setAdding((current) => !current)}>
          {adding ? 'Close' : 'Add a customer'}
        </button>
      </div>

      <Message error={error} success={notice} />

      {adding && (
        <Card title="New customer">
          <form onSubmit={create}>
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

            <Field
              label="Set a password for them"
              hint="Optional — fill this in and they can log in and book their own jobs. Needs an email address."
            >
              <input
                type="text"
                value={form.password}
                onChange={set('password')}
                placeholder="Leave blank for an account you manage yourself"
                minLength={8}
              />
            </Field>

            <Field label="Notes">
              <textarea rows={2} value={form.notes} onChange={set('notes')} />
            </Field>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Add customer'}
              </button>
              <button type="button" className="secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {!customers.length ? (
          <Empty>No customers yet — add the first one above.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th className="num">Rate</th>
                <th className="num">Jobs</th>
                <th className="num">Miles</th>
                <th className="num">Billed</th>
                <th className="num">Outstanding</th>
                <th>Last job</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link to={`/customers/${customer.id}`}>{customer.name}</Link>
                  </td>
                  <td className="small">
                    {customer.contact_name || customer.email || customer.phone || (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">{money(customer.rate_per_mile)}</td>
                  <td className="num">{Number(customer.job_count || 0)}</td>
                  <td className="num">{miles(customer.total_miles)}</td>
                  <td className="num">{money(customer.total_billed)}</td>
                  <td className="num">
                    {Number(customer.outstanding || 0) > 0 ? (
                      <span className="pill pill-due">{money(customer.outstanding)}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{dateOnly(customer.last_job_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
