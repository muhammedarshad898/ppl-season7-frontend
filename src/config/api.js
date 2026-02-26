/**
 * API base URL. In Vite dev we use '' so /api and /socket.io are proxied to backend.
 * For production or no proxy, set VITE_API_URL in .env (e.g. http://localhost:5000).
 */
const port = typeof window !== 'undefined' ? window.location.port : '';
const host = typeof window !== 'undefined' ? window.location.hostname : '';

export const API_URL =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL
    : import.meta.env.DEV
      ? ''
      : (port === '3000' || port === '5173' || port === '4173' ? `http://${host}:5000` : '');

export function resourceUrl(u) {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `${API_URL}${u.startsWith('/') ? u : '/' + u}`;
}
