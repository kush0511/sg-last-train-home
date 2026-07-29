import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  DATASET_VERSION,
  LINES,
  LINE_STOPS,
  NETWORK_AS_OF,
  STATIONS,
  STOP_BY_CODE
} from "../src/data/network";
import { SERVICE_PATTERNS } from "../src/data/services";
import { SERVICE_ADJUSTMENTS } from "../src/data/special-services";
import { SOURCES } from "../src/data/sources";
import { TRANSFER_RULES } from "../src/data/transfers";

const generatedAt = "2026-07-29T10:10:00+08:00";
const outputDirectory = fileURLToPath(new URL("../data/", import.meta.url));

const envelope = <T>(kind: string, payload: T) => ({
  schemaVersion: 1,
  datasetVersion: DATASET_VERSION,
  kind,
  generatedAt,
  networkAsOf: NETWORK_AS_OF,
  timezone: "Asia/Singapore",
  payload
});

const sourceDetails = SOURCES.map((source) => ({
  ...source,
  retrievalTimestamp: `${source.retrievedAt}T00:00:00+08:00`,
  coverage: source.use,
  transformations:
    source.authority === "model"
      ? "Project-authored conservative model; see docs/METHODOLOGY.md"
      : "Manually reviewed and normalised into the internal schema; no runtime fetch",
  confidence:
    source.authority === "official"
      ? "Official publisher for the stated factual scope"
      : source.authority === "community"
        ? "Community estimate; rounded conservatively and labelled"
        : "Model assumption; never presented as exact",
  knownGaps:
    source.authority === "official"
      ? "Coverage is limited to what the linked publisher page exposes"
      : source.authority === "community"
        ? "Not an operator source; station configuration and walking pace vary"
        : "No complete public working timetable; values are conservative"
}));

const files = {
  [`network.v${DATASET_VERSION}.json`]: envelope("network", {
    lines: LINES,
    lineStops: LINE_STOPS,
    stations: STATIONS,
    counts: {
      physicalStations: STATIONS.length,
      codedStops: STOP_BY_CODE.size
    }
  }),
  [`timetables.v${DATASET_VERSION}.json`]: envelope("timetables", {
    patterns: SERVICE_PATTERNS,
    adjustments: SERVICE_ADJUSTMENTS
  }),
  [`transfers.v${DATASET_VERSION}.json`]: envelope("transfers", {
    rules: TRANSFER_RULES,
    fallbackWalkMinutes: 6,
    defaultConnectionBufferMinutes: 3
  }),
  [`sources.v${DATASET_VERSION}.json`]: envelope("sources", {
    sources: sourceDetails
  })
};

await mkdir(outputDirectory, { recursive: true });
for (const [filename, contents] of Object.entries(files)) {
  await writeFile(
    `${outputDirectory}/${filename}`,
    `${JSON.stringify(contents, null, 2)}\n`,
    "utf8"
  );
}
await writeFile(
  `${outputDirectory}/index.json`,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      datasetVersion: DATASET_VERSION,
      generatedAt,
      files: Object.keys(files)
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Exported ${Object.keys(files).length} versioned datasets to ${outputDirectory}`);
