import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Card, Empty, Loading, Message, Stat, StatusBadge } from '../../components.jsx';
import { dateTime, miles, money } from '../../format.js';

function JobRows({ jobs, emptyText }) {
  if (!jobs.length) return <Empty>{emptyText}</Empty>;

  return (
    <table>
      <thead>
        <tr>
          <th>Reference</th>
          <th>When</th>
          <th>Route</th>
          <th>Status</th>
          <th className="num">Cost</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td className="mono">{job.reference}</td>
            <td>{dateTime(job.scheduled_at || job.created_at)}</td>
            <td>
              {job.pickup_city || job.pickup_postcode} → {job.dropoff_city || job.dropoff_postcode}
              {job.parcel_description && (
                <div className="muted small">{job.parcel_description}</div>
              )}
            </td>
            <td>
              <StatusBadge status={job.status} />
              {job.driver_name && <div className="muted small">{job.driver_name}</div>}
            </td>
            <td className="num">{job.price ? money(job.price) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * "How did we do?" - shows once the customer has at least one completed
 * delivery, and disappears for good after they leave a review. Signed-in
 * submissions are automatically badged "verified customer" once approved.
 */
function HowDidWeDo({ deliveredCount }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!deliveredCount) return;
    // Only ask people we have not asked successfully before.
    api
      .reviews({ mine: 'true' })
      .then((data) => setVisible(data.reviews.length === 0))
      .catch(() => {});
  }, [deliveredCount]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createReview({
        name: user.name,
        business: user.customer?.name || '',
        rating,
        comment,
      });
      setThanks(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  if (thanks) {
    return (
      <Card title="How did we do?">
        <p style={{ margin: 0 }}>
          <strong>Thank you!</strong> Your review is with us and will appear on our site once
          it&apos;s approved.
        </p>
      </Card>
    );
  }

  return (
    <Card title="How did we do?">
      <p className="muted" style={{ margin: '0 0 12px' }}>
        You&apos;ve had {deliveredCount} {deliveredCount === 1 ? 'delivery' : 'deliveries'} with
        us — a quick review helps other businesses find us.
      </p>

      <Message error={error} />

      <form onSubmit={submit}>
        <div className="star-input" style={{ marginBottom: 12 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={value <= rating ? 'on' : ''}
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          required
          maxLength={1000}
          rows={3}
          placeholder="How did we do?"
        />

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send review'}
          </button>
          <button type="button" className="link" onClick={() => setVisible(false)}>
            Maybe later
          </button>
        </div>
      </form>
    </Card>
  );
}

export default function CustomerDashboard() {  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <Message error={error} />;
  if (!data) return <Loading />;

  const { totals, upcoming, recent } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hello, {user.name.split(' ')[0]}</h1>
          <p>
            {totals.open_jobs
              ? `${totals.open_jobs} ${totals.open_jobs === 1 ? 'delivery' : 'deliveries'} in progress.`
              : 'Nothing on the road right now.'}
          </p>
        </div>
        <Link to="/book">
          <button type="button">Book a delivery</button>
        </Link>
      </div>

      <div className="stats">
        <Stat label="In progress" value={totals.open_jobs} />
        <Stat label="Delivered" value={totals.delivered_total} hint="All time" />
        <Stat label="Miles this month" value={miles(totals.miles_this_month)} />
        <Stat label="Spend this month" value={money(totals.spend_this_month)} />
        <Stat
          label="Outstanding"
          value={money(totals.outstanding)}
          tone={totals.outstanding > 0 ? 'warn' : undefined}
        />
      </div>

      <HowDidWeDo deliveredCount={totals.delivered_total} />

      <Card title="Coming up">
        <JobRows jobs={upcoming} emptyText="No deliveries booked. Book one and it will appear here." />
      </Card>

      <Card
        title="Recently delivered"
        action={
          <Link to="/deliveries" className="small">
            See all
          </Link>
        }
      >
        <JobRows jobs={recent} emptyText="Nothing delivered yet." />
      </Card>
    </>
  );
}
