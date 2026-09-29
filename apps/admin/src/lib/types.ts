export type VehicleType = "moto" | "trike" | "sedan" | "suv";
export type DriverStatus = "pending" | "approved" | "suspended" | "offline" | "online";
export type TripStatus =
  | "SEARCHING"
  | "ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface DriverDocs {
  paExpiry: string; // ISO date
  cpcExpiry: string; // ISO date
  licenseNo: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: VehicleType;
  plateNo: string;
  status: DriverStatus;
  docs: DriverDocs;
  lat: number;
  lng: number;
  updatedAt: string;
  /** Owning agency account (users.id) — null for directly-onboarded drivers. */
  agencyUserId?: string | null;
  /** Owning agency display name (joined where available). */
  agencyName?: string | null;
  /** Login account (users.id) — null until a login is created. */
  userId?: string | null;
}

export interface ZonePricing {
  base: number; // PHP
  perKm: number; // PHP/km
  perMin: number; // PHP/min
  minimum: number; // PHP
}

export interface Zone {
  id: string;
  name: string;
  pricing: ZonePricing;
  cashEnabled: boolean;
  gcashEnabled: boolean;
}

export type RiderStatus = "active" | "suspended";

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: RiderStatus;
  createdAt: string;
  /** Linked login account (users.role driver/rider), if one exists. */
  account?: { email: string; role: string } | null;
}

export interface Trip {
  id: string;
  zoneId: string;
  riderName: string;
  riderId?: string | null;
  driverId: string | null;
  status: TripStatus;
  pickup: string;
  dropoff: string;
  distanceM: number;
  durationS: number;
  fareQuote: number;
  payment: "cash" | "gcash";
  paid?: boolean;
  createdAt: string;
}
