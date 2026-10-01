import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { compare } from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  generateOtp,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  otpMatches,
  OTP_TTL_MS,
} from "./otp.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TOKEN_TTL_SECONDS, TokenService } from "./token.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";

const DEV = process.env.NODE_ENV !== "production";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Self-registration: creates the account (RIDER role via verify) and
   * immediately issues the first OTP challenge, so signup flows straight
   * into verification. Existing numbers get 409 and should log in.
   */
  async register(
    phone: string,
    displayName?: string,
  ): Promise<{ challengeId: string; devCode?: string }> {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15)
      throw new BadRequestException("invalid phone number");
    const name = (displayName ?? "").trim();
    if (name.length > 100)
      throw new BadRequestException("display name too long");
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) throw new ConflictException("account exists");
    const user = await this.prisma.user.create({
      data: { phone, displayName: name },
    });
    return this.issueChallenge(user.id, phone);
  }

  /** Step 1: issue an OTP challenge for a phone number. Dev returns the code. */
  async requestOtp(
    phone: string,
  ): Promise<{ challengeId: string; devCode?: string }> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive)
      throw new NotFoundException("account not found");
    return this.issueChallenge(user.id, phone);
  }

  private async issueChallenge(
    userId: string,
    phone: string,
  ): Promise<{ challengeId: string; devCode?: string }> {
    const code = generateOtp();
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    // Outbox for the SMS provider; LocalStage still exposes the code.
    await this.notifications.enqueue({
      userId,
      channel: "SMS",
      to: phone,
      template: "OTP_CODE",
      variables: { code },
    });
    return { challengeId: challenge.id, ...(DEV ? { devCode: code } : {}) };
  }

  /** Step 2: verify OTP → signed token carrying the user's roles. */
  async verifyOtp(
    challengeId: string,
    code: string,
  ): Promise<{ token: string }> {
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { id: challengeId },
      include: {
        user: {
          include: {
            adminRoles: true,
            agencyMemberships: true,
            driverProfile: true,
          },
        },
      },
    });
    if (!challenge) throw new NotFoundException("challenge not found");
    if (challenge.expiresAt < new Date())
      throw new BadRequestException("code expired");
    if (challenge.attempts >= OTP_MAX_ATTEMPTS)
      throw new BadRequestException("too many attempts");
    if (!otpMatches(code, challenge.codeHash)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: challenge.attempts + 1 },
      });
      throw new BadRequestException("invalid code");
    }
    await this.prisma.otpChallenge.delete({ where: { id: challenge.id } });
    const roles = this.resolveRoles(challenge.user as RolesSource);
    // Server-side session: logout revokes this row, killing the token.
    const jti = randomUUID();
    await this.prisma.session.create({
      data: {
        id: jti,
        userId: challenge.userId,
        expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000),
      },
    });
    return {
      token: this.tokens.sign(challenge.userId, roles, TOKEN_TTL_SECONDS, jti),
    };
  }

  /**
   * Logout: revoke the caller's session so the token stops working.
   * Idempotent — unknown or already-revoked sessions report revoked:false
   * instead of throwing, so clients can always finish signing out.
   */
  async logout(userId: string, jti?: string): Promise<{ revoked: boolean }> {
    if (!jti) return { revoked: false };
    const { count } = await this.prisma.session.updateMany({
      where: { id: jti, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: count > 0 };
  }

  /** Agency/admin password check → caller must still complete OTP (2FA). */
  async checkPassword(
    phone: string,
    password: string,
  ): Promise<{ challengeId: string }> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user?.passwordHash || !user.isActive)
      throw new Error("invalid credentials");
    if (!(await compare(password, user.passwordHash)))
      throw new Error("invalid credentials");
    return this.requestOtp(phone);
  }

  private resolveRoles(user: RolesSource): string[] {
    const roles = ["RIDER"];
    for (const r of user.adminRoles) roles.push(`ADMIN:${r.role}`);
    for (const m of user.agencyMemberships) {
      if (m.isActive) roles.push(`AGENCY:${m.agencyId}:${m.role}`);
    }
    if (user.driverProfile) roles.push(`DRIVER:${user.driverProfile.id}`);
    return roles;
  }
}

interface RolesSource {
  adminRoles: { role: string }[];
  agencyMemberships: { agencyId: string; role: string; isActive: boolean }[];
  driverProfile: { id: string } | null;
}
