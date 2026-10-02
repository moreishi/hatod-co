import {
  ConflictException,
  Inject,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AdminRole, DriverStatus } from "@hailing/constants";
import { PrismaService } from "../prisma/prisma.service.js";
import { LocationService } from "../location/location.service.js";
import { DEFAULT_TAKE, type Page } from "../common/paging.js";
import type { Requester } from "../onboarding/onboarding.service.js";

export interface CreateVehicleDto {
  plateNo: string;
  type: string;
  make?: string;
  model?: string;
  year?: number;
}

export interface CreateAgencyDto {
  name: string;
  slug?: string;
  cityCode: string;
  contactPhone: string;
}

export interface UpdateAgencyDto {
  contactPhone?: string;
  cityCode?: string;
  status?: string;
}

/**
 * Agency-scoped operations (spec §17, §18). Every method re-checks that the
 * requester belongs to the agency (or is a platform admin) — roles in the
 * token are claims, agency membership is enforced here (spec rule 49).
 */
@Injectable()
export class AgenciesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocationService) private readonly location: LocationService,
  ) {}

  /** Super-admin agency creation: ACTIVE agency + zero wallet. */
  async createAgency(dto: CreateAgencyDto) {
    const name = dto.name.trim();
    const cityCode = dto.cityCode.trim();
    const contactPhone = dto.contactPhone.trim();
    if (!name || !cityCode || !contactPhone) {
      throw new BadRequestException(
        "agency name, city code, and contact phone required",
      );
    }
    const slug = (dto.slug?.trim() || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) throw new BadRequestException("agency slug required");
    const taken = await this.prisma.agency.findUnique({ where: { slug } });
    if (taken) throw new ConflictException("agency slug taken");
    const agency = await this.prisma.agency.create({
      data: { name, slug, cityCode, contactPhone, status: "ACTIVE" },
    });
    await this.prisma.wallet.create({
      data: {
        ownerType: "AGENCY",
        ownerId: agency.id,
        balanceCentavos: 0,
      },
    });
    return agency;
  }

  /** Super-admin agency edit: contact, city, or ACTIVE|SUSPENDED. */
  async updateAgency(id: string, dto: UpdateAgencyDto) {
    const existing = await this.prisma.agency.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("agency not found");
    const data: { contactPhone?: string; cityCode?: string; status?: string } =
      {};
    if (dto.contactPhone !== undefined) {
      if (!dto.contactPhone.trim()) {
        throw new BadRequestException("contact phone required");
      }
      data.contactPhone = dto.contactPhone.trim();
    }
    if (dto.cityCode !== undefined) {
      if (!dto.cityCode.trim()) {
        throw new BadRequestException("city code required");
      }
      data.cityCode = dto.cityCode.trim();
    }
    if (dto.status !== undefined) {
      if (dto.status !== "ACTIVE" && dto.status !== "SUSPENDED") {
        throw new BadRequestException("status must be ACTIVE or SUSPENDED");
      }
      data.status = dto.status;
    }
    return this.prisma.agency.update({ where: { id }, data });
  }

  /** Active agencies for the driver-onboarding picker (public listing). */
  async listActive() {
    return this.prisma.agency.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, cityCode: true },
      orderBy: { name: "asc" },
    });
  }

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
    page: Page = { take: DEFAULT_TAKE, skip: 0 },
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
      take: page.take,
      skip: page.skip,
    });
  }

  async listDrivers(
    agencyId: string,
    requester: Requester,
    page: Page = { take: DEFAULT_TAKE, skip: 0 },
  ) {
    this.requireAgency(agencyId, requester);
    return this.prisma.driver.findMany({
      where: { agencyId },
      include: {
        user: { select: { displayName: true, phone: true } },
        assignments: { where: { isActive: true }, include: { vehicle: true } },
        documents: { select: { type: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
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

  /** Online drivers near a point, closest first (routing spec §12). */
  async nearbyDrivers(
    agencyId: string,
    lat: number,
    lng: number,
    requester: Requester,
  ) {
    this.requireAgency(agencyId, requester);
    return this.location.nearby(agencyId, lat, lng);
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
    opts: { search?: string; take?: number; skip?: number } = {},
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
    const q = opts.search?.trim();
    return this.prisma.document.findMany({
      where: {
        AND: [
          {
            OR: [
              { driverId: { in: driverIds } },
              { vehicleId: { in: vehicleIds } },
            ],
          },
          ...(status ? [{ status }] : []),
          ...(q
            ? [
                {
                  OR: [
                    { type: { contains: q, mode: "insensitive" as const } },
                    {
                      driver: {
                        user: {
                          OR: [
                            {
                              displayName: {
                                contains: q,
                                mode: "insensitive" as const,
                              },
                            },
                            {
                              phone: {
                                contains: q,
                                mode: "insensitive" as const,
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        driver: {
          include: { user: { select: { displayName: true, phone: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: opts.take ?? 100,
      ...(opts.skip ? { skip: opts.skip } : {}),
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
