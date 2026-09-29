# Hailing AI Project Specification

**Version:** 0.3
**Status:** Ready to Code
**Current Milestone:** Hailing Foundation v0.1
**Initial Market:** Cebu, Philippines

---

# 1. Project Overview

**Hailing** is a Philippines-first ride-hailing platform initially focused on Cebu.

The platform supports four primary actors:

1. Passenger
2. Driver
3. Agency
4. Admin

The initial product will be built as a **modular monolith** with event-driven internal architecture.

The initial development strategy is:

```text
LocalStage
    ↓
SQLite
    ↓
Next.js Admin
Next.js Agency
NestJS API
Worker
    ↓
Foundation
    ↓
Rides / Dispatch / Realtime
    ↓
Finance / Wallet / Settlements
    ↓
Production
```

---

# 2. Product Actors

## 2.1 Passenger

Passengers can:

* Create an account
* Verify phone number
* Manage profile
* Upload profile photo
* Request rides
* Enter pickup and destination
* View fare
* Track driver
* Cancel rides
* Pay using supported payment methods
* View ride history
* Rate drivers
* Manage wallet
* View transactions
* Contact support
* Receive notifications

---

## 2.2 Driver

Drivers can:

* Create account
* Verify phone number
* Manage profile
* Upload profile photo
* Submit driver information
* Submit driver documents
* Register vehicles
* Submit vehicle documents
* Be assigned to an agency
* Go online/offline
* Accept ride requests
* Navigate to passengers
* Start rides
* Complete rides
* View earnings
* Manage wallet
* View transactions
* View ride history
* Receive notifications

Driver account creation does **not** automatically make a driver eligible for dispatch.

A driver must satisfy all required eligibility rules.

---

## 2.3 Agency

An Agency is a first-class business entity.

An agency is not simply a role attached to a driver.

Agencies can:

* Register
* Complete business onboarding
* Submit agency documents
* Create agency users
* Recruit drivers
* Manage drivers
* Manage vehicles
* Assign drivers to vehicles
* View active rides
* View ride history
* View earnings
* Manage agency wallet
* View settlements
* View reports
* Receive notifications

Agency roles:

```text
OWNER
MANAGER
DISPATCHER
FINANCE
VIEWER
```

---

## 2.4 Admin

Admin users operate the Hailing command center.

Admin capabilities include:

* Passenger management
* Driver management
* Agency management
* Vehicle management
* Ride management
* Dispatch
* Pricing
* Service areas
* Document verification
* Finance
* Wallets
* Settlements
* Reports
* Notifications
* Support
* Audit logs
* System settings

Admin registration is invitation-based.

Admin 2FA is required.

---

# 3. Authentication and Onboarding

Authentication and onboarding are separate concepts.

```text
Authentication
=
Who are you?

Onboarding
=
What type of account are you?
Are you verified?
Are you approved?
Are you ready to use the platform?
```

General lifecycle:

```text
ACCOUNT CREATED
    ↓
PHONE VERIFIED
    ↓
PROFILE SETUP
    ↓
ACCOUNT TYPE / ROLE
    ↓
ONBOARDING
    ↓
VERIFICATION
    ↓
APPROVAL
    ↓
ACTIVE
```

---

# 4. Profiles

Profile photos are part of the normal user profile.

They are **not compliance documents**.

Example profile:

```text
User
├── firstName
├── lastName
├── displayName
├── phone
├── email
├── profilePhoto
├── dateOfBirth
├── address
├── countryCode
├── regionCode
├── provinceCode
├── cityCode
├── barangayCode
└── timestamps
```

Production image files are stored in:

```text
Cloudflare R2
```

The database stores file references and metadata.

---

# 5. Passenger Onboarding

Passenger onboarding should remain lightweight.

```text
Phone
    ↓
OTP
    ↓
Basic Profile
    ↓
Profile Photo
    ↓
Ready to Ride
```

Additional information can be collected later when required.

---

# 6. Driver Onboarding

Driver onboarding:

```text
Phone + OTP
    ↓
Basic Profile + Photo
    ↓
Driver Information
    ↓
Driver Documents
    ↓
Vehicle Information
    ↓
Vehicle Documents
    ↓
Agency Assignment
    ↓
Review
    ↓
Approval
    ↓
Activation
```

