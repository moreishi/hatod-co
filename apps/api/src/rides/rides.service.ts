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
import { MessagingService } from "../messaging/messaging.service.js";
import { RideEventsGateway } from "../realtime/ride-events.gateway.js";
import { pricing } from "@hailing/data";

export interface RequestRideDto {
  pickupLabel: string;
  pickupBrgyCode: string;
  dropoffLabel: string;
  dropoffBrgyCode: string;
  distanceKm: number;
  vehicleType: VehicleType;
  paymentMethod: PaymentMethod;
}

const PLATFORM_WALLET_ID = "platform";

@Injectable()
export class RidesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RideTransitionGuard) private readonly guard: RideTransitionGuard,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(RideEventsGateway) private readonly realtime: RideEventsGateway,
    @Inject(MessagingService) private readonly messaging: MessagingService,
  ) {}

  /** Rider requests a ride → REQUESTED with an upfront quoted fare. */
  async requestRide(riderId: string, dto: RequestRideDto) {
    const { fareCentavos } = quoteFare({
      vehicleType: dto.vehicleType,
      distanceKm: dto.distanceKm,
    });
    return this.prisma.ride.create({
      data: {
        riderId,
        status: RideStatus.REQUESTED,
        pickupLabel: dto.pickupLabel,
        pickupBrgyCode: dto.pickupBrgyCode,
        dropoffLabel: dto.dropoffLabel,
        dropoffBrgyCode: dto.dropoffBrgyCode,
        distanceKm: dto.distanceKm,
        fareCentavos,
        paymentMethod: dto.paymentMethod,
      },
    });
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
    const assignment = driver.assignments[0];
    if (!assignment)
      throw new Error(`driver ${driverId} has no active vehicle`);
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

  /** Move a ride along its state machine; COMPLETED settles the ledger pair. */
  async transitionRide(
    rideId: string,
    to: RideStatus,
    actorId: string,
    cancelReason?: string,
  ) {
    const ride = await this.prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
    });
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
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
  }

  listRides(status?: RideStatus) {
    return this.prisma.ride.findMany({
      where: status ? { status } : undefined,
      orderBy: { requestedAt: "desc" },
      take: 50,
    });
  }
}
