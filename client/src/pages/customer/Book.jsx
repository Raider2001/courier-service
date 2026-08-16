import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Field, Loading, Message } from '../../components.jsx';
import { addressLine, money, toLocalInput } from '../../format.js';

const BLANK_ADDRESS = {
  label: '',
  contact_name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  postcode: '',
};

/** In an hour's time, rounded to the next quarter hour - a sensible default. */
function defaultCollection() {
  const when = new Date(Date.now() + 60 * 60 * 1000);
  when.setMinutes(Math.ceil(when.getMinutes() / 15) * 15, 0, 0);
  return toLocalInput(when);
}

/**
 * Saved addresses first, "somewhere new" last. Picking a saved one is a single
 * click - which is the whole point for a returning customer.
 */
function EndpointPicker({ side, title, addresses, selection, onSelect, onEdit }) {
  const isNew = selection.addressId === null;

  return (
    <Card title={title}>
      {addresses.length > 0 && (
        <div className="picker">
          {addresses.map((address) => (
            <button
              key={address.id}
              type="button"
              className={`picker-option ${selection.addressId === address.id ? 'selected' : ''}`}
              onClick={() => onSelect(address.id)}
            >
              <strong>{address.label || addressLine(address)}</strong>
              <span>{addressLine(address)}</span>
              {address.contact_name && <span>{address.contact_name}</span>}
              {(side === 'pickup' ? address.is_default_pickup : address.is_default_dropoff) && (
                <em>Usual {side}</em>
              )}
            </button>
          ))}

          <button
            type="button"
            className={`picker-option ${isNew ? 'selected' : ''}`}
            onClick={() => onSelect(null)}
          >
            <strong>Somewhere new</strong>
            <span>Type an address — we&apos;ll save it for next time.</span>
          </button>
        </div>
      )}

      {isNew && (
        <>
          <Field label="Save as" hint="A short name, e.g. “Warehouse” or “Client — Miller &amp; Co.”">
            <input
              value={selection.fresh.label}
              onChange={onEdit('label')}
              placeholder="Optional"
            />
          </Field>

          <div className="row">
            <Field label="Contact name">
              <input value={selection.fresh.contact_name} onChange={onEdit('contact_name')} />
            </Field>
            <Field label="Contact phone">
              <input value={selection.fresh.phone} onChange={onEdit('phone')} />
            </Field>
          </div>

          <Field label="Address line 1">
            <input value={selection.fresh.line1} onChange={onEdit('line1')} required />
          </Field>

          <Field label="Address line 2">
            <input value={selection.fresh.line2} onChange={onEdit('line2')} />
          </Field>

          <div className="row">
            <Field label="Town / city">
              <input value={selection.fresh.city} onChange={onEdit('city')} />
            </Field>
            <Field label="ZIP code">
              <input value={selection.fresh.postcode} onChange={onEdit('postcode')} />
            </Field>
          </div>
        </>
      )}
    </Card>
  );
}

export default function BookDelivery() {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [pickup, setPickup] = useState({ addressId: null, fresh: { ...BLANK_ADDRESS } });
  const [dropoff, setDropoff] = useState({ addressId: null, fresh: { ...BLANK_ADDRESS } });
  const [details, setDetails] = useState({
    parcel_description: '',
    parcel_weight_kg: '',
    scheduled_at: defaultCollection(),
    notes: '',
  });

  // One request gives us the address book and the customer's rate, so the form
  // arrives already filled in for anyone who has booked before.
  useEffect(() => {
    let live = true;
    Promise.all([api.addresses(), api.me()])
      .then(([addressData, meData]) => {
        if (!live) return;
        const list = addressData.addresses || [];
        setAddresses(list);
        setRate(meData.user?.customer?.rate_per_mile ?? null);

        const usualPickup = list.find((a) => a.is_default_pickup) || list[0];
        const usualDropoff =
          list.find((a) => a.is_default_dropoff) ||
          list.find((a) => a.id !== usualPickup?.id) ||
          null;

        if (usualPickup) setPickup((p) => ({ ...p, addressId: usualPickup.id }));
        if (usualDropoff) setDropoff((d) => ({ ...d, addressId: usualDropoff.id }));
      })
      .catch((err) => live && setError(err.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const editFresh = (setter) => (key) => (event) =>
    setter((current) => ({ ...current, fresh: { ...current.fresh, [key]: event.target.value } }));

  const setDetail = (key) => (event) =>
    setDetails((current) => ({ ...current, [key]: event.target.value }));

  const ready = useMemo(() => {
    const ok = (side) => side.addressId !== null || side.fresh.line1.trim().length > 0;
    return ok(pickup) && ok(dropoff);
  }, [pickup, dropoff]);

  function endpointPayload(side, selection) {
    if (selection.addressId !== null) return { [`${side}_address_id`]: selection.addressId };
    return { [side]: { ...selection.fresh, save: true } };
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { job } = await api.createJob({
        ...endpointPayload('pickup', pickup),
        ...endpointPayload('dropoff', dropoff),
        parcel_description: details.parcel_description,
        parcel_weight_kg: details.parcel_weight_kg || null,
        scheduled_at: details.scheduled_at
          ? new Date(details.scheduled_at).toISOString()
          : null,
        notes: details.notes,
      });
      navigate('/deliveries', { state: { booked: job.reference } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Book a delivery</h1>
          <p>
            {addresses.length
              ? 'Your usual addresses are already selected — change them only if you need to.'
              : 'First booking, so we need the addresses once. After this they are one click.'}
          </p>
        </div>
      </div>

      <Message error={error} />

      <form onSubmit={onSubmit}>
        <div className="grid grid-2">
          <EndpointPicker
            side="pickup"
            title="Collect from"
            addresses={addresses}
            selection={pickup}
            onSelect={(addressId) => setPickup((p) => ({ ...p, addressId }))}
            onEdit={editFresh(setPickup)}
          />

          <EndpointPicker
            side="dropoff"
            title="Deliver to"
            addresses={addresses}
            selection={dropoff}
            onSelect={(addressId) => setDropoff((d) => ({ ...d, addressId }))}
            onEdit={editFresh(setDropoff)}
          />
        </div>

        <Card title="The parcel">
          <div className="row">
            <Field label="What are we carrying?">
              <input
                value={details.parcel_description}
                onChange={setDetail('parcel_description')}
                placeholder="e.g. 2 boxes of printed brochures"
              />
            </Field>

            <Field label="Weight (kg)">
              <input
                type="number"
                step="0.1"
                min="0"
                value={details.parcel_weight_kg}
                onChange={setDetail('parcel_weight_kg')}
              />
            </Field>
          </div>

          <Field label="Collection time" hint="We will confirm before a driver sets off.">
            <input
              type="datetime-local"
              value={details.scheduled_at}
              onChange={setDetail('scheduled_at')}
            />
          </Field>

          <Field label="Anything we should know?">
            <textarea
              value={details.notes}
              onChange={setDetail('notes')}
              placeholder="Access codes, who to ask for, fragile items…"
            />
          </Field>

          <div className="actions">
            <button type="submit" disabled={busy || !ready}>
              {busy ? 'Booking…' : 'Book this delivery'}
            </button>
            {rate !== null && (
              <span className="muted small">
                Charged at {money(rate)} per mile once the run is complete.
              </span>
            )}
          </div>
        </Card>
      </form>
    </>
  );
}