Driver lifecycle:

```text
APPLICANT
    ↓
DOCUMENTS_PENDING
    ↓
UNDER_REVIEW
    ↓
APPROVED
    ↓
ACTIVE
```

Possible inactive states:

```text
SUSPENDED
INACTIVE
```

---

# 7. Agency Onboarding

Agency onboarding:

```text
Phone + OTP
    ↓
Agency Profile
    ↓
Business Information
    ↓
Agency Documents
    ↓
Owner/Admin Setup
    ↓
Review
    ↓
Approved
    ↓
Active
    ↓
Recruit Drivers
```

---

# 8. Admin Onboarding

Admin onboarding is invitation-based.

```text
Admin Invitation
    ↓
Account Creation
    ↓
Verification
    ↓
2FA
    ↓
Role + Permissions
    ↓
Active
```

There should be no public admin registration flow.

---

# 9. Documents

Driver, vehicle, and agency documents are separate from profile photos.

Document model should support:

```text
documentType
fileReference
status
issueDate
expiryDate
reviewedBy
reviewedAt
rejectionReason
createdAt
updatedAt
```

Document states:

```text
PENDING
UNDER_REVIEW
APPROVED
REJECTED
EXPIRED
```

Document history must be auditable.

Production document files are stored in Cloudflare R2.

---

# 10. Constants

Use centralized constants/enums wherever practical.

Do not scatter magic strings throughout the application.

Centralize values such as:

```text
Account statuses
User roles
Agency roles
Permissions
Ride statuses
Driver statuses
Driver availability statuses
Document statuses
Onboarding statuses
Payment methods
Wallet transaction types
Notification types
Vehicle types
Settlement statuses
Configuration keys
```

Example:

```ts
export const RIDE_STATUS = {
  REQUESTED: "REQUESTED",
  SEARCHING: "SEARCHING",
  ASSIGNED: "ASSIGNED",
  DRIVER_EN_ROUTE: "DRIVER_EN_ROUTE",
  DRIVER_ARRIVED: "DRIVER_ARRIVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_DRIVER_FOUND: "NO_DRIVER_FOUND",
  EXPIRED: "EXPIRED",
  DISPUTED: "DISPUTED",
} as const;
```

Shared constants must be available to all applications that require them.

```text
packages/constants
```

Do not duplicate domain values between:

```text
Admin
Agency
API
Worker
Future Passenger App
Future Driver App
```

---

# 11. Geographic Reference Data

Country, region, province, city/municipality, and barangay data must use centralized data assets.

Do not hard-code geographic lists inside individual applications.

Geographic hierarchy:

```text
Country
    ↓
Region
    ↓
Province
    ↓
City / Municipality
    ↓
Barangay
```

Recommended structure:

```text
packages/
└── data/
    └── geography/
        ├── countries.json
        ├── regions.json
        ├── provinces.json
        ├── cities.json
        └── barangays.json
```

Example:

```json
{
  "code": "PH",
  "name": "Philippines"
}
```

```json
{
  "code": "PH-07",
  "name": "Central Visayas",
  "countryCode": "PH"
}
```

```json
{
  "code": "PH-CEB",
  "name": "Cebu",
  "regionCode": "PH-07"
}
```

```json
{
  "code": "PH-CEB-CEBU",
  "name": "Cebu City",
  "provinceCode": "PH-CEB"
}
```

These codes are illustrative.

Actual geographic identifiers must come from the selected authoritative dataset.

Applications should reference geography using stable IDs/codes:

```text
countryCode
regionCode
provinceCode
cityCode
barangayCode
```

Do not use display names as authoritative relationships.

---

# 12. Reference Data

Reference datasets should also be centralized.

Recommended structure:

```text
packages/
├── constants/
└── data/
    ├── geography/
    │   ├── countries.json
    │   ├── regions.json
    │   ├── provinces.json
    │   ├── cities.json
    │   └── barangays.json
    │
    └── reference/
        ├── vehicle-types.json
        ├── document-types.json
        └── service-types.json
```

Reference-data flow:

```text
VERSION-CONTROLLED DATA ASSET
        ↓
VALIDATION
        ↓
DATABASE SEED / IMPORT
        ↓
DATABASE REFERENCE DATA
        ↓
APPLICATION
```

