/** Plain-language names for backend codes (unknown codes pass through). */
const STATUSES: Record<string, string> = {
  REQUESTED: "Requested",
  NO_DRIVERS: "Needs a driver",
  ASSIGNED: "Assigned",
  DRIVER_EN_ROUTE: "Driver heading out",
  DRIVER_ARRIVED: "Driver arrived",
  IN_PROGRESS: "On trip",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function humanStatus(status: string): string {
  return STATUSES[status] ?? status;
}

const TXN_TYPES: Record<string, string> = {
  RIDE_EARNING: "Ride earning",
  COMMISSION: "Commission",
  PAYOUT: "Payout",
  TOP_UP: "Top-up",
  ADJUSTMENT: "Adjustment",
};

export function humanTxnType(type: string): string {
  return TXN_TYPES[type] ?? type;
}
