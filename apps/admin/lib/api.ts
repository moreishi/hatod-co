const API_URL = process.env.HAILING_API_URL ?? "http://localhost:3001";

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `API ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}
