import { STATION_BY_ID } from "../data/network";
import { PATTERN_BY_ID } from "../data/services";
import { adjustmentsForDate, DTL_LATE_OPEN_DATES } from "../data/special-services";
import { SOURCE_BY_ID } from "../data/sources";
import { getServiceDay } from "./calendar";
import { findRouteCandidates } from "./graph";
import { lastDepartureFor } from "./schedule";
import type {
  CalculationResult,
  Confidence,
  JourneyResult,
  RouteCandidate,
  ScheduleEvidence,
  ScheduledRide
} from "./types";

export function scheduleRouteCandidate(
  route: RouteCandidate,
  originId: string,
  destinationId: string,
  date: string
): JourneyResult | null {
  const scheduled = new Array<ScheduledRide>(route.rides.length);
  const evidence: ScheduleEvidence[] = [];
  const warnings = new Set<string>();
  let nextDeparture = Number.POSITIVE_INFINITY;

  for (let index = route.rides.length - 1; index >= 0; index -= 1) {
    const ride = route.rides[index];
    const pattern = PATTERN_BY_ID.get(ride.patternId);
    if (!pattern) throw new Error(`Unknown pattern: ${ride.patternId}`);
    const last = lastDepartureFor(pattern, ride.fromCode, date);
    let departure = last.value;
    let steppedBackByMinutes = 0;

    if (Number.isFinite(nextDeparture)) {
      const transfer = route.transfers[index];
      if (!transfer) return null;
      const latestArrival =
        nextDeparture - transfer.walkMinutes - transfer.bufferMinutes;
      const departureCap = latestArrival - ride.rideMinutes;
      if (departure > departureCap) {
        const intervals = Math.ceil(
          (departure - departureCap) / pattern.lateHeadwayMinutes
        );
        steppedBackByMinutes = intervals * pattern.lateHeadwayMinutes;
        departure -= steppedBackByMinutes;
        warnings.add(
          `${pattern.label}: stepped back ${steppedBackByMinutes} min using a conservative ${pattern.lateHeadwayMinutes}-min late headway.`
        );
      }
    }

    const arrival = departure + ride.rideMinutes;
    if (departure < 5 * 60 || arrival > 29 * 60) return null;

    const rideConfidence: Confidence =
      last.confidence === "exact" && steppedBackByMinutes === 0 ? "exact" : "estimated";
    scheduled[index] = {
      ...ride,
      departure,
      arrival,
      publishedLastDeparture: last.value,
      steppedBackByMinutes,
      confidence: rideConfidence,
      scheduleNote: last.note
    };
    evidence.push({
      sourceId: last.sourceId,
      statement: `${pattern.label} towards ${pattern.destination}: ${last.note.toLowerCase()}.`,
      confidence: rideConfidence
    });
    nextDeparture = departure;
  }

  for (const transfer of route.transfers) {
    const station = STATION_BY_ID.get(transfer.stationId)!;
    if (SOURCE_BY_ID.has(transfer.sourceId)) {
      evidence.push({
        sourceId: transfer.sourceId,
        statement: `${station.name}: ${transfer.walkMinutes}-minute interchange walking estimate.`,
        confidence: "estimated"
      });
    }
    if (transfer.sourceId === "fallback-transfer-model") {
      warnings.add(
        `${station.name}: no direction-specific interchange measurement; using a conservative 6-min walk.`
      );
    } else if (transfer.directionSpecific) {
      warnings.add(
        `${station.name}: ${transfer.walkMinutes}-min direction-specific walking estimate, plus your buffer.`
      );
    }
    if (transfer.outOfSystem) {
      warnings.add(
        `${station.name}: this interchange may require tapping out and back in; allow extra time and check fare-gate access.`
      );
    }
  }

  for (const adjustment of adjustmentsForDate(date)) {
    const usedPatterns = new Set(route.rides.map((ride) => ride.patternId));
    const affectsRoute =
      adjustment.affectedLine === "multiple"
        ? Object.keys(adjustment.anchorOverrides ?? {}).some((id) => usedPatterns.has(id))
        : route.rides.some(
            (ride) => PATTERN_BY_ID.get(ride.patternId)?.lineId === adjustment.affectedLine
          );
    if (affectsRoute) warnings.add(adjustment.note);
  }

  const exact =
    scheduled.length === 1 &&
    scheduled[0].confidence === "exact" &&
    route.transfers.length === 0;
  if (!exact) {
    warnings.add(
      "This is a cautious planning estimate, not a guaranteed connection. Arrive earlier when the trip matters."
    );
  }

  const origin = STATION_BY_ID.get(originId);
  const destination = STATION_BY_ID.get(destinationId);
  if (!origin || !destination) return null;

  const uniqueEvidence = [...new Map(evidence.map((item) => [item.sourceId, item])).values()];
  for (const item of uniqueEvidence) {
    if (!SOURCE_BY_ID.has(item.sourceId) && !item.sourceId.startsWith("model-")) {
      warnings.add(`Source metadata is incomplete for ${item.sourceId}.`);
    }
  }

  return {
    origin,
    destination,
    serviceDay: getServiceDay(date),
    boardBy: scheduled[0].departure,
    arriveBy: scheduled.at(-1)!.arrival,
    confidence: exact ? "exact" : "estimated",
    confidenceLabel: exact
      ? "Exact last scheduled train"
      : "Estimated safe board-by time",
    rides: scheduled,
    transfers: route.transfers,
    warnings: [...warnings],
    evidence: uniqueEvidence,
    totalRideMinutes: route.totalRideMinutes,
    totalTransferMinutes: route.totalTransferMinutes,
    signature: route.signature
  };
}

