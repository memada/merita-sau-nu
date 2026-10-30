import Link from 'next/link';
import Icon from '../components/Icon';
export default function Home() {
  return (
    <main id="main">
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> DECIZII MAI CLARE PENTRU CASA TA
          </span>
          <h1>
            Ce baterie <span className="accent-serif">merită</span>
            <br />
            pentru casa ta?
          </h1>
          <p className="hero-lead">
            Nu alege 5, 10 sau 15 kWh după instinct. Folosește consumul tău real pentru o estimare
            orientativă.
          </p>
          <p className="hero-sub">
            Introdu câteva date despre sistemul tău și află ce capacitate ar putea avea sens pentru
            consumul tău.
          </p>
          <Link className="button" href="/calculator-baterie">
            Calculează gratuit <Icon name="arrow" size={20} />
          </Link>
          <p className="cta-caption">
            <Icon name="clock" size={15} /> Fără cont. Durează aproximativ 1 minut.
          </p>
          <div className="hero-proof">
            <span>
              <Icon name="check" size={16} /> Gratuit
            </span>
            <span>
              <Icon name="check" size={16} /> Fără branduri favorizate
            </span>
            <span>
              <Icon name="check" size={16} /> Datele tale, decizia ta
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Exemplu ilustrativ de rezultat">
          <div className="visual-top">
            <span className="eyebrow">DE LA CONSUM LA CLARITATE</span>
            <Icon name="sun" size={25} />
          </div>
          <div className="energy-path">
            <span className="energy-node sun-node">
              <Icon name="sun" size={29} />
            </span>
            <span className="path-line" />
            <div className="battery-art">
              <div className="battery-cap" />
              <div className="battery-shell">
                <span />
                <span />
                <span />
                <span className="empty" />
                <Icon name="bolt" size={33} />
              </div>
            </div>
            <span className="path-line" />
            <span className="energy-node">
              <Icon name="chart" size={27} />
            </span>
          </div>
          <div className="example-result">
            <div className="example-title">
              <span className="tiny-label">EXEMPLU DE ESTIMARE</span>
              <span className="pill">Orientativ</span>
            </div>
            <p>O capacitate care are sens pentru tine.</p>
            <div className="example-number">
              5–10 <span>kWh</span>
            </div>
            <div className="capacity-track">
              <span />
            </div>
            <div className="capacity-labels">
              <span>Consumul tău</span>
              <span>Capacitate potrivită profilului</span>
            </div>
            <hr />
            <div className="example-data">
              <div>
                <span>Consum lunar</span>
                <strong>400 kWh</strong>
              </div>
              <div>
                <span>Seara și noaptea</span>
                <strong>4–8 kWh</strong>
              </div>
            </div>
          </div>
          <p className="visual-note">
            <Icon name="shield" size={15} /> Exemplu ilustrativ. Rezultatul tău depinde de datele
            introduse.
          </p>
        </div>
      </section>
      <div className="promise-strip">
        <div className="container">
          <strong>Calculează. Compară. Decide dacă merită.</strong>
          <span>Un instrument independent pentru proprietari.</span>
        </div>
      </div>
      <section className="section container">
        <div className="section-heading">
          <span className="eyebrow">ÎNAINTE SĂ INVESTEȘTI</span>
          <h2>
            Mai mare nu înseamnă
            <br />
            automat mai bună<span className="brand-dot">.</span>
          </h2>
          <p>O baterie utilă începe cu înțelegerea casei tale.</p>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: 'chart',
              title: 'Consum',
              text: 'Contează câtă energie folosești după ce panourile nu mai produc.',
            },
            {
              icon: 'sun',
              title: 'Sistem fotovoltaic',
              text: 'Puterea panourilor influențează cât surplus poți avea disponibil pentru stocare.',
            },
            {
              icon: 'shield',
              title: 'Obiectiv',
              text: 'Autoconsum, backup sau ambele pot duce la alegeri diferite.',
            },
          ].map((item, i) => (
            <article className="feature-card" key={item.title}>
              <div className="feature-top">
                <span className="icon-tile">
                  <Icon name={item.icon} />
                </span>
                <span className="micro">0{i + 1}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="how-section" id="cum-functioneaza">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">SIMPLU, DE LA ÎNCEPUT</span>
            <h2>Cum funcționează</h2>
          </div>
          <div className="steps-grid">
            {[
              ['Introduci datele', 'Câteva întrebări despre sistem, consum și ce îți dorești.'],
              ['Primești o estimare', 'Un interval de capacitate, explicat pe înțelesul tău.'],
              ['Dacă vrei, ceri până la 3 oferte', 'Tu decizi dacă vrei să faci următorul pas.'],
            ].map(([title, text], i) => (
              <article key={title}>
                <span className="step-number">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <Link className="text-link" href="/calculator-baterie">
            Începe cu datele tale <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
      <section className="container section">
        <div className="coming-card">
          <div>
            <span className="eyebrow">URMĂTORUL INSTRUMENT</span>
            <h2>Ai deja o ofertă?</h2>
            <p>În curând vei putea verifica dacă oferta include toate componentele importante.</p>
          </div>
          <button className="button secondary" disabled>
            În curând <Icon name="clock" size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
