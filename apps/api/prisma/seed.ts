/**
 * LocalStage seed — Cebu pilot world (spec §48, rules 22-32).
 * - Deterministic: mulberry32(20260929), same data on every run.
 * - DEV ONLY: refuses to run unless DATABASE_URL is a local file.
 * - Targets: 40–50 users, 200–500 ledger transactions, wallets reconcile.
 */
import { PrismaClient } from "@prisma/client";
import {
  AdminRole,
  AgencyRole,
  CENTAVOS_PER_PESO,
  DriverStatus,
  PaymentMethod,
  RideStatus,
  TransactionType,
  VehicleType,
  WalletOwnerType,
} from "@hailing/constants";
import cebu from "../../../packages/data/geography/cebu.json" with { type: "json" };
import pricing from "../../../packages/data/reference/pricing.json" with { type: "json" };

const SEED = 20260929;
const PLATFORM_WALLET_ID = "platform";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));

const FIRST = [
  "Jose",
  "Maria",
  "Juan",
  "Ana",
  "Ramon",
  "Liza",
  "Marco",
  "Nena",
  "Paolo",
  "Rosa",
];
const LAST = [
  "Dela Cruz",
  "Santos",
  "Reyes",
  "Garcia",
  "Mendoza",
  "Torres",
  "Flores",
  "Ramos",
];

const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.startsWith("file:")) {
  throw new Error(
    `seed refused: DATABASE_URL is not a local file (${dbUrl || "unset"})`,
  );
}

const prisma = new PrismaClient();

const barangays = cebu.cities.flatMap((c) =>
  c.barangays.map((b) => ({ code: b.code, city: c.name })),
);

async function reset() {
  // Dependency order: children first. Dev database only.
  await prisma.ledgerTransaction.deleteMany();
  await prisma.rideEvent.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.document.deleteMany();
  await prisma.driverVehicleAssignment.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.agencyMember.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.adminInvitation.deleteMany();
  await prisma.adminRoleAssignment.deleteMany();
  await prisma.user.deleteMany();
}

let phoneSeq = 917100000;
const nextPhone = () => `0${phoneSeq++}`;

