/**
 * Seed validator — spec rules 26-30. Exits non-zero on the first violation.
 * Run: pnpm --filter @hailing/api exec tsx prisma/validate-seed.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  AdminRole,
  AgencyRole,
  ConversationStatus,
  DriverStatus,
  MessageStatus,
  MessageType,
  PaymentMethod,
  RideStatus,
  RideTransitions,
  TransactionType,
  VehicleType,
  WalletOwnerType,
} from "@hailing/constants";
import { allCebuCodes, cebu } from "@hailing/data";

const prisma = new PrismaClient();
const failures: string[] = [];
const check = (ok: boolean, msg: string) => {
  if (!ok) failures.push(msg);
};
const inEnum = (v: string, e: Record<string, string>) =>
  Object.values(e).includes(v);

const codes = allCebuCodes();

const users = await prisma.user.count();
check(users >= 40 && users <= 50, `users=${users}, expected 40-50`);

const txns = await prisma.ledgerTransaction.findMany();
check(
  txns.length >= 200 && txns.length <= 500,
  `transactions=${txns.length}, expected 200-500`,
);

const walletIds = new Set(
  (await prisma.wallet.findMany({ select: { id: true } })).map((w) => w.id),
);
const rideIds = new Set(
  (await prisma.ride.findMany({ select: { id: true } })).map((r) => r.id),
);

for (const t of txns) {
  check(walletIds.has(t.walletId), `txn ${t.id} references missing wallet`);
  check(
    t.rideId === null || rideIds.has(t.rideId),
    `txn ${t.id} references missing ride`,
  );
  check(
    inEnum(t.type, TransactionType),
    `txn ${t.id} has unknown type ${t.type}`,
  );
}

const sums = new Map<string, number>();
for (const t of txns)
  sums.set(t.walletId, (sums.get(t.walletId) ?? 0) + t.amountCentavos);
for (const w of await prisma.wallet.findMany()) {
  check(
    w.balanceCentavos === (sums.get(w.id) ?? 0),
    `wallet ${w.id} balance mismatch`,
  );
  check(
    inEnum(w.ownerType, WalletOwnerType),
    `wallet ${w.id} has unknown owner ${w.ownerType}`,
  );
}

for (const r of await prisma.adminRoleAssignment.findMany()) {
  check(inEnum(r.role, AdminRole), `admin role ${r.role} unknown`);
}
for (const m of await prisma.agencyMember.findMany()) {
  check(inEnum(m.role, AgencyRole), `agency role ${m.role} unknown`);
}
for (const d of await prisma.driver.findMany()) {
  check(
    inEnum(d.status, DriverStatus),
    `driver ${d.id} status ${d.status} unknown`,
  );
}
for (const v of await prisma.vehicle.findMany()) {
  check(inEnum(v.type, VehicleType), `vehicle ${v.id} type ${v.type} unknown`);
}
const drivers = await prisma.driver.findMany({ select: { id: true } });
const vehicles = await prisma.vehicle.findMany({ select: { id: true } });
const driverIds = new Set(drivers.map((d) => d.id));
const vehicleIds = new Set(vehicles.map((v) => v.id));
for (const doc of await prisma.document.findMany()) {
  check(
    (doc.driverId !== null) !== (doc.vehicleId !== null),
    `document ${doc.id} must belong to exactly one owner`,
  );
  check(
    doc.driverId === null || driverIds.has(doc.driverId),
    `document ${doc.id} bad driver`,
  );
  check(
    doc.vehicleId === null || vehicleIds.has(doc.vehicleId),
    `document ${doc.id} bad vehicle`,
  );
}

for (const ride of await prisma.ride.findMany()) {
  check(
    inEnum(ride.status, RideStatus),
    `ride ${ride.id} status ${ride.status} unknown`,
  );
  check(
    inEnum(ride.paymentMethod, PaymentMethod),
    `ride ${ride.id} payment unknown`,
  );
  check(codes.has(ride.pickupBrgyCode), `ride ${ride.id} pickup code unknown`);
  check(
    codes.has(ride.dropoffBrgyCode),
    `ride ${ride.id} dropoff code unknown`,
  );
  const events = await prisma.rideEvent.findMany({
    where: { rideId: ride.id },
    orderBy: { createdAt: "asc" },
  });
  for (const e of events) {
    const legal = (
      RideTransitions[e.from as RideStatus] as readonly string[]
    ).includes(e.to);
    check(legal, `ride ${ride.id} has illegal event ${e.from} -> ${e.to}`);
  }
  if (ride.status === RideStatus.COMPLETED) {
    check(
      events.length >= 5,
      `completed ride ${ride.id} missing event history`,
    );
  }
}

const ridesById = new Map(
  (await prisma.ride.findMany({ include: { driver: true } })).map((r) => [
    r.id,
    r,
  ]),
);
const conversations = await prisma.conversation.findMany();
const seenRides = new Set<string>();
let unreadSeeded = 0;
for (const c of conversations) {
  check(
    inEnum(c.status, ConversationStatus),
    `conversation ${c.id} status unknown`,
  );
  check(
    !seenRides.has(c.rideId),
    `duplicate conversation for ride ${c.rideId}`,
  );
  seenRides.add(c.rideId);
  const ride = ridesById.get(c.rideId);
  check(!!ride, `conversation ${c.id} references missing ride`);
  if (ride) {
    check(c.riderId === ride.riderId, `conversation ${c.id} rider mismatch`);
    check(
      (ride.driver && c.driverId === ride.driver.userId) || !ride.driver,
      `conversation ${c.id} driver mismatch`,
    );
    if (ride.status === "COMPLETED" || ride.status === "CANCELLED") {
      check(
        c.status === "CLOSED",
        `terminal ride ${ride.id} conversation not CLOSED`,
      );
    }
  }
  const messages = await prisma.message.findMany({
    where: { conversationId: c.id },
  });
  for (const m of messages) {
    check(inEnum(m.type, MessageType), `message ${m.id} type unknown`);
    check(inEnum(m.status, MessageStatus), `message ${m.id} status unknown`);
    check(
      [c.riderId, c.driverId].includes(m.senderId),
      `message ${m.id} sender not a participant`,
    );
    check(
      [c.riderId, c.driverId].includes(m.recipientId),
      `message ${m.id} recipient not a participant`,
    );
    check(m.senderId !== m.recipientId, `message ${m.id} sender == recipient`);
    check(m.content.trim().length > 0, `message ${m.id} empty`);
    if (m.status === "SENT" && m.readAt === null) unreadSeeded += 1;
  }
}
check(unreadSeeded > 0, "seed has no unread messages");
check(
  conversations.some((c) => c.status === "ACTIVE"),
  "seed has no ACTIVE conversations",
);

await prisma.$disconnect();
if (failures.length > 0) {
  console.error(
    `SEED INVALID (${failures.length}):\n- ${failures.join("\n- ")}`,
  );
  process.exit(1);
}
console.log(`seed valid: users=${users} transactions=${txns.length}`);
