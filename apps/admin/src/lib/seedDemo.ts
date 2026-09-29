export type Rng = () => number;

/** mulberry32 — deterministic demo data, same seed replays everything. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const FIRST = [
  "Jose", "Maria", "Ana", "Juan", "Rosa", "Pedro", "Liza", "Marco", "Nena", "Ramon",
  "Cora", "Dante", "Elsa", "Felix", "Gina", "Hector", "Irene", "Joel", "Katrina", "Lito",
  "Mona", "Nestor", "Olga", "Paolo", "Quennie", "Renato", "Sara", "Tomas", "Ursula", "Victor",
] as const;

const LAST = [
  "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Torres", "Flores", "Ramos", "Aquino",
  "Navarro", "Salazar", "Mercado", "Aguilar", "Castillo", "Villanueva", "Rosales", "Padilla",
  "Cortez", "Manalo", "Dizon", "Galang", "Pineda", "Santiago", "Domingo", "Marquez", "Bautista",
] as const;

const PLACES = [
  "SM Gensan", "Lagao Public Market", "Gensan Airport", "KCC Mall", "Plaza Heneral Santos",
  "MSU Gensan", "Notre Dame Siena", "Calumpang Port", "Tinagacan Crossing", "Bulaong Terminal",
  "Dadiangas Market", "Fatima Church", "General Santos Doctors", "St. Elizabeth Hospital",
  "Veranza Mall", "City Hall Gensan", "Baluan Crossing", "San Isidro Parish", "Apopong Market",
  "Lagao Gym", "Digos Makar Wharf", "Tambler Beach Resorts", "Uhaw Market", "Conel Crossing",
  "Katanggawan Church",
] as const;

const VEHICLES = ["moto", "moto", "moto", "trike", "trike", "sedan", "suv"] as const;

export function personName(rng: Rng): string {
  return `${pick(rng, FIRST)[0]}. ${pick(rng, LAST)}`;
}

export function businessName(rng: Rng): string {
  return `${pick(rng, LAST)} ${pick(rng, ["Fleet", "Transport", "Transpo", "Movers", "Rides"])} Co`;
}

export function tripRoute(rng: Rng): { pickup: string; dropoff: string } {
  const a = pick(rng, PLACES);
  let b = pick(rng, PLACES);
  while (b === a) b = pick(rng, PLACES);
  return { pickup: a, dropoff: b };
}

export function vehicleOf(rng: Rng): string {
  return pick(rng, VEHICLES);
}

/** Random date within 2026, biased recent (last-30d window for earnings periods). */
export function recentDate(rng: Rng, now: Date = new Date("2026-09-28T12:00:00Z")): string {
  const daysAgo = Math.floor(-Math.log(1 - rng()) * 10);
  const d = new Date(now.getTime() - Math.min(daysAgo, 29) * 86400_000 - pickInt(rng, 0, 86399) * 1000);
  return d.toISOString();
}

/** Doc dates: mostly future, some expired for compliance demos. */
export function docDate(rng: Rng): string {
  const r = rng();
  const base = new Date("2026-09-28T00:00:00Z").getTime();
  const offset = r < 0.15 ? -pickInt(rng, 1, 60) : pickInt(rng, 30, 900);
  return new Date(base + offset * 86400_000).toISOString().slice(0, 10);
}
