import { cookies } from "next/headers";

const API_URL = process.env.HAILING_API_URL ?? "http://localhost:3001";

async function apiFetch(path: string, init?: RequestInit) {
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

/** Browser/proxy path: no user token (OTP request/verify only). */
export function apiPublic(path: string, body: unknown) {
  return apiFetch(`/api${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface AgencyDto {
  id: string;
  name: string;
  slug: string;
  cityCode: string;
  status: string;
}

export interface DriverDto {
  id: string;
  status: string;
  user: { displayName: string; phone: string };
  assignments: { vehicle: { plateNo: string; type: string } }[];
}

/** Server components/handlers: forward the session cookie as a Bearer token. */
export async function apiAsUser<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = (await cookies()).get("hailing_session")?.value;
  if (!token) throw new Error("no session");
  const res = await fetch(`${API_URL}/api${path}`, {
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

export function myAgencies() {
  return apiAsUser<AgencyDto[]>("/agencies/mine");
}

export interface RideDto {
  id: string;
  status: string;
  pickupLabel: string;
  dropoffLabel: string;
  fareCentavos: number;
  paymentMethod: string;
  driver: { user: { displayName: string } } | null;
}

export interface VehicleDto {
  id: string;
  plateNo: string;
  type: string;
  status: string;
  assignments: { driver: { user: { displayName: string } } }[];
}

export interface DocumentDto {
  id: string;
  type: string;
  status: string;
  storageKey: string;
  driver: { user: { displayName: string } } | null;
}

export function agencyVehicles(agencyId: string) {
  return apiAsUser<VehicleDto[]>(`/agencies/${agencyId}/vehicles`);
}

export function agencyDocuments(agencyId: string, status?: string) {
  return apiAsUser<DocumentDto[]>(
    `/agencies/${agencyId}/documents${status ? `?status=${status}` : ""}`,
  );
}

export function agencyRides(agencyId: string, statuses: string[]) {
  return apiAsUser<RideDto[]>(
    `/agencies/${agencyId}/rides?status=${statuses.join(",")}`,
  );
}

export function agencyDrivers(agencyId: string) {
  return apiAsUser<DriverDto[]>(`/agencies/${agencyId}/drivers`);
}
