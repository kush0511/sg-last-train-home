import { LINES, STATIONS, stationFromInput } from "../data/network";
import type { LineId, Station } from "./types";

export type StationMatchKind =
  | "exact-code"
  | "exact-name"
  | "alias"
  | "code"
  | "name"
  | "initials"
  | "line"
  | "spelling"
  | "partial";

export interface RankedStation {
  station: Station;
  score: number;
  kind: StationMatchKind;
  matchedText?: string;
}

const STATION_ALIASES: Record<string, string[]> = {
  "bayfront": ["marina bay sands", "mbs"],
  "botanic-gardens": ["botanical gardens"],
  "changi-airport": ["airport", "changi airport terminal"],
  "dhoby-ghaut": ["doby ghaut", "dhoby"],
  "gardens-by-the-bay": ["garden by the bay", "gardens by bay"],
  "harbourfront": ["harbour front", "harborfront", "harbor front", "vivo city", "vivocity"],
  "macpherson": ["mac pherson"],
  "one-north": ["one north"],
  "punggol-coast": ["punggol digital district"],
  "raffles-place": ["raffles"],
  "woodlands-north": ["woodlands north checkpoint"]
};

const LINE_ALIASES: Record<LineId, string[]> = {
  NS: ["nsl", "north south", "red line"],
  EW: ["ewl", "east west", "green line"],
  CG: ["cgl", "changi branch", "airport branch"],
  NE: ["nel", "north east", "purple line"],
  CC: ["ccl", "circle line", "orange line"],
  DT: ["dtl", "downtown line", "blue line"],
  TE: ["tel", "thomson east coast", "brown line"],
  BP: ["bplrt", "bukit panjang lrt"],
  SK: ["sklrt", "sengkang lrt"],
  PG: ["pglrt", "punggol lrt"]
};

