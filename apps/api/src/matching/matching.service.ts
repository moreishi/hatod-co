import { Inject, Injectable } from "@nestjs/common";
import {
  MATCH_MAX_CANDIDATES,
  MATCH_OFFER_TIMEOUT_SEC,
  MATCH_RADIUS_KM,
  PING_FRESH_SEC,
  RideStatus,
  RideTransitions,
} from "@hailing/constants";
import { haversineKm } from "@hailing/routing";
import { MessagingService } from "../messaging/messaging.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RideEventsGateway } from "../realtime/ride-events.gateway.js";

export interface Candidate {
  driverId: string;
  userId: string;
  displayName: string;
  distanceKm: number;
}

interface Offer {
  rideId: string;
  driverId: string;
  userId: string;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Automatic driver matching (routing spec §12–§14, adapted).
 * REQUESTED rides are matched against online, ACTIVE, dispatchable drivers
 * with fresh GPS inside the radius, ranked by haversine distance (Stage 1).
 * Road-aware ranking (Stage 2) plugs in when a matrix provider exists.
 *
 * Sequential single offers with a timeout; exhaustion parks the ride at
 * NO_DRIVERS for dispatcher rescue. Manual dispatcher assignment always
 * wins and cancels pending offers. Single-instance timers; a shared
 * offer table + worker timeouts are the multi-instance follow-up.
 */
@Injectable()
export class MatchingService {
  private readonly offers = new Map<string, Offer>();
  private readonly rejected = new Map<string, Set<string>>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(MessagingService) private readonly messaging: MessagingService,
    @Inject(RideEventsGateway) private readonly realtime: RideEventsGateway,
  ) {}

  /** Offer timeout in seconds (overridable in tests via subclassing). */
  protected get offerTimeoutSec(): number {
    return MATCH_OFFER_TIMEOUT_SEC;
  }

