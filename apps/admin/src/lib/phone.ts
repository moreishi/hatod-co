/** PH mobile numbers → canonical +63XXXXXXXXXX. */
export function normalizePhPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let rest = digits;
  if (rest.startsWith("63")) rest = rest.slice(2);
  else if (rest.startsWith("0")) rest = rest.slice(1);
  if (!/^9\d{9}$/.test(rest)) throw new Error(`invalid PH phone: ${raw}`);
  return `+63${rest}`;
}

function tryNormalize(raw: string): string | null {
  try {
    return normalizePhPhone(raw);
  } catch {
    return null;
  }
}

/** Find a user account for a profile phone, tolerant of 09xx/+63 formatting. */
export function matchUserByPhone<T extends { id: string; phone: string }>(
  profilePhone: string,
  users: T[],
): T | null {
  const want = tryNormalize(profilePhone);
  if (!want) return null;
  return users.find((u) => tryNormalize(u.phone) === want) ?? null;
}

export type LoginIdentity = { kind: "email"; value: string } | { kind: "phone"; value: string };

/** Login accepts an email or any PH phone format; routes to the right lookup. */
export function resolveLoginIdentity(raw: string): LoginIdentity {
  const trimmed = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
    return { kind: "email", value: trimmed.toLowerCase() };
  const phone = tryNormalize(trimmed);
  if (phone) return { kind: "phone", value: phone };
  throw new Error("invalid login — enter an email or PH mobile number");
}

/** Table search across name, email, and unique phone (any format). */
export function filterUsers<T extends { name: string; email?: string | null; phone?: string | null }>(
  rows: T[],
  q: string,
): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  let digits = "";
  try {
    digits = normalizePhPhone(needle);
  } catch {
    digits = needle.replace(/\D/g, "");
  }
  return rows.filter((r) => {
    const hay = `${r.name} ${r.email ?? ""} ${r.phone ?? ""}`.toLowerCase();
    if (hay.includes(needle)) return true;
    if (!digits) return false;
    const rowDigits = (r.phone ?? "").replace(/\D/g, "");
    return rowDigits.includes(digits.replace(/\D/g, "")) && digits.replace(/\D/g, "").length >= 4;
  });
}
