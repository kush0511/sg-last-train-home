# Last Train Home

A mobile-first, source-labelled last-train calculator for Singapore’s operating MRT and
LRT network.

**Live application:** <https://kush0511.github.io/sg-last-train-home/>

The app works backwards from the last usable service on each leg. It models directed
service patterns, real termini, the Changi branch, the completed Circle Line loop and
Dhoby Ghaut spur, LRT loop directions, interchange walks, connection buffers,
post-midnight service-day time, public holidays, and dated service adjustments.

The design deliberately distinguishes two very different claims:

- **Exact last scheduled train** — a direct NEL or DTL station cutoff currently
  shown on an operator page, or a precisely published special-event anchor.
- **Estimated safe board-by time** — any result involving a transfer, inferred late-night
  headway, conservatively modelled SMRT/LRT schedule, or propagated special-event
  time.

This is an independent planning aid, not a guarantee. Engineering works, event
extensions, incidents, platform closures, and operational decisions can supersede the
snapshot. Check same-day notices before relying on it.

## Current scope

- 184 physical stations / 216 operating station codes
- Six MRT lines plus Bukit Panjang, Sengkang and Punggol LRT
- CCL6 (Keppel, Cantonment and Prince Edward Road), opened 12 July 2026
- Hume, Punggol Coast and Teck Lee
- DTL3e and TEL5 stations excluded until passenger service begins
- 2026–2027 Singapore public-holiday calendar
- DTL July–September 2026 early closures/late openings
- Sengkang West Loop April–October 2026 directional closure
- Operator-published SMRT last departures by weekday, Saturday, Sunday/public holiday and public-holiday-eve category
- Operator-published NEL/DTL station cutoffs for every ordinary service-day category,
  plus exact Sengkang/Punggol LRT Town Centre loop cutoffs
- Published SMRT National Day Eve 2026 extension anchors
- Typo-tolerant station search with transposed-letter detection, station codes,
  abbreviations, line-name queries, aliases, highlighted matches, interchange codes,
  keyboard control, recent picks, and a locally remembered destination

The versioned data snapshot is `v2026.07.29`.

## Run locally

Requirements: Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Use one-shot verification commands:

```sh
npm run validate:data
npm test
npm run build
npm run test:e2e
npm run check:freshness
```

`npm run dev` and `npm run preview` are persistent servers; stop them with
<kbd>Ctrl</kbd>+<kbd>C</kbd> when finished. CI and the Playwright configuration manage
their own bounded lifecycle.

## How it calculates

1. Enumerate valid paths over directed, line-specific service patterns.
2. Reject paths that use a short working beyond its terminus or a service disabled on
   the selected date.
3. Start with the final ride’s last usable departure.
4. Work backwards through every transfer, subtracting riding time, the
   direction-specific interchange walk, and the selected connection buffer once.
5. Where the required earlier train is not published, step back in conservative
   late-night headway increments.
6. Rank by latest board-by time; within two minutes prefer fewer transfers, then
   stronger confidence and shorter duration.

Read [the full methodology](docs/METHODOLOGY.md), [source inventory](docs/DATA_SOURCES.md),
[update runbook](docs/DATA_UPDATE.md), and [validation report](docs/VALIDATION.md).

## Data refresh and failure safety

The repository has no scheduled operator scraper. Bounded SMRT and SBS Transit
retrievals were used to normalise current station-level last departures; they retain
only the factual times needed for calculation, never raw HTML or branding. Future
operator timetable imports require an explicit maintainer decision. Public-holiday
dates use the official open-data API and are refreshed annually through a review PR.

The weekly data-health workflow validates the committed snapshot and fails visibly
after its freshness threshold. A malformed replacement is rejected by the snapshot
loader, which retains the last known-good payload. Git history and release commits are
the durable rollback path.

## Architecture

- Preact + TypeScript + Vite static application
- Pure routing/calculation modules with Vitest coverage
- Playwright browser scenarios on mobile and desktop
- Static GitHub Pages deployment, no runtime server and no tracking
- Versioned, reviewable source metadata and service adjustments

## Licence

Original application code is MIT licensed. Third-party names, marks, source pages, and
factual datasets remain subject to their own rights and terms; see [NOTICE](NOTICE).
