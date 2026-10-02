import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { hashSync } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { hashOtp } from "../src/auth/otp.js";
import type { PrismaService } from "../src/prisma/prisma.service.js";
import { TokenService } from "../src/auth/token.service.js";

function serviceWith(stub: Record<string, Record<string, unknown>>) {
  const prisma = {
    user: stub.user,
    otpChallenge: stub.otpChallenge,
    ...stub,
  } as unknown as PrismaService;
  const notifications = { enqueue: vi.fn().mockResolvedValue({}) };
  return new AuthService(prisma, new TokenService(), notifications as never);
}

const baseUser = {
  id: "user-1",
  isActive: true,
  adminRoles: [{ role: "OPS" }],
  agencyMemberships: [{ agencyId: "ag-1", role: "OWNER", isActive: true }],
  driverProfile: null,
};

describe("AuthService OTP flow", () => {
  it("issues a challenge and verifies the code into a role-bearing token", async () => {
    let stored: { codeHash: string } | null = null;
    const svc = serviceWith({
      user: { findUnique: vi.fn().mockResolvedValue(baseUser) },
      otpChallenge: {
        create: vi
          .fn()
          .mockImplementation((args: { data: { codeHash: string } }) => {
            stored = args.data;
            return Promise.resolve({ id: "ch-1", ...args.data, attempts: 0 });
          }),
        findUnique: vi.fn().mockImplementation(() =>
          Promise.resolve({
            id: "ch-1",
            userId: "user-1",
            codeHash: stored!.codeHash,
            expiresAt: new Date(Date.now() + 60_000),
            attempts: 0,
            user: baseUser,
          }),
        ),
        delete: vi.fn().mockResolvedValue({}),
        update: vi.fn(),
      },
      session: { create: vi.fn().mockResolvedValue({}) },
    });

    // Recover the plaintext by issuing then reading the dev code path is
    // internal, so verify against the stored hash with a known code instead.
    const code = "424242";
    stored = { codeHash: hashOtp(code) };
    const { token } = await svc.verifyOtp("ch-1", code);
    const payload = new TokenService().verify(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.roles).toContain("ADMIN:OPS");
    expect(payload.roles).toContain("AGENCY:ag-1:OWNER");
  });

  it("rejects unknown accounts, wrong codes, expired codes, and attempt exhaustion", async () => {
    const noUser = serviceWith({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      otpChallenge: {},
    });
    await expect(noUser.requestOtp("09000000000")).rejects.toThrow(
      "account not found",
    );
    await expect(noUser.requestOtp("09000000000")).rejects.toThrowError(
      NotFoundException,
    );

    const mk = (challenge: object) =>
      serviceWith({
        user: {},
        otpChallenge: {
          findUnique: vi.fn().mockResolvedValue(challenge),
          update: vi.fn().mockResolvedValue({}),
          delete: vi.fn(),
        },
      });
    const good = {
      id: "ch",
      userId: "u",
      codeHash: hashOtp("111111"),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      user: { ...baseUser, id: "u" },
    };
    await expect(mk({ ...good }).verifyOtp("ch", "000000")).rejects.toThrow(
      "invalid code",
    );
    await expect(
      mk({ ...good }).verifyOtp("ch", "000000"),
    ).rejects.toThrowError(BadRequestException);
    await expect(
      mk({ ...good, expiresAt: new Date(Date.now() - 1000) }).verifyOtp(
        "ch",
        "111111",
      ),
    ).rejects.toThrow("code expired");
    await expect(
      mk({ ...good, attempts: 5 }).verifyOtp("ch", "111111"),
    ).rejects.toThrow("too many attempts");
    await expect(
      mk(null as unknown as object).verifyOtp("ch", "111111"),
    ).rejects.toThrow("challenge not found");
  });
});

