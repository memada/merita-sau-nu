import { cookies } from 'next/headers';
export const ADMIN_SEARCH_COOKIE = 'merita_admin_search';
export async function adminSearch() {
  return (await cookies()).get(ADMIN_SEARCH_COOKIE)?.value.slice(0, 200) || '';
}
