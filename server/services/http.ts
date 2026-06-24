/**
 * Tiny shared HTTP helper for the data-source clients.
 * Native fetch + timeout + JSON. Throws on non-2xx so callers can be wrapped in
 * Promise.allSettled by the aggregator.
 */

export interface FetchOpts {
  headers?: Record<string, string>;
  timeoutMs?: number;
  method?: string;
  body?: string;
}

export async function fetchJSON<T = any>(url: string, opts: FetchOpts = {}): Promise<T> {
  const { headers = {}, timeoutMs = 15000, method = "GET", body } = opts;
  const res = await fetch(url, {
    method,
    headers: { Accept: "application/json", ...headers },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Request to ${new URL(url).host} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  const { headers = {}, timeoutMs = 15000, method = "GET", body } = opts;
  const res = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Request to ${new URL(url).host} failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/** Read an API key from env; returns "" if unset. */
export const envKey = (name: string): string => process.env[name] ?? "";
