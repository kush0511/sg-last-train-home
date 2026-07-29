import { describe, expect, it } from "vitest";
import { STATIONS, stationId } from "../src/data/network";
import { PATTERN_BY_ID } from "../src/data/services";
import { lookupTransfer } from "../src/data/transfers";
import { findRouteCandidates } from "../src/lib/graph";
import {
  calculateLastTrain,
  scheduleRouteCandidate
} from "../src/lib/routing";

const date = "2026-07-29";

describe("acceptance journey matrix", () => {
  it("1 · handles a direct journey to Lakeside without an interchange buffer", () => {
    const result = calculateLastTrain({
      originId: stationId("Boon Lay"),
      destinationId: stationId("Lakeside"),
      date
    }).recommended!;
    expect(result.rides).toHaveLength(1);
    expect(result.rides[0].patternId).toBe("EW_TO_PASIR_RIS");
    expect(result.transfers).toHaveLength(0);
  });

  it("2 · validates Farrer Park through Outram Park to Lakeside", () => {
    const result = calculateLastTrain({
      originId: stationId("Farrer Park"),
      destinationId: stationId("Lakeside"),
      date,
      bufferMinutes: 3
    }).recommended!;
    expect(result.boardBy).toBe(23 * 60 + 41);
    expect(result.transfers[0].stationId).toBe(stationId("Outram Park"));
  });

  it("3 · prefers the later direct interchange path with current operator cutoffs", () => {
    const originId = stationId("Jurong East");
    const destinationId = stationId("HarbourFront");
    const candidates = findRouteCandidates(originId, destinationId, date, 3, 20);
    const shortest = [...candidates].sort(
      (a, b) =>
        a.totalRideMinutes +
        a.totalTransferMinutes -
        (b.totalRideMinutes + b.totalTransferMinutes)
    )[0];
    const shortestScheduled = scheduleRouteCandidate(
      shortest,
      originId,
      destinationId,
      date
    )!;
    const recommended = calculateLastTrain({ originId, destinationId, date }).recommended!;
    expect(shortest.rides.map((ride) => ride.patternId)).toEqual([
      "EW_TO_PASIR_RIS",
      "NE_TO_HARBOURFRONT"
    ]);
    expect(recommended.rides.map((ride) => ride.patternId)).toEqual([
      "EW_TO_PASIR_RIS",
      "NE_TO_HARBOURFRONT"
    ]);
    expect(recommended.boardBy).toBe(shortestScheduled.boardBy);
  });

  it("4 · rejects the chronologically later short working before Tuas Link", () => {
    const result = calculateLastTrain({
      originId: stationId("Pasir Ris"),
      destinationId: stationId("Tuas Link"),
      date
    }).recommended!;
    expect(result.rides[0].patternId).toBe("EW_TO_TUAS_LINK");
    expect(result.rides.some((ride) => ride.patternId === "EW_SHORT_TO_JOO_KOON")).toBe(
      false
    );
  });

  it("5 · keeps a journey crossing midnight in service-day order", () => {
    const result = calculateLastTrain({
      originId: stationId("HarbourFront"),
      destinationId: stationId("Punggol Coast"),
      date
    }).recommended!;
    expect(result.boardBy).toBeLessThan(24 * 60);
    expect(result.arriveBy).toBeGreaterThan(24 * 60);
  });

  it("6 · chooses a service from a multi-line origin automatically", () => {
    const origin = STATIONS.find((station) => station.id === stationId("Outram Park"))!;
    expect(origin.codes).toEqual(["EW16", "NE3", "TE17"]);
    const result = calculateLastTrain({
      originId: origin.id,
      destinationId: stationId("Lakeside"),
      date
    }).recommended!;
    expect(result.rides[0].patternId).toBe("EW_TO_TUAS_LINK");
  });

  it("7 · applies a dated early closure", () => {
    const result = calculateLastTrain({
      originId: stationId("Bukit Panjang"),
      destinationId: stationId("Expo"),
      date: "2026-07-31"
    }).recommended!;
    expect(result.confidence).toBe("estimated");
    expect(result.warnings.join(" ")).toContain("11:30 PM");
  });

  it("8 · makes a missing transfer measurement visible and non-zero", () => {
    const ne = PATTERN_BY_ID.get("NE_TO_HARBOURFRONT")!;
    const dt = PATTERN_BY_ID.get("DT_TO_BUKIT_PANJANG")!;
    expect(lookupTransfer("missing-example", "NE7", "DT12", ne, dt)).toMatchObject({
      fallback: true,
      walkMinutes: 6,
      sourceId: "fallback-transfer-model"
    });
  });

  it("9 · rejects an origin equal to its destination", () => {
    const result = calculateLastTrain({
      originId: stationId("Lakeside"),
      destinationId: stationId("Lakeside"),
      date
    });
    expect(result.recommended).toBeNull();
    expect(result.error).toContain("different");
  });

  it("10 · fails visibly when no service pattern is available", () => {
    const result = calculateLastTrain({
      originId: stationId("Lakeside"),
      destinationId: stationId("Boon Lay"),
      date,
      availablePatternIds: new Set()
    });
    expect(result.recommended).toBeNull();
    expect(result.error).toContain("No through journey");
  });
});
