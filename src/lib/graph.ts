import { adjustmentsForDate } from "../data/special-services";
import { PATTERN_BY_ID, SERVICE_PATTERNS } from "../data/services";
import { STATION_ID_BY_CODE } from "../data/network";
import { lookupTransfer } from "../data/transfers";
import type { GraphEdge, RideLeg, RouteCandidate, TransferLeg } from "./types";

interface SearchState {
  stationId: string;
  patternId: string | null;
  edges: GraphEdge[];
  transfers: TransferLeg[];
  visited: Set<string>;
  usedLineIds: Set<string>;
  cost: number;
}

function allowsSameLinePatternChange(fromPatternId: string, toPatternId: string): boolean {
  const pair = `${fromPatternId}>${toPatternId}`;
  return (
    (pair.includes("CC_SPUR_") && pair.includes("CC_LOOP_")) ||
    (pair.includes("CC_LOOP_") && pair.includes("CC_SPUR_")) ||
    (pair.includes("BP_TRUNK_") && pair.includes("BP_LOOP_")) ||
    (pair.includes("BP_LOOP_") && pair.includes("BP_TRUNK_"))
  );
}

export function activePatternIds(date: string): Set<string> {
  const disabled = new Set(
    adjustmentsForDate(date).flatMap((adjustment) => adjustment.disabledPatternIds ?? [])
  );
  return new Set(
    SERVICE_PATTERNS.filter((pattern) => !disabled.has(pattern.id)).map((pattern) => pattern.id)
  );
}

export function buildAdjacency(
  date: string,
  allowedPatternIds?: ReadonlySet<string>
): Map<string, GraphEdge[]> {
  const active = activePatternIds(date);
  const adjacency = new Map<string, GraphEdge[]>();

  for (const pattern of SERVICE_PATTERNS) {
    if (!active.has(pattern.id) || (allowedPatternIds && !allowedPatternIds.has(pattern.id))) {
      continue;
    }
    const edgeCount = pattern.circular ? pattern.stops.length : pattern.stops.length - 1;
    for (let index = 0; index < edgeCount; index += 1) {
      const fromCode = pattern.stops[index];
      const toCode = pattern.stops[(index + 1) % pattern.stops.length];
      const fromStationId = STATION_ID_BY_CODE.get(fromCode);
      const toStationId = STATION_ID_BY_CODE.get(toCode);
      if (!fromStationId || !toStationId) {
        throw new Error(`Pattern ${pattern.id} refers to an unknown stop`);
      }
      const edge: GraphEdge = {
        fromStationId,
        toStationId,
        fromCode,
        toCode,
        patternId: pattern.id,
        minutes: pattern.segmentMinutes[index]
      };
      const outgoing = adjacency.get(fromStationId) ?? [];
      outgoing.push(edge);
      adjacency.set(fromStationId, outgoing);
    }
  }

  return adjacency;
}

function compressRides(edges: GraphEdge[]): RideLeg[] {
  const rides: RideLeg[] = [];
  for (const edge of edges) {
    const current = rides.at(-1);
    if (current?.patternId === edge.patternId) {
      current.toStationId = edge.toStationId;
      current.toCode = edge.toCode;
      current.stopCodes.push(edge.toCode);
      current.rideMinutes += edge.minutes;
    } else {
      rides.push({
        patternId: edge.patternId,
        fromStationId: edge.fromStationId,
        toStationId: edge.toStationId,
        fromCode: edge.fromCode,
        toCode: edge.toCode,
        stopCodes: [edge.fromCode, edge.toCode],
        rideMinutes: edge.minutes
      });
    }
  }
  return rides;
}

function routeSignature(rides: RideLeg[]): string {
  return rides
    .map((ride) => `${ride.patternId}:${ride.fromCode}>${ride.toCode}`)
    .join("|");
}

