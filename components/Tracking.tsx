'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsContext, captureAttribution, trackEvent } from '../lib/analytics';
const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export default function Tracking() {
  const path = usePathname();
  const [consent, setConsent] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    try {
      setConsent(localStorage.getItem('merita_analytics'));
    } catch {
      setConsent('no');
    }
  }, []);
  useEffect(() => {
    if (id)
      (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] =
        path.startsWith('/admin') || consent !== 'yes';
    if (!path.startsWith('/admin')) {
      captureAttribution();
      if (path === '/') trackEvent('landing_view');
    }
  }, [path, consent]);
  useEffect(() => {
    if (consent !== 'yes' || !id || !/^G-[A-Z0-9]+$/.test(id) || path.startsWith('/admin')) return;
    if (document.getElementById('merita-ga')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...analyticsContext(),
    });
    if (path === '/') trackEvent('landing_view');
    const script = document.createElement('script');
    script.id = 'merita-ga';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }, [consent, path]);
  function choose(value: string) {
    try {
      localStorage.setItem('merita_analytics', value);
    } catch {}
    setConsent(value);
  }
  if (!id || consent !== null || path.startsWith('/admin')) return null;
  return (
    <aside className="cookie-banner" aria-label="Preferințe de măsurare">
      <p>
        Ne permiți să folosim Google Analytics pentru a înțelege utilizarea calculatorului? Acordul
        este separat de cererea de oferte. <a href="/confidentialitate">Detalii</a>
      </p>
      <div className="actions">
        <button className="button small" onClick={() => choose('yes')}>
          Accept măsurarea
        </button>
        <button className="button secondary small" onClick={() => choose('no')}>
          Doar funcționale
        </button>
      </div>
    </aside>
  );
}
