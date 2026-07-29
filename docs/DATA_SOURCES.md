# Data sources and provenance

All sources were opened or retrieved on **29 July 2026**. The source registry used by
the app lives in [`src/data/sources.ts`](../src/data/sources.ts).

## Source inventory

| Scope | Publisher | Source | Authority | Used as |
| --- | --- | --- | --- | --- |
| Operating network, codes and topology | Land Transport Authority | [Rail Network](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html) and current system map | Official | Manually normalised network |
| CCL6 opening/topology | Land Transport Authority | [Circle Line 6](https://www.lta.gov.sg/content/ltagov/en/upcoming_projects/rail_expansion/circle_line_6.html) | Official | Operating status and loop completion |
| NEL/DTL/LRT final departures | SBS Transit | [First Train / Last Train](https://www.sbstransit.com.sg/first-train-last-train) | Official | Station-specific NEL/DTL cutoffs and LRT town-centre loop cutoffs |
| NEL/DTL/LRT running-time cross-check | SBS Transit | [Train travel times](https://www.sbstransit.com.sg/travel-time) | Official | Manual plausibility check against official line diagrams |
| SMRT station last departures | SMRT | [Station first/last train](https://journey.smrt.com.sg/journey/station_info/outram-park/first-and-last-train/) pages | Official | One-time normalised station cutoffs by service category |
| 2026 service adjustments | Land Transport Authority | [Train service announcements](https://www.lta.gov.sg/content/ltagov/en/map/announcement.html) | Official | DTL and Sengkang LRT dated rules |
| National Day Eve extension | SMRT | [8 August 2026 extension](https://www.smrt.com.sg/news-publications/newsroom/service-announcements/last-bus-train-timings-extension-for-national-day-eve-2026/) | Official | Selected event departure anchors |
| 2026–2027 holidays | Ministry of Manpower | [Open-data holiday dataset](https://data.gov.sg/api/action/datastore_search?resource_id=d_8ef23381f9417e4d4254ee8b4dcdb176&limit=500) | Official | Calendar and observed days; annual review PR |
| Interchange walks | Community maintainers | [Transfer-time spreadsheet](https://docs.google.com/spreadsheets/d/1e-Tuf6rHBFsgsuFN7XqbFL8ec_vdRjQw/edit) | Community | Direction-specific walking estimates |

## Authority and uncertainty rules

- “Official” describes the publisher, not a promise that the source will never change.
- A complete operator station cutoff may be called exact only for the direct departure
  to which it applies.
- The SBS Transit table supplies every operating NEL and DTL origin in both
  directions. Its Sengkang and Punggol LRT tables supply only Town Centre
  departures, so all other LRT station cutoffs are estimates propagated from
  those published loop horizons.
- Community transfer measurements are rounded up to whole minutes and always labelled
  as estimates.
- Project-authored service curves, segment times, late headways, short workings, and
  propagated event times are estimates.
- Missing inputs are never silently replaced with zero.

### Normalisation and conflicts

- The transfer sheet still uses legacy `CE1`/`CE2` labels in places. They are
  normalised to current `CC34` Bayfront and `CC33` Marina Bay codes; the underlying
  station identity is not changed.
- Directional walking values are rounded up to whole minutes. When two directions
  differ, each is retained rather than averaged.
- NEL/DTL segment plausibility is checked against the official SBS Transit travel-time
  diagrams and against progression between station cutoff rows. Where rounding differs,
  the larger whole-minute segment is preferred for a safe connection.
- Public synthetic GTFS data that assumes a uniform three minutes per station conflicts
  with operator diagrams and was rejected rather than blended into the model.
- The source does not expose a reusable working timetable. The app retains only its
  one-time normalised station departure cutoffs; remaining unrepresented service
  patterns use explicitly labelled conservative values.

## Usage-term review

The [SMRT Terms of Use](https://www.smrt.com.sg/terms-of-use/) prohibit robots and
automatic copying without consent. The
[SBS Transit Conditions for Use](https://www.sbstransit.com.sg/conditions-for-use)
also restrict copying and public display.

Accordingly:

- there is no scheduled operator scraper;
- the project does not mirror HTML, images, branding, or raw pages;
- bounded one-time SMRT and SBS Transit retrievals are normalised into reviewable
  values only;
- only the factual values necessary for calculation are normalised;
- each use is attributed and its uncertainty is exposed;
- automated freshness checks inspect committed metadata; the only scheduled source
  refresh is the official public-holiday open-data API.

This is a product-engineering policy, not legal advice. If an operator provides a
licensed API or reusable feed, it should replace the manual snapshot.

## Data not used

Several public/community repositories and train-status sites were evaluated but not
adopted as an authoritative timetable:

- synthetic GTFS feeds that assume uniform three-minute travel times;
- repositories without a clear redistribution licence;
- third-party aggregators whose SMRT station values are approximate or incomplete;
- sites whose terms prohibit automated copying.

They may be useful for cross-checking but cannot support an exact claim.

## Snapshot contents

[`src/data/snapshot.json`](../src/data/snapshot.json) records the schema version,
dataset version, source-review date, scope, counts and freshness thresholds.
The human-reviewable network, patterns, source records, transfers and adjustments are
committed alongside it. `npm run data:export` writes stable, versioned JSON mirrors to
[`data/`](../data/) for review, comparison and downstream reuse.

The source snapshot explicitly excludes DT36/DT37 and TE30/TE31 until passenger
service begins.
