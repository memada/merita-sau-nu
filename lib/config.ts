export function appUrl() {
  if (process.env.NODE_ENV === 'production' && !process.env.APP_URL)
    throw new Error('APP_URL este obligatoriu în producție.');
  return new URL(process.env.APP_URL || 'http://localhost:3002').origin;
}
export function operatorConfigured() {
  return !!(
    process.env.OPERATOR_NAME &&
    process.env.OPERATOR_ADDRESS &&
    process.env.PRIVACY_EMAIL &&
    process.env.SUPPLIER_DISCLOSURE
  );
}
