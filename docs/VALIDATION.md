# Validation report

Snapshot: **2026.07.29**  
Validation date: **29 July 2026**  
Environment: Node 24, Chromium mobile and desktop projects

## Automated gates

| Gate | Coverage | Result |
| --- | --- | --- |
| `npm run validate:data` | Counts, codes, current/future stations, patterns, segment shapes, sources, monotonic exact cutoffs, adjustments | Pass |
| `npm test` | Service-day time, calendar, fallback/staleness, branch/loop/terminus graph, reverse scheduling, buffers, transfers, overrides, typo-tolerant station ranking | Pass — 49 tests |
| `npm run test:coverage` | Pure calculation and search modules | Pass — 89.81% statements, 83.13% branches, 93.50% functions, 93.01% lines |
| `npm run build` | Strict TypeScript and Vite production bundle | Pass |
| `npm run test:e2e` | Fifteen user-visible scenarios in 320×568, iPhone 13 and desktop Chromium, with page/console error capture | Pass — 45 checks |
| `PLAYWRIGHT_BASE_URL=… npx playwright test` | The same 45 checks in fresh contexts against the deployed repository path | Pass — 45 checks |
| `npm run check:freshness` | 30-day warning / 45-day failure policy | Pass |

## Validation sample

Times after midnight are shown on the passenger clock below but remain greater than
24:00 internally. “Expected” means the published anchor or the independently specified
model behaviour; it does not turn an estimated route into an operator-published trip.

