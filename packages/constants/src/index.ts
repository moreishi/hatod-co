/**
 * @hailing/constants — single source of truth for domain enums.
 * Spec §8 + AI rules 8-12: no magic strings, no duplicated business rules.
 * Apps import from here; never redefine these locally.
 */

/** Ride lifecycle — explicit state machine (spec §31, §38). */
export const RideStatus = {
  REQUESTED: "REQUESTED",
  ASSIGNED: "ASSIGNED",
  DRIVER_EN_ROUTE: "DRIVER_EN_ROUTE",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_DRIVERS: "NO_DRIVERS",
} as const;
export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus];

/** Allowed ride transitions. Backend enforces; clients cannot bypass. */
export const RideTransitions: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: [RideStatus.ASSIGNED, RideStatus.CANCELLED, RideStatus.NO_DRIVERS],
  ASSIGNED: [RideStatus.DRIVER_EN_ROUTE, RideStatus.CANCELLED],
  DRIVER_EN_ROUTE: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
  DRIVER_ARRIVED: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
  IN_PROGRESS: [RideStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_DRIVERS: [RideStatus.REQUESTED, RideStatus.CANCELLED],
};

/** Driver account lifecycle. Creation ≠ dispatchable (spec rule 36). */
export const DriverStatus = {
  APPLICANT: "APPLICANT",
  DOCUMENTS_PENDING: "DOCUMENTS_PENDING",
  DOCUMENTS_UNDER_REVIEW: "DOCUMENTS_UNDER_REVIEW",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DEACTIVATED: "DEACTIVATED",
  REJECTED: "REJECTED",
} as const;
export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

/** Only ACTIVE drivers with an active vehicle assignment are dispatchable. */
export const DISPATCHABLE_DRIVER_STATUSES: readonly DriverStatus[] = [
  DriverStatus.ACTIVE,
];

/** Agency membership roles (spec §17). */
export const AgencyRole = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  DISPATCHER: "DISPATCHER",
  FINANCE: "FINANCE",
  VIEWER: "VIEWER",
} as const;
export type AgencyRole = (typeof AgencyRole)[keyof typeof AgencyRole];

/** Platform admin roles (spec §16). */
export const AdminRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OPS: "OPS",
  SUPPORT: "SUPPORT",
  FINANCE_ADMIN: "FINANCE_ADMIN",
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

/** Payment methods (spec §44: cash + wallet only at pilot). */
export const PaymentMethod = {
  CASH: "CASH",
  WALLET: "WALLET",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/** Ledger transaction types (spec §45). Balances change ONLY via ledger rows. */
export const TransactionType = {
  RIDE_EARNING: "RIDE_EARNING",
  COMMISSION: "COMMISSION",
  PAYOUT: "PAYOUT",
  TOP_UP: "TOP_UP",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

/** Wallet owners: every balance sits behind exactly one wallet row. */
export const WalletOwnerType = {
  DRIVER: "DRIVER",
  AGENCY: "AGENCY",
  PLATFORM: "PLATFORM",
} as const;
export type WalletOwnerType =
  (typeof WalletOwnerType)[keyof typeof WalletOwnerType];

/** Vehicle classes supported at pilot. */
export const VehicleType = {
  MOTORCYCLE: "MOTORCYCLE",
  SEDAN: "SEDAN",
  SUV: "SUV",
  VAN: "VAN",
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

/** Compliance document lifecycle (spec §24). */
export const DocumentStatus = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

/** Notification channels (spec §47: SMS + push + email). */
export const NotificationChannel = {
  SMS: "SMS",
  PUSH: "PUSH",
  EMAIL: "EMAIL",
  IN_APP: "IN_APP",
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** Money is stored in centavos (integers) everywhere. */
export const CENTAVOS_PER_PESO = 100;