export function normaliseStationQuery(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(?:mrt|station)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compact(value: string): string {
  return normaliseStationQuery(value).replaceAll(" ", "");
}

/** Damerau–Levenshtein distance: also treats a swapped letter as one typo. */
function editDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );
  for (let row = 0; row <= a.length; row += 1) matrix[row][0] = row;
  for (let column = 0; column <= b.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const substitution =
        matrix[row - 1][column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1);
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        substitution
      );
      if (
        row > 1 &&
        column > 1 &&
        a[row - 1] === b[column - 2] &&
        a[row - 2] === b[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function isSubsequence(query: string, candidate: string): boolean {
  let queryIndex = 0;
  for (const character of candidate) {
    if (character === query[queryIndex]) queryIndex += 1;
    if (queryIndex === query.length) return true;
  }
  return false;
}

function initials(value: string): string {
  return normaliseStationQuery(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
}

function typoThreshold(length: number): number {
  if (length >= 11) return 3;
  if (length >= 5) return 2;
  return length >= 3 ? 1 : 0;
}

function lineTerms(station: Station): string[] {
  return station.lineIds.flatMap((lineId) => [
    LINES[lineId].name,
    LINES[lineId].shortName,
    ...LINE_ALIASES[lineId]
  ]);
}

function bestWordDistance(query: string, candidate: string): number {
  const queryWords = query.split(" ").filter(Boolean);
  const candidateWords = normaliseStationQuery(candidate).split(" ").filter(Boolean);
  if (!queryWords.length || !candidateWords.length) return Number.POSITIVE_INFINITY;

  return queryWords.reduce((sum, queryWord) => {
    const best = Math.min(
      ...candidateWords.map((candidateWord) => editDistance(queryWord, candidateWord))
    );
    return sum + best;
  }, 0);
}

function rankStation(station: Station, query: string): RankedStation | undefined {
  const queryCompact = query.replaceAll(" ", "");
  const name = normaliseStationQuery(station.name);
  const nameCompact = name.replaceAll(" ", "");
  const words = name.split(" ");
  const codes = station.codes.map((code) => code.toLowerCase());
  const codeCompacts = codes.map(compact);
  const aliases = (STATION_ALIASES[station.id] ?? []).map(normaliseStationQuery);
  const lines = lineTerms(station).map(normaliseStationQuery);

  if (codeCompacts.includes(queryCompact)) {
    return { station, score: 0, kind: "exact-code", matchedText: query };
  }
  if (name === query) {
    return { station, score: 1, kind: "exact-name", matchedText: station.name };
  }
  const exactAlias = aliases.find((alias) => alias === query);
  if (exactAlias) {
    return { station, score: 1.5, kind: "alias", matchedText: exactAlias };
  }
  if (queryCompact.length >= 2 && codeCompacts.some((code) => code.startsWith(queryCompact))) {
    return { station, score: 2, kind: "code", matchedText: query };
  }
  if (name.startsWith(query)) {
    return { station, score: 3, kind: "name", matchedText: query };
  }
  if (words.some((word) => word.startsWith(query))) {
    return { station, score: 4, kind: "name", matchedText: query };
  }
  const aliasPrefix = aliases.find((alias) => alias.startsWith(query) || alias.includes(query));
  if (query.length >= 2 && aliasPrefix) {
    return { station, score: 4.5, kind: "alias", matchedText: aliasPrefix };
  }
  if (query.length >= 2 && initials(station.name).startsWith(queryCompact)) {
    return { station, score: 5, kind: "initials", matchedText: initials(station.name) };
  }
  if (name.includes(query)) {
    return { station, score: 5.5, kind: "name", matchedText: query };
  }

  const queryWords = query.split(" ").filter(Boolean);
  const combinedTerms = [name, ...codes, ...aliases, ...lines].join(" ");
  if (
    queryWords.length > 1 &&
    queryWords.every((word) =>
      combinedTerms
        .split(" ")
        .some((term) => term.startsWith(word) || (word.length >= 4 && editDistance(word, term) <= 1))
    )
  ) {
    const usedLineTerm = queryWords.some((word) =>
      lines.some((line) => line.split(" ").some((term) => term.startsWith(word)))
    );
    return {
      station,
      score: usedLineTerm ? 6 : 6.5,
      kind: usedLineTerm ? "line" : "partial",
      matchedText: query
    };
  }

  if (queryCompact.length >= 3 && isSubsequence(queryCompact, nameCompact)) {
    return {
      station,
      score: 8 + Math.min(4, nameCompact.length - queryCompact.length) / 2,
      kind: "partial",
      matchedText: query
    };
  }

  if (queryCompact.length >= 3) {
    const fullDistance = editDistance(queryCompact, nameCompact);
    const wordDistance = bestWordDistance(query, name);
    const distance = Math.min(fullDistance, wordDistance);
    if (distance <= typoThreshold(queryCompact.length)) {
      return {
        station,
        score: 10 + distance + Math.abs(nameCompact.length - queryCompact.length) / 10,
        kind: "spelling",
        matchedText: query
      };
    }
  }

  return undefined;
}

export function rankStations(query: string): RankedStation[] {
  const cleaned = normaliseStationQuery(query);
  if (!cleaned) return [];

  return STATIONS.map((station) => rankStation(station, cleaned))
    .filter((result): result is RankedStation => Boolean(result))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.station.name.length - b.station.name.length ||
        a.station.name.localeCompare(b.station.name, "en-SG")
    );
}

export function searchStations(query: string, limit = 8): Station[] {
  return rankStations(query)
    .slice(0, limit)
    .map((result) => result.station);
}

export function resolveStationInput(value: string): Station | undefined {
  const exact = stationFromInput(value);
  if (exact) return exact;
  const cleaned = normaliseStationQuery(value);
  if (cleaned.length < 2) return undefined;
  const ranked = rankStations(value);
  if (!ranked.length || ranked[0].score > 13) return undefined;
  if (ranked[1] && ranked[1].score === ranked[0].score) return undefined;
  return ranked[0].station;
}