---

# 13. Ride Lifecycle

Core ride lifecycle:

```text
REQUESTED
    ↓
SEARCHING
    ↓
ASSIGNED
    ↓
DRIVER_EN_ROUTE
    ↓
DRIVER_ARRIVED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

Exceptional states:

```text
CANCELLED
NO_DRIVER_FOUND
EXPIRED
DISPUTED
```

The backend owns and enforces valid ride transitions.

Clients cannot bypass state-machine rules.

---

# 14. Driver Availability

Driver availability is separate from ride status.

Example:

```text
OFFLINE
    ↓
ONLINE
    ↓
AVAILABLE
    ↓
MATCHED
    ↓
EN_ROUTE
    ↓
ARRIVED
    ↓
IN_RIDE
    ↓
AVAILABLE
```

---

# 15. Dispatch and Matching

Default dispatch:

```text
Automatic Matching
```

Admin manual dispatch is available as a fallback.

Initial flow:

```text
Passenger requests ride
        ↓
Pickup coordinates
        ↓
Fare calculation
        ↓
Find eligible drivers
        ↓
Filter drivers
        ↓
Rank drivers
        ↓
Offer ride
        ↓
Driver accepts
        ↓
Assign ride
```

Initial filters:

1. Service eligibility
2. Driver online/available state
3. Valid documents
4. Vehicle compatibility
5. Service-area eligibility

Initial ranking:

1. Geographic proximity / ETA
2. Vehicle compatibility
3. Configurable dispatch rules

Do not over-engineer matching with AI initially.

Future optimization may include:

```text
Acceptance behavior
Demand balancing
Agency rules
Utilization
Zone balancing
Advanced ETA scoring
```

---

# 16. Fare and Pricing

Pricing must be configurable.

Do not hard-code pricing rules.

Pricing can include:

```text
Base fare
Per-km rate
Per-minute rate
Minimum fare
Waiting fee
Cancellation fee
Service/platform fee
Agency commission
Driver share
Promotions
Tolls
Other applicable charges
```

Admin controls platform pricing.

Agencies do not independently override platform fares.

---

# 17. Finance and Wallet

Use a ledger-based financial architecture.

Avoid direct mutable balance logic such as:

```text
wallet.balance += amount
wallet.balance -= amount
```

Instead use transaction/ledger records.

Wallet types:

```text
Passenger Wallet
Driver Wallet
Agency Wallet
Platform Wallet
```

Example flow:

```text
Ride Completed
    ↓
Payment
    ↓
Ledger Entries
    ↓
Driver Earnings
Agency Earnings
Platform Revenue
```

Support:

```text
Payments
Credits
Debits
Refunds
Adjustments
Commissions
Earnings
Settlements
Withdrawals
Reconciliation
```

Initial payment methods:

```text
CASH
WALLET
```

---

# 18. Vehicles

Driver and vehicle are separate entities.

```text
Driver
    ↓
Assignment
    ↓
Vehicle
```

This allows:

* Vehicle reassignment
* Fleet management
* Driver replacement
* Assignment history
* Multiple vehicles
* Historical ownership/assignment records

---

# 19. GPS and Realtime

Use WebSockets for live driver updates.

Use Redis for rapidly changing realtime state.

Use PostgreSQL for durable business state.

Architecture:

```text
Driver GPS
    ↓
WebSocket
    ↓
Redis
    ↓
