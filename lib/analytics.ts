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
export function trackEvent(name: AnalyticsEvent, params: Params = {}) {
  if (typeof window === 'undefined') return;
  if (window.gtag) window.gtag('event', name, params);
  else if (process.env.NODE_ENV === 'development') console.debug('[analytics]', name, params);
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
