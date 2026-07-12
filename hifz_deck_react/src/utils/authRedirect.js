/**
 * App is served at the site root on the custom domain (hifzer.app).
 * Empty basename = paths like / and /update-password (not /hifz_deck/...).
 */
export const APP_BASENAME = '';

/**
 * Absolute URL inside the SPA (respects basename on GitHub Pages + local Vite).
 * @param {string} path e.g. '/' or '/update-password'
 */
export function appAbsoluteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = APP_BASENAME.replace(/\/$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (normalized === '/') return `${origin}${base}/`;
  return `${origin}${base}${normalized}`;
}

/** Where OAuth / magic links should send the browser after Supabase finishes. */
export function authRedirectToHome() {
  return appAbsoluteUrl('/');
}

export function authRedirectToUpdatePassword() {
  return appAbsoluteUrl('/update-password');
}
