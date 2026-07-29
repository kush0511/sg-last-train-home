# Methodology

Snapshot version: **2026.07.29**  
Timezone: **Asia/Singapore**  
Network and source pages checked: **29 July 2026**

## Product claim

The calculator answers a narrow question: “What is the latest train I should plan to
board at this origin if I want a plausible route to this destination?”

It cannot answer “Will I definitely make it?” Rail operators do not publish a complete
machine-readable working timetable for every Singapore service. Walking pace,
platform assignment, crowding, doors closing, incidents, maintenance, and operational
short workings can invalidate a mathematically feasible connection.

The interface therefore uses two labels:

| Label | Meaning |
| --- | --- |
| Exact last scheduled train | One direct ride whose station cutoff is published by the operator, with no inferred headway or transfer |
| Estimated safe board-by time | Any multi-ride journey, conservative schedule curve, inferred headway, fallback transfer, or propagated special-service time |

An “exact” board-by claim applies to departure only. Arrival times remain indicative.

## Network representation

The graph is made from **directed service patterns**, not undirected station pairs.
Each pattern has:

- a line and operator;
- an ordered stop sequence;
- a destination/terminus;
- segment running-time estimates;
- a station-specific published cutoff table or a conservative origin horizon;
- a late-night headway assumption;
- a source and data date.

This prevents a train from being treated as if it serves stations beyond its terminus.
The graph includes:

- both directions of each linear MRT line;
- separate East–West Line main and Changi shuttle patterns;
- a CCL main loop in each direction plus the Dhoby Ghaut–Stadium spur;
- explicit BPLRT Service A/B loop directions and trunk;
- both directions of the Sengkang and Punggol east/west loops;
- conservative NSL/EWL short-working examples with their own termini.

The model never creates a zero-minute line transfer. Switching between main/spur
patterns on the same line still consumes the user’s connection buffer.

## Reverse timetable calculation

For a candidate route with rides \(R_1 \dots R_n\):

1. Set \(R_n\)'s departure to its last usable departure at the boarding station.
2. Calculate its indicative arrival using segment running times.
3. For each preceding ride \(R_i\), compute:

   `latest arrival = next departure − interchange walk − user buffer`

   `departure cap = latest arrival − ride time`

4. If the published/modelled final departure is later than that cap, step back by:

   `ceil((published last − cap) / late headway) × late headway`

5. Repeat to the origin.

The default connection buffer is three minutes and is applied once per train change,
in addition to the interchange walk.

### Worked validation: Farrer Park → Lakeside

For 29 July 2026 with the default three-minute buffer:

1. The selected EWL westbound train leaves Outram Park at 12:02 AM (published anchor
   used to calibrate the EWL estimate).
2. NEL platform to EWL platform is modelled as a three-minute direction-specific walk.
3. Adding the three-minute user buffer means reaching Outram by 11:56 PM.
4. The NEL ride from Farrer Park to Outram takes about ten minutes.
5. The published final NEL train at Farrer Park is 11:48 PM, which is too late for that
   protected connection.
6. Stepping back by the conservative seven-minute late headway produces **11:41 PM**.

The result is correctly labelled **Estimated safe board-by time**, not exact.

## Schedule model and confidence

### SBS Transit-operated NEL and DTL

Station-specific last departures are manually normalised from the current
[SBS Transit First Train / Last Train page](https://www.sbstransit.com.sg/first-train-last-train).
The page was checked on 29 July 2026 and labels the DTL table 28 February 2025 and the
NEL table 10 December 2024.

A direct, unadjusted NEL/DTL result can retain an exact published-departure label.
Once the calculation steps back by a headway, transfers, or applies an early closure,
the journey becomes estimated.

The one-time normalised snapshot expands the operator's columns into the app's
weekday, Saturday and Sunday/public-holiday categories. DTL publishes one last-train
column for all days; NEL publishes weekday and weekend/public-holiday columns.
They are stored separately even where the current values match, so a future operator
change cannot silently collapse the date classes.

### SBS Transit-operated Sengkang and Punggol LRT

SBS Transit publishes the daily last departure from Sengkang or Punggol Town Centre
for each East and West loop, but not a station-by-station last-train table. The Town
Centre value is therefore exact. Other LRT stops are conservatively propagated using
the modelled loop order and late-service segment times and remain estimated.

### SMRT-operated MRT and LRT

SMRT exposes station pages and selected event timetables, but not a complete reusable
working timetable. A bounded one-time import supplies published station last departures
for weekday, Saturday, Sunday/public-holiday and public-holiday-eve categories. A
missing category or service pattern falls back to the conservative service curve and
remains estimated.

The ordinary late-night headway is seven minutes (twelve for the airport shuttle and
eight for LRT). This is a conservative planning assumption, not a claim that trains
run at a fixed interval.

### Running times

NEL/DTL segment estimates follow the progression between published station cutoffs
where available. EWL segments are calibrated to selected official anchors (Pasir Ris,
City Hall, Outram Park, Clementi and Jurong East). Other segments use conservative
two-/three-minute increments.

These running times are sufficient to protect connections but do not claim second-level
precision.

## Transfers

Interchanges are directional. A small community-maintained measurement dataset supplies
the normalised walking estimates; the source is labelled in the UI. Examples include:

- Outram Park NEL → EWL: three minutes (150 seconds rounded up);
- Little India NEL → DTL: five minutes;
- Little India DTL → NEL: four minutes.

When no measured pair exists, the model uses six minutes and shows a fallback warning.
Newton, Tampines and Bukit Panjang are flagged as potential out-of-system interchanges.

## Service day and calendar

Times from midnight through 3:59 AM are represented as minutes greater than 24:00 and
belong to the preceding service date. That prevents a 12:02 AM last train from sorting
before an 11:48 PM train.

The calendar contains official 2026 and 2027 public holidays and observed days from
Singapore’s Ministry of Manpower. Public-holiday eves do **not** automatically receive
an extension; only a dated, published override changes a time.

## Dated adjustments

- DTL Friday early closures from 10 July through 4 September 2026 cap service at
  approximately 11:30 PM. Without station-specific finals, the model subtracts
  remaining runtime and labels the result estimated.
- DTL Saturday late openings from 11 July through 5 September 2026 appear as service
  notices.
- Sengkang West Loop service from STC towards SW1 is disabled 19 April–18 October
  2026; routing uses the outer direction via SW8.
- National Day Eve on 8 August 2026 uses selected published SMRT departure anchors.
  Times propagated away from an anchor remain estimates.

## Route ranking

The engine first maximises board-by time. When candidates differ by no more than two
minutes, it prefers:

1. fewer transfers;
2. exact over estimated;
3. shorter total duration.

It limits routes to four train changes, avoids physical-station cycles, prevents
unnecessary same-line pattern hopping, and does not leave and later re-enter the same
line. A detour guard discards paths more than 35% (or at least 20 minutes) longer than
the fastest feasible path before last-departure ranking; this prevents a much later but
operationally absurd cross-island loop from winning.

## Known limits

- No live disruption feed.
- No guarantee that a published final train accepts every downstream connection.
- SMRT station-level final departures are exact only where a published category value
  is present; unrepresented services remain estimates.
- LRT town-centre source labels are old; station-level timings are deliberately
  modelled rather than presented as exact.
- Walking times vary by platform, lift/escalator status, mobility, crowding and gate
  route.
- The holiday table currently covers only 2026–2027.
- Future stations are added only after passenger service begins.
- CCL operating patterns can change by time of day; the main-loop/spur model is
  conservative and should be checked against station signage.

When the cost of missing the train is high, leave earlier than the calculated time.
