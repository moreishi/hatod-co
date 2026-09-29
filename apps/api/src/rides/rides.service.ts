import { Injectable } from "@nestjs/common";
import {
  DISPATCHABLE_DRIVER_STATUSES,
  PaymentMethod,
  RideStatus,
  TransactionType,
  VehicleType,
  WalletOwnerType,
} from "@hailing/constants";
import { PrismaService } from "../auth/prisma.service.js";
import { quoteFare } from "./fare.js";
import { RideTransitionGuard } from "./ride-transition.guard.js";
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
    private readonly prisma: PrismaService,
    private readonly guard: RideTransitionGuard,
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
      include: { assignments: { where: { isActive: true } } },
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
    return this.prisma.$transaction([
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
    return this.prisma.$transaction([
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
