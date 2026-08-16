import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Empty, Loading, Message, StatusBadge } from '../../components.jsx';
import { STATUS_LABELS, dateTime, miles, money } from '../../format.js';

const VIEWS = [
  { key: 'live', label: 'Live', params: { status: 'requested,scheduled,in_progress' } },
  { key: 'today', label: 'Today', params: { from: today(), to: today() } },
  { key: 'unpaid', label: 'Unpaid', params: { unpaid: 'true' } },
  { key: 'uninvoiced', label: 'To invoice', params: { uninvoiced: 'true' } },
  { key: 'all', label: 'Everything', params: {} },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminJobs() {
  const [view, setView] = useState('live');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = VIEWS.find((v) => v.key === view)?.params || {};
    setLoading(true);
    api
      .jobs({ ...params, q: query })
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view, query]);

  useEffect(load, [load]);

  function submitSearch(event) {
    event.preventDefault();
    setQuery(search.trim());
  }

  const totalMiles = jobs.reduce((sum, job) => sum + Number(job.miles || 0), 0);
  const totalValue = jobs.reduce((sum, job) => sum + Number(job.price || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Deliveries</h1>
          <p>Every job, filtered how you need it.</p>
        </div>
        <form onSubmit={submitSearch} className="search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Reference, customer, ZIP code…"
          />
          <button type="submit" className="secondary">
            Search
          </button>
          {query && (
            <button
              type="button"
              className="link"
              onClick={() => {
                setSearch('');
                setQuery('');
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <Message error={error} />

      <div className="filters">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={view === v.key ? '' : 'secondary'}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Card
        action={
          !loading && jobs.length ? (
            <span className="muted small">
              {jobs.length} jobs · {miles(totalMiles)} · {money(totalValue)}
            </span>
          ) : null
        }
      >
        {loading ? (
          <Loading />
        ) : !jobs.length ? (
          <Empty>No deliveries match this view.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>When</th>
                <th>Route</th>
                <th>Driver</th>
                <th>Status</th>
                <th className="num">Miles</th>
                <th className="num">Value</th>
                <th>Billing</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="mono">
                    <Link to={`/jobs/${job.id}`}>{job.reference}</Link>
                  </td>
                  <td>
                    <Link to={`/customers/${job.customer_id}`}>{job.customer_name}</Link>
                  </td>
                  <td>{dateTime(job.scheduled_at || job.created_at)}</td>
                  <td>
                    {job.pickup_city || job.pickup_postcode} →{' '}
                    {job.dropoff_city || job.dropoff_postcode}
                  </td>
                  <td>{job.driver_name || <span className="muted">Unassigned</span>}</td>
                  <td>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="num">{job.miles ? miles(job.miles) : '—'}</td>
                  <td className="num">{job.price ? money(job.price) : '—'}</td>
                  <td>
                    {job.status === 'delivered' ? (
                      <span className={`pill ${job.paid ? 'pill-paid' : 'pill-due'}`}>
                        {job.paid ? 'Paid' : job.invoiced ? 'Invoiced' : 'To invoice'}
                      </span>
                    ) : (
                      <span className="muted small">{STATUS_LABELS[job.status]}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