Matching / Realtime
```

Redis handles:

```text
Current location
Online/offline status
Availability
Active dispatch state
Caching
Rate limiting
Temporary locks
```

Do not write every GPS update directly to PostgreSQL.

Persist only meaningful events or appropriate location history.

---

# 20. Maps

Create a map-provider abstraction.

Example:

```ts
interface MapService {
  geocode();
  reverseGeocode();
  route();
  distance();
  eta();
}
```

Do not scatter provider-specific map API calls throughout domain modules.

---

# 21. Notifications

Use RabbitMQ for asynchronous notification processing.

Events can include:

```text
RideAssigned
DriverArriving
DriverArrived
RideStarted
RideCompleted
PaymentReceived
DocumentExpiring
WalletCredited
SettlementCompleted
```

Notification channels:

```text
Push
SMS
Email
In-app
```

The API should not block while waiting for external notification providers.

---

# 22. Admin Dashboard

Navigation:

```text
Dashboard
Live Operations
Rides
Passengers
Drivers
Agencies
Vehicles
Finance
Pricing
Service Areas
Documents
Support
Reports
Notifications
Audit Logs
Settings
```

Live Operations should include:

```text
Live map
Active rides
Online drivers
Available drivers
Incidents
Ride status
Operational alerts
Dispatch controls
```

---

# 23. Agency Dashboard

Navigation:

```text
Overview
Drivers
Vehicles
Active Rides
Ride History
Earnings
Wallet
Settlements
Documents
Reports
Notifications
Team / Permissions
```

The Agency dashboard is fleet-first.

---

# 24. Role-Based Access Control

Use granular permissions.

Examples:

```text
rides.view
rides.dispatch
rides.cancel

drivers.view
drivers.create
drivers.approve
drivers.suspend

agencies.view
agencies.approve

finance.view
finance.adjust

settlements.approve
```

Never rely on frontend authorization alone.

All authorization must be enforced server-side.

---

# 25. Technology Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zustand where appropriate
```

## Backend

```text
NestJS
TypeScript
REST API
WebSockets
Prisma
```

## Database

Development:

```text
SQLite
```

Production:

```text
PostgreSQL
PostGIS
```

## Infrastructure

```text
Redis
RabbitMQ
Docker
Coolify
Cloudflare
Cloudflare R2
```

---

# 26. Architecture

Use a **Modular Monolith**.

Do not start with microservices.

NestJS modules:

```text
modules/
├── auth/
├── users/
├── agencies/
├── drivers/
├── vehicles/
├── rides/
├── dispatch/
├── fares/
├── wallets/
├── payments/
├── settlements/
├── documents/
├── notifications/
├── service-areas/
└── audit/
```

Use event-driven internals without premature microservices.

Example:

```text
RideCompleted
    ↓
Finance
Wallet
Notifications
Agency Earnings
Analytics
```

---

# 27. Repository Structure

Use a monorepo.

```text
hailing/
├── apps/
│   ├── admin/
│   ├── agency/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── constants/
│   ├── data/
│   │   ├── geography/
│   │   └── reference/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   └── coolify/
│
├── docs/
│
├── .github/
│   └── workflows/
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Tools:

```text
pnpm
Turborepo
Docker
GitHub Actions
```

---

# 28. LocalStage

Local development environment:

```text
LocalStage
├── Next.js Admin
├── Next.js Agency
├── NestJS API
├── Worker
└── SQLite
```

Integration testing can use Docker for:

```text
PostgreSQL/PostGIS
Redis
RabbitMQ
```

SQLite is development-only.

The application must remain portable to PostgreSQL.

---

# 29. Prisma

Prisma is the ORM.

Requirements:

```text
Prisma schema
Prisma migrations
Prisma seed system
SQLite development support
PostgreSQL production support
```

The database schema must support the domain relationships without tying business logic directly to SQLite-specific behavior.

---

# 30. Database Seed System

Database seeds are a required part of the development foundation.

The project must include reproducible seed scripts.

Seed data must represent a realistic development environment.

## Required Seed Volume

The default development seed should create:

```text
40–50 users
```

Target:

```text
~45 users
```

The seed should represent multiple account types.

Example distribution:

```text
Passengers
Drivers
Agency Users
Admins
```

The exact distribution can evolve as the domain model develops.

---

# 31. Seeded Domain Relationships

The seed system should generate realistic related entities.

At minimum:

```text
Users
Profiles
Roles
Permissions
Agencies
Agency Users
Drivers
Vehicles
Driver/Vehicle Assignments
Driver Documents
Vehicle Documents
Agency Documents
Rides
Wallets
Ledger Transactions
Notifications
```

Seed relationships must respect foreign keys.

Example:

```text
Agency
    ↓
Agency User
    ↓
Driver
    ↓
Vehicle Assignment
    ↓
Vehicle
    ↓
Ride
    ↓
Payment
    ↓
