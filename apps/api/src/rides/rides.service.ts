import { Inject, Injectable } from "@nestjs/common";
import {
  DISPATCHABLE_DRIVER_STATUSES,
  PaymentMethod,
  RideStatus,
  TransactionType,
  VehicleType,
  WalletOwnerType,
} from "@hailing/constants";
import { PrismaService } from "../prisma/prisma.service.js";
import { quoteFare } from "./fare.js";
import { RideTransitionGuard } from "./ride-transition.guard.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { MatchingService } from "../matching/matching.service.js";
import { MessagingService } from "../messaging/messaging.service.js";
import { RideEventsGateway } from "../realtime/ride-events.gateway.js";
import { RoutingService, type LatLng } from "@hailing/routing";
import { pricing } from "@hailing/data";

export interface RequestRideDto {
  pickupLabel: string;
  pickupBrgyCode: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLabel: string;
  dropoffBrgyCode: string;
  distanceKm: number;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
}

const PLATFORM_WALLET_ID = "platform";

@Injectable()
export class RidesService {
  private readonly routing = new RoutingService();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RideTransitionGuard) private readonly guard: RideTransitionGuard,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(RideEventsGateway) private readonly realtime: RideEventsGateway,
    @Inject(MessagingService) private readonly messaging: MessagingService,
    @Inject(MatchingService) private readonly matching: MatchingService,
  ) {}

  /** Upfront quote from real coordinates (routing spec §35: separated from booking). */
  async quoteFare(
    origin: LatLng,
    destination: LatLng,
    vehicleType: VehicleType,
  ) {
    const route = await this.routing.calculateRoute(origin, destination, {
      vehicleType,
    });
    return {
      ...quoteFare({ vehicleType, distanceKm: route.distanceKm }),
      distanceKm: route.distanceKm,
      durationSec: route.durationSec,
      provider: route.provider,
    };
  }

  /** Rider requests a ride → REQUESTED with an upfront quoted fare. */ async requestRide(
    riderId: string,
    dto: RequestRideDto,
  ) {
    const { fareCentavos } = quoteFare({
      vehicleType: dto.vehicleType,
      distanceKm: dto.distanceKm,
    });
    const created = await this.prisma.ride.create({
      data: {
        riderId,
        status: RideStatus.REQUESTED,
        pickupLabel: dto.pickupLabel,
        pickupBrgyCode: dto.pickupBrgyCode,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffLabel: dto.dropoffLabel,
        dropoffBrgyCode: dto.dropoffBrgyCode,
        distanceKm: dto.distanceKm,
        fareCentavos,
        vehicleType: dto.vehicleType,
        paymentMethod: dto.paymentMethod,
      },
    });
    // Fire-and-forget auto-match; booking is already persisted (persist first).
    void this.matching.matchRide(created.id).catch(() => undefined);
    return created;
  }

  /** Dispatcher assigns a dispatchable driver (ACTIVE + active vehicle assignment). */
  async assignRide(rideId: string, driverId: string, actorId: string) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
    });
    this.guard.assertTransition(ride.status as RideStatus, RideStatus.ASSIGNED);
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { id: driverId },
      include: {
        assignments: { where: { isActive: true } },
        user: { select: { id: true, displayName: true } },
      },
    });
    if (
      !(DISPATCHABLE_DRIVER_STATUSES as readonly string[]).includes(
        driver.status,
      )
    ) {
      throw new Error(
        `driver ${driverId} is ${driver.status}, not dispatchable`,
      );
    }
    if (!driver.isOnline) {
      throw new Error(`driver ${driverId} is offline`);
    }
    const assignment = driver.assignments[0];
    if (!assignment)
      throw new Error(`driver ${driverId} has no active vehicle`);
    // Dispatcher manual assignment wins over any pending auto-match offer.
    this.matching.cancelOffers(rideId);
    const [updated] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId,
          vehicleId: assignment.vehicleId,
          agencyId: driver.agencyId,
          status: RideStatus.ASSIGNED,
        },
      }),
      this.prisma.rideEvent.create({
        data: { rideId, from: ride.status, to: RideStatus.ASSIGNED, actorId },
      }),
    ]);
    await this.notifyRider(rideId, "RIDE_ASSIGNED");
    await this.broadcastRide(rideId, RideStatus.ASSIGNED);
    await this.messaging.ensureConversation(
      rideId,
      ride.riderId,
      driver.user.id,
    );
    await this.messaging.postSystemMessage(rideId, RideStatus.ASSIGNED);
    return updated;
  }

  /** Assigned driver accepts (simulator plan §5: ASSIGNED → ACCEPTED). */
  async acceptRide(rideId: string, driverUserId: string) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      include: { driver: true },
    });
    if (ride.status !== RideStatus.ASSIGNED) {
      throw new Error(`ride is ${ride.status}, nothing to accept`);
    }
    if (!ride.driver || ride.driver.userId !== driverUserId) {
      throw new Error("only the assigned driver can accept");
    }
    return this.prisma.ride.update({
      where: { id: rideId },
      data: { acceptedAt: new Date() },
    });
  }

  /** Assigned driver rejects → ride requeues to REQUESTED, stale chat removed. */
  async rejectRide(rideId: string, driverUserId: string) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      include: { driver: true },
    });
    if (ride.status !== RideStatus.ASSIGNED) {
      throw new Error(`ride is ${ride.status}, nothing to reject`);
    }
    if (!ride.driver || ride.driver.userId !== driverUserId) {
      throw new Error("only the assigned driver can reject");
    }
    this.guard.assertTransition(
      ride.status as RideStatus,
      RideStatus.REQUESTED,
    );
    const [updated] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId: null,
          vehicleId: null,
          acceptedAt: null,
          status: RideStatus.REQUESTED,
        },
      }),
      this.prisma.rideEvent.create({
        data: {
          rideId,
          from: RideStatus.ASSIGNED,
          to: RideStatus.REQUESTED,
          actorId: driverUserId,
        },
      }),
    ]);
    await this.messaging.deleteConversation(rideId);
    await this.broadcastRide(rideId, RideStatus.REQUESTED);
    return updated;
  }

  /** Driver toggles availability; only online drivers are dispatchable. */
  async setOnline(driverUserId: string, online: boolean) {
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { userId: driverUserId },
    });
    if (driver.status !== "ACTIVE" && online) {
      throw new Error(`driver is ${driver.status}, cannot go online`);
    }
    return this.prisma.driver.update({
      where: { id: driver.id },
      data: { isOnline: online },
    });
  }

  /** Move a ride along its state machine; COMPLETED settles the ledger pair. */
  async transitionRide(
    rideId: string,
    to: RideStatus,
    actorId: string,
    cancelReason?: string,
  ) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      include: { driver: { select: { userId: true } } },
    });
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      include: { adminRoles: true, agencyMemberships: true },
    });
    const ownRider = ride.riderId === actorId;
    const ownDriver = ride.driver?.userId === actorId;
    const staff =
      (actor?.adminRoles.length ?? 0) > 0 ||
      (ride.agencyId !== null &&
        (actor?.agencyMemberships ?? []).some(
          (m) => m.agencyId === ride.agencyId && m.isActive,
        ));
    if (to === RideStatus.CANCELLED) {
      if (!ownRider && !ownDriver && !staff) {
        throw new Error(
          "only the rider, the assigned driver, or staff can cancel",
        );
      }
    } else if (!ownDriver && !staff) {
      throw new Error("only the assigned driver or staff can move this ride");
    }
    this.guard.assertTransition(ride.status as RideStatus, to);
    if (to === RideStatus.COMPLETED)
      return this.completeRide(rideId, ride, actorId);
    const [moved] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: {
          status: to,
          ...(to === RideStatus.CANCELLED
            ? { cancelReason: cancelReason ?? "cancelled" }
            : {}),
        },
      }),
      this.prisma.rideEvent.create({
        data: { rideId, from: ride.status, to, actorId },
      }),
    ]);
    await this.broadcastRide(rideId, to);
    await this.messaging.postSystemMessage(rideId, to);
    if (to === RideStatus.CANCELLED) {
      await this.messaging.closeConversation(rideId);
    }
    return moved;
  }

  private async completeRide(
    rideId: string,
    ride: { status: string; fareCentavos: number; driverId: string | null },
    actorId: string,
  ) {
    if (!ride.driverId) throw new Error("cannot complete an unassigned ride");
    const commission = Math.round(
      (ride.fareCentavos * pricing.commissionTiers[0].rateBps) / 10000,
    );
    const earning = ride.fareCentavos - commission;
    const driverWallet = await this.prisma.wallet.findUniqueOrThrow({
      where: {
        ownerType_ownerId: {
          ownerType: WalletOwnerType.DRIVER,
          ownerId: ride.driverId,
        },
      },
    });
    const platformWallet = await this.prisma.wallet.findUniqueOrThrow({
      where: {
        ownerType_ownerId: {
          ownerType: WalletOwnerType.PLATFORM,
          ownerId: PLATFORM_WALLET_ID,
        },
      },
    });
    const [completed] = await this.prisma.$transaction([
      this.prisma.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.COMPLETED, completedAt: new Date() },
      }),
      this.prisma.rideEvent.create({
        data: { rideId, from: ride.status, to: RideStatus.COMPLETED, actorId },
      }),
      this.prisma.ledgerTransaction.create({
        data: {
          walletId: driverWallet.id,
          type: TransactionType.RIDE_EARNING,
          amountCentavos: earning,
          rideId,
        },
      }),
      this.prisma.ledgerTransaction.create({
        data: {
          walletId: platformWallet.id,
          type: TransactionType.COMMISSION,
          amountCentavos: commission,
          rideId,
        },
      }),
      this.prisma.wallet.update({
        where: { id: driverWallet.id },
        data: { balanceCentavos: driverWallet.balanceCentavos + earning },
      }),
      this.prisma.wallet.update({
        where: { id: platformWallet.id },
        data: { balanceCentavos: platformWallet.balanceCentavos + commission },
      }),
    ]);
    await this.notifyRider(rideId, "RIDE_COMPLETED");
    await this.broadcastRide(rideId, RideStatus.COMPLETED);
    await this.messaging.postSystemMessage(rideId, RideStatus.COMPLETED);
    await this.messaging.closeConversation(rideId);
    return completed;
  }

  private async broadcastRide(rideId: string, status: RideStatus) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
    });
    this.realtime.broadcastRide({
      rideId,
      status,
      agencyId: ride.agencyId,
      driverId: ride.driverId,
    });
  }

  /** Best-effort rider SMS for assignment + completion (outbox, worker sends). */
  private async notifyRider(
    rideId: string,
    template: "RIDE_ASSIGNED" | "RIDE_COMPLETED",
  ) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      include: {
        driver: { include: { user: { select: { displayName: true } } } },
      },
    });
    const rider = await this.prisma.user.findUnique({
      where: { id: ride.riderId },
    });
    if (!rider) return;
    const fare = `₱${(ride.fareCentavos / 100).toFixed(2)}`;
    await this.notifications.enqueue({
      userId: rider.id,
      channel: "SMS",
      to: rider.phone,
      template,
      variables:
        template === "RIDE_ASSIGNED"
          ? {
              driver: ride.driver?.user.displayName ?? "your driver",
              pickup: ride.pickupLabel,
              fare,
            }
          : { fare, method: ride.paymentMethod },
    });
  }

  getRide(id: string) {
    return this.prisma.ride.findUniqueOrThrow({
      where: { id },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        driver: { include: { user: { select: { displayName: true } } } },
      },
    });
  }

  listRides(status?: RideStatus) {
    return this.prisma.ride.findMany({
      where: status ? { status } : undefined,
      orderBy: { requestedAt: "desc" },
      take: 50,
    });
  }

  /** Rides where the user is the rider, plus ones assigned to their driver profile. */
  async myRides(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    const [asRider, asDriver] = await Promise.all([
      this.prisma.ride.findMany({
        where: { riderId: userId },
        orderBy: { requestedAt: "desc" },
        take: 25,
      }),
      driver
        ? this.prisma.ride.findMany({
            where: { driverId: driver.id },
            orderBy: { requestedAt: "desc" },
            take: 25,
          })
        : Promise.resolve([]),
    ]);
    return { asRider, asDriver };
  }

  /** Driver wallet balance plus RIDE_EARNING totals for the earnings screen. */
  async driverEarnings(driverUserId: string) {
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { userId: driverUserId },
    });
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: WalletOwnerType.DRIVER,
          ownerId: driver.id,
        },
      },
    });
    const earnings = await this.prisma.ledgerTransaction.findMany({
      where: {
        walletId: wallet?.id ?? "__none__",
        type: TransactionType.RIDE_EARNING,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    const totalCentavos = earnings.reduce(
      (sum, t) => sum + t.amountCentavos,
      0,
    );
    return {
      balanceCentavos: wallet?.balanceCentavos ?? 0,
      totalCentavos,
      tripCount: earnings.length,
      recent: earnings,
    };
  }
}