  /** Ranked dispatchable candidates for a ride (Stage 1 filter). */
  async findCandidates(rideId: string): Promise<Candidate[]> {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
    });
    if (ride.pickupLat === null || ride.pickupLng === null) return [];
    const freshSince = new Date(Date.now() - PING_FRESH_SEC * 1000);
    const drivers = await this.prisma.driver.findMany({
      where: { status: "ACTIVE", isOnline: true },
      include: {
        user: { select: { id: true, displayName: true } },
        assignments: {
          where: { isActive: true },
          include: { vehicle: { select: { id: true, type: true } } },
        },
        pings: { orderBy: { recordedAt: "desc" }, take: 1 },
        rides: {
          where: {
            status: {
              in: [
                RideStatus.ASSIGNED,
                RideStatus.DRIVER_EN_ROUTE,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.IN_PROGRESS,
              ],
            },
          },
          select: { id: true },
        },
      },
    });
    const excluded = this.rejected.get(rideId) ?? new Set<string>();
    const origin = { lat: ride.pickupLat, lng: ride.pickupLng };
    return drivers
      .filter((d) => {
        if (d.status !== "ACTIVE" || !d.isOnline) return false;
        if (excluded.has(d.id)) return false;
        if (d.rides.length > 0) return false;
        const assignment = d.assignments[0];
        if (!assignment) return false;
        if (ride.vehicleType && assignment.vehicle.type !== ride.vehicleType)
          return false;
        const ping = d.pings[0];
        if (!ping || ping.recordedAt < freshSince) return false;
        return true;
      })
      .map((d) => ({
        driverId: d.id,
        userId: d.user.id,
        displayName: d.user.displayName,
        distanceKm:
          Math.round(
            haversineKm(origin, { lat: d.pings[0].lat, lng: d.pings[0].lng }) *
              100,
          ) / 100,
      }))
      .filter((c) => c.distanceKm <= MATCH_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MATCH_MAX_CANDIDATES);
  }

  /** Entry point after a ride is requested (or requeued without offers). */
  async matchRide(rideId: string) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
    });
    if (ride.status !== RideStatus.REQUESTED) return null;
    return this.offerNext(rideId);
  }

  /** Pending offer for a ride, if any (drivers poll this). */
  pendingOffer(rideId: string) {
    const offer = this.offers.get(rideId);
    if (!offer || offer.expiresAt <= Date.now()) return null;
    return {
      rideId: offer.rideId,
      driverId: offer.driverId,
      expiresAt: offer.expiresAt,
    };
  }

  /** Offers awaiting a specific driver user. */
  async offersFor(driverUserId: string) {
    const out: { rideId: string; expiresAt: number }[] = [];
    for (const offer of this.offers.values()) {
      if (offer.userId === driverUserId && offer.expiresAt > Date.now()) {
        out.push({ rideId: offer.rideId, expiresAt: offer.expiresAt });
      }
    }
    return out;
  }

  /** Driver accepts the pending offer → full assignment. */
  async acceptOffer(rideId: string, driverUserId: string) {
    const offer = this.takeOffer(rideId, driverUserId);
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      include: { driver: true },
    });
    this.assertTransition(ride.status, RideStatus.ASSIGNED);
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { id: offer.driverId },
      include: {
        assignments: { where: { isActive: true } },
        user: { select: { id: true } },
      },
    });
    const assignment = driver.assignments[0];
    if (!assignment) throw new Error("no active vehicle");
    const [updated] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId: driver.id,
          vehicleId: assignment.vehicleId,
          agencyId: driver.agencyId,
          status: RideStatus.ASSIGNED,
          acceptedAt: new Date(),
        },
      }),
      this.prisma.rideEvent.create({
        data: {
          rideId,
          from: ride.status,
          to: RideStatus.ASSIGNED,
          actorId: driverUserId,
        },
      }),
    ]);
    await this.messaging.ensureConversation(
      rideId,
      ride.riderId,
      driver.user.id,
    );
    await this.messaging.postSystemMessage(rideId, RideStatus.ASSIGNED);
    this.realtime.broadcastRide({
      rideId,
      status: RideStatus.ASSIGNED,
      agencyId: driver.agencyId,
      driverId: driver.id,
    });
    return updated;
  }

  /** Driver declines → exclude and offer the next candidate. */
  async declineOffer(rideId: string, driverUserId: string) {
    const offer = this.takeOffer(rideId, driverUserId);
    this.excludeDriver(rideId, offer.driverId);
    return this.offerNext(rideId);
  }

  /** Dispatcher manual assignment wins over automation. */
  cancelOffers(rideId: string) {
    const offer = this.offers.get(rideId);
    if (offer) {
      clearTimeout(offer.timer);
      this.offers.delete(rideId);
    }
    this.rejected.delete(rideId);
  }

  private excludeDriver(rideId: string, driverId: string) {
    let excluded = this.rejected.get(rideId);
    if (!excluded) {
      excluded = new Set();
      this.rejected.set(rideId, excluded);
    }
    excluded.add(driverId);
  }

  private takeOffer(rideId: string, driverUserId: string) {
    const offer = this.offers.get(rideId);
    if (!offer || offer.userId !== driverUserId) {
      throw new Error("no pending offer for this driver");
    }
    if (offer.expiresAt <= Date.now()) {
      this.offers.delete(rideId);
      throw new Error("offer expired");
    }
    clearTimeout(offer.timer);
    this.offers.delete(rideId);
    return offer;
  }

  private async offerNext(rideId: string) {
    const candidates = await this.findCandidates(rideId);
    if (candidates.length === 0) {
      await this.parkNoDrivers(rideId);
      return null;
    }
    const [next] = candidates;
    const expiresAt = Date.now() + this.offerTimeoutSec * 1000;
    const timer = setTimeout(
      () => void this.expireOffer(rideId),
      this.offerTimeoutSec * 1000,
    );
    if (typeof timer.unref === "function") timer.unref();
    this.offers.set(rideId, {
      rideId,
      driverId: next.driverId,
      userId: next.userId,
      expiresAt,
      timer,
    });
    await this.notifications.enqueue({
      channel: "PUSH",
      to: next.userId,
      template: "NEW_MESSAGE",
      variables: { sender: "dispatcher" },
    });
    this.realtime.broadcastRide({
      rideId,
      status: RideStatus.REQUESTED,
      agencyId: null,
      driverId: null,
    });
    return { rideId, driverId: next.driverId, expiresAt };
  }

  private async expireOffer(rideId: string) {
    const offer = this.offers.get(rideId);
    if (!offer) return;
    this.offers.delete(rideId);
    this.excludeDriver(rideId, offer.driverId);
    await this.offerNext(rideId);
  }

  private async parkNoDrivers(rideId: string) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
    });
    if (ride.status !== RideStatus.REQUESTED) return null;
    const [updated] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.NO_DRIVERS },
      }),
      this.prisma.rideEvent.create({
        data: {
          rideId,
          from: RideStatus.REQUESTED,
          to: RideStatus.NO_DRIVERS,
          actorId: "system",
        },
      }),
    ]);
    this.realtime.broadcastRide({
      rideId,
      status: RideStatus.NO_DRIVERS,
      agencyId: null,
      driverId: null,
    });
    return updated;
  }

  private assertTransition(from: string, to: RideStatus) {
    const allowed = (RideTransitions[from as RideStatus] ??
      []) as readonly string[];
    if (!allowed.includes(to))
      throw new Error(`Illegal ride transition: ${from} -> ${to}`);
  }
}
