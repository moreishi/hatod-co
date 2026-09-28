import { z } from "zod";
import { isStaff } from "./access";
import type { Role } from "./access";
import { normalizePhPhone } from "./phone";
import type { Driver } from "./types";

// Pure driver rules (client- + edge-safe): no node:* / DB imports.
// Repository functions live in ./drivers (server-only).

const VEHICLES = ["moto", "trike", "sedan", "suv"] as const;

const DriverSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  phone: z.string().trim().min(1, "phone is required"),
  vehicleType: z.enum(VEHICLES, { message: "unknown vehicle type" }),
  plateNo: z.string().trim().min(1, "plate number is required"),
  paExpiry: z.string().trim().min(1, "PA expiry is required"),
  cpcExpiry: z.string().trim().min(1, "CPC expiry is required"),
  licenseNo: z.string().trim().min(1, "license number is required"),
});

export type NewDriver = z.infer<typeof DriverSchema>;

/** Agency onboarding validation: PH phone normalized, doc dates real. */
export function validateDriver(input: unknown): NewDriver {
  const parsed = DriverSchema.parse(input);
  let phone: string;
  try {
    phone = normalizePhPhone(parsed.phone);
  } catch {
    throw new Error("invalid phone");
  }
  for (const [key, label] of [["paExpiry", "PA"], ["cpcExpiry", "CPC"]] as const) {
    if (Number.isNaN(Date.parse(parsed[key]))) throw new Error(`invalid ${label} expiry date`);
  }
  return { ...parsed, phone };
}

/** Fleet scope: staff manage all; agency manages its own fleet only. */
export function canManageDriver(
  roles: Role[],
  actorId: string,
  driver: { agencyUserId?: string | null },
): boolean {
  if (roles.some((r) => isStaff(r))) return true;
  if (!roles.includes("agency")) return false;
  return !!driver.agencyUserId && driver.agencyUserId === actorId;
}

/** Offboard rule: trip history is financial record — never deleted. */
export function canOffboard(tripCount: number): { ok: boolean; reason?: string } {
  if (tripCount === 0) return { ok: true };
  return { ok: false, reason: "driver has trip history — suspend instead of deleting" };
}

/** Table search across name, phone, plate, vehicle, status (case-insensitive). */
export function filterDrivers(drivers: Driver[], q: string): Driver[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return drivers;
  return drivers.filter((d) =>
    [d.name, d.phone, d.plateNo, d.vehicleType, d.status].some((f) =>
      f.toLowerCase().includes(needle),
    ),
  );
}
