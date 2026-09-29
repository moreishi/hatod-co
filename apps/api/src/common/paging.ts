export const DEFAULT_TAKE = 25;
export const MAX_TAKE = 100;

export interface Page {
  take: number;
  skip: number;
}

/** Bounded take/skip from query params (?take=&skip=). */
export function parsePage(query: { take?: string; skip?: string }): Page {
  const take = Math.min(
    MAX_TAKE,
    Math.max(1, Number(query.take) || DEFAULT_TAKE),
  );
  const skip = Math.max(0, Number(query.skip) || 0);
  return { take, skip };
}
