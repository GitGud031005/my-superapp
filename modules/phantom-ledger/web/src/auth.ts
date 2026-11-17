export interface Me {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
}

const CSRF_COOKIE = 'XSRF-TOKEN';

export function csrfToken(): string {
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(`${CSRF_COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(CSRF_COOKIE.length + 1)) : '';
}

export async function fetchMe(): Promise<Me | null> {
  const response = await fetch('/api/me', { headers: { Accept: 'application/json' } });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`GET /api/me failed with ${response.status}`);
  return (await response.json()) as Me;
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/logout', {
    method: 'POST',
    headers: { 'X-XSRF-TOKEN': csrfToken() },
  });
  if (!response.ok) throw new Error(`POST /api/logout failed with ${response.status}`);
}

export function startGoogleSignIn(): void {
  window.location.assign('/api/oauth2/authorization/google');
}
