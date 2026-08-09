export function parseLimit(value: unknown, fallback = 50, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.floor(n));
}

export function cursorFilter(cursor: unknown): { createdAt?: { $lt: Date } } {
  if (!cursor || typeof cursor !== "string") return {};
  const date = new Date(cursor);
  if (Number.isNaN(date.getTime())) return {};
  return { createdAt: { $lt: date } };
}
