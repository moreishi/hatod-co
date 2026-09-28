import type { Driver, Rider, Trip, Zone } from "./types";

// Gensan pilot zones — coarse polygons replaced by named service areas for v1.
export const zones: Zone[] = [
  {
    id: "gensan-downtown",
    name: "Downtown Gensan",
    pricing: { base: 40, perKm: 12, perMin: 2, minimum: 60 },
    cashEnabled: true,
    gcashEnabled: true,
  },
  {
    id: "gensan-lagao",
    name: "Lagao",
    pricing: { base: 40, perKm: 13, perMin: 2, minimum: 60 },
    cashEnabled: true,
    gcashEnabled: true,
  },
  {
    id: "gensan-airport",
    name: "Airport Rd",
    pricing: { base: 60, perKm: 14, perMin: 2.5, minimum: 90 },
    cashEnabled: true,
    gcashEnabled: false,
  },
];

export const drivers: Driver[] = [
  {
    id: "drv-001",
    name: "J. Dela Cruz",
    phone: "+639171110001",
    vehicleType: "moto",
    plateNo: "MC-1001",
    status: "online",
    docs: { paExpiry: "2026-11-20", cpcExpiry: "2027-05-01", licenseNo: "L-0001" },
    lat: 6.1164,
    lng: 125.1712,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "drv-002",
    name: "M. Santos",
    phone: "+639171110002",
    vehicleType: "trike",
    plateNo: "TR-2002",
    status: "pending",
    docs: { paExpiry: "2026-10-05", cpcExpiry: "2027-01-15", licenseNo: "L-0002" },
    lat: 6.112,
    lng: 125.175,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "drv-003",
    name: "A. Reyes",
    phone: "+639171110003",
    vehicleType: "sedan",
    plateNo: "GSC-3003",
    status: "approved",
    docs: { paExpiry: "2026-09-29", cpcExpiry: "2026-10-28", licenseNo: "L-0003" },
    lat: 6.12,
    lng: 125.165,
    updatedAt: new Date().toISOString(),
  },
];

export const riders: Rider[] = [
  {
    id: "rdr-001",
    name: "R. Garcia",
    phone: "+639171110011",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rdr-002",
    name: "K. Tan",
    phone: "+639171110022",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rdr-003",
    name: "J. Cruz",
    phone: "",
    status: "suspended",
    createdAt: new Date().toISOString(),
  },
];

export const trips: Trip[] = [
  {
    id: "trip-1001",
    zoneId: "gensan-downtown",
    riderName: "R. Garcia",
    driverId: "drv-001",
    status: "IN_PROGRESS",
    pickup: "SM Gensan",
    dropoff: "Lagao Public Market",
    distanceM: 4200,
    durationS: 720,
    fareQuote: 114,
    payment: "cash",
    createdAt: new Date().toISOString(),
  },
  {
    id: "trip-1002",
    zoneId: "gensan-airport",
    riderName: "K. Tan",
    driverId: null,
    status: "SEARCHING",
    pickup: "Gensan Airport",
    dropoff: "Downtown",
    distanceM: 9800,
    durationS: 1200,
    fareQuote: 247,
    payment: "gcash",
    createdAt: new Date().toISOString(),
  },
];

export function docsExpiringSoon(iso: string, withinDays = 30): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < withinDays * 86400_000;
}
