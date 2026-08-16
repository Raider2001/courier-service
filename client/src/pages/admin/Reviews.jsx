import { useEffect, useState } from 'react';

import { api } from '../../api.js';
import { Card, Empty, Loading, Message } from '../../components.jsx';
import { dateOnly } from '../../format.js';
import { Stars } from '../Reviews.jsx';

/**
 * Review moderation. New submissions wait here; nothing is public until
 * the owner approves it.
 */
export default function AdminReviews() {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function load() {
    return api
      .reviews({ all: 'true' })
      .then((data) => setReviews(data.reviews))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function act(fn, message) {
    setError('');
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !reviews) return <Message error={error} />;
  if (!reviews) return <Loading />;

  const pending = reviews.filter((review) => !review.approved);
  const live = reviews.filter((review) => review.approved);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reviews</h1>
          <p>
            {pending.length
              ? `${pending.length} waiting for your approval.`
              : 'Nothing waiting — all clear.'}
          </p>
        </div>
      </div>

      <Message error={error} success={notice} />

      {pending.length > 0 && (
        <Card title="Waiting for approval" className="attention">
          <ReviewTable
            reviews={pending}
            action={(review) => (
              <span className="card-actions">
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    act(() => api.updateReview(review.id, { approved: true }), 'Review published.')
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="link danger"
                  onClick={() => act(() => api.deleteReview(review.id), 'Review deleted.')}
                >
                  Delete
                </button>
              </span>
            )}
          />
        </Card>
      )}

      <Card title="Live on the site">
        {!live.length ? (
          <Empty>No published reviews yet.</Empty>
        ) : (
          <ReviewTable
            reviews={live}
            action={(review) => (
              <span className="card-actions">
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    act(
                      () => api.updateReview(review.id, { approved: false }),
                      'Review taken down.'
                    )
                  }
                >
                  Take down
                </button>
                <button
                  type="button"
                  className="link danger"
                  onClick={() => act(() => api.deleteReview(review.id), 'Review deleted.')}
                >
                  Delete
                </button>
              </span>
            )}
          />
        )}
      </Card>
    </>
  );
}

function ReviewTable({ reviews, action }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Rating</th>
          <th>Review</th>
          <th>From</th>
          <th>When</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {reviews.map((review) => (
          <tr key={review.id}>
            <td>
              <Stars rating={review.rating} />
            </td>
            <td>{review.comment}</td>
            <td>
              {review.name}
              {review.business && <span className="muted small"> · {review.business}</span>}
              {review.customer_name && (
                <div>
                  <span className="tag">Customer: {review.customer_name}</span>
                </div>
              )}
            </td>
            <td className="small">{dateOnly(review.created_at)}</td>
            <td>{action(review)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
