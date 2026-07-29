export interface SnapshotEnvelope<T> {
  schemaVersion: number;
  generatedAt: string;
  payload: T;
}

export interface SnapshotLoadResult<T> {
  value: T;
  usedFallback: boolean;
  stale: boolean;
  warning?: string;
}

function ageInDays(iso: string, now: Date): number {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) throw new Error("Snapshot generatedAt is invalid");
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86_400_000));
}

export function parseSnapshot<T>(
  raw: string,
  validatePayload: (payload: unknown) => payload is T
): SnapshotEnvelope<T> {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("schemaVersion" in parsed) ||
    !("generatedAt" in parsed) ||
    !("payload" in parsed)
  ) {
    throw new Error("Snapshot envelope is incomplete");
  }
  const candidate = parsed as Partial<SnapshotEnvelope<unknown>>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.generatedAt !== "string" ||
    !validatePayload(candidate.payload)
  ) {
    throw new Error("Snapshot schema or payload is invalid");
  }
  return candidate as SnapshotEnvelope<T>;
}

export function loadSnapshotWithFallback<T>(
  raw: string,
  lastKnownGood: SnapshotEnvelope<T>,
  validatePayload: (payload: unknown) => payload is T,
  options: { now?: Date; staleAfterDays?: number } = {}
): SnapshotLoadResult<T> {
  const now = options.now ?? new Date();
  const staleAfterDays = options.staleAfterDays ?? 45;
  try {
    const parsed = parseSnapshot(raw, validatePayload);
    const stale = ageInDays(parsed.generatedAt, now) > staleAfterDays;
    return {
      value: parsed.payload,
      usedFallback: false,
      stale,
      warning: stale ? "The timetable snapshot is older than the freshness threshold." : undefined
    };
  } catch (error) {
    return {
      value: lastKnownGood.payload,
      usedFallback: true,
      stale: ageInDays(lastKnownGood.generatedAt, now) > staleAfterDays,
      warning: `Refresh rejected; retained last known-good snapshot. ${
        error instanceof Error ? error.message : "Unknown parser failure"
      }`
    };
  }
}
