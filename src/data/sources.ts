import type { SourceRecord } from "../lib/types";

export const SOURCES: SourceRecord[] = [
  {
    id: "lta-network-map",
    title: "Singapore MRT and LRT System Map",
    publisher: "Land Transport Authority",
    url: "https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-22",
    use: "Operating lines, stations, codes, and network topology",
    authority: "official",
    reusePolicy: "Referenced and manually normalised; no automated copying"
  },
  {
    id: "lta-ccl6",
    title: "Circle Line 6",
    publisher: "Land Transport Authority",
    url: "https://www.lta.gov.sg/content/ltagov/en/upcoming_projects/rail_expansion/circle_line_6.html",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-12",
    use: "CCL6 opening, stations, and completed-loop topology",
    authority: "official",
    reusePolicy: "Facts referenced with attribution"
  },
  {
    id: "sbs-first-last",
    title: "First Train / Last Train",
    publisher: "SBS Transit",
    url: "https://www.sbstransit.com.sg/first-train-last-train",
    retrievedAt: "2026-07-29",
    dataAsOf: "2025-02-28",
    use: "Station-specific NEL/DTL last-departure cutoffs and Sengkang/Punggol LRT Town Centre loop cutoffs",
    authority: "official",
    reusePolicy: "Bounded one-time retrieval of normalised factual cutoffs; raw HTML is not committed"
  },
  {
    id: "sbs-travel-time",
    title: "Train travel times",
    publisher: "SBS Transit",
    url: "https://www.sbstransit.com.sg/travel-time",
    retrievedAt: "2026-07-29",
    dataAsOf: "2025-02-28",
    use: "Official NEL, DTL, Sengkang and Punggol line-level travel-time cross-checks",
    authority: "official",
    reusePolicy: "Referenced for manual plausibility checks; images are not redistributed"
  },
  {
    id: "smrt-station-pages",
    title: "Station first and last train pages",
    publisher: "SMRT",
    url: "https://journey.smrt.com.sg/journey/station_info/outram-park/first-and-last-train/",
    retrievedAt: "2026-07-29",
    use: "One-time normalised SMRT station last-departure tables by weekday, Saturday, Sunday/public holiday and public-holiday eve",
    authority: "official",
    reusePolicy: "Bounded one-time retrieval, normalised factual times only; raw HTML is not committed and this source is never scheduled"
  },
  {
    id: "lta-service-adjustments",
    title: "Train service adjustments",
    publisher: "Land Transport Authority",
    url: "https://www.lta.gov.sg/content/ltagov/en/map/announcement.html",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "DTL early closures/late openings and Sengkang West LRT closure",
    authority: "official",
    reusePolicy: "Facts referenced with attribution"
  },
  {
    id: "smrt-national-day-2026",
    title: "Last bus and train timings extension for National Day Eve 2026",
    publisher: "SMRT",
    url: "https://www.smrt.com.sg/news-publications/newsroom/service-announcements/last-bus-train-timings-extension-for-national-day-eve-2026/",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "Published departure anchors for the 8 August 2026 service extension",
    authority: "official",
    reusePolicy: "Selected factual anchors referenced with attribution"
  },
  {
    id: "mom-public-holidays",
    title: "Public holidays",
    publisher: "Ministry of Manpower",
    url: "https://data.gov.sg/api/action/datastore_search?resource_id=d_8ef23381f9417e4d4254ee8b4dcdb176&limit=500",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "2026 and 2027 public-holiday calendar and observed days",
    authority: "official",
    reusePolicy: "Official open-data API; annual GitHub Action opens a review PR"
  },
  {
    id: "community-transfer-times",
    title: "Singapore rail transfer walking-time dataset",
    publisher: "Community-maintained Google Sheet",
    url: "https://docs.google.com/spreadsheets/d/1e-Tuf6rHBFsgsuFN7XqbFL8ec_vdRjQw/edit",
    retrievedAt: "2026-07-29",
    use: "Direction-specific interchange walking estimates",
    authority: "community",
    reusePolicy: "Small factual measurements normalised with source label"
  },
  {
    id: "model-smrt-conservative",
    title: "Conservative late-night service model",
    publisher: "Last Train Home",
    url: "docs/METHODOLOGY.md",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "Estimated SMRT last-departure curves where no complete public timetable exists",
    authority: "model",
    reusePolicy: "Project-authored assumptions"
  },
  {
    id: "model-short-turn",
    title: "Short-turn service model",
    publisher: "Last Train Home",
    url: "docs/METHODOLOGY.md",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "Conservative terminus-aware short-working examples",
    authority: "model",
    reusePolicy: "Project-authored assumptions"
  },
  {
    id: "model-ccl6-service-pattern",
    title: "CCL6 service-pattern model",
    publisher: "Last Train Home",
    url: "docs/METHODOLOGY.md",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "Main-loop and Dhoby Ghaut spur separation",
    authority: "model",
    reusePolicy: "Project-authored assumptions from LTA service descriptions"
  },
  {
    id: "model-lrt-conservative",
    title: "Conservative LRT service model",
    publisher: "Last Train Home",
    url: "docs/METHODOLOGY.md",
    retrievedAt: "2026-07-29",
    dataAsOf: "2026-07-29",
    use: "Loop direction, transfer, and late-headway estimates",
    authority: "model",
    reusePolicy: "Project-authored assumptions"
  },
  {
    id: "sbs-lrt-town-centre",
    title: "LRT first and last train",
    publisher: "SBS Transit",
    url: "https://www.sbstransit.com.sg/first-train-last-train",
    retrievedAt: "2026-07-29",
    dataAsOf: "2020-06-02",
    use: "Town-centre LRT service horizon; non-town-centre departures remain estimated",
    authority: "official",
    reusePolicy: "Referenced with conservative modelling"
  }
];

export const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));
