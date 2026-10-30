import type { Metadata } from 'next';
import Result from '../../components/Result';
export const metadata: Metadata = {
  title: 'Estimarea ta',
  robots: { index: false, follow: false },
  alternates: { canonical: '/rezultat' },
};
export default function ResultPage() {
  return (
    <main id="main" className="container tool-page">
      <Result />
    </main>
  );
}
