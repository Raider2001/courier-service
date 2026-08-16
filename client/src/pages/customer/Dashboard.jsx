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

export default function CustomerDashboard() {
  const { user } = useAuth();
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
