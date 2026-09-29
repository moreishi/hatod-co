import { insertQuery } from "./repo";
import { queryDb } from "./db";
import { gcashFee } from "./paymongo";

export interface Payment {
  id: string;
  tripId: string;
  amount: number;
  fee: number;
  status: string;
  checkoutId: string | null;
  reference: string | null;
}

/** Record a checkout attempt (pending until the webhook confirms). */
export async function createPayment(input: {
  tripId: string;
  fare: number;
  checkoutId: string;
  reference: string;
}): Promise<Payment> {
  const amount = Math.round(input.fare * 100);
  const q = insertQuery(
    "payments",
    ["id", "trip_id", "amount", "fee", "status", "checkout_id", "reference"],
    {
      id: `pay-${Date.now()}`,
      trip_id: input.tripId,
      amount,
      fee: gcashFee(amount),
      status: "pending",
      checkout_id: input.checkoutId,
      reference: input.reference,
    },
  );
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  const r = rows[0];
  return {
    id: String(r.id),
    tripId: String(r.trip_id),
    amount: Number(r.amount),
    fee: Number(r.fee),
    status: String(r.status),
    checkoutId: r.checkout_id == null ? null : String(r.checkout_id),
    reference: r.reference == null ? null : String(r.reference),
  };
}

/** Webhook landing: mark payment + trip paid by checkout reference. */
export async function markPaidByReference(reference: string): Promise<boolean> {
  const found = await queryDb<Record<string, unknown>>(
    "SELECT id, trip_id FROM payments WHERE reference = $1 AND status = 'pending'",
    [reference],
  );
  if (found.length === 0) return false;
  const payment = found[0];
  await queryDb(
    "UPDATE payments SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = $1",
    [payment.id],
  );
  await queryDb("UPDATE trips SET paid = TRUE WHERE id = $1", [payment.trip_id]);
  return true;
}

export async function latestPaymentForTrip(
  tripId: string,
): Promise<Payment | null> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM payments WHERE trip_id = $1 ORDER BY created_at DESC LIMIT 1",
    [tripId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    tripId: String(r.trip_id),
    amount: Number(r.amount),
    fee: Number(r.fee),
    status: String(r.status),
    checkoutId: r.checkout_id == null ? null : String(r.checkout_id),
    reference: r.reference == null ? null : String(r.reference),
  };
}