function compareResults(a: JourneyResult, b: JourneyResult): number {
  const departureDifference = b.boardBy - a.boardBy;
  if (Math.abs(departureDifference) > 2) return departureDifference;
  if (a.transfers.length !== b.transfers.length) {
    return a.transfers.length - b.transfers.length;
  }
  const aDuration = a.arriveBy - a.boardBy;
  const bDuration = b.arriveBy - b.boardBy;
  if (aDuration !== bDuration) return aDuration - bDuration;
  if (a.confidence !== b.confidence) return a.confidence === "exact" ? -1 : 1;
  return 0;
}

export interface CalculateOptions {
  originId: string;
  destinationId: string;
  date: string;
  bufferMinutes?: number;
  availablePatternIds?: ReadonlySet<string>;
}

export function calculateLastTrain({
  originId,
  destinationId,
  date,
  bufferMinutes = 3,
  availablePatternIds
}: CalculateOptions): CalculationResult {
  if (!STATION_BY_ID.has(originId) || !STATION_BY_ID.has(destinationId)) {
    return {
      recommended: null,
      alternatives: [],
      notices: [],
      error: "Choose a valid origin and destination station."
    };
  }
  if (originId === destinationId) {
    return {
      recommended: null,
      alternatives: [],
      notices: [],
      error: "Origin and destination must be different stations."
    };
  }
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 15) {
    return {
      recommended: null,
      alternatives: [],
      notices: [],
      error: "Connection buffer must be a whole number from 0 to 15 minutes."
    };
  }

  let serviceDay;
  try {
    serviceDay = getServiceDay(date);
  } catch (error) {
    return {
      recommended: null,
      alternatives: [],
      notices: [],
      error: error instanceof Error ? error.message : "Invalid service date."
    };
  }

  const routes = findRouteCandidates(
    originId,
    destinationId,
    date,
    bufferMinutes,
    32,
    availablePatternIds
  );
  const shortestRouteMinutes = Math.min(
    ...routes.map((route) => route.totalRideMinutes + route.totalTransferMinutes)
  );
  const detourAllowance = Math.max(20, Math.ceil(shortestRouteMinutes * 0.35));
  const plausibleRoutes = routes.filter(
    (route) =>
      route.totalRideMinutes + route.totalTransferMinutes <=
      shortestRouteMinutes + detourAllowance
  );
  const scheduled = plausibleRoutes
    .map((route) => scheduleRouteCandidate(route, originId, destinationId, date))
    .filter((result): result is JourneyResult => result !== null)
    .sort(compareResults);

  const deduplicated: JourneyResult[] = [];
  const seenLineJourneys = new Set<string>();
  for (const result of scheduled) {
    const lineJourney = result.rides.map((ride) => ride.patternId).join(">");
    if (seenLineJourneys.has(lineJourney)) continue;
    seenLineJourneys.add(lineJourney);
    deduplicated.push(result);
  }

  const notices = adjustmentsForDate(date).map((adjustment) => adjustment.note);
  if (DTL_LATE_OPEN_DATES.includes(date)) {
    notices.push(
      "Downtown Line service starts at about 8:30 AM today. This does not normally change last-train times, but it is shown for service-day completeness."
    );
  }
  if (serviceDay.publicHoliday) {
    notices.push(`${serviceDay.publicHoliday}: Sunday/public-holiday service day.`);
  } else if (serviceDay.isPublicHolidayEve) {
    notices.push("Public-holiday eve. Only explicitly published extensions are applied.");
  }

  return {
    recommended: deduplicated[0] ?? null,
    alternatives: deduplicated.slice(1, 3),
    notices,
    error: deduplicated.length
      ? undefined
      : "No through journey was found in the active service graph. Try an earlier trip or another destination."
  };
}
