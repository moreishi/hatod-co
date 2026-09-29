/** Centralized simulation configuration (simulator plan §21). */
export interface SimConfig {
  apiUrl: string;
  riderPhones: string[];
  driverPhones: string[];
  dispatcherPhone: string;
  scenario: string;
  seed: number;
  /** Simulated seconds per real second (movement/timing scale). */
  speed: number;
}

export function configFromEnv(): SimConfig {
  const list = (value: string | undefined, fallback: string[]) =>
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length > 0
      ? (value ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : fallback;
  return {
    apiUrl: process.env.SIM_API_URL ?? "http://localhost:3001",
    riderPhones: list(process.env.SIM_RIDERS, ["09200000005", "09200000006"]),
    driverPhones: list(process.env.SIM_DRIVERS, ["09200000004"]),
    dispatcherPhone: process.env.SIM_DISPATCHER ?? "09200000003",
    scenario: process.env.SIM_SCENARIO ?? "normal_ride",
    seed: Number(process.env.SIM_SEED ?? 42),
    speed: Number(process.env.SIM_SPEED ?? 1),
  };
}

/** Scale a simulated wait into real milliseconds. */
export function scaledMs(simSeconds: number, speed: number): number {
  return Math.max(0, Math.round((simSeconds * 1000) / Math.max(1, speed)));
}
