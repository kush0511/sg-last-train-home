import manifest from "../src/data/snapshot.json" with { type: "json" };
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  CODED_STOPS,
  NETWORK_AS_OF,
  STATIONS,
  STATION_ID_BY_CODE,
  STOP_BY_CODE
} from "../src/data/network";
import { SERVICE_PATTERNS } from "../src/data/services";
import { SERVICE_ADJUSTMENTS } from "../src/data/special-services";
import { SOURCE_BY_ID } from "../src/data/sources";

const errors: string[] = [];
const assert = (condition: unknown, message: string) => {
  if (!condition) errors.push(message);
};

assert(manifest.datasetVersion === "2026.07.29", "Manifest version is unexpected");
assert(manifest.networkAsOf === NETWORK_AS_OF, "Manifest/network as-of dates disagree");
assert(STATIONS.length === manifest.stationCount, "Station count disagrees with manifest");
assert(STOP_BY_CODE.size === manifest.codedStopCount, "Unique coded-stop count disagrees");
assert(
  SERVICE_PATTERNS.length === manifest.servicePatternCount,
  "Service-pattern count disagrees"
);

try {
  const dataDirectory = fileURLToPath(new URL("../data/", import.meta.url));
  const exportedIndex = JSON.parse(await readFile(`${dataDirectory}/index.json`, "utf8")) as {
    datasetVersion?: string;
    files?: string[];
  };
  assert(
    exportedIndex.datasetVersion === manifest.datasetVersion,
    "Exported JSON index version disagrees"
  );
  assert(exportedIndex.files?.length === 4, "Exported JSON index is incomplete");
  for (const filename of exportedIndex.files ?? []) {
    const exported = JSON.parse(await readFile(`${dataDirectory}/${filename}`, "utf8")) as {
      datasetVersion?: string;
    };
    assert(
      exported.datasetVersion === manifest.datasetVersion,
      `${filename}: exported version disagrees`
    );
  }
} catch (error) {
  errors.push(
    `Versioned JSON export is missing or unreadable: ${
      error instanceof Error ? error.message : "unknown error"
    }`
  );
}

const duplicateCodes = new Map<string, number>();
for (const stop of CODED_STOPS) {
  duplicateCodes.set(stop.code, (duplicateCodes.get(stop.code) ?? 0) + 1);
}
for (const [code, count] of duplicateCodes) {
  assert(count === 1 || code === "EW4", `Unexpected duplicate station code: ${code}`);
}

for (const expected of ["CC30", "CC31", "CC32", "DT4", "NE18", "PW2"]) {
  assert(STOP_BY_CODE.has(expected), `Current operating stop missing: ${expected}`);
}
for (const unopened of ["DT36", "DT37", "TE30", "TE31"]) {
  assert(!STOP_BY_CODE.has(unopened), `Unopened stop included: ${unopened}`);
}

for (const pattern of SERVICE_PATTERNS) {
  const expectedSegments = pattern.circular ? pattern.stops.length : pattern.stops.length - 1;
  assert(
    pattern.segmentMinutes.length === expectedSegments,
    `${pattern.id}: segment count mismatch`
  );
  assert(pattern.stops.length >= 2, `${pattern.id}: fewer than two stops`);
  assert(
    new Set(pattern.stops).size === pattern.stops.length,
    `${pattern.id}: duplicate stop occurrence`
  );
  for (const code of pattern.stops) {
    assert(STATION_ID_BY_CODE.has(code), `${pattern.id}: unknown stop ${code}`);
  }
  assert(SOURCE_BY_ID.has(pattern.sourceId), `${pattern.id}: unknown source ${pattern.sourceId}`);

  if (pattern.exactLastByStop) {
    let prior = -Infinity;
    for (const code of pattern.stops) {
      const value = pattern.exactLastByStop[code];
      if (value == null) continue;
      assert(value >= prior, `${pattern.id}: exact last times are not monotonic at ${code}`);
      prior = value;
    }
  }
}

for (const adjustment of SERVICE_ADJUSTMENTS) {
  assert(SOURCE_BY_ID.has(adjustment.sourceId), `${adjustment.id}: unknown source`);
  for (const date of adjustment.dates) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(date), `${adjustment.id}: invalid date ${date}`);
  }
  for (const patternId of adjustment.disabledPatternIds ?? []) {
    assert(
      SERVICE_PATTERNS.some((pattern) => pattern.id === patternId),
      `${adjustment.id}: unknown disabled pattern ${patternId}`
    );
  }
  for (const [patternId, anchor] of Object.entries(adjustment.anchorOverrides ?? {})) {
    const pattern = SERVICE_PATTERNS.find((candidate) => candidate.id === patternId);
    assert(Boolean(pattern), `${adjustment.id}: unknown anchor pattern ${patternId}`);
    assert(Boolean(pattern?.stops.includes(anchor.code)), `${adjustment.id}: unknown anchor code`);
  }
}

const codedStationsWithoutService = STATIONS.filter(
  (station) =>
    !SERVICE_PATTERNS.some((pattern) =>
      pattern.stops.some((code) => STATION_ID_BY_CODE.get(code) === station.id)
    )
);
assert(
  codedStationsWithoutService.length === 0,
  `Stations without a service pattern: ${codedStationsWithoutService
    .map((station) => station.name)
    .join(", ")}`
);

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Data validation passed: ${STATIONS.length} physical stations, ${STOP_BY_CODE.size} coded stops, ${SERVICE_PATTERNS.length} directed service patterns, ${SERVICE_ADJUSTMENTS.length} special-service rules.`
);
