import { describe, expect, it } from "vitest";
import { loadSnapshotWithFallback, type SnapshotEnvelope } from "./snapshot";

const fallback: SnapshotEnvelope<{ value: number }> = {
  schemaVersion: 1,
  generatedAt: "2026-07-20T00:00:00Z",
  payload: { value: 7 }
};
const valid = (payload: unknown): payload is { value: number } =>
  typeof payload === "object" &&
  payload !== null &&
  "value" in payload &&
  typeof payload.value === "number";

describe("versioned snapshot loader", () => {
  it("retains last known-good data on parser failure", () => {
    const loaded = loadSnapshotWithFallback("{broken", fallback, valid, {
      now: new Date("2026-07-29T00:00:00Z")
    });
    expect(loaded.value).toEqual({ value: 7 });
    expect(loaded.usedFallback).toBe(true);
    expect(loaded.warning).toContain("retained last known-good");
  });

  it("flags stale data without silently discarding it", () => {
    const raw = JSON.stringify(fallback);
    const loaded = loadSnapshotWithFallback(raw, fallback, valid, {
      now: new Date("2026-09-20T00:00:00Z"),
      staleAfterDays: 45
    });
    expect(loaded.usedFallback).toBe(false);
    expect(loaded.stale).toBe(true);
    expect(loaded.warning).toContain("older");
  });
});
