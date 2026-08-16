import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { api } from '../../api.js';
import { Card, Empty, Loading, Message, StatusBadge } from '../../components.jsx';
import { addressLine, dateTime, miles, money } from '../../format.js';

const FILTERS = [
  { key: 'open', label: 'In progress', status: 'requested,scheduled,in_progress' },
  { key: 'delivered', label: 'Delivered', status: 'delivered' },
  { key: 'all', label: 'Everything', status: '' },
];

export default function Deliveries() {
  const location = useLocation();
  const justBooked = location.state?.booked;

  const [filter, setFilter] = useState('open');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(
    justBooked ? `Booked. Your reference is ${justBooked} — we will confirm the collection shortly.` : ''
  );

  const load = useCallback(() => {
    const status = FILTERS.find((f) => f.key === filter)?.status;
    setLoading(true);
    api
      .jobs({ status })
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  async function cancel(job) {
    setError('');
    try {
      await api.updateJob(job.id, { status: 'cancelled' });
      setNotice(`${job.reference} cancelled.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My deliveries</h1>
          <p>Everything you have sent with us, newest first.</p>
        </div>
        <Link to="/book">
          <button type="button">Book a delivery</button>
        </Link>
      </div>

      <Message error={error} success={notice} />

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? '' : 'secondary'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <Loading />
        ) : !jobs.length ? (
          <Empty>Nothing here yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Collection</th>
                <th>From → to</th>
                <th>Status</th>
                <th className="num">Miles</th>
                <th className="num">Cost</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="mono">{job.reference}</td>
                  <td>{dateTime(job.scheduled_at || job.created_at)}</td>
                  <td>
                    <div>{addressLine({ city: job.pickup_city, postcode: job.pickup_postcode })}</div>
                    <div className="muted small">
                      → {addressLine({ city: job.dropoff_city, postcode: job.dropoff_postcode })}
                    </div>
                    {job.parcel_description && (
                      <div className="muted small">{job.parcel_description}</div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={job.status} />
                    {job.driver_name && <div className="muted small">{job.driver_name}</div>}
                  </td>
                  <td className="num">{job.miles ? miles(job.miles) : '—'}</td>
                  <td className="num">
                    {job.price ? money(job.price) : '—'}
                    {job.status === 'delivered' && (
                      <div className={`pill ${job.paid ? 'pill-paid' : 'pill-due'}`}>
                        {job.paid ? 'Paid' : 'Due'}
                      </div>
                    )}
                  </td>
                  <td className="num">
                    {['requested', 'scheduled'].includes(job.status) && (
                      <button type="button" className="link danger" onClick={() => cancel(job)}>
                        Cancel
                      </button>
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
