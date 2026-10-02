import { PrismaClient } from "@prisma/client";

// Idempotent seed of the bundled POI dataset (mirrors the mobile
// places.dart Gensan + Cebu lists). Safe to re-run: upserts on providerId.
const SEEDS: Array<{
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  areaKey: string;
}> = [
  {
    slug: "gensan-kcc",
    areaKey: "ph-12",
    name: "KCC Mall of Gensan",
    address: "Osmeña St, Dadiangas",
    lat: 6.1117,
    lng: 125.1749,
  },
  {
    slug: "gensan-sm",
    areaKey: "ph-12",
    name: "SM City General Santos",
    address: "Santiago Blvd, Dadiangas",
    lat: 6.1103,
    lng: 125.171,
  },
  {
    slug: "gensan-robinsons",
    areaKey: "ph-12",
    name: "Robinsons Place Gensan",
    address: "J. Catolico Sr Ave, Lagao",
    lat: 6.1075,
    lng: 125.175,
  },
  {
    slug: "gensan-gaisano",
    areaKey: "ph-12",
    name: "Gaisano Mall of Gensan",
    address: "J. Catolico Sr Ave, Dadiangas",
    lat: 6.1128,
    lng: 125.1735,
  },
  {
    slug: "gensan-veranza",
    areaKey: "ph-12",
    name: "Veranza Mall",
    address: "Tejeros St, Dadiangas East",
    lat: 6.1219,
    lng: 125.1756,
  },
  {
    slug: "gensan-terminal",
    areaKey: "ph-12",
    name: "Bulaong Public Terminal",
    address: "Bulaong Ave, Dadiangas North",
    lat: 6.1175,
    lng: 125.18,
  },
  {
    slug: "gensan-market",
    areaKey: "ph-12",
    name: "General Santos Public Market",
    address: "Osmeña St, Dadiangas",
    lat: 6.115,
    lng: 125.172,
  },
  {
    slug: "gensan-lagao-market",
    areaKey: "ph-12",
    name: "Lagao Public Market",
    address: "Block 8, Lagao",
    lat: 6.103,
    lng: 125.165,
  },
  {
    slug: "gensan-plaza",
    areaKey: "ph-12",
    name: "Plaza Heneral Santos",
    address: "Pioneer Ave, Dadiangas",
    lat: 6.116,
    lng: 125.1718,
  },
  {
    slug: "gensan-nddu",
    areaKey: "ph-12",
    name: "Notre Dame of Dadiangas University",
    address: "Marist Ave, Dadiangas",
    lat: 6.1133,
    lng: 125.17,
  },
  {
    slug: "gensan-airport",
    areaKey: "ph-12",
    name: "General Santos International Airport",
    address: "Brgy. Fatima",
    lat: 6.1064,
    lng: 125.235,
  },
  {
    slug: "gensan-fishport",
    areaKey: "ph-12",
    name: "General Santos Fish Port",
    address: "Tambler",
    lat: 6.1,
    lng: 125.15,
  },
  {
    slug: "cebu-ayala",
    areaKey: "ph-07",
    name: "Ayala Center Cebu",
    address: "Archbishop Reyes Ave, Cebu City",
    lat: 10.3181,
    lng: 123.9054,
  },
  {
    slug: "cebu-sm",
    areaKey: "ph-07",
    name: "SM City Cebu",
    address: "Juan Luna Ave, Mabolo, Cebu City",
    lat: 10.3111,
    lng: 123.9185,
  },
  {
    slug: "cebu-seaside",
    areaKey: "ph-07",
    name: "SM Seaside City Cebu",
    address: "South Road Properties, Cebu City",
    lat: 10.283,
    lng: 123.881,
  },
  {
    slug: "cebu-itpark",
    areaKey: "ph-07",
    name: "Cebu IT Park",
    address: "Apas, Cebu City",
    lat: 10.3297,
    lng: 123.9058,
  },
  {
    slug: "cebu-galleria",
    areaKey: "ph-07",
    name: "Robinsons Galleria Cebu",
    address: "Gen. Maxilom Ave, Cebu City",
    lat: 10.3145,
    lng: 123.912,
  },
  {
    slug: "cebu-airport",
    areaKey: "ph-07",
    name: "Mactan-Cebu International Airport",
    address: "Lapu-Lapu City",
    lat: 10.3075,
    lng: 123.9795,
  },
  {
    slug: "cebu-magellans",
    areaKey: "ph-07",
    name: "Magellan's Cross",
    address: "Magallanes St, Downtown Cebu City",
    lat: 10.293,
    lng: 123.9019,
  },
  {
    slug: "cebu-fuente",
    areaKey: "ph-07",
    name: "Fuente Osmeña Circle",
    address: "Fuente Osmeña, Cebu City",
    lat: 10.3098,
    lng: 123.8915,
  },
  {
    slug: "cebu-carbon",
    areaKey: "ph-07",
    name: "Carbon Public Market",
    address: "M.C. Briones St, Cebu City",
    lat: 10.2945,
    lng: 123.899,
  },
  {
    slug: "cebu-southbus",
    areaKey: "ph-07",
    name: "Cebu South Bus Terminal",
    address: "N. Bacalso Ave, Cebu City",
    lat: 10.301,
    lng: 123.8865,
  },
  {
    slug: "cebu-northbus",
    areaKey: "ph-07",
    name: "Cebu North Bus Terminal",
    address: "SM City Cebu vicinity, Mabolo",
    lat: 10.313,
    lng: 123.92,
  },
  {
    slug: "cebu-newtown",
    areaKey: "ph-07",
    name: "Mactan Newtown",
    address: "Lapu-Lapu City, Mactan",
    lat: 10.326,
    lng: 123.96,
  },
];

const prisma = new PrismaClient();

for (const s of SEEDS) {
  await prisma.place.upsert({
    where: { providerId: `seed:${s.slug}` },
    update: {
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      areaKey: s.areaKey,
    },
    create: {
      providerId: `seed:${s.slug}`,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      source: "seed",
      areaKey: s.areaKey,
    },
  });
}

const count = await prisma.place.count();
console.log(`places seeded: ${count} total`);
await prisma.$disconnect();
