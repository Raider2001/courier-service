import { Link } from 'react-router-dom';

import { BRAND } from '../branding.js';

/**
 * Contact page. Phone and email live in branding.js so a rebrand or a new
 * number is a one-file change.
 */
export default function Contact() {
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
          <Link to="/">
            <button type="button" className="ghost">
              Home
            </button>
          </Link>
          <Link to="/about">
            <button type="button" className="ghost">
              About us
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
          <p className="eyebrow">Contact us</p>
          <h1>Questions, concerns, special deliveries — talk to us.</h1>
        </section>

        <section className="landing-section">
          <div className="landing-cards contact-cards">
            <div className="landing-card">
              <h3>Call or text</h3>
              <p className="contact-big">
                <a href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a>
              </p>
              <p>
                Fastest for anything time-critical. If we&apos;re on the road we&apos;ll call you
                back the same day.
              </p>
            </div>

            <div className="landing-card">
              <h3>Email</h3>
              <p className="contact-big">
                <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
              </p>
              <p>
                Best for quotes, paperwork and anything you want in writing. We reply to every
                message.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <h2>Special deliveries</h2>
          <p className="section-lede">
            Something out of the ordinary? We welcome it — with prior approval and enough time
            allowed.
          </p>
          <div className="landing-card">
            <p style={{ margin: 0 }}>
              Odd sizes, unusual hours, multi-stop runs, waiting-for-signature jobs, anything
              that needs extra care — call or email <em>before</em> booking so we can agree the
              plan, the timing and the price. Once it&apos;s approved, book it in the app like
              any other delivery and it gets the same tracking and record keeping.
            </p>
          </div>
        </section>

        <section className="landing-section landing-cta">
          <h2>Ready to book something ordinary?</h2>
          <p>Standard document and small-freight runs need no approval — just book.</p>
          <Link to="/register">
            <button type="button">Book a delivery</button>
          </Link>
        </section>
      </main>

      <footer className="landing-foot">
        <p>Locally owned and operated.</p>
        <p className="muted small">
          {BRAND.phoneDisplay} · {BRAND.email}
        </p>
      </footer>
    </div>
  );
}
