import {
  Inject,
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  DocumentStatus,
  DriverStatus,
  WalletOwnerType,
} from "@hailing/constants";
import { documentRequirements } from "@hailing/data";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { roleMatches } from "../auth/roles.guard.js";

export interface ApplyDriverDto {
  agencyId: string;
  licenseNo: string;
  dateOfBirth?: string;
}

export interface SubmitDocumentDto {
  type: string;
  storageKey: string;
}

export interface Requester {
  sub: string;
  roles: string[];
}

export type ReviewAction = "start-review" | "approve" | "reject";

const SUBMITTABLE: readonly DriverStatus[] = [
  DriverStatus.APPLICANT,
  DriverStatus.DOCUMENTS_PENDING,
];
const REVIEWABLE: readonly DriverStatus[] = [
  DriverStatus.DOCUMENTS_PENDING,
  DriverStatus.DOCUMENTS_UNDER_REVIEW,
];
const VERDICTS: readonly DocumentStatus[] = [
  DocumentStatus.VERIFIED,
  DocumentStatus.REJECTED,
];

/**
 * Driver onboarding pipeline (spec §21–§24):
 * APPLICANT → DOCUMENTS_PENDING → DOCUMENTS_UNDER_REVIEW → ACTIVE | REJECTED.
 * Account creation never makes a driver dispatchable; only ACTIVE with an
 * active vehicle assignment is (enforced in RidesService).
 */
@Injectable()
export class OnboardingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  async applyDriver(userId: string, dto: ApplyDriverDto) {
    const existing = await this.prisma.driver.findUnique({ where: { userId } });
    if (existing)
      throw new BadRequestException("user already has a driver profile");
    const driver = await this.prisma.driver.create({
      data: {
        userId,
        agencyId: dto.agencyId,
        licenseNo: dto.licenseNo,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        status: DriverStatus.APPLICANT,
      },
    });
    await this.prisma.wallet.create({
      data: {
        ownerType: WalletOwnerType.DRIVER,
        ownerId: driver.id,
        balanceCentavos: 0,
      },
    });
    return driver;
  }

  async submitDocument(
    driverId: string,
    dto: SubmitDocumentDto,
    requester: Requester,
  ) {
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { id: driverId },
    });
    const staff = requester.roles.some(
      (have) => roleMatches("DRIVER:*", have) || roleMatches("AGENCY:*", have),
    );
    if (!staff && driver.userId !== requester.sub) {
      throw new ForbiddenException("not your driver profile");
    }
    if (!SUBMITTABLE.includes(driver.status as DriverStatus)) {
      throw new BadRequestException(
        `cannot submit documents while driver is ${driver.status}`,
      );
    }
    const [doc] = await this.prisma.$transaction([
      this.prisma.document.create({
        data: {
          driverId,
          type: dto.type,
          storageKey: dto.storageKey,
          status: DocumentStatus.PENDING,
        },
      }),
      this.prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.DOCUMENTS_PENDING },
      }),
    ]);
    return doc;
  }

  async verifyDocument(
    documentId: string,
    status: DocumentStatus,
    reviewerId: string,
  ) {
    if (!VERDICTS.includes(status)) {
      throw new BadRequestException(
        `cannot set document to ${status} from review`,
      );
    }
    return this.prisma.document.update({
      where: { id: documentId },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
  }

  async reviewDriver(
    driverId: string,
    action: ReviewAction,
    reviewerId: string,
  ) {
    const driver = await this.prisma.driver.findUniqueOrThrow({
      where: { id: driverId },
    });
    switch (action) {
      case "start-review":
        if (driver.status !== DriverStatus.DOCUMENTS_PENDING) {
          throw new BadRequestException(
            `cannot start review while driver is ${driver.status}`,
          );
        }
        return this.setStatus(
          driverId,
          DriverStatus.DOCUMENTS_UNDER_REVIEW,
          reviewerId,
        );
      case "approve": {
        if (driver.status !== DriverStatus.DOCUMENTS_UNDER_REVIEW) {
          throw new BadRequestException(
            `cannot approve while driver is ${driver.status}`,
          );
        }
        const missing = await this.missingRequiredDocs(driverId);
        if (missing.length > 0) {
          throw new BadRequestException(
            `missing verified documents: ${missing.join(", ")}`,
          );
        }
        const approved = await this.setStatus(
          driverId,
          DriverStatus.ACTIVE,
          reviewerId,
        );
        const profile = await this.prisma.driver.findUnique({
          where: { id: driverId },
          include: { user: true },
        });
        if (profile?.user) {
          await this.notifications.enqueue({
            userId: profile.user.id,
            channel: "SMS",
            to: profile.user.phone,
            template: "DRIVER_APPROVED",
            variables: {},
          });
        }
        return approved;
      }
      case "reject":
        if (!REVIEWABLE.includes(driver.status as DriverStatus)) {
          throw new BadRequestException(
            `cannot reject while driver is ${driver.status}`,
          );
        }
        return this.setStatus(driverId, DriverStatus.REJECTED, reviewerId);
    }
  }

  private async missingRequiredDocs(driverId: string): Promise<string[]> {
    const required = (
      documentRequirements as { driver: { type: string; required: boolean }[] }
    ).driver
      .filter((d) => d.required)
      .map((d) => d.type);
    const docs = await this.prisma.document.findMany({ where: { driverId } });
    return required.filter(
      (type) =>
        !docs.some(
          (d) => d.type === type && d.status === DocumentStatus.VERIFIED,
        ),
    );
  }

  private async setStatus(
    driverId: string,
    status: DriverStatus,
    reviewerId: string,
  ) {
    const [driver] = await this.prisma.$transaction([
      this.prisma.driver.update({ where: { id: driverId }, data: { status } }),
      this.prisma.auditLog.create({
        data: {
          actorId: reviewerId,
          action: `driver.${status.toLowerCase()}`,
          entity: "Driver",
          entityId: driverId,
        },
      }),
    ]);
    return driver;
  }
}
