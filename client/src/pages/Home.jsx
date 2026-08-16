import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * The public home page - the only page search engines and first-time
 * visitors see. Everything else lives behind a login.
 *
 * SERVICES is deliberately just a list: to offer something new (e.g. mobile
 * notary once certified), add one entry here and the page updates itself.
 */
const SERVICES = [
  {
    title: 'Same-day delivery',
    text: 'Booked in the morning, delivered by the afternoon. Documents, parcels and packages moved across town while you get on with your day.',
  },
  {
    title: 'Scheduled runs',
    text: 'Regular routes on the days you choose - shop restocks, court bundles, weekly transfers. Set it up once and forget about it.',
  },
  {
    title: 'Urgent & legal documents',
    text: 'Time-critical paperwork handled with care and delivered into the right hands, with a record of every step.',
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
    text: 'Fair, mileage-based pricing. Every delivery and every price stays in your history.',
  },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <div className="brand">
          Courier
          <small>Deliveries you can see</small>
        </div>
        <nav className="landing-nav">
          <Link to="/login">
            <button type="button" className="secondary">
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
          <h1>Your delivery, door to door, without the phone calls.</h1>
          <p>
            Book a courier online in under a minute, track it from pickup to drop-off, and keep
            every delivery and price in one place.
          </p>
          <div className="actions">
            <Link to="/register">
              <button type="button">Book your first delivery</button>
            </Link>
            <Link to="/login">
              <button type="button" className="secondary">
                I already have an account
              </button>
            </Link>
          </div>
        </section>

        <section className="landing-section">
          <h2>What we do</h2>
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
          <h2>Run deliveries for your business?</h2>
          <p>
            Regular customers get saved addresses, one-tap booking and a full history of every
            job and invoice - so nobody on your team ever re-types an address or chases a
            delivery by phone.
          </p>
          <Link to="/register">
            <button type="button">Set up your business account</button>
          </Link>
        </section>
      </main>

      <footer className="landing-foot">
        <ServiceArea />
        <p className="muted small">
          Questions? Get in touch and we will call you back the same day.
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