async function main() {
  await reset();

  // ---- Platform admins (3) ----
  const adminSpecs = [
    { role: AdminRole.SUPER_ADMIN, name: "Super Admin" },
    { role: AdminRole.OPS, name: "Ops Lead" },
    { role: AdminRole.FINANCE_ADMIN, name: "Finance Admin" },
  ];
  for (const spec of adminSpecs) {
    const user = await prisma.user.create({
      data: { phone: nextPhone(), displayName: spec.name },
    });
    await prisma.adminRoleAssignment.create({
      data: { userId: user.id, role: spec.role },
    });
  }

  // ---- Agencies (2) + staff (6) ----
  const agencySpecs = [
    {
      name: "Queen City Wheels",
      slug: "queen-city-wheels",
      cityCode: "072217000",
    },
    {
      name: "Mactan Island Rides",
      slug: "mactan-island-rides",
      cityCode: "072231000",
    },
  ];
  const agencies = [];
  for (const spec of agencySpecs) {
    const agency = await prisma.agency.create({
      data: {
        name: spec.name,
        slug: spec.slug,
        contactPhone: nextPhone(),
        cityCode: spec.cityCode,
        status: "ACTIVE",
      },
    });
    const staff: Record<string, string> = {};
    for (const role of [
      AgencyRole.OWNER,
      AgencyRole.DISPATCHER,
      AgencyRole.FINANCE,
    ]) {
      const user = await prisma.user.create({
        data: {
          phone: nextPhone(),
          displayName: `${pick(FIRST)} ${pick(LAST)}`,
        },
      });
      await prisma.agencyMember.create({
        data: { agencyId: agency.id, userId: user.id, role },
      });
      staff[role] = user.id;
    }
    await prisma.wallet.create({
      data: {
        ownerType: WalletOwnerType.AGENCY,
        ownerId: agency.id,
        balanceCentavos: 0,
      },
    });
    agencies.push({ ...agency, staff });
  }

  // Platform wallet (collects commissions).
  await prisma.wallet.create({
    data: {
      ownerType: WalletOwnerType.PLATFORM,
      ownerId: PLATFORM_WALLET_ID,
      balanceCentavos: 0,
    },
  });

  // ---- Vehicles (12, 6 per agency) ----
  const vehicleTypes = [
    VehicleType.MOTORCYCLE,
    VehicleType.SEDAN,
    VehicleType.SUV,
  ] as const;
  const vehicles = [];
  for (const agency of agencies) {
    for (let i = 0; i < 6; i += 1) {
      vehicles.push(
        await prisma.vehicle.create({
          data: {
            agencyId: agency.id,
            plateNo: `G${int(1000, 9999)}${String.fromCharCode(65 + int(0, 25))}${String.fromCharCode(65 + int(0, 25))}`,
            type: vehicleTypes[i % vehicleTypes.length],
            make: pick(["Honda", "Toyota", "Yamaha", "Suzuki"] as const),
            year: int(2019, 2025),
            status: "ACTIVE",
          },
        }),
      );
    }
  }

  // ---- Drivers (20) + assignments + documents + wallets ----
  const driverStatuses = [
    ...Array<string>(16).fill(DriverStatus.ACTIVE),
    DriverStatus.DOCUMENTS_UNDER_REVIEW,
    DriverStatus.DOCUMENTS_UNDER_REVIEW,
    DriverStatus.DOCUMENTS_PENDING,
    DriverStatus.SUSPENDED,
  ];
  const drivers = [];
  let vehicleCursor = 0;
  for (let i = 0; i < 20; i += 1) {
    const agency = agencies[i % agencies.length];
    const user = await prisma.user.create({
      data: { phone: nextPhone(), displayName: `${pick(FIRST)} ${pick(LAST)}` },
    });
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        agencyId: agency.id,
        status: driverStatuses[i],
        licenseNo: `L${int(1000000, 9999999)}`,
      },
    });
    await prisma.wallet.create({
      data: {
        ownerType: WalletOwnerType.DRIVER,
        ownerId: driver.id,
        balanceCentavos: 0,
      },
    });
    if (driverStatuses[i] === DriverStatus.ACTIVE) {
      const vehicle = vehicles[vehicleCursor++ % vehicles.length];
      await prisma.driverVehicleAssignment.create({
        data: { driverId: driver.id, vehicleId: vehicle.id, isActive: true },
      });
      for (const type of ["DRIVERS_LICENSE", "NBI_CLEARANCE"] as const) {
        await prisma.document.create({
          data: {
            driverId: driver.id,
            type,
            storageKey: `docs/${driver.id}/${type.toLowerCase()}.pdf`,
            status: "VERIFIED",
          },
        });
      }
    }
    drivers.push(driver);
  }

  // ---- Riders (16) ----
  const riders = [];
  for (let i = 0; i < 16; i += 1) {
    riders.push(
      await prisma.user.create({
        data: {
          phone: nextPhone(),
          displayName: `${pick(FIRST)} ${pick(LAST)}`,
        },
      }),
    );
  }

  const activeDrivers = drivers.filter(
    (_, i) => driverStatuses[i] === DriverStatus.ACTIVE,
  );
  const wallets = new Map<string, number>(); // walletId -> running balance
  const walletByOwner = new Map<string, string>();
  for (const w of await prisma.wallet.findMany()) {
    wallets.set(w.id, 0);
    walletByOwner.set(`${w.ownerType}:${w.ownerId}`, w.id);
  }

  async function postTxn(opts: {
    walletId: string;
    type: string;
    amountCentavos: number;
    rideId?: string;
    reference?: string;
  }) {
    await prisma.ledgerTransaction.create({
      data: { ...opts, createdAt: new Date() },
    });
    wallets.set(
      opts.walletId,
      (wallets.get(opts.walletId) ?? 0) + opts.amountCentavos,
    );
  }

  async function syncBalances() {
    for (const [id, balance] of wallets) {
      await prisma.wallet.update({
        where: { id },
        data: { balanceCentavos: balance },
      });
    }
  }

  // Top-ups: every driver + agency starts funded.
  for (const driver of drivers) {
    const walletId = walletByOwner.get(
      `${WalletOwnerType.DRIVER}:${driver.id}`,
    )!;
    await postTxn({
      walletId,
      type: TransactionType.TOP_UP,
      amountCentavos: int(20, 100) * CENTAVOS_PER_PESO,
      reference: "seed-topup",
    });
  }
  for (const agency of agencies) {
    const walletId = walletByOwner.get(
      `${WalletOwnerType.AGENCY}:${agency.id}`,
    )!;
    await postTxn({
      walletId,
      type: TransactionType.TOP_UP,
      amountCentavos: 500 * CENTAVOS_PER_PESO,
      reference: "seed-topup",
    });
  }

  // ---- Rides (~130) with full event history + ledger pairs ----
  const ridePath = [
    RideStatus.REQUESTED,
    RideStatus.ASSIGNED,
    RideStatus.DRIVER_EN_ROUTE,
    RideStatus.DRIVER_ARRIVED,
    RideStatus.IN_PROGRESS,
    RideStatus.COMPLETED,
  ];
  const RIDE_COUNT = 130;
  for (let i = 0; i < RIDE_COUNT; i += 1) {
    const rider = pick(riders);
    const driver = pick(activeDrivers);
    const pickup = pick(barangays);
    const dropoff = pick(barangays);
    const distanceKm = Math.round((2 + rand() * 18) * 10) / 10;
    const vtype = vehicles.find((v) => v.agencyId === driver.agencyId)!
      .type as keyof typeof pricing.perKmCentavos;
    const fare = Math.max(
      pricing.minimumFareCentavos,
      pricing.baseFareCentavos +
        Math.round(distanceKm * pricing.perKmCentavos[vtype]),
    );
    const roll = rand();
    const terminal = roll < 0.82 ? RideStatus.COMPLETED : RideStatus.CANCELLED;

    const assignment = await prisma.driverVehicleAssignment.findFirst({
      where: { driverId: driver.id, isActive: true },
    });
    const ride = await prisma.ride.create({
      data: {
        riderId: rider.id,
        agencyId: driver.agencyId,
        driverId: driver.id,
        vehicleId: assignment?.vehicleId,
        status: terminal,
        pickupLabel: `${pickup.city} proper`,
        pickupBrgyCode: pickup.code,
        dropoffLabel: `${dropoff.city} proper`,
        dropoffBrgyCode: dropoff.code,
        distanceKm,
        fareCentavos: fare,
        paymentMethod:
          rand() < 0.85 ? PaymentMethod.CASH : PaymentMethod.WALLET,
        cancelReason:
          terminal === RideStatus.CANCELLED ? "Rider cancelled" : null,
        completedAt: terminal === RideStatus.COMPLETED ? new Date() : null,
      },
    });

    const path =
      terminal === RideStatus.COMPLETED
        ? ridePath
        : [RideStatus.REQUESTED, RideStatus.CANCELLED];
    for (let s = 0; s < path.length - 1; s += 1) {
      await prisma.rideEvent.create({
        data: {
          rideId: ride.id,
          from: path[s],
          to: path[s + 1],
          actorId: rider.id,
        },
      });
    }

    if (terminal === RideStatus.COMPLETED) {
      const commission = Math.round(
        (fare * pricing.commissionTiers[0].rateBps) / 10000,
      );
      const driverWallet = walletByOwner.get(
        `${WalletOwnerType.DRIVER}:${driver.id}`,
      )!;
      const platformWallet = walletByOwner.get(
        `${WalletOwnerType.PLATFORM}:${PLATFORM_WALLET_ID}`,
      )!;
      await postTxn({
        walletId: driverWallet,
        type: TransactionType.RIDE_EARNING,
        amountCentavos: fare - commission,
        rideId: ride.id,
      });
      await postTxn({
        walletId: platformWallet,
        type: TransactionType.COMMISSION,
        amountCentavos: commission,
        rideId: ride.id,
      });
    }
  }

  // Payouts: active drivers cash out part of earnings; agencies take a cut.
  for (const driver of activeDrivers.slice(0, 12)) {
    const walletId = walletByOwner.get(
      `${WalletOwnerType.DRIVER}:${driver.id}`,
    )!;
    const balance = wallets.get(walletId) ?? 0;
    if (balance > 5000) {
      const payout = Math.min(balance - 1000, int(50, 300) * CENTAVOS_PER_PESO);
      await postTxn({
        walletId,
        type: TransactionType.PAYOUT,
        amountCentavos: -payout,
        reference: "seed-payout",
      });
    }
  }
  for (const agency of agencies) {
    const walletId = walletByOwner.get(
      `${WalletOwnerType.AGENCY}:${agency.id}`,
    )!;
    await postTxn({
      walletId,
      type: TransactionType.ADJUSTMENT,
      amountCentavos: int(-20, 50) * CENTAVOS_PER_PESO,
      reference: "seed-adjustment",
    });
  }
  await syncBalances();

  const userCount = await prisma.user.count();
  const txnCount = await prisma.ledgerTransaction.count();
  console.log(
    `seeded users=${userCount} rides=${RIDE_COUNT} transactions=${txnCount}`,
  );
}

await main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
