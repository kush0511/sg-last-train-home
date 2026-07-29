import { adjustmentsForDate } from "../data/special-services";
import {
  PUBLISHED_LAST_DEPARTURES,
  PUBLISHED_TIMETABLE_SOURCE_BY_PATTERN
} from "../data/published-timetables";
import { getServiceDay, timetableCategoryForDate } from "./calendar";
import type { Confidence, ServicePattern } from "./types";

export interface LastDeparture {
  value: number;
  confidence: Confidence;
  sourceId: string;
  note: string;
}

export function cumulativeMinutes(pattern: ServicePattern, code: string): number {
  const index = pattern.stops.indexOf(code);
  if (index < 0) throw new Error(`${code} is not served by ${pattern.id}`);
  return pattern.segmentMinutes.slice(0, index).reduce((sum, value) => sum + value, 0);
}

export function remainingMinutes(pattern: ServicePattern, code: string): number {
  const index = pattern.stops.indexOf(code);
  if (index < 0) throw new Error(`${code} is not served by ${pattern.id}`);
  if (pattern.circular) return 0;
  return pattern.segmentMinutes.slice(index).reduce((sum, value) => sum + value, 0);
}

export function lastDepartureFor(
  pattern: ServicePattern,
  code: string,
  date: string
): LastDeparture {
  let value: number;
  let confidence: Confidence;
  let note: string;
  const category = timetableCategoryForDate(date);
  const ordinaryCategory = getServiceDay(date).dayType;
  const publishedForCategory =
    PUBLISHED_LAST_DEPARTURES[pattern.id]?.[category]?.[code] ??
    PUBLISHED_LAST_DEPARTURES[pattern.id]?.[ordinaryCategory]?.[code];

  if (publishedForCategory != null) {
    value = publishedForCategory;
    confidence = "exact";
    note = `Operator-published ${
      PUBLISHED_LAST_DEPARTURES[pattern.id]?.[category]?.[code] != null
        ? category.replaceAll("-", " ")
        : ordinaryCategory.replaceAll("-", " ")
    } station cutoff`;
  } else if (pattern.exactLastByStop?.[code] != null) {
    value = pattern.exactLastByStop[code];
    confidence = "exact";
    note = "Operator-published station cutoff";
  } else if (pattern.estimatedOriginLast != null) {
    value = pattern.estimatedOriginLast + cumulativeMinutes(pattern, code);
    confidence = "estimated";
    note = "Conservative service-horizon estimate";
  } else {
    throw new Error(`No last-departure data for ${pattern.id} at ${code}`);
  }

  for (const adjustment of adjustmentsForDate(date)) {
    const anchor = adjustment.anchorOverrides?.[pattern.id];
    if (anchor) {
      const anchorOffset = cumulativeMinutes(pattern, anchor.code);
      value = anchor.lastDeparture + cumulativeMinutes(pattern, code) - anchorOffset;
      confidence = code === anchor.code ? "exact" : "estimated";
      note =
        code === anchor.code
          ? "Published special-service departure anchor"
          : "Estimate propagated from a published special-service anchor";
    }
    if (adjustment.affectedLine === pattern.lineId && adjustment.closeBy != null) {
      value = Math.min(value, adjustment.closeBy - remainingMinutes(pattern, code));
      confidence = "estimated";
      note = "Conservative station estimate for an announced early line closure";
    }
  }

  return {
    value,
    confidence,
    sourceId:
      publishedForCategory != null
        ? (PUBLISHED_TIMETABLE_SOURCE_BY_PATTERN[pattern.id] ?? pattern.sourceId)
        : pattern.sourceId,
    note
  };
}
