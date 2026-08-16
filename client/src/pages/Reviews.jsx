import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../api.js';
import { BRAND } from '../branding.js';
import { Loading, Message } from '../components.jsx';
import { dateOnly } from '../format.js';

const BLANK = { name: '', business: '', rating: 5, comment: '' };

/** Gold stars, e.g. Stars rating={4} -> ★★★★☆ */
export function Stars({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

/**
 * Public reviews page: read what customers say, leave your own.
 * Submissions are held for the owner's approval before they appear.
 */
export default function Reviews() {
  const [reviews, setReviews] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    api
      .reviews()
      .then((data) => setReviews(data.reviews))
      .catch((err) => setError(err.message));
  }, []);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.createReview({ ...form, rating: Number(form.rating) });
      setThanks(true);
      setForm(BLANK);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const average =
    reviews?.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return (
    <div className="landing">
      <header className="landing-bar">
        <Link to="/" className="brand-link">
          <div className="brand">
            {BRAND.name}
            <small>{BRAND.tagline}</small>
          </div>
        </Link>
        <nav className="landing-nav">
          <Link to="/about">
            <button type="button" className="ghost">
              About us
            </button>
          </Link>
          <Link to="/contact">
            <button type="button" className="ghost">
              Contact
            </button>
          </Link>
          <Link to="/login">
            <button type="button" className="ghost">
              Sign in
            </button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero hero-slim">
          <p className="eyebrow">Reviews</p>
          <h1>What our customers say.</h1>
          {average !== null && (
            <p>
              <Stars rating={Math.round(average)} /> {average} out of 5 from {reviews.length}{' '}
              {reviews.length === 1 ? 'review' : 'reviews'}
            </p>
          )}
        </section>

        <section className="landing-section">
          {!reviews && !error && <Loading />}
          <Message error={error} />

          {reviews && reviews.length === 0 && (
            <p className="muted">No reviews yet — be the first below.</p>
          )}

          <div className="review-list">
            {reviews?.map((review) => (
              <article key={review.id} className="landing-card review">
                <header>
                  <Stars rating={review.rating} />
                  <span className="muted small">{dateOnly(review.created_at)}</span>
                </header>
                <p>{review.comment}</p>
                <footer>
                  <strong>{review.name}</strong>
                  {review.business && <span className="muted"> · {review.business}</span>}
                  {review.verified && <span className="tag">Verified customer</span>}
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <h2>Leave a review</h2>
          {thanks ? (
            <div className="landing-card">
              <p style={{ margin: 0 }}>
                <strong>Thank you!</strong> Your review has been received and will appear here
                once it&apos;s approved.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="landing-card review-form">
              <label className="field">
                <span className="field-label">Rating</span>
                <div className="star-input">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={value <= Number(form.rating) ? 'on' : ''}
                      onClick={() => setForm((current) => ({ ...current, rating: value }))}
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </label>

              <div className="row">
                <label className="field">
                  <span className="field-label">Your name</span>
                  <input value={form.name} onChange={set('name')} required maxLength={80} />
                </label>
                <label className="field">
                  <span className="field-label">Business (optional)</span>
                  <input value={form.business} onChange={set('business')} maxLength={80} />
                </label>
              </div>

              <label className="field">
                <span className="field-label">Your review</span>
                <textarea
                  value={form.comment}
                  onChange={set('comment')}
                  required
                  maxLength={1000}
                  rows={4}
                  placeholder="How did we do?"
                />
              </label>

              <div className="actions">
                <button type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Submit review'}
                </button>
                <span className="muted small">Reviews appear after a quick approval check.</span>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="landing-foot">
        <p>Locally owned and operated.</p>
        <p className="muted small">
          <a href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a> ·{' '}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
        </p>
      </footer>
    </div>
  );
}
