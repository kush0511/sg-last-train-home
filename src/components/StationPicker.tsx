import type { ComponentChildren, JSX } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { LINES, STOP_BY_CODE, STATION_BY_ID, stationFromInput } from "../data/network";
import {
  normaliseStationQuery,
  rankStations,
  type RankedStation,
  type StationMatchKind
} from "../lib/station-search";
import type { Station } from "../lib/types";

const RECENT_STATIONS_KEY = "last-train-home.recent-stations";
const MAX_RESULTS = 8;

interface StationPickerProps {
  id: string;
  label: string;
  accessibleLabel?: string;
  value: string;
  onInput: (value: string) => void;
}

interface PickerOption extends RankedStation {
  recent?: boolean;
}

const MATCH_LABELS: Partial<Record<StationMatchKind, string>> = {
  "exact-code": "Code",
  code: "Code",
  alias: "Alias",
  initials: "Shortcut",
  line: "Line",
  spelling: "Spelling"
};

function readRecentStations(): Station[] {
  if (typeof window === "undefined") return [];
  try {
    const ids = JSON.parse(window.localStorage.getItem(RECENT_STATIONS_KEY) ?? "[]");
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => (typeof id === "string" ? STATION_BY_ID.get(id) : undefined))
      .filter((station): station is Station => Boolean(station))
      .slice(0, 5);
  } catch {
    return [];
  }
}

