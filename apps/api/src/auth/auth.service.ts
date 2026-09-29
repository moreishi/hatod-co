import { Inject, Injectable } from "@nestjs/common";
import { compare } from "bcryptjs";
import {
  generateOtp,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  otpMatches,
  OTP_TTL_MS,
} from "./otp.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TokenService } from "./token.service.js";
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

  /** Step 1: issue an OTP challenge for a phone number. Dev returns the code. */
  async requestOtp(
    phone: string,
  ): Promise<{ challengeId: string; devCode?: string }> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) throw new Error("account not found");
    const code = generateOtp();
    const challenge = await this.prisma.otpChallenge.create({
      data: {
        userId: user.id,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    // Outbox for the SMS provider; LocalStage still exposes the code.
    await this.notifications.enqueue({
      userId: user.id,
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
    if (!challenge) throw new Error("challenge not found");
    if (challenge.expiresAt < new Date()) throw new Error("code expired");
    if (challenge.attempts >= OTP_MAX_ATTEMPTS)
      throw new Error("too many attempts");
    if (!otpMatches(code, challenge.codeHash)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: challenge.attempts + 1 },
      });
      throw new Error("invalid code");
    }
    await this.prisma.otpChallenge.delete({ where: { id: challenge.id } });
    const roles = this.resolveRoles(challenge.user as RolesSource);
    return { token: this.tokens.sign(challenge.userId, roles) };
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
