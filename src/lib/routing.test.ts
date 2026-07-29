import { describe, expect, it } from "vitest";
import { PATTERN_BY_ID } from "../data/services";
import { lookupTransfer } from "../data/transfers";
import { stationId } from "../data/network";
import { calculateLastTrain } from "./routing";
import { lastDepartureFor } from "./schedule";

describe("backward last-train calculation", () => {
  it("validates the Farrer Park to Lakeside transfer case", () => {
    const result = calculateLastTrain({
      originId: stationId("Farrer Park"),
      destinationId: stationId("Lakeside"),
      date: "2026-07-29",
      bufferMinutes: 3
    }).recommended!;
    expect(result.boardBy).toBe(23 * 60 + 41);
    expect(result.confidence).toBe("estimated");
    expect(result.rides.map((ride) => ride.patternId)).toEqual([
      "NE_TO_HARBOURFRONT",
      "EW_TO_TUAS_LINK"
    ]);
    expect(result.transfers[0]).toMatchObject({
      stationId: stationId("Outram Park"),
      walkMinutes: 3,
      bufferMinutes: 3
    });
  });

  it("preserves an exact operator cutoff for a direct DTL trip", () => {
    const result = calculateLastTrain({
      originId: stationId("Bukit Panjang"),
      destinationId: stationId("Expo"),
      date: "2026-07-29"
    }).recommended!;
    expect(result.boardBy).toBe(23 * 60 + 35);
    expect(result.confidence).toBe("exact");
  });

  it("preserves an exact direct NEL trip including a post-midnight cutoff", () => {
    const result = calculateLastTrain({
      originId: stationId("HarbourFront"),
      destinationId: stationId("Punggol Coast"),
      date: "2026-07-29"
    }).recommended!;
    expect(result.boardBy).toBe(23 * 60 + 55);
    expect(result.confidence).toBe("exact");
    expect(result.arriveBy).toBeGreaterThan(24 * 60);
  });

  it("makes every editable connection buffer affect the result", () => {
    const calculate = (bufferMinutes: number) =>
      calculateLastTrain({
        originId: stationId("Farrer Park"),
        destinationId: stationId("Lakeside"),
        date: "2026-07-29",
        bufferMinutes
      }).recommended!.boardBy;
    expect(calculate(0)).toBe(23 * 60 + 48);
    expect(calculate(3)).toBe(23 * 60 + 41);
    expect(calculate(10)).toBe(23 * 60 + 34);
  });

  it("uses direction-specific transfer walks", () => {
    const ne = PATTERN_BY_ID.get("NE_TO_HARBOURFRONT")!;
    const dt = PATTERN_BY_ID.get("DT_TO_BUKIT_PANJANG")!;
    expect(lookupTransfer(stationId("Little India"), "NE7", "DT12", ne, dt).walkMinutes).toBe(5);
    expect(lookupTransfer(stationId("Little India"), "DT12", "NE7", dt, ne).walkMinutes).toBe(4);
  });

  it("uses a non-zero conservative fallback for a missing transfer measurement", () => {
    const ne = PATTERN_BY_ID.get("NE_TO_HARBOURFRONT")!;
    const dt = PATTERN_BY_ID.get("DT_TO_BUKIT_PANJANG")!;
    expect(lookupTransfer("invented-interchange", "NE7", "DT12", ne, dt)).toMatchObject({
      walkMinutes: 6,
      fallback: true
    });
  });

  it("supports multi-transfer routes while applying the buffer once per change", () => {
    const result = calculateLastTrain({
      originId: stationId("Changi Airport"),
      destinationId: stationId("Woodlands North"),
      date: "2026-07-29",
      bufferMinutes: 5
    }).recommended!;
    expect(result.transfers.length).toBeGreaterThanOrEqual(2);
    expect(result.transfers.every((transfer) => transfer.bufferMinutes === 5)).toBe(true);
  });

  it("rejects schedule-arbitrage detours before ranking by latest departure", () => {
    const result = calculateLastTrain({
      originId: stationId("Changi Airport"),
      destinationId: stationId("Bedok"),
      date: "2026-07-29",
      bufferMinutes: 3
    }).recommended!;
    expect(result.rides.map((ride) => ride.patternId)).toEqual([
      "CG_TO_TANAH_MERAH",
      "EW_TO_TUAS_LINK"
    ]);
  });

  it("routes around the temporarily closed Sengkang West inner loop", () => {
    const result = calculateLastTrain({
      originId: stationId("Cheng Lim"),
      destinationId: stationId("Sengkang"),
      date: "2026-07-29"
    }).recommended!;
    expect(result.rides[0].patternId).toBe("SK_WEST_OUTER");
    expect(result.warnings.join(" ")).toContain("suspended");
  });

  it("applies the published DTL early-close announcement conservatively", () => {
    const pattern = PATTERN_BY_ID.get("DT_TO_EXPO")!;
    const normal = lastDepartureFor(pattern, "DT1", "2026-07-29");
    const early = lastDepartureFor(pattern, "DT1", "2026-07-31");
    expect(early.value).toBeLessThan(normal.value);
    expect(early.confidence).toBe("estimated");
    expect(early.note).toContain("early line closure");
  });

  it("applies a one-off published extension only from a dated override", () => {
    const pattern = PATTERN_BY_ID.get("EW_TO_TUAS_LINK")!;
    expect(lastDepartureFor(pattern, "EW13", "2026-08-08")).toMatchObject({
      value: 24 * 60 + 30,
      confidence: "exact"
    });
    expect(lastDepartureFor(pattern, "EW13", "2026-08-09").value).not.toBe(24 * 60 + 30);
  });

  it("rejects same-station and invalid-buffer requests", () => {
    expect(
      calculateLastTrain({
        originId: stationId("Lakeside"),
        destinationId: stationId("Lakeside"),
        date: "2026-07-29"
      }).error
    ).toContain("different");
    expect(
      calculateLastTrain({
        originId: stationId("Lakeside"),
        destinationId: stationId("Boon Lay"),
        date: "2026-07-29",
        bufferMinutes: 17
      }).error
    ).toContain("0 to 15");
  });
});
