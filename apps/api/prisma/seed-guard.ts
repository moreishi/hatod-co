/**
 * Seed guard (spec rule 22: sample data never reaches prod by accident).
 * LocalStage (`file:`) and `@localhost` databases seed freely; anything else
 * needs the explicit `ALLOW_SEED=true` opt-in — e.g. a staging database in
 * the cloud. Kept pure so the guard is testable without running the seed.
 */
export function seedAllowed(
  dbUrl: string,
  opts: { allowSeed?: boolean } = {},
): boolean {
  if (dbUrl.startsWith("file:")) return true;
  if (dbUrl.includes("@localhost")) return true;
  return opts.allowSeed === true;
}
