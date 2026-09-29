export interface Session {
  sub: string;
  roles: string[];
  exp: number;
}

function unb64url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") return atob(padded);
  return Buffer.from(padded, "base64").toString("utf8");
}

/** Edge-safe decode (no node:crypto) — routing only, never authorization. */
export function decodeSession(token: string): Session | null {
  try {
    const [body] = token.split(".");
    if (!body) return null;
    const payload = JSON.parse(unb64url(body)) as Session;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdmin(session: Session): boolean {
  return session.roles.some((r) => r.startsWith("ADMIN:"));
}
