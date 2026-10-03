import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: string;
  areaKey: string;
}

export interface ScopedArea {
  city: string;
  areaKey: string;
  areaLabel: string;
  label: string;
  /** Road/amenity-level name when reverse runs in detail mode for pins. */
  name: string;
}

export interface NominatimHit {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

const SEARCH_LIMIT = 8;

/**
 * HATOD location search (routing spec §29): HATOD DB first, Nominatim
 * fallback only on cache miss. Fresh Nominatim hits are persisted, so each
 * unique address costs one free lookup ever and is a local hit afterwards.
 *
 * Nominatim usage policy: <=1 req/s with a identifying User-Agent; queries
 * are scoped to the Philippines. Zero per-call cost.
 */
@Injectable()
export class PlacesService {
  private readonly nominatimFn: (query: string) => Promise<NominatimHit[]>;
  private readonly reverseFetchFn: typeof fetch;
  private readonly minGapMs: number;
  private lastCallAt = 0;

    constructor(
      @Inject(PrismaService) private readonly prisma: PrismaService,
      // The inline object type emits `design:paramtypes = Object`, which
      // Nest cannot resolve as a provider — it must be marked optional so
      // the `= {}` default applies instead of crashing bootstrap.
      @Optional()
      opts: {
        nominatimFn?: (query: string) => Promise<NominatimHit[]>;
        reverseFetchFn?: typeof fetch;
        minGapMs?: number;
      } = {},
    ) {
    this.nominatimFn = opts.nominatimFn ?? nominatimSearch;
    this.reverseFetchFn = opts.reverseFetchFn ?? fetch;
    this.minGapMs = opts.minGapMs ?? 1100;
  }

  /**
   * GPS → city + area key (Nominatim reverse, throttled, unpersisted).
   * Detail mode zooms to street level for naming map-picked pins.
   */
  async reverse(lat: number, lng: number, detail = false): Promise<ScopedArea> {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestException("lat out of range");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BadRequestException("lng out of range");
    }
    await this.throttle();
    const url =
      "https://nominatim.openstreetmap.org/reverse" +
      `?format=jsonv2&zoom=${detail ? 18 : 10}&lat=${lat}&lon=${lng}`;
    const res = await this.reverseFetchFn(url, {
      headers: {
        "User-Agent": "HATOD/0.1 (dev; +https://hatod.co)",
        Referer: "https://hatod.co/",
      },
    });
    if (!res.ok) throw new Error(`nominatim http ${res.status}`);
    const body = (await res.json()) as {
      display_name: string;
      address: Record<string, string>;
    };
    const addr = body.address ?? {};
    const city =
      addr.city ?? addr.town ?? addr.municipality ?? addr.village ?? "";
    const areaKey = (addr["ISO3166-2-lvl3"] ?? "").toLowerCase();
    const areaLabel = addr.region ?? addr.state ?? "";
    const name =
      addr.amenity ??
      addr.road ??
      addr.suburb ??
      addr.neighbourhood ??
      addr.quarter ??
      city;
    return {
      city,
      areaKey,
      areaLabel,
      label: city ? `${city}${areaLabel ? `, ${areaLabel}` : ""}` : "",
      name,
    };
  }

  async search(raw: string, areaKey = ""): Promise<PlaceResult[]> {
    const query = raw.trim().replace(/\s+/g, " ");
    if (query.length < 2) throw new BadRequestException("query too short");

    // Every word must appear in the name or address: "lagao gym" recalls a
    // cached "Baluan Gym … Lagao … General Santos" row on repeat searches.
    const words = query.toLowerCase().split(/\s+/);
    const cached = await this.prisma.place.findMany({
      where: {
        AND: words.map((w) => ({
          OR: [{ name: { contains: w } }, { address: { contains: w } }],
        })),
      },
      orderBy: { hitCount: "desc" },
      take: SEARCH_LIMIT * 2,
    });
    if (cached.length > 0) {
      const now = new Date();
      for (const row of cached) {
        await this.prisma.place.update({
          where: { id: row.id },
          data: { hitCount: row.hitCount + 1, lastUsedAt: now },
        });
      }
      // Same-area rows first when the GPS scope is known; outside-area
      // rows still follow (prioritize, never hide).
      return orderByArea(cached, areaKey.toLowerCase())
        .slice(0, SEARCH_LIMIT)
        .map(toResult);
    }

    await this.throttle();
    const hits = await this.nominatimFn(query);
    if (hits.length === 0) return [];
    const rows = hits.slice(0, SEARCH_LIMIT).map((h) => ({
      providerId: `${h.osm_type}/${h.osm_id}`,
      name: h.display_name.split(",")[0].trim(),
      address: h.display_name,
      lat: Number(h.lat),
      lng: Number(h.lon),
      source: "nominatim",
      areaKey: areaKeyFor(h),
    }));
    // SQLite has no createMany(skipDuplicates): filter in JS.
    const existing = await this.prisma.place.findMany({
      where: { providerId: { in: rows.map((r) => r.providerId) } },
      select: { providerId: true },
    });
    const seen = new Set(existing.map((e) => e.providerId));
    const fresh = rows.filter((r) => !seen.has(r.providerId));
    if (fresh.length > 0) {
      await this.prisma.place.createMany({ data: fresh });
    }
    return hits.slice(0, SEARCH_LIMIT).map((h, i) => ({
      id: `nominatim-${h.osm_type}-${h.osm_id}-${i}`,
      name: h.display_name.split(",")[0].trim(),
      address: h.display_name,
      lat: Number(h.lat),
      lng: Number(h.lon),
      source: "nominatim",
      areaKey: areaKeyFor(h),
    }));
  }

  private async throttle() {
    const wait = this.minGapMs - (Date.now() - this.lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }
}

function toResult(row: {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: string;
  areaKey: string;
}): PlaceResult {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    source: row.source,
    areaKey: row.areaKey ?? "",
  };
}

/** Nominatim search hits lack address blocks: keep the scope if the query
 *  carried one, else "". Detail lookups can backfill later. */
function areaKeyFor(_h: NominatimHit): string {
  void _h;
  return "";
}

function orderByArea<T extends { areaKey: string }>(
  rows: T[],
  areaKey: string,
): T[] {
  if (!areaKey) return rows;
  return [...rows].sort((a, b) => {
    const ai = (a.areaKey ?? "").toLowerCase() === areaKey ? 0 : 1;
    const bi = (b.areaKey ?? "").toLowerCase() === areaKey ? 0 : 1;
    return ai - bi;
  });
}

async function nominatimSearch(query: string): Promise<NominatimHit[]> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&limit=${SEARCH_LIMIT}&countrycodes=ph&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "HATOD/0.1 (dev; +https://hatod.co)",
      Referer: "https://hatod.co/",
    },
  });
  if (!res.ok) throw new Error(`nominatim http ${res.status}`);
  return (await res.json()) as NominatimHit[];
}
