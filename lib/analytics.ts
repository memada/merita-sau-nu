export type AnalyticsEvent =
  | 'landing_view'
  | 'calculator_start'
  | 'calculator_step_completed'
  | 'calculator_completed'
  | 'lead_form_opened'
  | 'lead_form_started'
  | 'lead_submitted';
type Params = Record<string, string | number | boolean>;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
export function analyticsContext() {
  const allowed = [
    '/',
    '/calculator-baterie',
    '/rezultat',
    '/multumim',
    '/confidentialitate',
    '/termeni',
  ];
  const path = allowed.includes(window.location.pathname) ? window.location.pathname : '/';
  return {
    page_location: window.location.origin + path,
    page_referrer: '',
    page_title: 'Merită sau Nu',
  };
}
export function trackEvent(name: AnalyticsEvent, params: Params = {}) {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
  try {
    if (localStorage.getItem('merita_analytics') !== 'yes') return;
  } catch {
    return;
  }
  const allowed: AnalyticsEvent[] = [
    'landing_view',
    'calculator_start',
    'calculator_step_completed',
    'calculator_completed',
    'lead_form_opened',
    'lead_form_started',
    'lead_submitted',
  ];
  if (!allowed.includes(name)) return;
  const safe =
    name === 'calculator_step_completed' &&
    Number.isInteger(params.step) &&
    Number(params.step) >= 1 &&
    Number(params.step) <= 5
      ? { step: params.step }
      : {};
  if (window.gtag) window.gtag('event', name, { ...safe, ...analyticsContext() });
}
export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = {
      utm_source: 'utmSource',
      utm_medium: 'utmMedium',
      utm_campaign: 'utmCampaign',
      utm_content: 'utmContent',
      utm_term: 'utmTerm',
    };
    const tagged = Object.keys(keys).some((key) => params.has(key));
    if (sessionStorage.getItem('merita_attribution') && !tagged) return;
    const values: Record<string, string> = {};
    for (const [param, key] of Object.entries(keys))
      values[key] = (params.get(param) || '').slice(0, 200);
    let referrer = '';
    try {
      referrer = document.referrer ? new URL(document.referrer).origin : '';
    } catch {
      /* no referrer */
    }
    sessionStorage.setItem(
      'merita_attribution',
      JSON.stringify({
        ...values,
        source: values.utmSource || referrer || 'direct',
        landingPage: window.location.origin + window.location.pathname,
        referrer,
      }),
    );
  } catch {
    /* Storage can be unavailable in privacy mode. Calculator remains usable. */
  }
}
export function getAttribution() {
  try {
    return JSON.parse(sessionStorage.getItem('merita_attribution') || '{}');
  } catch {
    return {};
  }
}
