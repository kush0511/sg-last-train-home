import sbsTimetables from "./published-timetables.sbs.json" with { type: "json" };
import smrtTimetables from "./published-timetables.smrt.json" with { type: "json" };
import type { SourceRecord, TimetableCategory } from "../lib/types";

export type PublishedLastDepartures = Partial<
  Record<string, Partial<Record<TimetableCategory, Record<string, number>>>>
>;

const sbs = sbsTimetables as PublishedLastDepartures;
const smrt = smrtTimetables as PublishedLastDepartures;

export const PUBLISHED_LAST_DEPARTURES: PublishedLastDepartures = {
  ...smrt,
  ...sbs
};

export const PUBLISHED_TIMETABLE_SOURCE_BY_PATTERN: Record<string, SourceRecord["id"]> = {
  ...Object.fromEntries(Object.keys(smrt).map((patternId) => [patternId, "smrt-station-pages"])),
  ...Object.fromEntries(Object.keys(sbs).map((patternId) => [patternId, "sbs-first-last"]))
};
