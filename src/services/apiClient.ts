const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const url = API_BASE_URL
      ? new URL(input, `${API_BASE_URL}/`).toString()
      : input;

    return fetch(url, init);
  }

  return fetch(input, init);
}