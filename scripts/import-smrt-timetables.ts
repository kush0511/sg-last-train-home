import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { STATIONS } from "../src/data/network";
import { SERVICE_PATTERNS } from "../src/data/services";
import type { TimetableCategory } from "../src/lib/types";

const CDN_ROOT = "https://connect-cdn.smrt.wwprojects.com/autoupdate/mrt-timing";
const SMRT_LINE_IDS = new Set(["NS", "EW", "CG", "CC", "TE", "BP"]);
const categoryByLabel: Record<string, TimetableCategory> = {
  "monday - friday": "weekday",
  "monday to friday": "weekday",
  saturday: "saturday",
  "sunday/public holidays": "sunday-public-holiday",
  "sunday / public holidays": "sunday-public-holiday",
  "eve of public holidays last train": "public-holiday-eve"
};

type StationTimetable = Partial<Record<TimetableCategory, number>>;
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

function parseTime(value: string): number | undefined {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 29 || minute > 59) return undefined;
  return (hour < 4 ? hour + 24 : hour) * 60 + minute;
}

function tableRows(fragment: string): string[][] {
  return [...fragment.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => htmlText(cell[1]))
  );
}

function parseStationPage(
  html: string
): Array<{ destinationCode?: string; heading: string; values: StationTimetable }> {
  const tables = html.split(/<div\s+class=["']divTimesDescContainer["'][^>]*>/i).slice(1);
  return tables.flatMap((table) => {
    const heading = htmlText(table.match(/id=["']divTimeHeader["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    const destinationCode = heading.match(/\b([A-Z]{1,2}\d+[A-Z]?)\b/i)?.[1]?.toUpperCase();
    const values: StationTimetable = {};
    for (const row of tableRows(table)) {
      const category = categoryByLabel[row[0]?.toLowerCase() ?? ""];
      const last = parseTime(row.at(-1) ?? "");
      if (category && last != null) values[category] = last;
    }
    return Object.keys(values).length ? [{ destinationCode, heading: heading.toLowerCase(), values }] : [];
  });
}

async function fetchStationTimetables(name: string): Promise<ReturnType<typeof parseStationPage>> {
  const url = `${CDN_ROOT}/${encodeURIComponent(name.toLowerCase())}.html`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "sg-last-train-home one-time data import",
      Referer: "https://journey.smrt.com.sg/"
    }
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`${name}: ${response.status} ${response.statusText}`);
  return parseStationPage(await response.text());
}

const output: PublishedLastDepartures = {};
const stations = STATIONS.filter((station) => station.lineIds.some((line) => SMRT_LINE_IDS.has(line)));

for (const station of stations) {
  const tables = await fetchStationTimetables(station.name);
  for (const table of tables) {
    const patterns = SERVICE_PATTERNS.filter((pattern) => {
      if (!pattern.stops.some((code) => station.codes.includes(code))) return false;
      if (pattern.stops.at(-1) === table.destinationCode) return true;
      // CCL pages name their loop direction rather than giving a terminal code.
      if (pattern.id === "CC_LOOP_CLOCKWISE") {
        return table.heading.startsWith("clockwise") && table.heading.includes("full loop");
      }
      if (pattern.id === "CC_LOOP_ANTICLOCKWISE") {
        return table.heading.startsWith("anticlockwise") && table.heading.includes("full loop");
      }
      if (pattern.id === "CC_SPUR_TO_DHOBY_GHAUT") {
        return table.heading.includes("clockwise") && table.heading.includes("dhoby ghaut");
      }
      if (pattern.id === "CC_SPUR_TO_STADIUM") return table.heading.includes("ends at stadium");
      return false;
    });
    for (const pattern of patterns) {
      for (const [category, lastDeparture] of Object.entries(table.values) as Array<
        [TimetableCategory, number]
      >) {
        const stationCode = pattern.stops.find((code) => station.codes.includes(code));
        if (!stationCode) continue;
        output[pattern.id] ??= {};
        output[pattern.id]![category] ??= {};
        output[pattern.id]![category]![stationCode] = lastDeparture;
      }
    }
  }
}

const destination = fileURLToPath(
  new URL("../src/data/published-timetables.smrt.json", import.meta.url)
);
await writeFile(
  destination,
  `${JSON.stringify(output, null, 2)}\n`
);
console.log(`Imported ${stations.length} SMRT station pages into ${destination}.`);