describe("AuthService self-registration", () => {
  const regStubs = () => ({
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation((args: { data: { phone: string } }) =>
          Promise.resolve({ id: "user-9", ...args.data, isActive: true }),
        ),
    },
    otpChallenge: {
      create: vi.fn().mockImplementation(() => Promise.resolve({ id: "ch-9" })),
    },
  });

  it("creates the user and issues an OTP challenge", async () => {
    const stubs = regStubs();
    const svc = serviceWith(stubs);
    const out = await svc.register("09170000999", "Maria Santos");
    expect(stubs.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: "09170000999",
          displayName: "Maria Santos",
        }),
      }),
    );
    expect(out.challengeId).toBe("ch-9");
  });

  it("rejects duplicates with 409 and bad phones with 400", async () => {
    const taken = serviceWith({
      ...regStubs(),
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "u-x", isActive: true }),
        create: vi.fn(),
      },
    });
    await expect(taken.register("09170000000")).rejects.toThrowError(
      ConflictException,
    );
    const fresh = serviceWith(regStubs());
    await expect(fresh.register("abc")).rejects.toThrowError(
      BadRequestException,
    );
    await expect(fresh.register("123")).rejects.toThrowError(
      BadRequestException,
    );
  });
});

describe("AuthService device tokens", () => {
  it("upserts the token onto the user", async () => {
    const upsert = vi.fn().mockImplementation(() =>
      Promise.resolve({
        id: "dt-1",
        userId: "u-1",
        token: "fcm-token-9",
        platform: "android",
      }),
    );
    const svc = serviceWith({
      user: {},
      otpChallenge: {},
      deviceToken: { upsert },
    });
    const out = (await svc.saveDeviceToken(
      "u-1",
      "fcm-token-9",
      "android",
    )) as {
      userId: string;
    };
    expect(out.userId).toBe("u-1");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: "fcm-token-9" },
      }),
    );
  });
});

describe("AuthService password step (2FA gate)", () => {
  it("accepts the right password and rejects the wrong one", async () => {
    const mk = (hash: string | null) =>
      serviceWith({
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ ...baseUser, passwordHash: hash }),
        },
        otpChallenge: { create: vi.fn().mockResolvedValue({ id: "ch-9" }) },
      });
    const real = hashSync("s3cret!", 4);
    await expect(
      mk(real).checkPassword("09170000000", "s3cret!"),
    ).resolves.toMatchObject({
      challengeId: "ch-9",
    });
    await expect(
      mk(real).checkPassword("09170000000", "wrong"),
    ).rejects.toThrow("invalid credentials");
    await expect(
      mk(null).checkPassword("09170000000", "s3cret!"),
    ).rejects.toThrow("invalid credentials");
  });
});

describe("AuthService sessions + logout", () => {
  const verifiedStubs = () => {
    const sessions: Record<string, { revokedAt: Date | null }> = {};
    const stubs = {
      user: {},
      otpChallenge: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ch-s",
          userId: "user-1",
          codeHash: hashOtp("222222"),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
          user: baseUser,
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      session: {
        create: vi.fn().mockImplementation((args: { data: { id: string } }) => {
          sessions[args.data.id] = { revokedAt: null };
          return Promise.resolve({ ...args.data, revokedAt: null });
        }),
        updateMany: vi
          .fn()
          .mockImplementation((args: { where: { id: string } }) => {
            const s = sessions[args.where.id];
            if (!s || s.revokedAt) return Promise.resolve({ count: 0 });
            s.revokedAt = new Date();
            return Promise.resolve({ count: 1 });
          }),
      },
    };
    return { stubs, sessions };
  };

  it("records a server-side session on verify with matching jti", async () => {
    const { stubs } = verifiedStubs();
    const svc = serviceWith(stubs);
    const { token } = await svc.verifyOtp("ch-s", "222222");
    const payload = new TokenService().verify(token);
    expect(payload.jti).toBeDefined();
    expect(stubs.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: payload.jti,
          userId: "user-1",
        }),
      }),
    );
  });

  it("logout revokes the session; unknown sessions report revoked:false", async () => {
    const { stubs } = verifiedStubs();
    const svc = serviceWith(stubs);
    const { token } = await svc.verifyOtp("ch-s", "222222");
    const { jti } = new TokenService().verify(token);
    await expect(svc.logout("user-1", jti)).resolves.toMatchObject({
      revoked: true,
    });
    await expect(svc.logout("user-1", jti)).resolves.toMatchObject({
      revoked: false,
    });
    await expect(
      svc.logout("user-1", "no-such-session"),
    ).resolves.toMatchObject({ revoked: false });
  });
});
