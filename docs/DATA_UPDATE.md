# Data update runbook

The update process is intentionally manual because the relevant operator terms do not
permit an unattended scraper.

## Routine review

1. Open the LTA rail-network page and current system map.
2. Confirm every operating station/code and note openings, closures or renamed stops.
3. Open the LTA service-announcement page and record dated adjustments.
4. Open the current SBS Transit NEL/DTL first/last-train tables.
5. Open affected SMRT station or event pages for factual anchors.
6. Check the Ministry of Manpower holiday list when a new calendar year is published.
7. Record the retrieval date, publisher update label, URL, scope and authority in
   `src/data/sources.ts`.
8. Edit the smallest reviewable data module and bump `datasetVersion`,
   `generatedAt`, `networkAsOf`, and counts in `src/data/snapshot.json`.
9. Run `npm run data:export` and review the versioned JSON diff in `data/`.

Do not copy an entire page or automate access around an operator restriction.

## Required gates

Run:

```sh
npm ci
npm run validate:data
npm test
npm run build
npm run test:e2e
npm run check:freshness
```

Then manually verify at minimum:

- Farrer Park → Lakeside with 3-minute buffer;
- a direct DTL exact cutoff;
- a post-midnight NEL result;
- Changi Airport branch;
- CCL spur to main loop;
- each LRT loop family;
- every active dated adjustment;
- mobile 320 px, mobile 390 px and desktop layouts;
- keyboard focus, labels, result announcement, and reduced motion.

Update `docs/VALIDATION.md` with observed output and the commit.

## Failure and rollback

- Do not overwrite a last known-good snapshot when parsing or validation fails.
- `loadSnapshotWithFallback` rejects an invalid envelope and retains the prior payload.
- The weekly workflow fails after 45 days without a review; it never modifies
  production data.
- If a bad snapshot reaches `main`, revert the single data commit and redeploy the
  prior Pages artifact.
- Preserve the failed candidate and error output in an issue or branch for diagnosis.

## Freshness policy

- 0–30 days since network review: current
- 31–45 days: warning
- more than 45 days: CI failure / manual review required

This threshold concerns network/notices review. An operator’s own older “updated”
label is separately shown and does not become newer simply because the page was
re-opened.