function highlightName(name: string, query: string): ComponentChildren {
  const tokens = normaliseStationQuery(query)
    .split(" ")
    .filter((token) => token.length >= 2 && !/^[a-z]{1,2}\d+$/.test(token))
    .filter((token) => name.toLowerCase().includes(token.toLowerCase()));
  if (!tokens.length) return name;

  const expression = new RegExp(
    `(${tokens
      .sort((a, b) => b.length - a.length)
      .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "gi"
  );
  const tokenSet = new Set(tokens.map((token) => token.toLowerCase()));
  return name
    .split(expression)
    .filter(Boolean)
    .map((part) =>
      tokenSet.has(part.toLowerCase()) ? <mark key={`${part}-${part.length}`}>{part}</mark> : part
    );
}

function resultSummary(options: PickerOption[], browseMode: boolean, query: string): string {
  if (browseMode) return options.length > 1 ? "Selected + recent" : "Selected station";
  if (!query.trim()) return options.length ? "Recent stations" : "Search all stations";
  if (!options.length) return "No station found";
  if (options[0].kind === "spelling") return `Did you mean ${options[0].station.name}?`;
  return `${options.length} best match${options.length === 1 ? "" : "es"}`;
}

export function StationPicker({
  id,
  label,
  accessibleLabel,
  value,
  onInput
}: StationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentStations, setRecentStations] = useState<Station[]>(readRecentStations);
  const selected = stationFromInput(value);
  const browseMode = Boolean(selected && value === selected.searchLabel);
  const listboxId = `${id}-options`;
  const statusId = `${id}-search-status`;

  const options = useMemo<PickerOption[]>(() => {
    if (browseMode && selected) {
      return [
        { station: selected, score: 0, kind: "exact-name" as const },
        ...recentStations
          .filter((station) => station.id !== selected.id)
          .map((station, index) => ({
            station,
            score: 50 + index,
            kind: "partial" as const,
            recent: true
          }))
      ].slice(0, MAX_RESULTS);
    }
    if (!value.trim()) {
      return recentStations.map((station, index) => ({
        station,
        score: 50 + index,
        kind: "partial" as const,
        recent: true
      }));
    }
    return rankStations(value).slice(0, MAX_RESULTS);
  }, [browseMode, recentStations, selected, value]);

  function remember(station: Station) {
    const updated = [
      station,
      ...recentStations.filter((recent) => recent.id !== station.id)
    ].slice(0, 5);
    setRecentStations(updated);
    try {
      window.localStorage.setItem(
        RECENT_STATIONS_KEY,
        JSON.stringify(updated.map((recent) => recent.id))
      );
    } catch {
      // Search remains fully functional when storage is unavailable.
    }
  }

  function choose(station: Station) {
    onInput(station.searchLabel);
    remember(station);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: JSX.TargetedKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
      } else if (options.length) {
        setActiveIndex((index) => (index + 1) % options.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (options.length) {
        setActiveIndex((index) => (index - 1 + options.length) % options.length);
      }
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open && options.length) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex].station);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const summary = resultSummary(options, browseMode, value);

  return (
    <div class="station-picker">
      <label class="station-picker__label" for={id}>
        {label}
      </label>
      <span class="station-picker__field">
        <input
          ref={inputRef}
          id={id}
          name={id}
          role="combobox"
          aria-label={accessibleLabel ?? label}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-describedby={statusId}
          aria-activedescendant={
            open && options[activeIndex]
              ? `${id}-option-${options[activeIndex].station.id}`
              : undefined
          }
          value={value}
          onFocus={(event) => {
            setOpen(true);
            setActiveIndex(0);
            if (stationFromInput(event.currentTarget.value)) event.currentTarget.select();
          }}
          onInput={(event) => {
            onInput(event.currentTarget.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setOpen(false)}
          placeholder="Station name or code"
          autocomplete="off"
          autocapitalize="words"
          enterkeyhint="done"
          spellcheck={false}
        />
        {value ? (
          <button
            class="station-picker__clear"
            type="button"
            aria-label={`Clear ${id} station`}
            tabindex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onInput("");
              setOpen(true);
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        ) : null}
        {selected ? (
          <span class="station-picker__selected-lines" aria-hidden="true">
            {selected.codes.slice(0, 3).map((code) => {
              const lineId = STOP_BY_CODE.get(code)?.lineId ?? selected.lineIds[0];
              return (
                <i
                  key={code}
                  title={LINES[lineId].name}
                  style={{ "--station-line": LINES[lineId].colour }}
                />
              );
            })}
          </span>
        ) : null}
      </span>
      <span id={statusId} class="visually-hidden" aria-live="polite">
        {summary}. Use the up and down arrow keys to review results, then Enter to select.
      </span>
      {open ? (
        <div class="station-picker__menu" id={listboxId} role="listbox">
          <div class="station-picker__menu-head" role="presentation">
            <span>{summary}</span>
            <span aria-hidden="true">↑↓ select · esc close</span>
          </div>
          {options.length ? (
            options.map((option, index) => {
              const station = option.station;
              const reason = option.recent ? "Recent" : MATCH_LABELS[option.kind];
              return (
                <button
                  type="button"
                  role="option"
                  id={`${id}-option-${station.id}`}
                  aria-selected={selected?.id === station.id}
                  class={[
                    index === activeIndex ? "is-active" : "",
                    index === 0 && option.kind === "spelling" ? "is-spelling" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={station.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(station)}
                >
                  <span class="station-picker__result">
                    <span class="station-picker__name">
                      {highlightName(station.name, browseMode ? "" : value)}
                    </span>
                    <span class="station-picker__meta">
                      {station.lineIds.map((lineId) => LINES[lineId].shortName).join(" · ")}
                      {station.lineIds.length > 1 ? " · Interchange" : ""}
                    </span>
                  </span>
                  {reason ? <span class="station-picker__reason">{reason}</span> : null}
                  <span class="station-picker__codes">
                    {station.codes.map((code) => {
                      const lineId = STOP_BY_CODE.get(code)?.lineId ?? station.lineIds[0];
                      const line = LINES[lineId];
                      return (
                        <span
                          key={code}
                          style={{
                            "--station-line": line.colour,
                            "--station-line-text": line.textColour
                          }}
                        >
                          {code}
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })
          ) : (
            <span class="station-picker__empty" role="status">
              <strong>No match</strong>
              <span>Try fewer letters, a station code, or a line — “EW26” and “NEL Outram” work.</span>
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
