import { useEffect, useState } from 'react';

import { api } from '../../api.js';
import { Card, Empty, Field, Loading, Message } from '../../components.jsx';
import { miles } from '../../format.js';

const BLANK = { name: '', phone: '', email: '', vehicle_reg: '', password: '' };

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // driver id, or 'new'
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  function load() {
    return api
      .drivers({ includeInactive: 'true' })
      .then((data) => setDrivers(data.drivers))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  function startNew() {
    setForm(BLANK);
    setEditing('new');
  }

  function startEdit(driver) {
    setForm({
      name: driver.name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      vehicle_reg: driver.vehicle_reg || '',
      password: '',
    });
    setEditing(driver.id);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing === 'new') {
        const body = { ...form };
        if (!body.password) delete body.password;
        await api.createDriver(body);
        setNotice(`${form.name} added.`);
      } else {
        const { password, ...rest } = form;
        await api.updateDriver(editing, rest);
        setNotice('Driver updated.');
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setActive(driver, active) {
    setError('');
    try {
      await api.updateDriver(driver.id, { active });
      setNotice(`${driver.name} ${active ? 'back on the road' : 'marked inactive'}.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Loading />;

  const active = drivers.filter((driver) => driver.active);
  const inactive = drivers.filter((driver) => !driver.active);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Drivers</h1>
          <p>Who is available to assign to a job.</p>
        </div>
        <button type="button" onClick={startNew}>
          Add a driver
        </button>
      </div>

      <Message error={error} success={notice} />

      {editing !== null && (
        <Card title={editing === 'new' ? 'New driver' : 'Edit driver'}>
          <form onSubmit={save}>
            <div className="row">
              <Field label="Name">
                <input value={form.name} onChange={set('name')} required />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set('phone')} />
              </Field>
            </div>

            <div className="row">
              <Field label="Email">
                <input type="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="License plate">
                <input value={form.vehicle_reg} onChange={set('vehicle_reg')} />
              </Field>
            </div>

            {editing === 'new' && (
              <Field
                label="App password (optional)"
                hint="Give the driver a login so they can see their runs and mark deliveries done. Needs their email above. 8+ characters."
              >
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
            )}

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save driver'}
              </button>
              <button type="button" className="secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title="On the road">
        <DriverTable
          drivers={active}
          empty="No active drivers — add one so jobs can be assigned."
          onEdit={startEdit}
          action={(driver) => (
            <button type="button" className="link danger" onClick={() => setActive(driver, false)}>
              Mark inactive
            </button>
          )}
        />
      </Card>

      {inactive.length > 0 && (
        <Card title="Inactive">
          <DriverTable
            drivers={inactive}
            empty=""
            onEdit={startEdit}
            action={(driver) => (
              <button type="button" className="link" onClick={() => setActive(driver, true)}>
                Reactivate
              </button>
            )}
          />
        </Card>
      )}
    </>
  );
}

function DriverTable({ drivers, empty, onEdit, action }) {
  if (!drivers.length) return <Empty>{empty}</Empty>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Contact</th>
          <th>Vehicle</th>
          <th className="num">Deliveries</th>
          <th className="num">Miles</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {drivers.map((driver) => (
          <tr key={driver.id}>
            <td>{driver.name}</td>
            <td className="small">
              {[driver.phone, driver.email].filter(Boolean).join(' · ') || (
                <span className="muted">—</span>
              )}
            </td>
            <td className="mono">{driver.vehicle_reg || <span className="muted">—</span>}</td>
            <td className="num">{Number(driver.job_count || 0)}</td>
            <td className="num">{miles(driver.total_miles)}</td>
            <td>
              <span className="card-actions">
                <button type="button" className="link" onClick={() => onEdit(driver)}>
                  Edit
                </button>
                {action(driver)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
