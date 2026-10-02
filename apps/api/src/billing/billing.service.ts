import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { VehicleType } from "@hailing/constants";
import { pricing as staticPricing } from "@hailing/data";
import { PrismaService } from "../prisma/prisma.service.js";
import type { FarePricing } from "../rides/fare.js";

export interface PublishFareDto {
  name: string;
  baseFareCentavos: number;
  minimumFareCentavos: number;
  perKmCentavos: Record<string, number>;
  commissionTiers: { minLifetimeRides: number; rateBps: number }[];
}

const CACHE_TTL_MS = 30_000;
const ALL_TYPES = Object.values(VehicleType);

/**
 * Versioned fares: exactly one ACTIVE FareSchedule prices every quote and
 * booking. Reads are cached for 30s (hot path); publishing deactivates the
 * old row, creates the new one, audits, and clears the cache. With no row
 * (fresh database), the static pilot table stands in.
 */
@Injectable()
export class BillingService {
  private cached: {
    at: number;
    row: {
      id: string;
      name: string;
      createdAt: Date;
      createdBy: string | null;
    } | null;
    pricing: FarePricing;
  } | null = null;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPricing(): Promise<FarePricing> {
    return (await this.load()).pricing;
  }

  /** Raw active schedule row (null on a fresh database); for admin display. */
  async getActiveSchedule() {
    return (await this.load()).row;
  }

  private async load(): Promise<{
    row: {
      id: string;
      name: string;
      createdAt: Date;
      createdBy: string | null;
    } | null;
    pricing: FarePricing;
  }> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < CACHE_TTL_MS) {
      return this.cached;
    }
    const row = await this.prisma.fareSchedule.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    const pricing: FarePricing = row
      ? {
          baseFareCentavos: row.baseFareCentavos,
          minimumFareCentavos: row.minimumFareCentavos,
          perKmCentavos: row.perKmCentavos as Record<string, number>,
          commissionTiers: row.commissionTiers as { rateBps: number }[],
        }
      : {
          baseFareCentavos: staticPricing.baseFareCentavos,
          minimumFareCentavos: staticPricing.minimumFareCentavos,
          perKmCentavos: { ...staticPricing.perKmCentavos } as Record<
            string,
            number
          >,
          commissionTiers: staticPricing.commissionTiers.map((t) => ({
            rateBps: t.rateBps,
          })),
        };
    const loaded = {
      row: row
        ? {
            id: row.id,
            name: row.name,
            createdAt: row.createdAt,
            createdBy: row.createdBy,
          }
        : null,
      pricing,
    };
    this.cached = { at: now, ...loaded };
    return loaded;
  }

  async publish(dto: PublishFareDto, actorId: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("schedule name required");
    const ints = [dto.baseFareCentavos, dto.minimumFareCentavos];
    if (
      !ints.every((n) => Number.isInteger(n) && (n as number) > 0) ||
      dto.minimumFareCentavos < dto.baseFareCentavos
    ) {
      throw new BadRequestException("base/minimum fares must be positive");
    }
    for (const type of ALL_TYPES) {
      const rate = dto.perKmCentavos[type];
      if (!Number.isInteger(rate) || (rate as number) <= 0) {
        throw new BadRequestException(`per-km rate missing for ${type}`);
      }
    }
    if (
      !Array.isArray(dto.commissionTiers) ||
      dto.commissionTiers.length === 0 ||
      dto.commissionTiers.some(
        (t) =>
          !Number.isInteger(t.rateBps) || t.rateBps < 0 || t.rateBps > 10000,
      )
    ) {
      throw new BadRequestException("commission tiers invalid");
    }
    const [, created] = await this.prisma.$transaction([
      this.prisma.fareSchedule.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.fareSchedule.create({
        data: {
          name,
          baseFareCentavos: dto.baseFareCentavos,
          minimumFareCentavos: dto.minimumFareCentavos,
          perKmCentavos: dto.perKmCentavos,
          commissionTiers: dto.commissionTiers,
          isActive: true,
          createdBy: actorId,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: "fare.publish",
          entity: "FareSchedule",
          entityId: name,
        },
      }),
    ]);
    this.cached = null;
    return created;
  }
}
