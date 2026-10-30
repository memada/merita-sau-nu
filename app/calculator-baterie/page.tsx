import type { Metadata } from 'next';
import Calculator from '../../components/Calculator';
export const metadata: Metadata = {
  title: 'Ce baterie îmi trebuie? Calculator gratuit',
  alternates: { canonical: '/calculator-baterie' },
  openGraph: {
    title: 'Ce baterie îmi trebuie? Calculator gratuit | Merită sau Nu',
    url: '/calculator-baterie',
  },
};
export default function CalculatorPage() {
  return (
    <main id="main" className="container tool-page">
      <Calculator />
    </main>
  );
}
