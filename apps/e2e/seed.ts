/**
 * Compact deterministic world for E2E (isolated e2e.db — never dev.db).
 * Requires DATABASE_URL to point at the e2e database (set by global-setup).
 */
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.includes("e2e.db")) {
  throw new Error(
    `e2e seed refused: DATABASE_URL=${dbUrl || "unset"} (want e2e.db)`,
  );
}

const prisma = new PrismaClient();

export const E2E_PHONES = {
  admin: "09200000001",
  owner: "09200000002",
  dispatcher: "09200000003",
  driver: "09200000004",
  riderA: "09200000005",
  riderB: "09200000006",
};

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.rideEvent.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.document.deleteMany();
  await prisma.driverVehicleAssignment.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.agencyMember.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.adminRoleAssignment.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { phone: E2E_PHONES.admin, displayName: "E2E Admin" },
  });
  await prisma.adminRoleAssignment.create({
    data: { userId: admin.id, role: "SUPER_ADMIN" },
  });

  const agency = await prisma.agency.create({
    data: {
      name: "E2E Wheels",
      slug: "e2e-wheels",
      contactPhone: "09209999999",
      cityCode: "072217000",
      status: "ACTIVE",
    },
  });
  for (const [phone, role] of [
    [E2E_PHONES.owner, "OWNER"],
    [E2E_PHONES.dispatcher, "DISPATCHER"],
  ] as const) {
    const user = await prisma.user.create({
      data: { phone, displayName: `E2E ${role}` },
    });
    await prisma.agencyMember.create({
      data: { agencyId: agency.id, userId: user.id, role },
    });
  }
  await prisma.wallet.create({
    data: { ownerType: "AGENCY", ownerId: agency.id, balanceCentavos: 0 },
  });

  const driverUser = await prisma.user.create({
    data: { phone: E2E_PHONES.driver, displayName: "E2E Driver" },
  });
  const driver = await prisma.driver.create({
    data: {
      userId: driverUser.id,
      agencyId: agency.id,
      status: "ACTIVE",
      isOnline: true,
      licenseNo: "E2E0001",
    },
  });
  const vehicle = await prisma.vehicle.create({
    data: {
      agencyId: agency.id,
      plateNo: "E2E0001A",
      type: "SEDAN",
      status: "ACTIVE",
    },
  });
  await prisma.driverVehicleAssignment.create({
    data: { driverId: driver.id, vehicleId: vehicle.id, isActive: true },
  });
  await prisma.wallet.create({
    data: { ownerType: "DRIVER", ownerId: driver.id, balanceCentavos: 0 },
  });
  await prisma.wallet.create({
    data: { ownerType: "PLATFORM", ownerId: "platform", balanceCentavos: 0 },
  });

  for (const [phone, name] of [
    [E2E_PHONES.riderA, "E2E Rider A"],
    [E2E_PHONES.riderB, "E2E Rider B"],
  ] as const) {
    await prisma.user.create({ data: { phone, displayName: name } });
  }
  console.log("e2e seed ready");
}

await main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
