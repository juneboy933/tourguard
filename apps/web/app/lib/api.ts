export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';

export function csrfToken(): string {
  return document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('tourguard_csrf='))?.split('=').slice(1).join('=') ?? '';
}

export async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, { ...init, credentials: 'include', headers: { ...(init?.headers ?? {}), ...(init?.method && init.method !== 'GET' ? { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() } : {}) } });
}
