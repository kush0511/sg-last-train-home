import manifest from "../src/data/snapshot.json" with { type: "json" };

const now = new Date();
const asOf = new Date(`${manifest.networkAsOf}T00:00:00+08:00`);
const ageDays = Math.max(0, Math.floor((now.getTime() - asOf.getTime()) / 86_400_000));

console.log(
  `Network snapshot ${manifest.datasetVersion} is ${ageDays} day(s) old; warning threshold ${manifest.freshness.warnAfterDays}, failure threshold ${manifest.freshness.failAfterDays}.`
);

if (ageDays > manifest.freshness.failAfterDays) {
  console.error(
    "Freshness gate failed. Review official network/notices pages and commit a new last known-good snapshot; do not auto-scrape restricted operator pages."
  );
  process.exit(1);
}

if (ageDays > manifest.freshness.warnAfterDays) {
  console.warn("Freshness warning: a manual source review is due.");
}
