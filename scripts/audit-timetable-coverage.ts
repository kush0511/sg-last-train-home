import { LINES, LINE_STOPS } from "../src/data/network";
import { SERVICE_PATTERNS } from "../src/data/services";
import { lastDepartureFor } from "../src/lib/schedule";
import type { LineId } from "../src/lib/types";

const auditDate = "2026-07-29";
const sbsLines = (Object.keys(LINES) as LineId[]).filter(
  (lineId) => LINES[lineId].operator === "SBS Transit"
);
const uncovered: string[] = [];

for (const lineId of sbsLines) {
  const patterns = SERVICE_PATTERNS.filter((pattern) => pattern.lineId === lineId);
  const exact: string[] = [];
  const modelled: string[] = [];

  for (const { code } of LINE_STOPS[lineId]) {
    const results = patterns
      .filter((pattern) => pattern.stops.includes(code))
      .flatMap((pattern) => {
        try {
          return [lastDepartureFor(pattern, code, auditDate)];
        } catch {
          return [];
        }
      });
    if (results.some((result) => result.confidence === "exact")) exact.push(code);
    else if (results.length) modelled.push(code);
    else uncovered.push(code);
  }

  console.log(
    `${LINES[lineId].shortName}: ${exact.length} station codes with operator-published cutoffs, ` +
      `${modelled.length} with explicit conservative LRT estimates, ` +
      `${LINE_STOPS[lineId].length} total`
  );
}

if (uncovered.length) {
  throw new Error(`SBS Transit station codes without timetable coverage: ${uncovered.join(", ")}`);
}
