export interface SqlQuery {
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any[];
}

function assertAllowed(table: string, allowed: string[], row: Record<string, unknown>) {
  const keys = Object.keys(row);
  if (keys.length === 0) throw new Error(`${table}: nothing to write`);
  for (const k of keys) {
    if (!allowed.includes(k)) throw new Error(`${table}: unknown column ${k}`);
  }
  return keys;
}

/** Parameterized INSERT — columns are allowlisted, never interpolated from input. */
export function insertQuery(
  table: string,
  allowed: string[],
  row: Record<string, unknown>,
): SqlQuery {
  const keys = assertAllowed(table, allowed, row);
  const cols = keys.join(", ");
  const params = keys.map((_, i) => `$${i + 1}`).join(", ");
  return {
    text: `INSERT INTO ${table} (${cols}) VALUES (${params}) RETURNING *`,
    values: keys.map((k) => row[k]),
  };
}

/** Parameterized UPDATE by id — id is always the last parameter. */
export function updateQuery(
  table: string,
  allowed: string[],
  id: string,
  patch: Record<string, unknown>,
): SqlQuery {
  const keys = assertAllowed(table, allowed, patch);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  return {
    text: `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...keys.map((k) => patch[k]), id],
  };
}

export function deleteQuery(table: string, id: string): SqlQuery {
  return { text: `DELETE FROM ${table} WHERE id = $1`, values: [id] };
}

/** Convert $n placeholders to ? for SQLite. Builders stay Postgres-canonical. */
export function toSqlite(text: string): string {
  return text.replace(/\$\d+/g, "?");
}

/** True for Postgres 23505 / SQLite UNIQUE failures — map to friendly dup errors. */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (code === "23505" || code === "SQLITE_CONSTRAINT_UNIQUE") return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && /unique constraint failed/i.test(message);
}
