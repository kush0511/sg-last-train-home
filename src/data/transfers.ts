import type { ServicePattern, TransferRule } from "../lib/types";
import { stationId } from "./network";

function rule(
  stationName: string,
  fromCodePrefix: string,
  toCodePrefix: string,
  walkMinutes: number,
  options: Partial<TransferRule> = {}
): TransferRule {
  return {
    stationId: stationId(stationName),
    fromCodePrefix,
    toCodePrefix,
    walkMinutes,
    sourceId: "community-transfer-times",
    directionSpecific: true,
    ...options
  };
}

function both(
  stationName: string,
  first: string,
  second: string,
  firstToSecond: number,
  secondToFirst = firstToSecond,
  options: Partial<TransferRule> = {}
): TransferRule[] {
  return [
    rule(stationName, first, second, firstToSecond, options),
    rule(stationName, second, first, secondToFirst, options)
  ];
}

export const TRANSFER_RULES: TransferRule[] = [
  ...both("Jurong East", "NS", "EW", 4, 4),
  ...both("Choa Chu Kang", "NS", "BP", 4, 4),
  ...both("Woodlands", "NS", "TE", 5, 5),
  ...both("Bishan", "NS", "CC", 5, 6),
  ...both("Newton", "NS", "DT", 8, 8, { outOfSystem: true }),
  ...both("Orchard", "NS", "TE", 7, 7),
  ...both("Dhoby Ghaut", "NS", "NE", 4, 5),
  ...both("Dhoby Ghaut", "NS", "CC", 5, 6),
  ...both("Dhoby Ghaut", "NE", "CC", 5, 5),
  ...both("City Hall", "NS", "EW", 2, 2),
  ...both("Raffles Place", "NS", "EW", 2, 2),
  ...both("Marina Bay", "NS", "CC", 5, 5),
  ...both("Marina Bay", "NS", "TE", 5, 5),
  ...both("Marina Bay", "CC", "TE", 4, 4),
  ...both("Tampines", "EW", "DT", 9, 9, { outOfSystem: true }),
  ...both("Paya Lebar", "EW", "CC", 4, 4),
  ...both("Bugis", "EW", "DT", 5, 5),
  ...both("Outram Park", "NE", "EW", 3, 3),
  ...both("Outram Park", "EW", "TE", 5, 5),
  ...both("Outram Park", "NE", "TE", 5, 5),
  ...both("Buona Vista", "EW", "CC", 4, 4),
  ...both("HarbourFront", "NE", "CC", 5, 5),
  ...both("Little India", "NE", "DT", 5, 4),
  ...both("Serangoon", "NE", "CC", 5, 5),
  ...both("Sengkang", "NE", "STC", 4, 4),
  ...both("Punggol", "NE", "PTC", 4, 4),
  ...both("Promenade", "CC", "DT", 4, 4),
  ...both("Caldecott", "CC", "TE", 4, 4),
  ...both("Botanic Gardens", "CC", "DT", 5, 5),
  ...both("MacPherson", "CC", "DT", 4, 4),
  ...both("Bayfront", "CC", "DT", 3, 3),
  ...both("Bukit Panjang", "DT", "BP", 8, 8, { outOfSystem: true }),
  ...both("Stevens", "DT", "TE", 4, 4),
  ...both("Expo", "DT", "CG", 4, 4),
  ...both("Tanah Merah", "EW", "CG", 3, 3)
];

function codePrefix(code: string, pattern: ServicePattern): string {
  if (pattern.lineId === "CG") return "CG";
  if (code === "STC" || code.startsWith("SE") || code.startsWith("SW")) return "STC";
  if (code === "PTC" || code.startsWith("PE") || code.startsWith("PW")) return "PTC";
  return code.match(/^[A-Z]+/)?.[0] ?? code;
}

export interface TransferLookup {
  walkMinutes: number;
  sourceId: string;
  directionSpecific: boolean;
  outOfSystem: boolean;
  fallback: boolean;
}

export function lookupTransfer(
  stationIdValue: string,
  fromCode: string,
  toCode: string,
  fromPattern: ServicePattern,
  toPattern: ServicePattern
): TransferLookup {
  if (fromPattern.lineId === toPattern.lineId) {
    return {
      walkMinutes: 0,
      sourceId: "same-line-pattern-change",
      directionSpecific: false,
      outOfSystem: false,
      fallback: false
    };
  }

  const from = codePrefix(fromCode, fromPattern);
  const to = codePrefix(toCode, toPattern);
  const match = TRANSFER_RULES.find(
    (candidate) =>
      candidate.stationId === stationIdValue &&
      candidate.fromCodePrefix === from &&
      candidate.toCodePrefix === to
  );

  if (match) {
    return {
      walkMinutes: match.walkMinutes,
      sourceId: match.sourceId,
      directionSpecific: match.directionSpecific,
      outOfSystem: Boolean(match.outOfSystem),
      fallback: false
    };
  }

  return {
    walkMinutes: 6,
    sourceId: "fallback-transfer-model",
    directionSpecific: false,
    outOfSystem: false,
    fallback: true
  };
}