export function findRouteCandidates(
  originStationId: string,
  destinationStationId: string,
  date: string,
  bufferMinutes: number,
  limit = 32,
  allowedPatternIds?: ReadonlySet<string>
): RouteCandidate[] {
  if (originStationId === destinationStationId) return [];
  const adjacency = buildAdjacency(date, allowedPatternIds);
  const queue: SearchState[] = [
    {
      stationId: originStationId,
      patternId: null,
      edges: [],
      transfers: [],
      visited: new Set([originStationId]),
      usedLineIds: new Set(),
      cost: 0
    }
  ];
  const candidates: RouteCandidate[] = [];
  const signatures = new Set<string>();
  const best = new Map<string, number>();
  let expanded = 0;
  let shortestCandidateCost = Number.POSITIVE_INFINITY;

  while (queue.length && candidates.length < limit && expanded < 20_000) {
    queue.sort((a, b) => a.cost - b.cost);
    const state = queue.shift()!;
    expanded += 1;
    if (
      candidates.length >= 12 &&
      Number.isFinite(shortestCandidateCost) &&
      state.cost > shortestCandidateCost + 45
    ) {
      break;
    }

    if (state.stationId === destinationStationId) {
      const rides = compressRides(state.edges);
      const signature = routeSignature(rides);
      if (!signatures.has(signature)) {
        signatures.add(signature);
        candidates.push({
          signature,
          rides,
          transfers: state.transfers,
          totalRideMinutes: rides.reduce((sum, ride) => sum + ride.rideMinutes, 0),
          totalTransferMinutes: state.transfers.reduce(
            (sum, transfer) => sum + transfer.walkMinutes + transfer.bufferMinutes,
            0
          )
        });
        shortestCandidateCost = Math.min(shortestCandidateCost, state.cost);
      }
      continue;
    }

    for (const edge of adjacency.get(state.stationId) ?? []) {
      if (state.visited.has(edge.toStationId)) continue;
      const changesPattern = state.patternId !== null && state.patternId !== edge.patternId;
      if (changesPattern && state.transfers.length >= 4) continue;

      let transfer: TransferLeg | undefined;
      let transferCost = 0;
      if (changesPattern) {
        const previousEdge = state.edges.at(-1)!;
        const previousPattern = PATTERN_BY_ID.get(previousEdge.patternId)!;
        const nextPattern = PATTERN_BY_ID.get(edge.patternId)!;
        if (
          previousPattern.lineId === nextPattern.lineId &&
          !allowsSameLinePatternChange(previousPattern.id, nextPattern.id)
        ) {
          continue;
        }
        if (
          previousPattern.lineId !== nextPattern.lineId &&
          state.usedLineIds.has(nextPattern.lineId)
        ) {
          continue;
        }
        const lookup = lookupTransfer(
          state.stationId,
          previousEdge.toCode,
          edge.fromCode,
          previousPattern,
          nextPattern
        );
        transfer = {
          stationId: state.stationId,
          fromPatternId: previousPattern.id,
          toPatternId: nextPattern.id,
          walkMinutes: lookup.walkMinutes,
          bufferMinutes,
          sourceId: lookup.sourceId,
          directionSpecific: lookup.directionSpecific,
          outOfSystem: lookup.outOfSystem
        };
        transferCost = lookup.walkMinutes + bufferMinutes + (lookup.outOfSystem ? 4 : 0);
      }

      const newTransfers = transfer ? [...state.transfers, transfer] : state.transfers;
      const edgeLineId = PATTERN_BY_ID.get(edge.patternId)!.lineId;
      const newUsedLineIds = new Set(state.usedLineIds);
      newUsedLineIds.add(edgeLineId);
      const newCost = state.cost + edge.minutes + transferCost;
      const key = `${edge.toStationId}|${edge.patternId}|${newTransfers.length}`;
      const previousBest = best.get(key);
      if (previousBest != null && newCost > previousBest + 18) continue;
      if (previousBest == null || newCost < previousBest) best.set(key, newCost);

      queue.push({
        stationId: edge.toStationId,
        patternId: edge.patternId,
        edges: [...state.edges, edge],
        transfers: newTransfers,
        visited: new Set([...state.visited, edge.toStationId]),
        usedLineIds: newUsedLineIds,
        cost: newCost
      });
    }
  }

  return candidates;
}
