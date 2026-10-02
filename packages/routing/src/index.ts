/**
 * @hailing/routing — provider abstraction (routing spec §7).
 * Domain code calls RoutingService only. LocalStage uses the deterministic
 * HaversineProvider (no network, no cost); Valhalla/GrabMaps adapters plug
 * in per environment without touching callers.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteOptions {
  /** Vehicle class affects costing (e.g. motorcycle profile). */
  vehicleType:
    | "MOTORCYCLE"
    | "SEDAN"
    | "SUV"
    | "VAN"
    | "TAXI"
    | "CAR_4SEATER"
    | "CAR_6SEATER"
    | "TRUCK_600KG"
    | "TRUCK_600KG_MOVER"
    | "TRUCK_1000KG"
    | "TRUCK_2000KG";
}

export interface RouteResult {
  distanceKm: number;
  /** Estimated travel time in seconds, free-flow. */
  durationSec: number;
  provider: string;
  /** Encoded road geometry (polyline precision 5); "" when unavailable. */
  geometry: string;
}

export interface RoutingProvider {
  readonly name: string;
  calculateRoute(
    origin: LatLng,
    destination: LatLng,
    options: RouteOptions,
  ): Promise<RouteResult>;
}

export interface EtaResult {
  etaSec: number;
  provider: string;
}

/** Mean speeds per vehicle class (km/h, free-flow, Cebu urban baseline). */
const SPEEDS_KMH: Record<RouteOptions["vehicleType"], number> = {
  MOTORCYCLE: 28,
  SEDAN: 24,
  SUV: 24,
  VAN: 22,
  TAXI: 24,
  CAR_4SEATER: 24,
  CAR_6SEATER: 22,
  TRUCK_600KG: 20,
  TRUCK_600KG_MOVER: 20,
  TRUCK_1000KG: 18,
  TRUCK_2000KG: 18,
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sLat = Math.sin(dLat / 2);
  const sLng = Math.sin(dLng / 2);
  const h =
    sLat * sLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sLng *
      sLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Deterministic local provider: great-circle distance + class speeds. */
export class HaversineProvider implements RoutingProvider {
  readonly name = "haversine";

  async calculateRoute(
    origin: LatLng,
    destination: LatLng,
    options: RouteOptions,
  ): Promise<RouteResult> {
    const distanceKm = Math.round(haversineKm(origin, destination) * 100) / 100;
    const durationSec = Math.round(
      (distanceKm / SPEEDS_KMH[options.vehicleType]) * 3600,
    );
    return { distanceKm, durationSec, provider: this.name, geometry: "" };
  }
}

/**
 * OSRM fastest-route provider (free public demo server by default; self-host
 * for production per the routing spec). Falls back to haversine so a routing
 * outage never breaks quoting — geometry is just empty then.
 */
export class OsrmProvider implements RoutingProvider {
  readonly name = "osrm";
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly fallback = new HaversineProvider();

  constructor(opts: { baseUrl?: string; fetchFn?: typeof fetch } = {}) {
    this.baseUrl = opts.baseUrl ?? "https://router.project-osrm.org";
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  async calculateRoute(
    origin: LatLng,
    destination: LatLng,
    options: RouteOptions,
  ): Promise<RouteResult> {
    try {
      const url =
        `${this.baseUrl}/route/v1/driving/` +
        `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
        `?overview=full&geometries=polyline`;
      const res = await this.fetchFn(url);
      if (!res.ok) throw new Error(`osrm http ${res.status}`);
      const body = (await res.json()) as {
        code: string;
        routes: { distance: number; duration: number; geometry: string }[];
      };
      const first = body.code === "Ok" ? body.routes[0] : undefined;
      if (first == null || typeof first.geometry !== "string") {
        throw new Error("osrm no route");
      }
      void options;
      return {
        distanceKm: Math.round((first.distance / 1000) * 100) / 100,
        durationSec: Math.round(first.duration),
        provider: this.name,
        geometry: first.geometry,
      };
    } catch {
      return this.fallback.calculateRoute(origin, destination, options);
    }
  }
}

export class RoutingService {
  constructor(
    private readonly provider: RoutingProvider = new HaversineProvider(),
  ) {}

  calculateRoute(origin: LatLng, destination: LatLng, options: RouteOptions) {
    return this.provider.calculateRoute(origin, destination, options);
  }

  async calculateETA(
    origin: LatLng,
    destination: LatLng,
    options: RouteOptions,
  ): Promise<EtaResult> {
    const route = await this.provider.calculateRoute(
      origin,
      destination,
      options,
    );
    return { etaSec: route.durationSec, provider: route.provider };
  }

  async calculateDistance(
    origin: LatLng,
    destination: LatLng,
    options: RouteOptions,
  ): Promise<number> {
    return (await this.provider.calculateRoute(origin, destination, options))
      .distanceKm;
  }
}
