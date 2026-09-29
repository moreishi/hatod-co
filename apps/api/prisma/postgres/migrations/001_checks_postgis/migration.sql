-- PostGIS for future dispatch geography (location columns land with the
-- location-ping feature; the extension must exist first).
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum mirrors of @hailing/constants. Application validation stays the first
-- line of defense; these CHECKs are the production backstop (spec rule 49).
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_status_check"
  CHECK ("status" IN ('REQUESTED','ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','NO_DRIVERS'));
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_paymentMethod_check"
  CHECK ("paymentMethod" IN ('CASH','WALLET'));

ALTER TABLE "Driver" ADD CONSTRAINT "Driver_status_check"
  CHECK ("status" IN ('APPLICANT','DOCUMENTS_PENDING','DOCUMENTS_UNDER_REVIEW','ACTIVE','SUSPENDED','DEACTIVATED','REJECTED'));

ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_role_check"
  CHECK ("role" IN ('OWNER','MANAGER','DISPATCHER','FINANCE','VIEWER'));

ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_role_check"
  CHECK ("role" IN ('SUPER_ADMIN','OPS','SUPPORT','FINANCE_ADMIN'));
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_role_check"
  CHECK ("role" IN ('SUPER_ADMIN','OPS','SUPPORT','FINANCE_ADMIN'));

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_type_check"
  CHECK ("type" IN ('MOTORCYCLE','SEDAN','SUV','VAN'));

ALTER TABLE "Document" ADD CONSTRAINT "Document_status_check"
  CHECK ("status" IN ('PENDING','VERIFIED','REJECTED','EXPIRED'));

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_ownerType_check"
  CHECK ("ownerType" IN ('DRIVER','AGENCY','PLATFORM'));

ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_type_check"
  CHECK ("type" IN ('RIDE_EARNING','COMMISSION','PAYOUT','TOP_UP','ADJUSTMENT'));

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_channel_check"
  CHECK ("channel" IN ('SMS','PUSH','EMAIL','IN_APP'));
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_status_check"
  CHECK ("status" IN ('QUEUED','SENT','FAILED'));

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_status_check"
  CHECK ("status" IN ('PENDING','ACTIVE','CLOSED'));

ALTER TABLE "Message" ADD CONSTRAINT "Message_type_check"
  CHECK ("type" IN ('TEXT','SYSTEM'));
ALTER TABLE "Message" ADD CONSTRAINT "Message_status_check"
  CHECK ("status" IN ('SENT','DELIVERED','READ'));
