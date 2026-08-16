import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Empty, Loading, Message, Stat, StatusBadge } from '../../components.jsx';
import { dateTime, miles, money } from '../../format.js';

function JobTable({ jobs, empty, showCustomer = true }) {
  if (!jobs.length) return <Empty>{empty}</Empty>;

  return (
    <table>
      <thead>
        <tr>
          <th>Reference</th>
          {showCustomer && <th>Customer</th>}
          <th>When</th>
          <th>Route</th>
          <th>Driver</th>
          <th>Status</th>
          <th className="num">Value</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td className="mono">
              <Link to={`/jobs/${job.id}`}>{job.reference}</Link>
            </td>
            {showCustomer && <td>{job.customer_name}</td>}
            <td>{dateTime(job.scheduled_at || job.created_at)}</td>
            <td>
              {job.pickup_city || job.pickup_postcode} → {job.dropoff_city || job.dropoff_postcode}
            </td>
            <td>{job.driver_name || <span className="muted">Unassigned</span>}</td>
            <td>
              <StatusBadge status={job.status} />
            </td>
            <td className="num">{job.price ? money(job.price) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Message error={error} />;
  if (!data) return <Loading />;

  const { totals, today, needsAttention, recent, topCustomers } = data;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p>
            {totals.jobs_today
              ? `${totals.jobs_today} ${totals.jobs_today === 1 ? 'delivery' : 'deliveries'} on the board today.`
              : 'Nothing booked for today.'}
          </p>
        </div>
        <Link to="/jobs">
          <button type="button">All deliveries</button>
        </Link>
      </div>

      <div className="stats">
        <Stat label="Today" value={totals.jobs_today} hint="Booked for today" />
        <Stat
          label="To schedule"
          value={totals.awaiting_scheduling}
          tone={totals.awaiting_scheduling > 0 ? 'warn' : undefined}
          hint="New requests"
        />
        <Stat label="On the road" value={totals.on_the_road} />
        <Stat label="Miles this month" value={miles(totals.miles_this_month)} />
        <Stat label="Revenue this month" value={money(totals.revenue_this_month)} />
        <Stat
          label="Outstanding"
          value={money(totals.outstanding)}
          tone={totals.outstanding > 0 ? 'warn' : undefined}
          hint={`${totals.awaiting_invoice} to invoice`}
        />
        <Stat label="Deliveries" value={totals.delivered_total} hint="All time" />
        <Stat label="Active customers" value={totals.active_customers} />
      </div>

      {needsAttention.length > 0 && (
        <Card title="Needs you" className="attention">
          <JobTable jobs={needsAttention} empty="All clear." />
        </Card>
      )}

      <Card title="Today's run">
        <JobTable jobs={today} empty="Nothing scheduled for today." />
      </Card>

      <div className="grid grid-2">
        <Card
          title="Recently delivered"
          action={
            <Link to="/jobs" className="small">
              See all
            </Link>
          }
        >
          <JobTable jobs={recent} empty="No completed deliveries yet." />
        </Card>

        <Card title="Best customers this month">
          {!topCustomers.length ? (
            <Empty>No deliveries completed this month yet.</Empty>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">Jobs</th>
                  <th className="num">Miles</th>
                  <th className="num">Billed</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/customers/${row.id}`}>{row.name}</Link>
                    </td>
                    <td className="num">{row.job_count}</td>
                    <td className="num">{miles(row.miles)}</td>
                    <td className="num">{money(row.billed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
