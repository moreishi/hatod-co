import { randomBytes, scrypt as _scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";

const scrypt = promisify(_scrypt);

export const CredentialsSchema = z.object({
  login: z.string().trim().min(1, "email or phone is required"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

export function parseCredentials(input: unknown): Credentials {
  return CredentialsSchema.parse(input);
}

function encode(salt: Buffer, hash: Buffer): string {
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function decode(stored: string): { salt: Buffer; hash: Buffer } {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) throw new Error("unknown hash format");
  return { salt: Buffer.from(saltHex, "hex"), hash: Buffer.from(hashHex, "hex") };
}

/** scrypt hash, sync core so dev seeding (node:sqlite) can use it too. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return encode(salt, hash);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return encode(salt, hash);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const { salt, hash } = decode(stored);
    const attempt = (await scrypt(password, salt, 64)) as Buffer;
    return attempt.length === hash.length && timingSafeEqual(attempt, hash);
  } catch {
    return false;
  }
}
