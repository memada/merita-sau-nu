export function normalizePhone(value: string): string | null {
  const phone = value.replace(/[\s().-]/g, '');
  if (/^07\d{8}$/.test(phone)) return `+4${phone}`;
  return /^\+407\d{8}$/.test(phone) ? phone : null;
}
