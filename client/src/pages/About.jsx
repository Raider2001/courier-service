import { Link } from 'react-router-dom';

import { BRAND } from '../branding.js';

/**
 * The About page - the founder's story, told the way a title agency or a
 * clinic wants to hear it: long experience, serious about confidentiality.
 */
export default function About() {
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
          <Link to="/register">
            <button type="button">Create an account</button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero hero-slim">
          <p className="eyebrow">About us</p>
          <h1>Logistics has been our bread and butter for {BRAND.aboutYears}.</h1>
        </section>

        <section className="landing-section prose">
          <p>
            Before this app existed, there were three and a half decades of freight docks,
            dispatch boards, tight windows and promises kept. Moving things - and moving them
            <em> right</em> - is not a side business for us. It is the trade we know.
          </p>

          <h2>How we treat your request</h2>
          <p>
            Every job gets the same two things, whether it is a sealed medical record going
            across town or a small freight run on a deadline:
          </p>
          <ul className="plain-list">
            <li>
              <strong>Intensity.</strong> Your deadline becomes our deadline. We plan the route,
              we confirm the handoff, and we do not consider a job finished until it is in the
              right hands and on the record.
            </li>
            <li>
              <strong>Respect for confidentiality.</strong> We do not discuss your business, your
              documents, or your customers with anyone. Paperwork stays sealed, deliveries go to
              the named recipient, and the details stay between us.
            </li>
          </ul>

          <h2>Why we built this the way we did</h2>
          <p>
            Thirty-plus years in logistics teaches you where deliveries actually go wrong: the
            depot handoff, the untracked mile, the &quot;it should be there&quot; phone call.
            So this service removes them. One driver takes your delivery door to door. Every
            pickup and drop-off is time-stamped. Every job, mile and charge stays in your
            account - so the answer to &quot;where is it?&quot; is on your screen, not on hold.
          </p>

          <div className="actions" style={{ marginTop: 28 }}>
            <Link to="/register">
              <button type="button">Book your first delivery</button>
            </Link>
            <Link to="/">
              <button type="button" className="secondary">
                Back to home
              </button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <p>Locally owned and operated.</p>
        <p className="muted small">
          Questions? Get in touch and we will call you back the same day.
        </p>
      </footer>
    </div>
  );
}
