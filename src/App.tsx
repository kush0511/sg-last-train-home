import { useMemo, useState } from "preact/hooks";
import { StationPicker } from "./components/StationPicker";
import {
  LINES,
  NETWORK_AS_OF,
  STATIONS,
  STATION_BY_ID
} from "./data/network";
import { PATTERN_BY_ID } from "./data/services";
import { SOURCE_BY_ID } from "./data/sources";
import { calculateLastTrain } from "./lib/routing";
import { resolveStationInput } from "./lib/station-search";
import {
  formatDuration,
  formatServiceTime,
  hasDeparturePassed,
  singaporeToday
} from "./lib/time";
import type { CalculationResult, JourneyResult, Station } from "./lib/types";

const DEFAULT_ORIGIN = STATIONS.find((station) => station.id === "farrer-park")!;
const DEFAULT_DESTINATION = STATIONS.find((station) => station.id === "lakeside")!;
const DESTINATION_STORAGE_KEY = "last-train-home.destination";

function preferredDestination(): Station {
  if (typeof window === "undefined") return DEFAULT_DESTINATION;
  try {
    const stored = window.localStorage.getItem(DESTINATION_STORAGE_KEY);
    return (stored && STATION_BY_ID.get(stored)) || DEFAULT_DESTINATION;
  } catch {
    return DEFAULT_DESTINATION;
  }
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short"
  }).format(new Date(`${date}T12:00:00+08:00`));
}

function scheduleLabel(result: JourneyResult): string {
  if (result.serviceDay.publicHoliday) return "Sun / PH";
  if (result.serviceDay.isPublicHolidayEve) return "PH eve";
  if (result.serviceDay.dayType === "saturday") return "Saturday";
  if (result.serviceDay.dayType === "sunday-public-holiday") return "Sun / PH";
  return "Weekday";
}

function scheduleDescription(result: JourneyResult): string {
  if (result.serviceDay.publicHoliday) return "Sunday / public holiday timetable";
  if (result.serviceDay.isPublicHolidayEve) return "Public holiday eve timetable";
  if (result.serviceDay.dayType === "saturday") return "Saturday timetable";
  if (result.serviceDay.dayType === "sunday-public-holiday") {
    return "Sunday / public holiday timetable";
  }
  return "Weekday timetable";
}

function LineBadge({ patternId }: { patternId: string }) {
  const pattern = PATTERN_BY_ID.get(patternId)!;
  const line = LINES[pattern.lineId];
  return (
    <span
      class="line-badge"
      style={{ "--line": line.colour, "--line-text": line.textColour }}
      aria-label={line.name}
    >
      {line.shortName}
    </span>
  );
}

function TrainMark() {
  return (
    <svg class="train-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M9 3.5h14c2.3 0 4 1.8 4 4v13.2c0 2.1-1.7 3.8-3.8 3.8H8.8A3.8 3.8 0 0 1 5 20.7V7.5c0-2.2 1.8-4 4-4Z" />
      <path d="M9 8h14v8H9z" />
      <circle cx="10.5" cy="20" r="1.5" />
      <circle cx="21.5" cy="20" r="1.5" />
      <path d="m10 25-3 4m15-4 3 4M9 28h14" />
    </svg>
  );
}

