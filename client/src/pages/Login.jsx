import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth.jsx';
import { Field, Message } from '../components.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p className="lede">Book a delivery or check where your parcels are.</p>

        <Message error={error} />

        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} required autoFocus />
        </Field>

        <Field label="Password">
          <input type="password" value={form.password} onChange={set('password')} required />
        </Field>

        <button type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth-switch">
          New customer? <Link to="/register">Create an account</Link>
        </p>

        <p className="demo-hint">
          Demo logins — owner: <strong>admin@courier.local</strong> / changeme123 · customer:{' '}
          <strong>demo@customer.local</strong> / demo1234 · driver:{' '}
          <strong>danny@courier.local</strong> / drive1234
        </p>
      </form>
    </div>
  );
}
