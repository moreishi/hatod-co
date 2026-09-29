import {
  Inject,
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AdminRole, DriverStatus } from "@hailing/constants";
import { PrismaService } from "../prisma/prisma.service.js";
import type { Requester } from "../onboarding/onboarding.service.js";

export interface CreateVehicleDto {
  plateNo: string;
  type: string;
  make?: string;
  model?: string;
  year?: number;
}

/**
 * Agency-scoped operations (spec §17, §18). Every method re-checks that the
 * requester belongs to the agency (or is a platform admin) — roles in the
 * token are claims, agency membership is enforced here (spec rule 49).
 */
@Injectable()
export class AgenciesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Agencies the requester belongs to (admins see all). */
  async myAgencies(requester: Requester) {
    if (this.isAdmin(requester)) return this.prisma.agency.findMany();
    const ids = this.agencyIds(requester);
    return this.prisma.agency.findMany({ where: { id: { in: ids } } });
  }

  /** Rides booked under this agency, optionally filtered by status. */ async listRides(
    agencyId: string,
    statuses: string[] | undefined,
    requester: Requester,
  ) {
    this.requireAgency(agencyId, requester);
    return this.prisma.ride.findMany({
      where: {
        agencyId,
        ...(statuses && statuses.length > 0
          ? { status: { in: statuses } }
          : {}),
      },
      include: {
        driver: { include: { user: { select: { displayName: true } } } },
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
  }

  async listDrivers(agencyId: string, requester: Requester) {
    this.requireAgency(agencyId, requester);
    return this.prisma.driver.findMany({
      where: { agencyId },
      include: {
        user: { select: { displayName: true, phone: true } },
        assignments: { where: { isActive: true }, include: { vehicle: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createVehicle(
    agencyId: string,
    dto: CreateVehicleDto,
    requester: Requester,
  ) {
    this.requireAgency(agencyId, requester, ["OWNER", "MANAGER"]);
    const existing = await this.prisma.vehicle.findUnique({
      where: { plateNo: dto.plateNo },
    });
    if (existing)
      throw new BadRequestException(`plate ${dto.plateNo} already registered`);
    return this.prisma.vehicle.create({
      data: {
        agencyId,
        plateNo: dto.plateNo,
        type: dto.type,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        status: "ACTIVE",
      },
    });
  }

  /** Assign a vehicle, closing the previous active assignment (history kept). */
  async assignVehicle(
    driverId: string,
    vehicleId: string,
    requester: Requester,
  ) {
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { id: driverId },
    });
    this.requireAgency(driver.agencyId, requester, [
      "OWNER",
      "MANAGER",
      "DISPATCHER",
    ]);
    if (driver.status !== DriverStatus.ACTIVE) {
      throw new BadRequestException(
        `driver is ${driver.status}, not dispatchable`,
      );
    }
    const vehicle = await this.prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
    });
    if (vehicle.agencyId !== driver.agencyId) {
      throw new BadRequestException("vehicle belongs to another agency");
    }
    const previous = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, isActive: true },
    });
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (previous) {
      ops.push(
        this.prisma.driverVehicleAssignment.update({
          where: { id: previous.id },
          data: { isActive: false, endsAt: new Date() },
        }),
      );
    }
    ops.push(
      this.prisma.driverVehicleAssignment.create({
        data: { driverId, vehicleId, isActive: true },
      }),
    );
    const results = await this.prisma.$transaction(ops);
    return results[results.length - 1];
  }

  /** Fleet registry for the agency. */
  async listVehicles(agencyId: string, requester: Requester) {
    this.requireAgency(agencyId, requester);
    return this.prisma.vehicle.findMany({
      where: { agencyId },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            driver: { include: { user: { select: { displayName: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Compliance review queue: documents of the agency's drivers (and vehicles). */
  async listDocuments(
    agencyId: string,
    status: string | undefined,
    requester: Requester,
  ) {
    this.requireAgency(agencyId, requester);
    const driverIds = (
      await this.prisma.driver.findMany({
        where: { agencyId },
        select: { id: true },
      })
    ).map((d) => d.id);
    const vehicleIds = (
      await this.prisma.vehicle.findMany({
        where: { agencyId },
        select: { id: true },
      })
    ).map((v) => v.id);
    return this.prisma.document.findMany({
      where: {
        OR: [
          { driverId: { in: driverIds } },
          { vehicleId: { in: vehicleIds } },
        ],
        ...(status ? { status } : {}),
      },
      include: {
        driver: { include: { user: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  private isAdmin(requester: Requester): boolean {
    return requester.roles.some(
      (r) =>
        r === `ADMIN:${AdminRole.SUPER_ADMIN}` ||
        r === `ADMIN:${AdminRole.OPS}`,
    );
  }

  private agencyIds(requester: Requester): string[] {
    return requester.roles
      .filter((r) => r.startsWith("AGENCY:"))
      .map((r) => r.split(":")[1])
      .filter((id, i, arr) => id && arr.indexOf(id) === i);
  }

  private requireAgency(
    agencyId: string,
    requester: Requester,
    allowedRoles?: string[],
  ) {
    if (this.isAdmin(requester)) return;
    const membership = requester.roles
      .filter((r) => r.startsWith(`AGENCY:${agencyId}:`))
      .map((r) => r.split(":")[2]);
    if (membership.length === 0)
      throw new ForbiddenException("not a member of this agency");
    if (
      allowedRoles &&
      !membership.some((role) => allowedRoles.includes(role))
    ) {
      throw new ForbiddenException("role cannot perform this action");
    }
  }
}
