import { insertQuery } from "./repo";
import { queryDb } from "./db";
import { normalizePhPhone } from "./phone";
import { paginate } from "./users";
import { COMMISSION_RATE } from "./earnings";

/** All money moves in integer centavos — never floats. */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/** Filterable transaction types (ledger dropdown). */
export const TX_TYPES = ["topup", "ride_debit", "ride_credit", "payout", "adjustment"] as const;
export type TxType = (typeof TX_TYPES)[number];

/** Optional memo, trimmed, capped — empty becomes NULL. */
export function validateMemo(input: unknown): string | null {
  const memo = String(input ?? "").trim();
  if (!memo) return null;
  if (memo.length > 140) throw new Error("memo exceeds 140 characters");
  return memo;
}

export interface RideSplit {
  rider: number;
  driver: number;
  commission: number;
}

/** Completed-trip split: rider pays full fare, driver nets of 15% commission. */
export function settleRide(fareCents: number): RideSplit {
  const commission = Math.round(fareCents * COMMISSION_RATE);
  return { rider: -fareCents, driver: fareCents - commission, commission };
}

/** Balance guard: credits always land, debits must clear. */
export function applyDelta(balanceCents: number, deltaCents: number): number {
  const next = balanceCents + deltaCents;
  if (next < 0) throw new Error("insufficient wallet balance");
  return next;
}

const TOPUP_LIMIT_PESOS = 10_000_000;

/** Cash-in validation (ops/agency counter): positive pesos → centavos. */
export function validateTopup(pesos: number): number {
  if (!Number.isFinite(pesos) || pesos <= 0) throw new Error("top-up must be positive");
  if (pesos > TOPUP_LIMIT_PESOS) throw new Error("top-up exceeds limit");
  return toCentavos(pesos);
}

export type AdjustDirection = "credit" | "debit";

/** Superadmin adjustment: signed centavos with the same guards as top-up. */
export function validateAdjustment(input: {
  direction: AdjustDirection;
  pesos: number;
}): number {
  const { pesos } = input;
  if (!Number.isFinite(pesos) || pesos <= 0) throw new Error("amount must be positive");
  if (pesos > TOPUP_LIMIT_PESOS) throw new Error("amount exceeds limit");
  const cents = toCentavos(pesos);
  return input.direction === "credit" ? cents : -cents;
}

export async function getBalance(userId: string): Promise<number> {
  const rows = await queryDb<{ balance_cents: number }>(
    "SELECT balance_cents FROM wallets WHERE user_id = $1",
    [userId],
  );
  return rows.length > 0 ? Number(rows[0].balance_cents) : 0;
}

