import { describe, expect, it } from "vitest";
import { rankStations, resolveStationInput, searchStations } from "./station-search";

describe("station autocomplete", () => {
  it("ranks an exact station code first", () => {
    expect(searchStations("EW26")[0]).toMatchObject({ name: "Lakeside" });
  });

  it("tolerates a minor spelling mistake", () => {
    expect(searchStations("Laksid")[0]).toMatchObject({ name: "Lakeside" });
    expect(resolveStationInput("Laksid")).toMatchObject({ id: "lakeside" });
  });

  it("catches transposed letters and labels the result as a spelling match", () => {
    const match = rankStations("Laksdie")[0];
    expect(match.station.name).toBe("Lakeside");
    expect(match.kind).toBe("spelling");
  });

  it("matches a typo in one word of a multi-word station", () => {
    expect(searchStations("Outrm")[0]).toMatchObject({ name: "Outram Park" });
    expect(searchStations("Botanic Gardnes")[0]).toMatchObject({
      name: "Botanic Gardens"
    });
  });

  it("finds a station by a distinctive name token", () => {
    expect(searchStations("Ghaut")[0]).toMatchObject({ name: "Dhoby Ghaut" });
  });

  it("accepts spaced codes and searches within a named line", () => {
    expect(searchStations("EW 26")[0]).toMatchObject({ name: "Lakeside" });
    expect(searchStations("NEL outram")[0]).toMatchObject({ name: "Outram Park" });
  });

  it("supports useful abbreviations and alternate spellings", () => {
    expect(searchStations("MBS")[0]).toMatchObject({ name: "Bayfront" });
    expect(searchStations("Harbor Front")[0]).toMatchObject({ name: "HarbourFront" });
    expect(searchStations("DG")[0]).toMatchObject({ name: "Dhoby Ghaut" });
  });

  it("keeps multi-line stations as one result with all codes", () => {
    expect(searchStations("Outram")[0].codes).toEqual(["EW16", "NE3", "TE17"]);
  });

  it("does not return an arbitrary station for an empty query", () => {
    expect(searchStations("")).toEqual([]);
  });

  it("does not guess from an ambiguous tiny query", () => {
    expect(resolveStationInput("a")).toBeUndefined();
  });
});
