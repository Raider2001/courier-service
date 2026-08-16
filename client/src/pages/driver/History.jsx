import { useEffect, useState } from 'react';

import { api } from '../../api.js';
import { Card, Empty, Loading, Message, StatusBadge } from '../../components.jsx';
import { dateTime, miles } from '../../format.js';

/** Every run this driver has completed - their proof-of-work record. */
export default function DriverHistory() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .jobs({ status: 'delivered,cancelled' })
      .then((data) => setJobs(data.jobs))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <Message error={error} />;
  if (!jobs) return <Loading />;

  const totalMiles = jobs
    .filter((job) => job.status === 'delivered')
    .reduce((sum, job) => sum + Number(job.miles || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Delivery history</h1>
          <p>
            {jobs.length
              ? `${jobs.length} past ${jobs.length === 1 ? 'run' : 'runs'} · ${miles(totalMiles)} driven.`
              : 'Completed runs will appear here.'}
          </p>
        </div>
      </div>

      <Card>
        {!jobs.length ? (
          <Empty>Nothing here yet.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Delivered</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Status</th>
                <th className="num">Miles</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="mono">{job.reference}</td>
                  <td>{dateTime(job.delivered_at || job.scheduled_at || job.created_at)}</td>
                  <td>{job.customer_name}</td>
                  <td>
                    {job.pickup_city || job.pickup_postcode} →{' '}
                    {job.dropoff_city || job.dropoff_postcode}
                  </td>
                  <td>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="num">{miles(job.miles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