async function recordTx(input: {
  userId: string;
  type: string;
  amountCents: number;
  ref: string | null;
  memo?: string | null;
  actorId: string | null;
}): Promise<void> {
  const balance = await getBalance(input.userId);
  const next = applyDelta(balance, input.amountCents);
  const q = insertQuery(
    "wallet_transactions",
    ["id", "user_id", "type", "amount_cents", "ref", "memo", "balance_after", "created_by"],
    {
      id: `wtx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: input.userId,
      type: input.type,
      amount_cents: input.amountCents,
      ref: input.ref,
      memo: input.memo ?? null,
      balance_after: next,
      created_by: input.actorId,
    },
  );
  await queryDb(q.text, q.values);
  await queryDb("UPDATE wallets SET balance_cents = $1 WHERE user_id = $2", [next, input.userId]);
}

async function ensureWallet(userId: string): Promise<void> {
  await queryDb("INSERT INTO wallets (user_id, balance_cents) VALUES ($1, 0)", [userId]).catch(
    () => undefined,
  );
}

/** Cash-in at counter: credit any account. Staff/agency-checked upstream. */
export async function topUp(
  userId: string,
  pesos: number,
  actorId: string,
): Promise<number> {
  const cents = validateTopup(pesos);
  await ensureWallet(userId);
  await recordTx({ userId, type: "topup", amountCents: cents, ref: null, actorId });
  return getBalance(userId);
}

/**
 * Superadmin adjustment (credit or debit) recorded as an `adjustment`
 * transaction. Debits respect the overdraft guard — a broke account fails
 * loudly instead of going negative silently.
 */
export async function adjustWallet(
  userId: string,
  direction: AdjustDirection,
  pesos: number,
  actorId: string,
  memo?: unknown,
): Promise<number> {
  const cents = validateAdjustment({ direction, pesos });
  await ensureWallet(userId);
  await recordTx({
    userId,
    type: "adjustment",
    amountCents: cents,
    ref: null,
    memo: validateMemo(memo ?? ""),
    actorId,
  });
  return getBalance(userId);
}

/** Settle a COMPLETED trip. Idempotent per trip (safe to retry/double-click). */
export async function settleTrip(tripId: string): Promise<RideSplit> {
  const trips = await queryDb<Record<string, unknown>>("SELECT * FROM trips WHERE id = $1", [
    tripId,
  ]);
  const trip = trips[0];
  if (!trip) throw new Error("trip not found");
  if (trip.status !== "COMPLETED") throw new Error("trip is not completed");
  const done = await queryDb("SELECT id FROM wallet_transactions WHERE ref = $1 LIMIT 1", [
    tripId,
  ]);
  const fareCents = toCentavos(Number(trip.fare_quote));
  const split = settleRide(fareCents);
  if (done.length > 0) return split;
  const riderId = trip.rider_id == null ? null : String(trip.rider_id);
  const driverId = trip.driver_id == null ? null : String(trip.driver_id);
  if (!riderId) throw new Error("trip has no rider account");
  if (!driverId) throw new Error("trip has no driver");
  await ensureWallet(riderId);
  await ensureWallet(driverId);
  await recordTx({ userId: riderId, type: "ride_debit", amountCents: split.rider, ref: tripId, actorId: null });
  await recordTx({ userId: driverId, type: "ride_credit", amountCents: split.driver, ref: tripId, actorId: null });
  return split;
}

export interface WalletTx {
  id: string;
  type: string;
  amountCents: number;
  ref: string | null;
  memo: string | null;
  balanceAfter: number;
  createdAt: string;
}

function rowToTx(r: Record<string, unknown>): WalletTx {
  return {
    id: String(r.id),
    type: String(r.type),
    amountCents: Number(r.amount_cents),
    ref: r.ref == null ? null : String(r.ref),
    memo: (r as Record<string, unknown>).memo == null ? null : String(r.memo),
    balanceAfter: Number(r.balance_after),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function listTransactions(userId: string, limit = 20): Promise<WalletTx[]> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit],
  );
  return rows.map(rowToTx);
}

export interface WalletRow {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  balanceCents: number;
}

export interface WalletPage {
  rows: WalletRow[];
  total: number;
  page: number;
  pages: number;
}

const PER_PAGE = 10;

/** Admin ledger: DB-level search (name/email/phone, any format) + pagination. */
export async function listWalletsPaged(q = "", page = 1): Promise<WalletPage> {
  const needle = q.trim();
  let digits = "";
  try {
    digits = normalizePhPhone(needle);
  } catch {
    digits = needle.replace(/\D/g, "");
  }
  const like = `%${needle}%`;
  const d1 = `%${digits}%`;
  const d2 = `%${digits.replace(/^63/, "0")}%`;
  // NOTE: one value per slot on both dialects ($n reused would need repeats in SQLite).
  const where = `WHERE ($1 = '' OR u.name LIKE $2 OR u.email LIKE $3 OR u.phone LIKE $4 OR u.phone LIKE $5 OR u.phone LIKE $6)`;
  const params = [needle, like, like, like, d1, d2];
  const totalRows = await queryDb<{ n: number }>(
    `SELECT COUNT(*) AS n FROM users u ${where}`,
    params as unknown[],
  );
  const total = Number(totalRows[0]?.n ?? 0);
  const { page: safe, pages, offset, limit } = paginate(total, page, PER_PAGE);
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT u.id, u.name, u.email, u.phone, COALESCE(w.balance_cents, 0) AS balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id ${where}
     ORDER BY u.created_at ASC LIMIT ${limit} OFFSET ${offset}`,
    params as unknown[],
  );
  return {
    rows: rows.map((r) => ({
      userId: String(r.id),
      name: String(r.name),
      email: String(r.email),
      phone: r.phone == null ? null : String(r.phone),
      balanceCents: Number(r.balance),
    })),
    total,
    page: safe,
    pages,
  };
}

/** Full ledger without paging (reports only). Prefer listWalletsPaged for UI. */
export async function listWallets(): Promise<WalletRow[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT u.id, u.name, u.email, u.phone, COALESCE(w.balance_cents, 0) AS balance
     FROM users u LEFT JOIN wallets w ON w.user_id = u.id ORDER BY u.created_at ASC`,
    [],
  );
  return rows.map((r) => ({
    userId: String(r.id),
    name: String(r.name),
    email: String(r.email),
    phone: r.phone == null ? null : String(r.phone),
    balanceCents: Number(r.balance),
  }));
}

/** Latest system-wide transactions, optional type filter (ledger dropdown). */
export async function listRecentTransactions(
  limit = 30,
  type?: string,
): Promise<(WalletTx & { email: string })[]> {
  const clean = (TX_TYPES as readonly string[]).includes(type ?? "") ? (type as string) : "";
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT t.*, u.email FROM wallet_transactions t
     JOIN users u ON u.id = t.user_id
     WHERE ($1 = '' OR t.type = $2) ORDER BY t.created_at DESC LIMIT $3`,
    [clean, clean, limit],
  );
  return rows.map((r) => ({
    ...rowToTx(r),
    email: String(r.email),
  }));
}
