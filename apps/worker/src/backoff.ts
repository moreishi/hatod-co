/**
 * Capped exponential backoff for job retries (RabbitMQ consumers use this
 * to space redelivery of failed notification/dispatch jobs).
 */
export function backoffMs(
  attempt: number,
  baseMs = 1000,
  maxMs = 60_000,
): number {
  if (attempt < 0) throw new Error("attempt must be >= 0");
  return Math.min(maxMs, baseMs * 2 ** attempt);
}
