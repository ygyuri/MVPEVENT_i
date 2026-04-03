import { API_BASE_URL } from './api';

/**
 * Poll option media may use `image_url` (API) or `imageUrl` (some clients).
 */
export function getPollOptionImageUrl(option) {
  if (!option || typeof option !== 'object') return '';
  const raw = option.image_url ?? option.imageUrl;
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * URL for <img src>.
 * When API_BASE_URL is set (typical dev: http://host:5001), use it for `/api/...` paths so
 * images load directly from the API (avoids Vite proxy issues with binary streams). Same-origin
 * when API_BASE_URL is empty (production behind one host).
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('/')) {
    const base = typeof API_BASE_URL === 'string' ? API_BASE_URL.replace(/\/$/, '') : '';
    if (base && /^https?:\/\//i.test(base)) {
      return `${base}${t}`;
    }
    return t;
  }
  return t;
}
