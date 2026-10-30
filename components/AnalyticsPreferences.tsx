'use client';
export default function AnalyticsPreferences() {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return null;
  return (
    <button
      className="preferences-link"
      onClick={() => {
        try {
          localStorage.removeItem('merita_analytics');
        } catch {}
        window.location.reload();
      }}
    >
      Preferințe de măsurare
    </button>
  );
}
