import Link from 'next/link';
import type { Metadata } from 'next';
import Icon from '../../components/Icon';
export const metadata: Metadata = {
  title: 'Cerere înregistrată',
  robots: { index: false, follow: false },
  alternates: { canonical: '/multumim' },
};
export default function Thanks() {
  return (
    <main id="main" className="container tool-page">
      <div className="confirmation card">
        <span className="icon-tile">
          <Icon name="check" size={30} />
        </span>
        <span className="eyebrow">URMĂTORUL PAS, ÎN RITMUL TĂU</span>
        <h1>Cererea ta a fost înregistrată.</h1>
        <p>
          Vom verifica informațiile înainte ca solicitarea să fie transmisă către furnizori
          relevanți.
        </p>
        <Link href="/" className="button">
          Înapoi la Merită sau Nu <Icon name="arrow" size={18} />
        </Link>
      </div>
    </main>
  );
}
