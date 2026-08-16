import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth.jsx';
import { Field, Message } from '../components.jsx';

const EMPTY = {
  name: '',
  business_name: '',
  email: '',
  phone: '',
  password: '',
};

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create an account</h1>
        <p className="lede">
          Tell us who you are once. After that your details are saved and booking takes seconds.
        </p>

        <Message error={error} />

        <Field label="Your name">
          <input value={form.name} onChange={set('name')} required autoFocus />
        </Field>

        <Field label="Company" hint="Leave blank if you are booking as an individual.">
          <input value={form.business_name} onChange={set('business_name')} />
        </Field>

        <div className="row">
          <Field label="Email">
            <input type="email" value={form.email} onChange={set('email')} required />
          </Field>

          <Field label="Phone">
            <input value={form.phone} onChange={set('phone')} />
          </Field>
        </div>

        <Field label="Password" hint="At least 8 characters.">
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={8}
          />
        </Field>

        <button type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>

        <p className="auth-switch">
          <Link to="/">← Back to home</Link>
        </p>
      </form>
    </div>
  );
}
