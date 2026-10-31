// Pure validation: returns field names/codes only, never environment values.
export function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return { configured: true, issues: [] };
  const issues = [];
  const required = ['ADMIN_USERNAME', 'OPERATOR_NAME', 'OPERATOR_ADDRESS', 'SUPPLIER_DISCLOSURE'];
  for (const key of required) if (!env[key]?.trim()) issues.push(key);
  try {
    const url = new URL(env.APP_URL || '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      issues.push('APP_URL');
  } catch {
    issues.push('APP_URL');
  }
  if (
    !env.SESSION_SECRET ||
    env.SESSION_SECRET.trim().length < 32 ||
    /^(change|replace|example|demo)/i.test(env.SESSION_SECRET)
  )
    issues.push('SESSION_SECRET');
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH || ''))
    issues.push('ADMIN_PASSWORD_HASH');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PRIVACY_EMAIL?.trim() || ''))
    issues.push('PRIVACY_EMAIL');
  // This project's production ingress is exclusively Cloudflare Tunnel.
  if (env.TRUST_CF_HEADERS !== 'true') issues.push('TRUST_CF_HEADERS');
  return { configured: issues.length === 0, issues };
}