Ledger Transactions
```

---

# 32. Seeded Transactions

The seed system must create:

```text
200–500 financial transaction records
```

Target:

```text
~350 transactions
```

Transactions should represent realistic activity.

Transaction types may include:

```text
RIDE_PAYMENT
DRIVER_EARNING
AGENCY_COMMISSION
PLATFORM_FEE
WALLET_CREDIT
WALLET_DEBIT
REFUND
ADJUSTMENT
SETTLEMENT
WITHDRAWAL
```

Transaction data should be connected to actual seeded domain entities.

Do not generate isolated fake transactions with no relationship to rides, wallets, users, agencies, or settlements.

---

# 33. Seeded Rides

The seed system should generate enough ride activity to make the dashboards useful.

Seed rides should cover different states, including appropriate combinations of:

```text
REQUESTED
SEARCHING
ASSIGNED
DRIVER_EN_ROUTE
DRIVER_ARRIVED
IN_PROGRESS
COMPLETED
CANCELLED
NO_DRIVER_FOUND
EXPIRED
DISPUTED
```

Completed rides should generate corresponding financial records where applicable.

The seed data should allow developers to test:

```text
Ride history
Driver earnings
Agency earnings
Platform revenue
Wallet balances
Transactions
Admin dashboards
Agency dashboards
Reports
Notifications
```

---

# 34. Seeded Geographic Data

Geographic seed data must come from:

```text
packages/data/geography
```

The seed process must not contain a separate manually maintained list of:

```text
Countries
Regions
Provinces
Cities
Barangays
```

Instead:

```text
Geographic Data Assets
        ↓
Validation
        ↓
Database Seed
```

Seeded user, agency, driver, and ride addresses must reference geographic IDs/codes from the centralized dataset.

---

# 35. Deterministic Seeds

Seeds should be deterministic/reproducible where practical.

Use a fixed seed for development.

Example:

```text
SEED=2026
```

Running the seed against a clean database should produce the same logical dataset.

Randomization can be used for realistic variation, but it should be deterministic when the seed value is fixed.

---

# 36. Seed Safety

Development/demo seeds must not accidentally execute against production.

Requirements:

```text
Environment validation
Explicit seed command
Production protection
Clear database environment detection
```

Example:

```text
pnpm db:seed
```

Production should require an explicit and separate process if production data initialization is ever needed.

Never automatically run demo seed data during a production deployment.

---

# 37. Seed Commands

Recommended commands:

```text
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm db:studio
```

Possible development workflow:

```text
pnpm db:reset
    ↓
Prisma migration
    ↓
Reference data seed
    ↓
Application seed
```

---

# 38. Seed Validation

The seed process should validate:

```text
40–50 users exist
Required roles exist
Agencies exist
Drivers exist
Vehicles exist
Assignments exist
Geographic relationships are valid
Rides exist
200–500 financial transactions exist
Ledger records reconcile
Foreign keys are valid
Domain state rules are respected
```

Seed failures should stop execution rather than silently producing partial or inconsistent data.

---

# 39. Production Infrastructure

Three VPSs:

```text
4 CPU cores
8 GB RAM
100 GB SSD
```

Start with two active VPSs.

Reserve VPS #3.

---

# 40. VPS #1 — Application and Operations

```text
Coolify
Next.js Admin
Next.js Agency
NestJS API
WebSocket
Workers
Redis
RabbitMQ
```

---

# 41. VPS #2 — Database

```text
PostgreSQL
PostGIS
Backup System
```

The database should not expose a public database port.

---

# 42. VPS #3 — Reserved Capacity

Potential future uses:

```text
Redis split-out
RabbitMQ split-out
Additional application capacity
Failover
Staging
Dedicated workers
```

---

# 43. Production Architecture

```text
Cloudflare
    ↓
VPS #1 / Coolify
    ├── Admin
    ├── Agency
    ├── NestJS API
    ├── WebSocket
    ├── Workers
    ├── Redis
    └── RabbitMQ
    ↓
Private Network
    ↓
VPS #2
    ├── PostgreSQL
    └── PostGIS
    ↓
