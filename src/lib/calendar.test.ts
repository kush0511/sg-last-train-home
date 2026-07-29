import { describe, expect, it } from "vitest";
import { getServiceDay } from "./calendar";

describe("Singapore service calendar", () => {
  it("recognises public holidays and observed days", () => {
    expect(getServiceDay("2026-08-09")).toMatchObject({
      dayType: "sunday-public-holiday",
      publicHoliday: "National Day"
    });
    expect(getServiceDay("2026-08-10").publicHoliday).toBe("National Day observed");
  });

  it("recognises a public-holiday eve without assuming an extension", () => {
    expect(getServiceDay("2026-08-08")).toMatchObject({
      dayType: "saturday",
      isPublicHolidayEve: true
    });
  });

  it("separates weekday, Saturday and Sunday service types", () => {
    expect(getServiceDay("2026-07-29").dayType).toBe("weekday");
    expect(getServiceDay("2026-08-01").dayType).toBe("saturday");
    expect(getServiceDay("2026-08-02").dayType).toBe("sunday-public-holiday");
  });
});
