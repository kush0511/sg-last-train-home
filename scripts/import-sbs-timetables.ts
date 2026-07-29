import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { TimetableCategory } from "../src/lib/types";

const SOURCE = "https://www.sbstransit.com.sg/first-train-last-train";
const ORDINARY_CATEGORIES: TimetableCategory[] = [
  "weekday",
  "saturday",
  "sunday-public-holiday"
];

type Timetable = Partial<Record<TimetableCategory, Record<string, number>>>;
type PublishedLastDepartures = Partial<Record<string, Timetable>>;

function htmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tableRows(html: string): string[][][] {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((table) =>
    [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
      [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
        htmlText(cell[1])
      )
    )
  );
}

function parseTime(value: string): number | undefined {
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,2})[.:](\d{2})(am|pm)$/);
  if (!match) return undefined;
  let hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  if (match[3] === "pm") hour += 12;
  if (minute > 59) return undefined;
  if (hour < 4) hour += 24;
  return hour * 60 + minute;
}

function stationCode(value: string): string | undefined {
  return value.match(/^(DT\d+|NE\d+)\b/)?.[1];
}

function setTime(
  output: PublishedLastDepartures,
  patternId: string,
  category: TimetableCategory,
  code: string,
  value: number
): void {
  output[patternId] ??= {};
  output[patternId]![category] ??= {};
  output[patternId]![category]![code] = value;
}

function importMrtTable(
  output: PublishedLastDepartures,
  rows: string[][],
  patternId: string
): void {
  const isNel = rows[0]?.[0]?.includes("Punggol") || rows[0]?.[0]?.includes("HarbourFront");
  for (const row of rows.slice(2)) {
    const code = stationCode(row[0] ?? "");
    if (!code) continue;
    if (isNel) {
      const weekday = parseTime(row[4] ?? "");
      const weekend = parseTime(row[5] ?? "");
      if (weekday != null) setTime(output, patternId, "weekday", code, weekday);
      if (weekend != null) {
        setTime(output, patternId, "saturday", code, weekend);
        setTime(output, patternId, "sunday-public-holiday", code, weekend);
      }
    } else {
      const last = parseTime(row[3] ?? "");
      if (last == null) continue;
      for (const category of ORDINARY_CATEGORIES) {
        setTime(output, patternId, category, code, last);
      }
    }
  }
}

function importLrtTable(
  output: PublishedLastDepartures,
  rows: string[][],
  line: "SK" | "PG"
): void {
  const townCentre = line === "SK" ? "STC" : "PTC";
  for (const row of rows.slice(2)) {
    const loop = row[0]?.toLowerCase();
    const last = parseTime(row[3] ?? "");
    if (!loop || last == null) continue;
    const patternIds =
      loop === "east loop"
        ? [`${line}_EAST_INNER`, `${line}_EAST_OUTER`]
        : loop === "west loop"
          ? [`${line}_WEST_INNER`, `${line}_WEST_OUTER`]
          : [];
    for (const patternId of patternIds) {
      for (const category of ORDINARY_CATEGORIES) {
        setTime(output, patternId, category, townCentre, last);
      }
    }
  }
}

const response = await fetch(SOURCE, {
  headers: { "User-Agent": "sg-last-train-home one-time data import" }
});
if (!response.ok) throw new Error(`SBS Transit timetable returned ${response.status}`);

const output: PublishedLastDepartures = {};
for (const rows of tableRows(await response.text())) {
  const heading = rows[0]?.[0] ?? "";
  if (heading === "Towards Expo") importMrtTable(output, rows, "DT_TO_EXPO");
  else if (heading === "Towards Bukit Panjang") {
    importMrtTable(output, rows, "DT_TO_BUKIT_PANJANG");
  } else if (heading === "Towards HarbourFront") {
    importMrtTable(output, rows, "NE_TO_HARBOURFRONT");
  } else if (heading === "Towards Punggol Coast") {
    importMrtTable(output, rows, "NE_TO_PUNGGOL_COAST");
  } else if (heading === "Departing from Sengkang Town Centre") {
    importLrtTable(output, rows, "SK");
  } else if (heading === "Departing from Punggol Town Centre") {
    importLrtTable(output, rows, "PG");
  }
}

const expectedPatterns = [
  "DT_TO_EXPO",
  "DT_TO_BUKIT_PANJANG",
  "NE_TO_HARBOURFRONT",
  "NE_TO_PUNGGOL_COAST",
  "SK_EAST_INNER",
  "SK_EAST_OUTER",
  "SK_WEST_INNER",
  "SK_WEST_OUTER",
  "PG_EAST_INNER",
  "PG_EAST_OUTER",
  "PG_WEST_INNER",
  "PG_WEST_OUTER"
];
const missingPatterns = expectedPatterns.filter((patternId) => !output[patternId]);
if (missingPatterns.length) {
  throw new Error(`SBS Transit import missed patterns: ${missingPatterns.join(", ")}`);
}

const destination = fileURLToPath(
  new URL("../src/data/published-timetables.sbs.json", import.meta.url)
);
await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Imported SBS Transit NEL, DTL, Sengkang LRT and Punggol LRT last departures into ${destination}.`
);
