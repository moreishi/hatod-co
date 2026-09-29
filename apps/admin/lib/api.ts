import { cookies } from "next/headers";

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

/** Server components/handlers: forward the session cookie as Bearer. */
export async function apiAsUser<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = (await cookies()).get("hailing_session")?.value;
  if (!token) throw new Error("no session");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface AdminUserDto {
  id: string;
  phone: string;
  email: string | null;
  adminRoles: { role: string }[];
}

export interface InvitationDto {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}
