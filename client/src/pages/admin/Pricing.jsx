import { useEffect, useMemo, useState } from 'react';

import { api } from '../../api.js';
import { Card, Field, Loading, Message } from '../../components.jsx';
import { money } from '../../format.js';

/**
 * The owner's pricing rules. Four numbers, one honest model:
 * base fee + miles x rate, fuel free inside the radius then per-mile beyond,
 * tax on top. The live example recalculates as she types.
 */
export default function AdminPricing() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .settings()
      .then((data) =>
        setForm({
          base_fee: data.settings.base_fee,
          fuel_free_miles: data.settings.fuel_free_miles,
          fuel_per_mile: data.settings.fuel_per_mile,
          tax_rate: data.settings.tax_rate,
        })
      )
      .catch((err) => setError(err.message));
  }, []);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  // A worked example so the numbers are never abstract: a 40-mile run at $1.35.
  const example = useMemo(() => {
    if (!form) return null;
    const miles = 40;
    const rate = 1.35;
    const base = Number(form.base_fee) || 0;
    const free = Number(form.fuel_free_miles) || 0;
    const cpm = Number(form.fuel_per_mile) || 0;
    const tax = Number(form.tax_rate) || 0;

    const mileage = Math.round(miles * rate * 100) / 100;
    const fuel = Math.round(Math.max(0, miles - free) * cpm * 100) / 100;
    const subtotal = Math.round((base + mileage + fuel) * 100) / 100;
    const taxAmount = Math.round(subtotal * tax) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    return { miles, rate, base, free, mileage, fuel, subtotal, taxAmount, total };
  }, [form]);

  async function save(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { settings } = await api.updateSettings({
        base_fee: Number(form.base_fee) || 0,
        fuel_free_miles: Number(form.fuel_free_miles) || 0,
        fuel_per_mile: Number(form.fuel_per_mile) || 0,
        tax_rate: Number(form.tax_rate) || 0,
      });
      setForm(settings);
      setNotice('Pricing updated. New bookings use these numbers; past jobs keep theirs.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !form) return <Message error={error} />;
  if (!form) return <Loading />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pricing</h1>
          <p>Your rules for every job. Each customer&apos;s per-mile rate is set on their page.</p>
        </div>
      </div>

      <Message error={error} success={notice} />

      <div className="grid grid-2">
        <Card title="The rules">
          <form onSubmit={save}>
            <Field label="Base fee ($)" hint="Flat amount on every per-mile job - covers the stop itself.">
              <input type="number" step="0.25" min="0" value={form.base_fee} onChange={set('base_fee')} />
            </Field>

            <div className="row">
              <Field label="Fuel-free radius (miles)" hint="No fuel charge inside this distance.">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form.fuel_free_miles}
                  onChange={set('fuel_free_miles')}
                />
              </Field>
              <Field
                label="Fuel per extra mile ($)"
                hint="Only the miles beyond the radius. Lower it where gas is cheap."
              >
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={form.fuel_per_mile}
                  onChange={set('fuel_per_mile')}
                />
              </Field>
            </div>

            <Field
              label="Sales tax (%)"
              hint="Leave at 0 until your accountant confirms delivery services are taxable in your state."
            >
              <input type="number" step="0.25" min="0" value={form.tax_rate} onChange={set('tax_rate')} />
            </Field>

            <div className="actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save pricing'}
              </button>
            </div>
          </form>
        </Card>

        <Card title={`Example: a ${example.miles}-mile run at ${money(example.rate)}/mile`}>
          <table>
            <tbody>
              <tr>
                <td>Base fee</td>
                <td className="num">{money(example.base)}</td>
              </tr>
              <tr>
                <td>
                  Mileage — {example.miles} mi × {money(example.rate)}
                </td>
                <td className="num">{money(example.mileage)}</td>
              </tr>
              <tr>
                <td>
                  Fuel — {Math.max(0, example.miles - example.free)} mi beyond the {example.free}-mile radius
                </td>
                <td className="num">{money(example.fuel)}</td>
              </tr>
              <tr>
                <td>Tax</td>
                <td className="num">{money(example.taxAmount)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Customer pays</strong>
                </td>
                <td className="num">
                  <strong>{money(example.total)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted small" style={{ marginTop: 12 }}>
            Changes only affect jobs priced from now on — completed jobs keep the numbers they
            were billed with.
          </p>
        </Card>
      </div>
    </>
  );
}
