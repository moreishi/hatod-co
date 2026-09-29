import { cookies } from "next/headers";
import { decodeSession } from "./session-edge.js";

const API_URL = process.env.HAILING_API_URL ?? "http://localhost:3001";

export interface RideDto {
  id: string;
  status: string;
  pickupLabel: string;
  dropoffLabel: string;
  fareCentavos: number;
  paymentMethod: string;
  acceptedAt: string | null;
}

export interface ConversationDto {
  id: string;
  status: string;
}

export interface MessageDto {
  id: string;
  senderId: string;
  type: string;
  content: string;
  status: string;
  createdAt: string;
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

export function myRides() {
  return apiAsUser<{ asRider: RideDto[]; asDriver: RideDto[] }>(
    "/api/rides/mine",
  );
}

export function rideDetail(id: string) {
  return apiAsUser<RideDto & { events: { from: string; to: string }[] }>(
    `/api/rides/${id}`,
  );
}

export function conversationByRide(rideId: string) {
  return apiAsUser<ConversationDto>(
    `/api/conversations/by-ride/${rideId}`,
  ).catch(() => null);
}

export function conversationMessages(conversationId: string) {
  return apiAsUser<MessageDto[]>(
    `/api/conversations/${conversationId}/messages?limit=30`,
  );
}

export async function sessionSub(): Promise<string> {
  const token = (await cookies()).get("hailing_session")?.value;
  const session = token ? decodeSession(token) : null;
  if (!session) throw new Error("no session");
  return session.sub;
}
