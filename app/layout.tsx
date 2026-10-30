import type { Metadata } from 'next';
import { Header, Footer } from '../components/Shell';
import Tracking from '../components/Tracking';
import { appUrl } from '../lib/config';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: 'Calculator baterie fotovoltaică | Merită sau Nu',
    template: '%s | Merită sau Nu',
  },
  description:
    'Estimează ce capacitate de baterie ar putea avea sens pentru sistemul tău fotovoltaic și consumul casei tale. Calculator gratuit și orientativ.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    siteName: 'Merită sau Nu',
    title: 'Calculator baterie fotovoltaică | Merită sau Nu',
    description: 'Calculează. Compară. Decide dacă merită.',
    url: '/',
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <a className="skip-link" href="#main">
          Sari la conținut
        </a>
        <Header />
        {children}
        <Footer />
        <Tracking />
      </body>
    </html>
  );
}
