const env = (import.meta as { env: Record<string, string> }).env;

export const API_URL =
  env?.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://myaitutor-54iv.onrender.com');
