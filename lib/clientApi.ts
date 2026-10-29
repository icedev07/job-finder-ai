'use client';

// Small fetch wrapper for the admin UI: JSON in/out, a readable error for any
// failure, and a redirect to the login page when the session has expired.

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit | null };

// Whose data this tab shows ("all" or a user id), sent with every request so a
// tab keeps working on the user it shows even after another tab switched. Set
// by the ViewingProvider (components/shell/viewing.tsx).
let viewing: string | null = null;

export function setApiViewing(value: number | 'all' | null): void {
  viewing = value == null ? null : String(value);
}

/** Query-string value for download links, which cannot send headers: `?user=…`. */
export function viewingParam(): string {
  return viewing ? `user=${encodeURIComponent(viewing)}` : '';
}

export async function api<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(viewing ? { 'X-JF-View': viewing } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text.slice(0, 300) || `HTTP ${res.status}` };
  }
  const body = (data ?? {}) as { error?: string; code?: string };
  if (res.status === 401 && body.code === 'unauthenticated') {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    // A full reload on purpose: it drops every piece of client state from the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/admin/login?next=${next}`;
    throw new ApiError('Signed out', 401, data);
  }
  if (!res.ok) {
    throw new ApiError(body.error || `Request failed (HTTP ${res.status})`, res.status, data);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
