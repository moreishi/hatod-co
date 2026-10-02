/** Plain-language names for backend status codes (unknown codes pass through). */
const STATUSES: Record<string, string> = {
  REQUESTED: "Requested",
  NO_DRIVERS: "Needs a driver",
  ASSIGNED: "Assigned",
  DRIVER_EN_ROUTE: "Driver heading out",
  DRIVER_ARRIVED: "Driver arrived",
  IN_PROGRESS: "On trip",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  APPLICANT: "Applicant",
  DOCUMENTS_PENDING: "Documents pending",
  DOCUMENTS_UNDER_REVIEW: "Under review",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  PENDING: "Pending",
  VERIFIED: "Verified",
};

export function humanStatus(status: string): string {
  return STATUSES[status] ?? status;
}

const TRANSITIONS: Record<string, string> = {
  DRIVER_EN_ROUTE: "Mark heading out",
  DRIVER_ARRIVED: "Mark arrived",
  IN_PROGRESS: "Start trip",
  COMPLETED: "Complete trip",
  CANCELLED: "Cancel ride",
};

export function humanTransition(code: string): string {
  return TRANSITIONS[code] ?? code;
}

const DOC_TYPES: Record<string, string> = {
  DRIVERS_LICENSE: "Driver's license",
  OR_CR: "Vehicle OR/CR",
  NBI_CLEARANCE: "NBI clearance",
  INSURANCE: "Insurance policy",
  PROOF_OF_ADDRESS: "Proof of address",
};

export function humanDocType(type: string): string {
  return DOC_TYPES[type] ?? type;
}
