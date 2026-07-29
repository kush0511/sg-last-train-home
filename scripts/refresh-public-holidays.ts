import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source =
  "https://data.gov.sg/api/action/datastore_search?resource_id=d_8ef23381f9417e4d4254ee8b4dcdb176&limit=500";
const response = await fetch(source, {
  headers: { "User-Agent": "sg-last-train-home public-holiday refresh" }
});
if (!response.ok) throw new Error(`Public-holiday API returned ${response.status}`);

const payload = (await response.json()) as {
  result?: { records?: Array<{ date?: string; holiday?: string }> };
};
const currentSingaporeYear = Number(
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric" }).format(
    new Date()
  )
);
const holidays = Object.fromEntries(
  (payload.result?.records ?? [])
    .filter(
      (record): record is { date: string; holiday: string } =>
        typeof record.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
        Number(record.date.slice(0, 4)) >= currentSingaporeYear &&
        Number(record.date.slice(0, 4)) <= currentSingaporeYear + 1 &&
        typeof record.holiday === "string"
    )
    .map((record) => [record.date, record.holiday])
    .sort(([a], [b]) => a.localeCompare(b))
);
if (!Object.keys(holidays).length) throw new Error("Public-holiday API returned no valid records");

const destination = fileURLToPath(new URL("../src/data/public-holidays.json", import.meta.url));
await writeFile(
  destination,
  `${JSON.stringify(
    {
      source,
      retrievedAt: new Date().toISOString().slice(0, 10),
      holidays
    },
    null,
    2
  )}\n`
);
const snapshotPath = fileURLToPath(new URL("../src/data/snapshot.json", import.meta.url));
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as Record<string, unknown>;
snapshot.publicHolidayYears = [...new Set(Object.keys(holidays).map((date) => Number(date.slice(0, 4))))];
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Refreshed ${Object.keys(holidays).length} public-holiday dates from data.gov.sg.`);
