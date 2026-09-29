import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { haversineKm } from "@hailing/routing";
import { PrismaService } from "../prisma/prisma.service.js";

export interface PingDto {
  lat: number;
  lng: number;
  accuracyM?: number;
}

/**
 * Driver location tracks (routing spec §36).
 * Proximity is computed in JS over latest pings so SQLite LocalStage and
 * Postgres behave identically; a PostGIS-native query is the documented
 * production follow-up once location volumes justify it.
 */
@Injectable()
export class LocationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ping(driverUserId: string, dto: PingDto) {
    if (!Number.isFinite(dto.lat) || dto.lat < -90 || dto.lat > 90) {
      throw new BadRequestException("lat out of range");
    }
    if (!Number.isFinite(dto.lng) || dto.lng < -180 || dto.lng > 180) {
      throw new BadRequestException("lng out of range");
    }
    if (
      dto.accuracyM !== undefined &&
      !(dto.accuracyM >= 0 && dto.accuracyM <= 100000)
    ) {
      throw new BadRequestException("accuracyM out of range");
    }
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { userId: driverUserId },
    });
    return this.prisma.locationPing.create({
      data: {
        driverId: driver.id,
        lat: dto.lat,
        lng: dto.lng,
        accuracyM: dto.accuracyM,
      },
    });
  }

  async latestByAgency(agencyId: string) {
    const drivers = await this.prisma.driver.findMany({
      where: { agencyId, status: "ACTIVE", isOnline: true },
      include: {
        user: { select: { displayName: true } },
        assignments: { where: { isActive: true }, include: { vehicle: true } },
        pings: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    });
    return drivers.map((d) => ({ ...d, lastPing: d.pings[0] ?? null }));
  }

  async nearby(agencyId: string, lat: number, lng: number, radiusKm = 5) {
    const drivers = await this.latestByAgency(agencyId);
    return drivers
      .filter((d) => d.lastPing !== null)
      .map((d) => ({
        driverId: d.id,
        displayName: d.user.displayName,
        vehicle: d.assignments[0]?.vehicle ?? null,
        lat: d.lastPing!.lat,
        lng: d.lastPing!.lng,
        distanceKm:
          Math.round(
            haversineKm(
              { lat, lng },
              { lat: d.lastPing!.lat, lng: d.lastPing!.lng },
            ) * 100,
          ) / 100,
      }))
      .filter((d) => d.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
