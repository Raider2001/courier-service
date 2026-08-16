import { useState } from 'react';

import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Card, Field, Message } from '../../components.jsx';
import { money } from '../../format.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const customer = user.customer;

  const [details, setDetails] = useState({
    name: customer?.name || '',
    contact_name: customer?.contact_name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
  });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });

  const [detailState, setDetailState] = useState({ busy: false, error: '', notice: '' });
  const [passwordState, setPasswordState] = useState({ busy: false, error: '', notice: '' });

  const setDetail = (key) => (event) =>
    setDetails((current) => ({ ...current, [key]: event.target.value }));
  const setPassword = (key) => (event) =>
    setPasswords((current) => ({ ...current, [key]: event.target.value }));

  async function saveDetails(event) {
    event.preventDefault();
    setDetailState({ busy: true, error: '', notice: '' });
    try {
      await api.updateCustomer(customer.id, details);
      const { user: fresh } = await api.me();
      setUser(fresh);
      setDetailState({ busy: false, error: '', notice: 'Details saved.' });
    } catch (err) {
      setDetailState({ busy: false, error: err.message, notice: '' });
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordState({ busy: true, error: '', notice: '' });
    try {
      await api.changePassword(passwords);
      setPasswords({ current_password: '', new_password: '' });
      setPasswordState({ busy: false, error: '', notice: 'Password changed.' });
    } catch (err) {
      setPasswordState({ busy: false, error: err.message, notice: '' });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>Change these once and every future booking uses them.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <Card title="Your details">
          <form onSubmit={saveDetails}>
            <Message error={detailState.error} success={detailState.notice} />

            <Field label="Company or account name">
              <input value={details.name} onChange={setDetail('name')} required />
            </Field>

            <Field label="Main contact">
              <input value={details.contact_name} onChange={setDetail('contact_name')} />
            </Field>

            <div className="row">
              <Field label="Email">
                <input type="email" value={details.email} onChange={setDetail('email')} />
              </Field>
              <Field label="Phone">
                <input value={details.phone} onChange={setDetail('phone')} />
              </Field>
            </div>

            <div className="actions">
              <button type="submit" disabled={detailState.busy}>
                {detailState.busy ? 'Saving…' : 'Save details'}
              </button>
              {customer?.rate_per_mile != null && (
                <span className="muted small">
                  Your agreed rate is {money(customer.rate_per_mile)} per mile.
                </span>
              )}
            </div>
          </form>
        </Card>

        <Card title="Password">
          <form onSubmit={savePassword}>
            <Message error={passwordState.error} success={passwordState.notice} />

            <Field label="Current password">
              <input
                type="password"
                value={passwords.current_password}
                onChange={setPassword('current_password')}
                required
              />
            </Field>

            <Field label="New password" hint="At least 8 characters.">
              <input
                type="password"
                value={passwords.new_password}
                onChange={setPassword('new_password')}
                required
                minLength={8}
              />
            </Field>

            <div className="actions">
              <button type="submit" disabled={passwordState.busy}>
                {passwordState.busy ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
