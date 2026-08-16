import { useEffect, useState } from 'react';

import { api } from '../../api.js';
import { Card, Empty, Field, Loading, Message } from '../../components.jsx';
import { addressLine } from '../../format.js';

const BLANK = {
  label: '',
  contact_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  postcode: '',
  is_default_pickup: false,
  is_default_dropoff: false,
};

/**
 * The address book is the reason a repeat booking takes two clicks, so it is
 * worth keeping tidy. Deleting archives, so old deliveries keep their history.
 */
export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // address id, or 'new'
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  function load() {
    return api
      .addresses()
      .then((data) => setAddresses(data.addresses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const set = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));

  function startNew() {
    setForm(BLANK);
    setEditing('new');
  }

  function startEdit(address) {
    setForm({
      label: address.label || '',
      contact_name: address.contact_name || '',
      phone: address.phone || '',
      line1: address.line1 || '',
      line2: address.line2 || '',
      city: address.city || '',
      postcode: address.postcode || '',
      is_default_pickup: address.is_default_pickup,
      is_default_dropoff: address.is_default_dropoff,
    });
    setEditing(address.id);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing === 'new') {
        await api.createAddress(form);
        setNotice('Address saved. It will be offered next time you book.');
      } else {
        await api.updateAddress(editing, form);
        setNotice('Address updated. Past deliveries keep their original address.');
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(address) {
    setError('');
    try {
      await api.deleteAddress(address.id);
      setNotice(`${address.label || address.line1} removed.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function makeDefault(address, side) {
    setError('');
    try {
      await api.updateAddress(address.id, { [`is_default_${side}`]: true });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Saved addresses</h1>
          <p>Your usual pickup and drop-off are filled in for you every time you book.</p>
        </div>
        <button type="button" onClick={startNew}>
          Add an address
        </button>
      </div>

      <Message error={error} success={notice} />

      {editing !== null && (
        <Card title={editing === 'new' ? 'New address' : 'Edit address'}>
          <form onSubmit={save}>
            <Field label="Save as" hint="A short name, e.g. “Warehouse”.">
              <input value={form.label} onChange={set('label')} placeholder="Optional" />
            </Field>

            <div className="row">
              <Field label="Contact name">
                <input value={form.contact_name} onChange={set('contact_name')} />
              </Field>
              <Field label="Contact phone">
                <input value={form.phone} onChange={set('phone')} />
              </Field>
            </div>

            <Field label="Address line 1">
              <input value={form.line1} onChange={set('line1')} required />
            </Field>

            <Field label="Address line 2">
              <input value={form.line2} onChange={set('line2')} />
            </Field>

            <div className="row">
              <Field label="Town / city">
                <input value={form.city} onChange={set('city')} />
              </Field>
              <Field label="Postcode">
                <input value={form.postcode} onChange={set('postcode')} />
              </Field>
            </div>

            <div className="row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.is_default_pickup}
                  onChange={set('is_default_pickup')}
                />
                <span>Use as my usual pickup</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.is_default_dropoff}
                  onChange={set('is_default_dropoff')}
                />
                <span>Use as my usual drop-off</span>
              </label>
            </div>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save address'}
              </button>
              <button type="button" className="secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {!addresses.length ? (
        <Card>
          <Empty>No saved addresses yet — the first delivery you book will save them for you.</Empty>
        </Card>
      ) : (
        <div className="grid grid-2">
          {addresses.map((address) => (
            <Card
              key={address.id}
              title={address.label || address.line1}
              action={
                <span className="card-actions">
                  <button type="button" className="link" onClick={() => startEdit(address)}>
                    Edit
                  </button>
                  <button type="button" className="link danger" onClick={() => remove(address)}>
                    Remove
                  </button>
                </span>
              }
            >
              <p className="address">{addressLine(address)}</p>
              {address.contact_name && (
                <p className="muted small">
                  {address.contact_name}
                  {address.phone ? ` · ${address.phone}` : ''}
                </p>
              )}

              <div className="tags">
                {address.is_default_pickup ? (
                  <span className="tag">Usual pickup</span>
                ) : (
                  <button
                    type="button"
                    className="link small"
                    onClick={() => makeDefault(address, 'pickup')}
                  >
                    Make usual pickup
                  </button>
                )}
                {address.is_default_dropoff ? (
                  <span className="tag">Usual drop-off</span>
                ) : (
                  <button
                    type="button"
                    className="link small"
                    onClick={() => makeDefault(address, 'dropoff')}
                  >
                    Make usual drop-off
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
