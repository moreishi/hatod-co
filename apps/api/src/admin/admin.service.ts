import {
  Inject,
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { AdminRole } from "@hailing/constants";
import { PrismaService } from "../prisma/prisma.service.js";
import { DEFAULT_TAKE, type Page } from "../common/paging.js";

export interface InviteAdminDto {
  email: string;
  role: AdminRole;
}

export interface AcceptInviteDto {
  phone: string;
  password: string;
}

const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

/**
 * Invitation-based admin onboarding (spec §16). Only SUPER_ADMIN can invite;
 * the invitee claims the invitation with a phone + password, then uses the
 * standard password + OTP login path.
 */
@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async invite(dto: InviteAdminDto, inviterId: string) {
    if (!Object.values(AdminRole).includes(dto.role)) {
      throw new BadRequestException(`unknown admin role ${dto.role}`);
    }
    const token = randomBytes(24).toString("base64url");
    return this.prisma.adminInvitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedById: inviterId,
      },
    });
  }

  async listInvitations() {
    return this.prisma.adminInvitation.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async accept(token: string, dto: AcceptInviteDto) {
    const invitation = await this.prisma.adminInvitation.findUniqueOrThrow({
      where: { token },
    });
    if (invitation.acceptedAt)
      throw new ForbiddenException("invitation already used");
    if (invitation.expiresAt < new Date())
      throw new ForbiddenException("invitation expired");
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException("password must be at least 8 characters");
    }
    const taken = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (taken) throw new BadRequestException("phone already registered");
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: invitation.email,
        passwordHash: await hash(dto.password, 10),
        displayName: invitation.email,
      },
    });
    await this.prisma.adminRoleAssignment.create({
      data: { userId: user.id, role: invitation.role },
    });
    await this.prisma.adminInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return { userId: user.id, role: invitation.role };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      where: { adminRoles: { some: {} } },
      include: { adminRoles: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Platform-wide ride oversight for ops/finance/support. */
  async listRides(
    status: string | undefined,
    page: Page = { take: DEFAULT_TAKE, skip: 0 },
  ) {
    return this.prisma.ride.findMany({
      where: status ? { status } : undefined,
      include: {
        driver: { include: { user: { select: { displayName: true } } } },
      },
      orderBy: { requestedAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  /** Ledger oversight: every centavo movement, newest first. */
  async listTransactions(
    type: string | undefined,
    page: Page = { take: DEFAULT_TAKE, skip: 0 },
  ) {
    return this.prisma.ledgerTransaction.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  /** Sensitive admin/financial operations trail (spec rule 53). */
  async listAuditLogs(page: Page = { take: DEFAULT_TAKE, skip: 0 }) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  /** Sensitive admin/financial operations trail (spec rule 53). */
  async listAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /**
   * Read-only support inspection of a conversation (messaging spec §22).
   * Audited; message content is never written to the audit row.
   */
  async inspectConversation(conversationId: string, adminId: string) {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { ride: { select: { id: true, status: true } } },
    });
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "conversation.view",
        entity: "Conversation",
        entityId: conversationId,
      },
    });
    return { conversation, messages };
  }

  /** Finance summary: totals per transaction type + wallet count. */
  async financeSummary() {
    const groups = await this.prisma.ledgerTransaction.groupBy({
      by: ["type"],
      _sum: { amountCentavos: true },
      _count: { type: true },
    });
    const wallets = await this.prisma.wallet.count();
    return {
      byType: groups.map((g) => ({
        type: g.type,
        totalCentavos: g._sum.amountCentavos ?? 0,
        count: g._count.type,
      })),
      wallets,
    };
  }
}
