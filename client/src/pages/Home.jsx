import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { BRAND } from '../branding.js';

/**
 * The public home page - the only page search engines and first-time
 * visitors see. Positioned for the high-trust niche: important documents
 * that absolutely must get there.
 *
 * SERVICES and CARRY are deliberately just lists: to offer something new
 * (e.g. mobile notary once certified), add one entry and the page updates.
 * Every claim on this page is something the app genuinely does - add
 * "bonded & insured" style badges only once they are true.
 */
const CARRY = [
  'Real estate closings',
  'Title documents',
  'Legal filings',
  'Medical records',
  'Insurance paperwork',
  'Business contracts',
  'Signature-required packages',
];

const PILLARS = [
  {
    title: 'Chain of custody',
    text: 'Every run is time-stamped from pickup to drop-off, with the driver on record. You can see where your documents are without calling anyone.',
  },
  {
    title: 'One driver, door to door',
    text: 'No depots, no sorting belts, no third pair of hands. The person who collects your envelope is the person who delivers it.',
  },
  {
    title: 'Discreet and careful',
    text: 'Sensitive paperwork stays sealed and is handed to the named recipient - not left on a porch, not signed for by a stranger.',
  },
  {
    title: 'Everything on record',
    text: 'Every delivery, mile and charge is kept in your account history. If a question comes up months later, the answer is one search away.',
  },
];

const SERVICES = [
  {
    title: 'Same-day delivery',
    text: 'Booked in the morning, delivered by the afternoon - across town while you get on with your day.',
  },
  {
    title: 'Scheduled runs',
    text: 'Regular routes on the days you choose - weekly filings, records transfers, recurring closings. Set it up once.',
  },
  {
    title: 'Urgent & time-critical',
    text: 'Deadline filings and must-sign packages, moved directly and confirmed the moment they arrive.',
  },
  {
    title: 'Small freight',
    text: 'Bigger than an envelope, smaller than a pallet - parts, samples, supplies and equipment that need a truck and a careful pair of hands, not a freight terminal.',
  },
  // Coming later - uncomment when certified:
  // {
  //   title: 'Mobile notary',
  //   text: 'A certified notary comes to you - signings, affidavits and
  //     acknowledgements done at your home, office or job site.',
  // },
];

const STEPS = [
  {
    title: 'Tell us the pickup and drop-off',
    text: 'First time takes a minute. After that your addresses are saved - regulars book in about four taps.',
  },
  {
    title: 'We collect and deliver',
    text: 'Watch the status move from Pending to Assigned, In transit and Delivered - no need to ring and ask.',
  },
  {
    title: 'See exactly what it cost',
    text: 'Fair, transparent mileage-based pricing. Every delivery and every price stays in your history.',
  },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <div className="brand">
          {BRAND.name}
          <small>{BRAND.tagline}</small>
        </div>
        <nav className="landing-nav">
          <Link to="/about">
            <button type="button" className="ghost">
              About us
            </button>
          </Link>
          <Link to="/reviews">
            <button type="button" className="ghost">
              Reviews
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
          <Link to="/register">
            <button type="button">Create an account</button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Trusted courier service</p>
          <h1>Important documents, delivered like they matter.</h1>
          <p>
            Closings, filings, records and contracts - collected by a named driver, tracked at
            every step, and placed in the right hands. Businesses choose us for reliability,
            not just speed.
          </p>
          <div className="actions">
            <Link to="/register">
              <button type="button">Book a delivery</button>
            </Link>
            <Link to="/login">
              <button type="button" className="ghost">
                I already have an account
              </button>
            </Link>
          </div>
          <p className="hero-strip">
            Time-stamped chain of custody &nbsp;·&nbsp; One driver, door to door &nbsp;·&nbsp;
            Every delivery on record
          </p>
        </section>

        <section className="landing-section">
          <h2>What we&apos;re trusted with</h2>
          <p className="section-lede">
            The paperwork that can&apos;t be &quot;probably fine&quot; - it has to arrive, intact,
            with proof.
          </p>
          <ul className="checklist">
            {CARRY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="landing-section">
          <h2>Why offices hand us their sensitive files</h2>
          <div className="landing-cards">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="landing-card pillar">
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <h2>Services</h2>
          <div className="landing-cards">
            {SERVICES.map((service) => (
              <div key={service.title} className="landing-card">
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="notice-band">
            <div>
              <h3>Special deliveries welcomed</h3>
              <p>
                Odd sizes, unusual hours, extra care — we&apos;re glad to take them on, with
                prior approval and enough time allowed. Reach out first and we&apos;ll agree the
                plan and the price.
              </p>
            </div>
            <Link to="/contact">
              <button type="button" className="secondary">
                Contact us
              </button>
            </Link>
          </div>
        </section>

        <section className="landing-section">
          <h2>How it works</h2>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="step-number">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-cta">
          <h2>Send documents regularly?</h2>
          <p>
            Law offices, title agencies, clinics and brokerages get saved addresses, one-tap
            booking, transparent per-mile pricing and a complete, searchable record of every
            delivery - so no one on your team ever chases a package by phone.
          </p>
          <Link to="/register">
            <button type="button">Set up your business account</button>
          </Link>
        </section>
      </main>

      <footer className="landing-foot">
        <ServiceArea />
        <p className="muted small">
          Questions, concerns or special deliveries?{' '}
          <a href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a> ·{' '}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> ·{' '}
          <Link to="/contact">Contact us</Link>
        </p>
      </footer>
    </div>
  );
}

/**
 * "Serving YOUR area" - follows the visitor instead of naming a fixed city.
 *
 * Two layers, like delivery tracking:
 *  1. On load: a rough fix from the visitor's internet connection - instant,
 *     no permission popup, usually right about the city.
 *  2. On tap: the phone's real GPS, reverse-geocoded to city + ZIP.
 * If both fail (offline, denied), it falls back to neutral wording.
 */
function ServiceArea() {
  const [place, setPlace] = useState(null); // { city, region, zip, precise }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('https://ipapi.co/json/')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.city) return;
        // Never downgrade a precise GPS fix with an IP guess.
        setPlace((current) =>
          current?.precise
            ? current
            : { city: data.city, region: data.region_code, zip: data.postal, precise: false }
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function locate() {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          setPlace({
            city: data.city || data.locality,
            region: data.principalSubdivisionCode?.split('-').pop(),
            zip: data.postcode,
            precise: true,
          });
        } catch {
          // Keep whatever we already had.
        } finally {
          setBusy(false);
        }
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const where = place
    ? [place.city, place.region].filter(Boolean).join(', ') +
      (place.zip ? ` ${place.zip}` : '')
    : null;

  return (
    <p>
      {where
        ? `Locally owned and operated — serving your area (you're near ${where}).`
        : 'Locally owned and operated — serving your area.'}{' '}
      {!place?.precise && (
        <button type="button" className="link" onClick={locate} disabled={busy}>
          {busy ? 'Locating…' : '📍 Use my exact location'}
        </button>
      )}
    </p>
  );
}
