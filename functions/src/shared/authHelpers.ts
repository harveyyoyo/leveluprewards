import * as crypto from "crypto";

export function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Timing-safe string comparison for passcodes and secrets. */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
