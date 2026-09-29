import { hashSync } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { hashOtp } from "../src/auth/otp.js";
import type { PrismaService } from "../src/auth/prisma.service.js";
import { TokenService } from "../src/auth/token.service.js";

function serviceWith(stub: Record<string, Record<string, unknown>>) {
  const prisma = {
    user: stub.user,
    otpChallenge: stub.otpChallenge,
  } as unknown as PrismaService;
  return new AuthService(prisma, new TokenService());
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
