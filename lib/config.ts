export function appUrl() {
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL)
    throw new Error('APP_URL este obligatoriu în producție.');
  return new URL(process.env.APP_URL || 'http://localhost:3002').origin;
}
export function operatorConfigured() {
  return ['OPERATOR_NAME', 'OPERATOR_ADDRESS', 'PRIVACY_EMAIL', 'SUPPLIER_DISCLOSURE'].every(
    (key) => !!process.env[key]?.trim(),
  );
}