Cloudflare R2
```

---

# 44. Coolify

Coolify is installed only on VPS #1.

Docker remains the deployment foundation.

Coolify is the management/deployment layer.

Application architecture must not depend on Coolify.

PostgreSQL remains independently managed on VPS #2.

---

# 45. Cloudflare

Use Cloudflare for:

```text
DNS
SSL
WAF
CDN
Proxy
```

---

# 46. Cloudflare R2

Production object storage:

```text
Profile photos
Driver documents
Vehicle documents
Agency documents
Receipts
Reports
Database backups
```

Do not store production uploads on VPS disks.

---

# 47. Database Strategy

Development:

```text
SQLite
```

Production:

```text
PostgreSQL + PostGIS
```

Keep database ports private.

Leave the architecture open for future migration to managed PostgreSQL.

---

# 48. Backups and Disaster Recovery

Required:

```text
PostgreSQL
    ↓
Automated encrypted backup
    ↓
Cloudflare R2
```

Backup requirements:

```text
Automated backups
Encryption
Retention policy
Offsite storage
Restore testing
Recovery procedure
Monitoring
```

A backup that has never been restored/tested is not considered proven.

---

# 49. Security

Requirements:

```text
Phone + OTP
Secure sessions/tokens
Refresh token/session management
RBAC
Granular permissions
Rate limiting
Request validation
Audit logs
Encryption of sensitive information
Protected document access
Admin 2FA
Secrets outside Git
Private database
Firewall rules
```

---

# 50. Observability

Monitor:

```text
Structured logs
Error tracking
Server metrics
Uptime
Database health
Redis health
RabbitMQ health
Worker health
Queue depth
Disk usage
API health
Dispatch failures
Matching failures
```

---

# 51. Performance and Scale

Planning targets only; actual capacity must be benchmarked.

```text
MVP:
100–300 active rides

Early community:
300–1,000 active rides

Busy Cebu:
1,000–3,000 active rides

Large operation:
3,000–10,000+ active rides
```

First serious engineering benchmark:

```text
~1,000 concurrent active rides
```

Then benchmark and optimize based on actual bottlenecks.

Example GPS load:

```text
5,000 drivers
×
1 update / 2 seconds
=
2,500 location updates/sec
```

This is why current driver location belongs in Redis rather than PostgreSQL.

---

# 52. Scale Path

Expected scaling path:

```text
2 VPS
    ↓
Split Redis / RabbitMQ
    ↓
Multiple API servers
    ↓
Database optimization
    ↓
Database replica where justified
    ↓
Managed PostgreSQL if justified
```

Do not scale infrastructure without measuring the bottleneck.

---

# 53. Mobile Strategy

Web first.

Mobile later.

The API must be designed so that:

```text
Admin Web
Agency Web
Passenger Mobile
Driver Mobile
```

can all consume the same NestJS API.

---

# 54. GitFlow

Use:

```text
main
  ↑