function JourneyBoard({
  result,
  dataStale,
  alternatives,
  notices
}: {
  result: JourneyResult;
  dataStale: boolean;
  alternatives: JourneyResult[];
  notices: string[];
}) {
  const departed = hasDeparturePassed(result.serviceDay.date, result.boardBy);
  const exact = result.confidence === "exact" && !dataStale;
  const sourceRecords = result.evidence
    .map((item) => SOURCE_BY_ID.get(item.sourceId))
    .filter((source, index, all) => source && all.findIndex((item) => item?.id === source.id) === index);
  const activeNotices = notices.filter((notice) => result.warnings.includes(notice));

  return (
    <section class="departure-board" aria-live="polite" aria-labelledby="board-title">
      <span class="visually-hidden">
        {exact ? "Exact last scheduled train" : "Estimated safe board-by time"}.{" "}
        {scheduleDescription(result)}.
      </span>
      <div class="board-status">
        <span class={exact ? "status-published" : "status-estimate"}>
          <i aria-hidden="true" />
          {dataStale ? "Stale data" : exact ? "Published" : "Estimated"}
        </span>
        <span>
          {shortDate(result.serviceDay.date)} · {scheduleLabel(result)}
        </span>
      </div>

      <div class="board-core">
        <div class="board-time">
          <div>
            <p id="board-title">
              {dataStale
                ? "Verify before travel"
                : exact
                  ? "Exact last train"
                  : "Be on the platform by"}
            </p>
            <time data-testid="board-by">{formatServiceTime(result.boardBy)}</time>
          </div>
          <div class="arrival-time">
            <span>Arrive</span>
            <strong>{formatServiceTime(result.arriveBy)}</strong>
            <small>{formatDuration(result.arriveBy - result.boardBy)}</small>
          </div>
        </div>

        <div class="board-journey">
          {departed ? (
            <div class="alert-line" role="alert">
              Departed · do not rely on this route now
            </div>
          ) : null}
          {dataStale ? (
            <div class="alert-line" role="alert">
              Data too old for this date · verify with the operator
            </div>
          ) : null}

          {activeNotices.map((notice) => (
            <details class="service-notice" key={notice}>
              <summary>
                <span>!</span>
                {notice.split(".")[0]}
                <span aria-hidden="true">＋</span>
              </summary>
              <p>{notice}</p>
            </details>
          ))}

          <div
            class={`compact-route ${result.rides.length > 1 ? "has-transfers" : ""}`}
            aria-label="Recommended train itinerary"
          >
            {result.rides.map((ride, index) => {
              const pattern = PATTERN_BY_ID.get(ride.patternId)!;
              const from = STATION_BY_ID.get(ride.fromStationId)!;
              const to = STATION_BY_ID.get(ride.toStationId)!;
              const transfer = result.transfers[index];
              return (
                <div class="compact-leg" key={`${ride.patternId}-${index}`}>
                  <div
                    class="leg-rail"
                    style={{ "--line": LINES[pattern.lineId].colour }}
                    aria-hidden="true"
                  >
                    <i />
                    <span />
                    <i />
                  </div>
                  <div class="leg-content">
                    <div class="leg-heading">
                      <LineBadge patternId={ride.patternId} />
                      <strong>
                        {from.name} <b>→</b> {to.name}
                      </strong>
                      <time>{formatServiceTime(ride.departure)}</time>
                    </div>
                    <p>
                      {ride.fromCode} · Towards {pattern.destination} ·{" "}
                      {ride.stopCodes.length - 1} stop
                      {ride.stopCodes.length === 2 ? "" : "s"}
                    </p>
                  </div>
                  {transfer ? (
                    <div class="transfer-line">
                      <span>Change at {STATION_BY_ID.get(transfer.stationId)!.name}</span>
                      <span>
                        {transfer.walkMinutes} min walk + {transfer.bufferMinutes} min buffer
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div class="board-foot">
        <span>
          {result.transfers.length} change{result.transfers.length === 1 ? "" : "s"}
        </span>
        <span>{exact ? "Exact departure" : "Conservative estimate"}</span>
        <span>Data 29 Jul</span>
      </div>

      <details class="technical-drawer">
        <summary>
          <span>How this was calculated</span>
          <span aria-hidden="true">＋</span>
        </summary>
        <div class="technical-content">
          <ol>
            {[...result.rides].reverse().map((ride) => {
              const pattern = PATTERN_BY_ID.get(ride.patternId)!;
              return (
                <li key={`${ride.patternId}-${ride.fromCode}`}>
                  <strong>{pattern.label}</strong> at {ride.fromCode}: last source time{" "}
                  {formatServiceTime(ride.publishedLastDeparture)}
                  {ride.steppedBackByMinutes
                    ? `, stepped back ${ride.steppedBackByMinutes} min for the connection.`
                    : ", no headway step-back."}
                </li>
              );
            })}
          </ol>
          {result.warnings.length ? (
            <ul>
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {activeNotices.length ? (
            <div class="drawer-notices">
              {activeNotices.map((notice) => (
                <p key={notice}>{notice}</p>
              ))}
            </div>
          ) : null}
          <div class="source-links">
            {sourceRecords.map((source) =>
              source ? (
                <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                  {source.publisher} ↗
                </a>
              ) : null
            )}
          </div>
          <p>
            Scheduled service only; live disruptions are not included. Allow extra time
            from the station entrance.
          </p>
        </div>
      </details>

      {alternatives.length ? (
        <details class="technical-drawer alternatives-drawer">
          <summary>
            <span>{alternatives.length} other route{alternatives.length === 1 ? "" : "s"}</span>
            <span aria-hidden="true">＋</span>
          </summary>
          <div class="alternative-lines">
            {alternatives.map((alternative) => (
              <div key={alternative.signature}>
                <strong>{formatServiceTime(alternative.boardBy)}</strong>
                <span>
                  {alternative.rides
                    .map((ride) => LINES[PATTERN_BY_ID.get(ride.patternId)!.lineId].shortName)
                    .join(" → ")}
                </span>
                <small>{alternative.transfers.length} changes</small>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function App() {
  const today = singaporeToday();
  const initialDestination = useMemo(() => preferredDestination(), []);
  const [originInput, setOriginInput] = useState(DEFAULT_ORIGIN.searchLabel);
  const [destinationInput, setDestinationInput] = useState(initialDestination.searchLabel);
  const [date, setDate] = useState(today);
  const [bufferMinutes, setBufferMinutes] = useState(3);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<CalculationResult>(() =>
    calculateLastTrain({
      originId: DEFAULT_ORIGIN.id,
      destinationId: initialDestination.id,
      date: today,
      bufferMinutes: 3
    })
  );

  const networkAge = useMemo(() => {
    const current = new Date(`${today}T00:00:00Z`);
    const snapshot = new Date(`${NETWORK_AS_OF}T00:00:00Z`);
    return Math.max(0, Math.floor((current.getTime() - snapshot.getTime()) / 86_400_000));
  }, [today]);
  const selectedDateOffset = useMemo(() => {
    const selected = new Date(`${date}T00:00:00Z`);
    const snapshot = new Date(`${NETWORK_AS_OF}T00:00:00Z`);
    return Math.max(0, Math.floor((selected.getTime() - snapshot.getTime()) / 86_400_000));
  }, [date]);
  const dataStale = networkAge > 45 || selectedDateOffset > 45;

  function submit(event: Event) {
    event.preventDefault();
    const origin = resolveStationInput(originInput);
    const destination = resolveStationInput(destinationInput);
    if (origin) setOriginInput(origin.searchLabel);
    if (destination) {
      setDestinationInput(destination.searchLabel);
      try {
        window.localStorage.setItem(DESTINATION_STORAGE_KEY, destination.id);
      } catch {
        // Storage is optional.
      }
    }
    setResult(
      calculateLastTrain({
        originId: origin?.id ?? "",
        destinationId: destination?.id ?? "",
        date,
        bufferMinutes
      })
    );
    setDirty(false);
  }

  function swapStations() {
    setOriginInput(destinationInput);
    setDestinationInput(originInput);
    setDirty(true);
  }

  function updateOrigin(value: string) {
    setOriginInput(value);
    setDirty(true);
  }

  function updateDestination(value: string) {
    setDestinationInput(value);
    setDirty(true);
  }

  return (
    <div class="app-shell">
      <header class="rail-header">
        <div class="wordmark">
          <TrainMark />
          <h1>Last train home</h1>
        </div>
        <span>Singapore · SGT</span>
      </header>

      <main>
        <form class="route-controls" onSubmit={submit}>
          <div class="station-fields">
            <span class="input-rail" aria-hidden="true">
              <i />
              <b />
              <i />
            </span>
            <StationPicker
              id="origin"
              label="From"
              accessibleLabel="Leaving from"
              value={originInput}
              onInput={updateOrigin}
            />
            <button
              class="swap-button"
              type="button"
              onClick={swapStations}
              aria-label="Swap origin and destination"
              title="Swap stations"
            >
              <span class="swap-icon swap-icon--vertical" aria-hidden="true">⇅</span>
              <span class="swap-icon swap-icon--horizontal" aria-hidden="true">⇄</span>
            </button>
            <StationPicker
              id="destination"
              label="Home"
              accessibleLabel="Going home to"
              value={destinationInput}
              onInput={updateDestination}
            />
          </div>

          <div class="control-strip">
            <label>
              <span>Date</span>
              <input
                type="date"
                name="date"
                aria-label="Service date · Singapore time"
                value={date}
                min="2026-01-01"
                max="2027-12-31"
                onInput={(event) => {
                  setDate(event.currentTarget.value);
                  setDirty(true);
                }}
              />
            </label>
            <label>
              <span>Buffer</span>
              <select
                name="buffer"
                aria-label="Extra connection buffer"
                value={bufferMinutes}
                onChange={(event) => {
                  setBufferMinutes(Number(event.currentTarget.value));
                  setDirty(true);
                }}
              >
                {[0, 2, 3, 5, 8, 10, 15].map((minutes) => (
                  <option value={minutes} key={minutes}>
                    {minutes} MIN
                  </option>
                ))}
              </select>
            </label>
            <button
              class="calculate-button"
              type="submit"
              aria-label="Calculate my last train"
            >
              Check <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        {!dirty && result.error ? (
          <section class="error-line" role="alert">
            <strong>No route</strong>
            <span>{result.error}</span>
          </section>
        ) : null}

        {!dirty && result.recommended ? (
          <JourneyBoard
            result={result.recommended}
            dataStale={dataStale}
            alternatives={result.alternatives}
            notices={result.notices}
          />
        ) : null}
      </main>

      <footer class="rail-footer">
        <span>Scheduled times · no live disruptions</span>
        <a href="https://github.com/kush0511/sg-last-train-home">Source ↗</a>
      </footer>
    </div>
  );
}
