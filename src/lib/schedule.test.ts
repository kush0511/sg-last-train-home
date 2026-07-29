import { describe, expect, it } from "vitest";
import { PATTERN_BY_ID } from "../data/services";
import { lastDepartureFor } from "./schedule";

describe("category-specific last departures", () => {
  it("uses the published public-holiday-eve departure when available", () => {
    const pattern = PATTERN_BY_ID.get("EW_TO_PASIR_RIS")!;
    expect(lastDepartureFor(pattern, "EW33", "2026-12-30")).toMatchObject({
      value: 23 * 60 + 19,
      confidence: "exact"
    });
    expect(lastDepartureFor(pattern, "EW33", "2026-12-31")).toMatchObject({
      value: 23 * 60 + 37,
      confidence: "exact"
    });
  });

  it("falls back to the ordinary service class when an eve table has no departure", () => {
    const pattern = PATTERN_BY_ID.get("CC_LOOP_CLOCKWISE")!;
    const ordinary = lastDepartureFor(pattern, "CC4", "2026-12-30");
    const holidayEve = lastDepartureFor(pattern, "CC4", "2026-12-31");
    expect(holidayEve).toMatchObject({ value: ordinary.value, confidence: "exact" });
  });

  it("uses SBS category data and preserves SBS provenance", () => {
    const pattern = PATTERN_BY_ID.get("DT_TO_EXPO")!;
    const result = lastDepartureFor(pattern, "DT1", "2026-07-29");
    expect(result.value).toBe(23 * 60 + 35);
    expect(result.confidence).toBe("exact");
    expect(result.sourceId).toBe("sbs-first-last");
  });

  it("keeps non-town-centre SBS LRT cutoffs explicitly estimated", () => {
    const pattern = PATTERN_BY_ID.get("SK_EAST_INNER")!;
    const result = lastDepartureFor(pattern, "SE2", "2026-07-29");
    expect(result.confidence).toBe("estimated");
    expect(result.sourceId).toBe("sbs-lrt-town-centre");
  });
});
