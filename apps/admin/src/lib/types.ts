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
  status: RiderStatus;
  createdAt: string;
}

export interface Trip {
  id: string;
  zoneId: string;
  riderName: string;
  driverId: string | null;
  status: TripStatus;
  pickup: string;
  dropoff: string;
  distanceM: number;
  durationS: number;
  fareQuote: number;
  payment: "cash" | "gcash";
  createdAt: string;
}