release/*
  ↑
develop
  ↑
feature/*
```

Hotfix:

```text
hotfix/*
    ↓
main
+
develop
```

Rules:

```text
No direct push to main
No direct push to develop
PR required
CI checks required
Feature branches originate from develop
```

---

# 55. Conventional Commits

Use:

```text
feat:
fix:
refactor:
test:
docs:
chore:
```

Examples:

```text
feat: add driver onboarding
feat: add agency vehicle assignment
fix: prevent invalid ride transition
test: add wallet ledger reconciliation tests
docs: update seed requirements
chore: configure turborepo
```

---

# 56. Hailing Foundation v0.1

The first milestone is:

```text
LocalStage
    ↓
GitFlow Repository
    ↓
Next.js Admin
Next.js Agency
NestJS API
Worker
    ↓
SQLite
    ↓
Shared Constants
    ↓
Shared Reference Data
    ↓
Geographic Data Assets
    ↓
Prisma
    ↓
Database Schema
    ↓
Database Seeds
    ↓
40–50 Seeded Users
    ↓
200–500 Seeded Transactions
    ↓
Authentication
    ↓
User Profiles
    ↓
Profile Photos
    ↓
Roles & Permissions
    ↓
Basic Onboarding
```

---

# 57. Initial Engineering Sequence

Implement in this order:

```text
1. CREATE MONOREPO

2. CONFIGURE PNPM

3. CONFIGURE TURBOREPO

4. CREATE ADMIN APP

5. CREATE AGENCY APP

6. CREATE NESTJS API

7. CREATE WORKER

8. CREATE SHARED PACKAGES

9. CREATE CONSTANTS PACKAGE

10. CREATE DATA PACKAGE

11. CREATE GEOGRAPHIC DATA ASSETS

12. CREATE REFERENCE DATA ASSETS

13. CONFIGURE LOCALSTAGE

14. CONFIGURE PRISMA

15. CONFIGURE SQLITE

16. CREATE INITIAL DOMAIN SCHEMA

17. CREATE MIGRATIONS

18. CREATE DATABASE SEED SYSTEM

19. SEED 40–50 USERS

20. SEED AGENCIES / DRIVERS / VEHICLES

21. SEED REALISTIC RIDES

22. SEED 200–500 FINANCIAL TRANSACTIONS

23. VALIDATE SEED INTEGRITY

24. IMPLEMENT AUTH

25. IMPLEMENT USER PROFILE

26. IMPLEMENT PROFILE PHOTO ABSTRACTION

27. IMPLEMENT RBAC

28. IMPLEMENT BASIC ONBOARDING

29. TEST

30. CI
```

---

# 58. Foundation Definition of Done

The foundation is complete when:

```text
[ ] Monorepo builds
[ ] Admin runs locally
[ ] Agency runs locally
[ ] API runs locally
[ ] Worker runs locally
[ ] SQLite works through Prisma
[ ] Prisma migrations work
[ ] Database seed system exists
[ ] Seed data is deterministic
[ ] 40–50 users are generated
[ ] Passenger accounts are represented
[ ] Driver accounts are represented
[ ] Agency users are represented
[ ] Admin users are represented
[ ] Agencies are seeded
[ ] Drivers are seeded
[ ] Vehicles are seeded
[ ] Driver/vehicle assignments are seeded
[ ] Profile data is seeded
[ ] Profile photo abstraction exists
[ ] Driver documents are seeded
[ ] Vehicle documents are seeded
[ ] Agency documents are seeded
[ ] Geographic data assets exist
[ ] Geographic seed data is loaded centrally
[ ] Geography is not duplicated across applications
[ ] Geographic relationships are validated
[ ] Rides are seeded
[ ] Multiple ride states are represented
[ ] 200–500 financial transactions are seeded
[ ] Transactions reference real domain entities
[ ] Ledger balances reconcile
[ ] Seed data respects constants/enums
[ ] Seed data respects state machines
[ ] Production cannot accidentally run demo seeds
[ ] Shared constants package exists
[ ] Shared reference-data package exists
[ ] Authentication works
[ ] Development OTP flow works
[ ] User profiles work
[ ] Roles exist
[ ] Permissions exist
[ ] Backend RBAC works
[ ] Passenger onboarding structure works
[ ] Driver onboarding structure exists
[ ] Agency onboarding structure exists
[ ] Core foundation tests exist
[ ] CI passes
[ ] GitFlow conventions are documented
```

---

# 59. AI Coding Rules

When an AI coding model works on Hailing, treat this document as the current source of truth.

## Architecture

1. Do not casually replace the modular monolith with microservices.
2. Do not replace SQLite for LocalStage unless explicitly requested.
3. Do not replace PostgreSQL/PostGIS production unless explicitly requested.
4. Do not remove Agency as a first-class entity.
5. Do not merge Driver and Vehicle.
6. Do not merge authentication and onboarding.
7. Do not treat profile photos as compliance documents.

## Constants and Reference Data

8. Prefer centralized constants.
9. Prefer shared enums/types/constants where appropriate.
10. Avoid magic strings.
11. Avoid duplicated business rules.
12. Keep shared definitions in `packages/`.
13. Keep geography in shared data assets.
14. Keep reference datasets centralized.
15. Do not hard-code country/province/city/barangay lists inside individual applications.
16. Use stable geographic codes/IDs.
17. Do not use geographic display names as primary identifiers.
18. Do not manually duplicate Philippine geographic data in frontend code.
19. Use shared geographic data as the authoritative project reference.
20. Validate geographic hierarchy relationships.

## Database and Seeds

21. Treat Prisma migrations and seeds as separate concerns.
22. Keep development seed data reproducible.
23. Maintain approximately 40–50 seeded users.
24. Maintain approximately 200–500 seeded financial transactions.
25. Seed realistic domain relationships.
26. Transactions must reference actual seeded entities.
27. Seeded wallets must reconcile with ledger transactions.
28. Seed data must respect foreign keys.
29. Seed data must respect constants and enums.
30. Seed data must respect state-machine rules.
31. Do not accidentally execute development seeds against production.
32. Keep geographic seed data sourced from centralized assets.

## Business Logic

33. Business rules are enforced by the backend.
34. Use explicit state machines.
35. Clients cannot bypass ride transitions.
36. Driver account creation does not make a driver dispatchable.
37. Do not hard-code pricing.
38. Do not directly mutate financial balances without ledger records.
39. Preserve historical assignments and financial events.

## Realtime

40. Do not write every GPS update to PostgreSQL.
41. Use Redis for rapidly changing realtime state.
42. Use WebSockets for live updates.
43. Keep durable business state in PostgreSQL.

## Providers

44. Use map provider abstraction.
45. Use storage provider abstraction.
46. Use notification provider abstraction.
47. Avoid provider-specific code inside domain modules.

## Security

48. Never rely on frontend authorization.
49. Enforce RBAC server-side.
50. Protect documents.
51. Keep secrets outside Git.
52. Keep production DB private.
53. Audit sensitive admin and financial operations.

## Infrastructure

54. Do not depend on Coolify from application code.
55. Keep Docker as the deployment foundation.
56. Keep production uploads in R2.
57. Do not scale infrastructure without measuring bottlenecks.

## Development

58. Write tests for important domain behavior.
59. Keep changes incremental.
60. Follow GitFlow.
61. Use Conventional Commits.
62. Prefer maintainability over premature optimization.
63. Explain architectural changes before implementing them.

---

# 60. Immediate AI Coding Task

The first implementation task is:

```text
CREATE MONOREPO
    ↓
CONFIGURE PNPM
    ↓
CONFIGURE TURBOREPO
    ↓
CREATE ADMIN APP
    ↓
CREATE AGENCY APP
    ↓
CREATE NESTJS API
    ↓
CREATE WORKER
    ↓
CREATE SHARED PACKAGES
    ↓
CREATE CONSTANTS PACKAGE
    ↓
CREATE DATA PACKAGE
    ↓
CREATE GEOGRAPHIC DATA ASSETS
    ↓
CREATE REFERENCE DATA ASSETS
    ↓
CONFIGURE LOCALSTAGE
    ↓
CONFIGURE PRISMA
    ↓
CONFIGURE SQLITE
    ↓
CREATE INITIAL DOMAIN SCHEMA
    ↓
CREATE MIGRATIONS
    ↓
CREATE SEED SYSTEM
    ↓
SEED 40–50 USERS
    ↓
SEED AGENCIES / DRIVERS / VEHICLES
    ↓
SEED REALISTIC RIDES
    ↓
SEED 200–500 TRANSACTIONS
    ↓
VALIDATE SEED DATA
    ↓
IMPLEMENT AUTH
    ↓
IMPLEMENT USER PROFILE
    ↓
IMPLEMENT PROFILE PHOTO ABSTRACTION
    ↓
IMPLEMENT RBAC
    ↓
IMPLEMENT BASIC ONBOARDING
    ↓
TEST
    ↓
CI
```

---

# 61. Current Project Status

```text
PROJECT:
Hailing

STATUS:
Ready to Code

VERSION:
0.3

CURRENT MILESTONE:
Hailing Foundation v0.1

DEVELOPMENT:
LocalStage + SQLite

PRODUCTION:
VPS + PostgreSQL/PostGIS
+ Redis
+ RabbitMQ
+ Cloudflare
+ Cloudflare R2

ARCHITECTURE:
Modular Monolith
+ Event-Driven Internals

VERSION CONTROL:
GitFlow

INITIAL MARKET:
Cebu, Philippines

MOBILE:
Later

CURRENT PRIORITY:
Backend
+ Admin Web
+ Agency Web

SHARED FOUNDATION:
Constants
+ Reference Data
+ Geographic Data
+ Types
+ Validation

DATABASE FOUNDATION:
Prisma
+ SQLite Development
+ PostgreSQL Production
+ Seed System

DEVELOPMENT SEED TARGET:
40–50 Users
200–500 Financial Transactions
```

# END OF HAILING PROJECT SPECIFICATION
