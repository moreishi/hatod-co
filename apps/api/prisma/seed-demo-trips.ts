import { PrismaClient } from "@prisma/client";

// Seeds sample COMPLETED trips for a rider phone (Orders tab shows
// completed only). Usage: tsx prisma/seed-demo-trips.ts [phone]
// Defaults to 0917100000. Safe to re-run: skips when trips already exist.
const prisma = new PrismaClient();

const phone = process.argv[2] ?? "0917100000";

const TRIPS: Array<{
  pickup: string;
  plat: number;
  plng: number;
  dropoff: string;
  dlat: number;
  dlng: number;
  vehicle: string;
  km: number;
  fare: number;
  daysAgo: number;
  startHour: number;
  startMin: number;
  mins: number;
}> = [
  {
    pickup: "Ayala Center Cebu",
    plat: 10.3181,
    plng: 123.9054,
    dropoff: "SM City Cebu",
    dlat: 10.3111,
    dlng: 123.9185,
    vehicle: "MOTORCYCLE",
    km: 2.6,
    fare: 8000,
    daysAgo: 4,
    startHour: 8,
    startMin: 12,
    mins: 19,
  },
  {
    pickup: "Cebu IT Park",
    plat: 10.3297,
    plng: 123.9058,
    dropoff: "SM Seaside City Cebu",
    dlat: 10.283,
    dlng: 123.881,
    vehicle: "MOTORCYCLE",
    km: 9.8,
    fare: 22000,
    daysAgo: 3,
    startHour: 17,
    startMin: 40,
    mins: 32,
  },
  {
    pickup: "Mactan-Cebu International Airport",
    plat: 10.3075,
    plng: 123.9795,
    dropoff: "Ayala Center Cebu",
    dlat: 10.3181,
    dlng: 123.9054,
    vehicle: "SEDAN",
    km: 12.4,
    fare: 26500,
    daysAgo: 2,
    startHour: 10,
    startMin: 5,
    mins: 28,
  },
  {
    pickup: "Fuente Osmeña Circle",
    plat: 10.3098,
    plng: 123.8915,
    dropoff: "Carbon Public Market",
    dlat: 10.2945,
    dlng: 123.899,
    vehicle: "MOTORCYCLE",
    km: 1.8,
    fare: 6000,
    daysAgo: 1,
    startHour: 18,
    startMin: 20,
    mins: 12,
  },
  {
    pickup: "SM City General Santos",
    plat: 6.1103,
    plng: 125.171,
    dropoff: "KCC Mall of Gensan",
    dlat: 6.1117,
    dlng: 125.1749,
    vehicle: "MOTORCYCLE",
    km: 1.1,
    fare: 6000,
    daysAgo: 0,
    startHour: 7,
    startMin: 45,
    mins: 9,
  },
  {
    pickup: "Mactan Newtown",
    plat: 10.326,
    plng: 123.96,
    dropoff: "Magellan's Cross",
    dlat: 10.293,
    dlng: 123.9019,
    vehicle: "MOTORCYCLE",
    km: 8.2,
    fare: 19000,
    daysAgo: 0,
    startHour: 13,
    startMin: 10,
    mins: 25,
  },
];

const user = await prisma.user.findUnique({ where: { phone } });
if (user == null) throw new Error(`no account for phone ${phone}`);

let created = 0;
let backfilled = 0;
for (const t of TRIPS) {
  const found = await prisma.ride.findFirst({
    where: {
      riderId: user.id,
      status: "COMPLETED",
      pickupLabel: t.pickup,
      dropoffLabel: t.dropoff,
    },
  });
  if (found == null) {
    const requestedAt = new Date();
    requestedAt.setDate(requestedAt.getDate() - t.daysAgo);
    requestedAt.setHours(t.startHour, t.startMin, 0, 0);
    const completedAt = new Date(requestedAt.getTime() + t.mins * 60000);
    await prisma.ride.create({
      data: {
        riderId: user.id,
        status: "COMPLETED",
        pickupLabel: t.pickup,
        pickupBrgyCode: "072217001",
        pickupLat: t.plat,
        pickupLng: t.plng,
        dropoffLabel: t.dropoff,
        dropoffBrgyCode: "072217002",
        dropoffLat: t.dlat,
        dropoffLng: t.dlng,
        distanceKm: t.km,
        fareCentavos: t.fare,
        vehicleType: t.vehicle,
        paymentMethod: "CASH",
        requestedAt,
        completedAt,
      },
    });
    created++;
  } else if (found.pickupLat == null || found.dropoffLat == null) {
    await prisma.ride.update({
      where: { id: found.id },
      data: {
        pickupLat: t.plat,
        pickupLng: t.plng,
        dropoffLat: t.dlat,
        dropoffLng: t.dlng,
      },
    });
    backfilled++;
  }
}
console.log(
  `demo trips for ${phone}: created ${created}, backfilled ${backfilled}`,
);
await prisma.$disconnect();
