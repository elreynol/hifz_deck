/** App is served under Vite/GitHub Pages basename `/hifz_deck`. */

export const APP_BASENAME = '/hifz_deck';

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
