import { MAX_LIMIT, MAX_RADIUS } from "@webanwendung/shared";

export function validateLimit(limit: number): string | null {
  if (!Number.isFinite(limit) || limit < 1) return "Limit muss >= 1 sein.";
  if (limit > MAX_LIMIT) return `Limit darf max. ${MAX_LIMIT} sein.`;
  return null;
}

export function validateRadius(radius: number): string | null {
  if (!Number.isFinite(radius) || radius < 1) return "Radius muss >= 1 sein.";
  if (radius > MAX_RADIUS) return `Radius darf max. ${MAX_RADIUS} sein.`;
  return null;
}