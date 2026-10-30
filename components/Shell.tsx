import Link from 'next/link';
import Icon from './Icon';
import AnalyticsPreferences from './AnalyticsPreferences';
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Merită sau Nu, pagina principală">
      <span className="brand-mark">
        <Icon name="bolt" size={20} />
      </span>
      merită<span className="brand-light">sau</span>nu<span className="brand-dot">.</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Navigație principală">
          <a className="nav-about" href="/#cum-functioneaza">
            Cum funcționează
          </a>
          <Link className="button small secondary" href="/calculator-baterie">
            Calculator baterie <Icon name="arrow" size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-row">
          <Brand />
          <div>
            <Link href="/confidentialitate">Confidențialitate</Link>
            <Link href="/termeni">Termeni</Link>
            <AnalyticsPreferences />
          </div>
        </div>
        <p>
          Informațiile și estimările prezentate sunt orientative și nu înlocuiesc proiectarea sau
          recomandarea unui specialist autorizat.
        </p>
        <span className="micro">
          Un instrument pentru decizii mai informate. © {new Date().getFullYear()} Merită sau Nu
        </span>
      </div>
    </footer>
  );
}