| Case and service date | Expected | Actual | Source pages used | Claim, uncertainty and discrepancy |
| --- | --- | --- | --- | --- |
| Boon Lay → Lakeside, 29 Jul | Direct eastbound EWL service that reaches EW26; no transfer buffer | 11:23 PM → 11:26 PM, direct | [SMRT station information](https://journey.smrt.com.sg/journey/station_info/outram-park/first-and-last-train/), [LTA network](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html) | Estimated from the conservative EWL curve. No topology discrepancy. |
| Farrer Park → Lakeside, 29 Jul, buffer 3 | NEL → EWL at Outram; 3-min walk + 3-min buffer; earlier than the 11:48 PM final NEL | 11:41 PM → 12:30 AM | [SBS first/last train](https://www.sbstransit.com.sg/first-train-last-train), [SMRT Outram](https://journey.smrt.com.sg/journey/station_info/outram-park/first-and-last-train/), [transfer sheet](https://docs.google.com/spreadsheets/d/1e-Tuf6rHBFsgsuFN7XqbFL8ec_vdRjQw/edit?gid=459175256#gid=459175256) | Estimated when the NEL leg steps back seven minutes to protect the connection. No discrepancy. |
| Bukit Panjang → Expo, 29 Jul | Published direct DTL cutoff | 11:35 PM, direct | [SBS first/last train](https://www.sbstransit.com.sg/first-train-last-train) | Exact published departure. Arrival remains indicative. No discrepancy. |
| HarbourFront → Punggol Coast, 29 Jul | Published 11:55 PM NEL final; arrival remains on the same service day after midnight | 11:55 PM → 12:32 AM, direct | [SBS first/last train](https://www.sbstransit.com.sg/first-train-last-train), [SBS travel time](https://www.sbstransit.com.sg/travel-time) | Exact published departure; indicative arrival. No discrepancy. |
| Outram Park → Lakeside, 29 Jul | Reproduce the official 12:02 AM EWL westbound anchor | 12:02 AM → 12:30 AM, direct | [SMRT Outram](https://journey.smrt.com.sg/journey/station_info/outram-park/first-and-last-train/) | Estimated journey because the downstream running curve is modelled; anchor matched exactly. |
| Jurong East → HarbourFront, 29 Jul | A later CCL route via Buona Vista should beat the faster daytime EWL → NEL route | 11:31 PM → 12:27 AM via EWL + CCL | [LTA network](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html), SMRT model sources in `DATA_SOURCES.md` | Estimated. Confirms latest-departure ranking rather than shortest-path ranking. |
| Pasir Ris → Tuas Link, 29 Jul | Reject the later service terminating at Joo Koon; retain a train reaching EW33 | 11:23 PM → 12:51 AM, direct full-line pattern | [LTA network](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html), SMRT model sources in `DATA_SOURCES.md` | Estimated. Short-turn filtering behaved as specified. |
| Changi Airport → Bedok, 29 Jul | Airport shuttle then EWL; mandatory change at Tanah Merah | 11:06 PM → 11:35 PM via CGL + EWL | [LTA network](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html), SMRT model sources in `DATA_SOURCES.md` | Estimated. Branch topology and transfer are explicit; no fictional through train. |
| Cheng Lim → Sengkang, 29 Jul | Closed inner direction excluded; outer loop via Renjong remains | 11:47 PM → 11:50 PM via outer West Loop | [LTA service announcements](https://www.lta.gov.sg/content/ltagov/en/map/announcement.html) | Estimated LRT time. Closure direction applied; no discrepancy. |
| Bukit Panjang → Expo, 31 Jul | Affected Friday ends around 11:30 PM; origin cutoff must move earlier and lose exact status | 10:22 PM → 11:30 PM, direct | [LTA service announcements](https://www.lta.gov.sg/content/ltagov/en/map/announcement.html) | Estimated because the announcement lacks station-specific final departures. No unsupported precision claimed. |
| Woodlands North → Lakeside, 29 Jul | Valid loop-free multi-transfer route with non-zero walks and buffers | 11:00 PM → 12:30 AM via TEL + NSL + EWL | [LTA network](https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network.html), transfer sources in `DATA_SOURCES.md` | Estimated. Two transfers validate repeated backward scheduling and per-transfer buffers. |
| Farrer Park → Lakeside, buffers 0 / 3 / 10 | Every extra buffer must visibly move the origin recommendation earlier | 11:48 / 11:41 / 11:34 PM | Same sources as the Farrer Park case | Estimated. Exactly one user buffer is charged at the Outram transfer. |

Failure-state checks additionally cover equal stations, an empty active service graph,
missing transfer measurements, stale/parser fallback, passed cutoffs, public holidays,
public-holiday eves, dated extensions, CCL spur/main-loop separation and all three LRT
families.

## Source cross-checks

- Network inventory includes CC30, CC31, CC32, DT4, NE18 and PW2.
- Network inventory excludes unopened DT36, DT37, TE30 and TE31.
- DTL/NEL exact tables are monotonic along each directed pattern.
- EWL calibration reproduces the selected Outram Park westbound 12:02 AM anchor.
- 2026 public holidays and observed days match the Ministry of Manpower list.
- DTL early-close dates and Sengkang West Loop closure window match the LTA
  announcement.

## Manual visual/accessibility checklist

Checked against the production build served locally; the URL-specific checks are
repeated after Pages deployment:

- [x] 320×568: full controls, primary recommendation, both drawers and footer fit
  without horizontal or page-level vertical overflow
- [x] 393×568: station fields, date, buffer and square action controls occupy separate
  non-overlapping grid cells; the complete result and footer remain above the fold
- [x] 1440×900: horizontal controls lead directly into a natural-height, two-column
  departure board without manufacturing empty panel space
- [x] keyboard: visible focus, arrow-key wrap, Home/End, Enter selection and Escape close
- [x] screen-reader semantics: named comboboxes, listbox/option state, live result,
  service notices and error role
- [x] reduced motion: the media query disables transition duration and smooth scrolling
- [x] square-control invariant: every button, input and select computes to zero border radius
- [x] console/page errors: none across all 45 browser checks
- [x] production source links resolve to the cited SBS Transit, SMRT and community pages
- [x] production direct navigation, refresh and repository-root asset paths return 200

## Production evidence

- Production URL:
  <https://kush0511.github.io/sg-last-train-home/>
- Repository:
  <https://github.com/kush0511/sg-last-train-home>
- GitHub Pages workflow:
  [successful run 30419248370](https://github.com/kush0511/sg-last-train-home/actions/runs/30419248370)
- Full CI workflow:
  [successful run 30419248400](https://github.com/kush0511/sg-last-train-home/actions/runs/30419248400)
- The deployed HTML, CSS and JavaScript repository-path assets returned HTTP 200
  with HTTPS enforcement.
- Fresh production browser contexts passed all 45 cases at 320×568, iPhone 13
  and desktop sizes.
- Visual captures:
  [mobile 393×568](screenshots/production-mobile.png) and
  [desktop 1440×900](screenshots/production-desktop.png).

## Residual limitations

Passing validation proves consistency with this committed model; it does not prove
future operations or guarantee a connection. The largest unresolved inputs are a
complete licensed SMRT/LRT working timetable, live disruption data, exact
platform-specific walking times, and official CCL time-of-day service-pattern details.
