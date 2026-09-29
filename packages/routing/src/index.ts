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
  vehicleType: "MOTORCYCLE" | "SEDAN" | "SUV" | "VAN";
}

export interface RouteResult {
  distanceKm: number;
  /** Estimated travel time in seconds, free-flow. */
  durationSec: number;
  provider: string;
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
    return { distanceKm, durationSec, provider: this.name };
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
