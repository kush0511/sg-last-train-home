import { describe, expect, it } from "vitest";
import { STATIONS, STOP_BY_CODE, stationId } from "../data/network";
import { SERVICE_PATTERNS } from "../data/services";
import { findRouteCandidates } from "./graph";

describe("operating network snapshot", () => {
  it("contains every modelled operating station and the 2026 openings", () => {
    expect(STATIONS).toHaveLength(184);
    for (const code of ["CC30", "CC31", "CC32", "DT4", "NE18", "PW2"]) {
      expect(STOP_BY_CODE.has(code), code).toBe(true);
    }
  });

  it("excludes future DTL3e and TEL5 stations", () => {
    for (const code of ["DT36", "DT37", "TE30", "TE31"]) {
      expect(STOP_BY_CODE.has(code), code).toBe(false);
    }
  });

  it("does not let a short-turn service run beyond its terminus", () => {
    const routes = findRouteCandidates(
      stationId("Pasir Ris"),
      stationId("Tuas Link"),
      "2026-07-29",
      3
    );
    expect(
      routes.some((route) =>
        route.rides.some((ride) => ride.patternId === "EW_SHORT_TO_JOO_KOON")
      )
    ).toBe(false);
  });

  it("models the airport branch as a train change at Tanah Merah", () => {
    const routes = findRouteCandidates(
      stationId("Changi Airport"),
      stationId("Bedok"),
      "2026-07-29",
      3
    );
    expect(
      routes.some(
        (route) =>
          route.rides[0]?.patternId === "CG_TO_TANAH_MERAH" &&
          route.rides[1]?.patternId === "EW_TO_TUAS_LINK" &&
          route.transfers[0]?.stationId === stationId("Tanah Merah")
      )
    ).toBe(true);
  });

  it("keeps the CCL main loop and Dhoby Ghaut spur as separate services", () => {
    const route = findRouteCandidates(
      stationId("Dhoby Ghaut"),
      stationId("Keppel"),
      "2026-07-29",
      3
    ).find(
      (candidate) =>
        candidate.rides.some((ride) => ride.patternId === "CC_SPUR_TO_STADIUM") &&
        candidate.rides.some((ride) => ride.patternId.startsWith("CC_LOOP_"))
    );
    expect(route?.rides.some((ride) => ride.patternId === "CC_SPUR_TO_STADIUM")).toBe(true);
    expect(route?.rides.some((ride) => ride.patternId.startsWith("CC_LOOP_"))).toBe(true);
  });

  it("contains explicit circular LRT patterns", () => {
    expect(
      SERVICE_PATTERNS.filter((pattern) => pattern.lineId === "BP" && pattern.circular)
    ).toHaveLength(2);
  });
});
