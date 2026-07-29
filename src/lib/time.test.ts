import { describe, expect, it } from "vitest";
import {
  formatServiceTime,
  hasDeparturePassed,
  parseClockTime,
  serviceMinutes
} from "./time";

describe("service-day time", () => {
  it("keeps post-midnight times on the preceding service day", () => {
    expect(parseClockTime("12:02am")).toBe(24 * 60 + 2);
    expect(serviceMinutes(1, 15)).toBe(25 * 60 + 15);
  });

  it("does not roll ordinary evening times", () => {
    expect(parseClockTime("11:48pm")).toBe(23 * 60 + 48);
  });

  it("formats service-day minutes as a 12-hour clock", () => {
    expect(formatServiceTime(24 * 60 + 2)).toBe("12:02 AM");
    expect(formatServiceTime(23 * 60 + 41)).toBe("11:41 PM");
  });

  it("rejects malformed clock data", () => {
    expect(() => parseClockTime("25:99")).toThrow("Invalid clock time");
  });

  it("detects a same-night cutoff that has passed", () => {
    expect(
      hasDeparturePassed(
        "2026-07-29",
        23 * 60 + 41,
        new Date("2026-07-29T15:50:00Z")
      )
    ).toBe(true);
    expect(
      hasDeparturePassed(
        "2026-07-29",
        23 * 60 + 41,
        new Date("2026-07-29T02:00:00Z")
      )
    ).toBe(false);
  });

  it("compares post-midnight continuations against the preceding service day", () => {
    const afterMidnight = new Date("2026-07-29T16:15:00Z");
    expect(hasDeparturePassed("2026-07-29", 24 * 60 + 10, afterMidnight)).toBe(true);
    expect(hasDeparturePassed("2026-07-29", 24 * 60 + 30, afterMidnight)).toBe(false);
  });
});
