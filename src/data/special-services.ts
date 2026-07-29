export interface ServiceAdjustment {
  id: string;
  title: string;
  dates: string[];
  affectedLine: string;
  patternIds?: string[];
  closeBy?: number;
  disabledPatternIds?: string[];
  anchorOverrides?: Record<string, { code: string; lastDeparture: number }>;
  note: string;
  sourceId: string;
}

const minutes = (hour: number, minute: number) => (hour < 4 ? hour + 24 : hour) * 60 + minute;

export const DTL_EARLY_CLOSE_DATES = [
  "2026-07-10",
  "2026-07-17",
  "2026-07-24",
  "2026-07-31",
  "2026-08-07",
  "2026-08-14",
  "2026-08-21",
  "2026-08-28",
  "2026-09-04"
];

export const DTL_LATE_OPEN_DATES = [
  "2026-07-11",
  "2026-07-18",
  "2026-07-25",
  "2026-08-01",
  "2026-08-08",
  "2026-08-15",
  "2026-08-22",
  "2026-08-29",
  "2026-09-05"
];

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (current <= final) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export const SERVICE_ADJUSTMENTS: ServiceAdjustment[] = [
  {
    id: "dtl-friday-early-close-2026",
    title: "Downtown Line ends early",
    dates: DTL_EARLY_CLOSE_DATES,
    affectedLine: "DT",
    closeBy: minutes(23, 30),
    note:
      "DTL services end around 11:30 PM on this affected Friday. Station-specific final departures are not published in the announcement, so the calculator uses an earlier conservative estimate.",
    sourceId: "lta-service-adjustments"
  },
  {
    id: "sk-west-inner-closure-2026",
    title: "Sengkang West Loop inner direction closed",
    dates: dateRange("2026-04-19", "2026-10-18"),
    affectedLine: "SK",
    disabledPatternIds: ["SK_WEST_INNER"],
    note:
      "West Loop trains from Sengkang towards SW1 Cheng Lim are suspended. The outer direction via SW8 Renjong remains available.",
    sourceId: "lta-service-adjustments"
  },
  {
    id: "national-day-eve-extension-2026",
    title: "National Day Eve extended service",
    dates: ["2026-08-08"],
    affectedLine: "multiple",
    anchorOverrides: {
      EW_TO_TUAS_LINK: { code: "EW13", lastDeparture: minutes(0, 30) },
      NS_TO_JURONG_EAST: { code: "NS25", lastDeparture: minutes(0, 30) },
      NS_TO_MARINA_SOUTH_PIER: { code: "NS25", lastDeparture: minutes(0, 30) },
      CC_LOOP_CLOCKWISE: { code: "CC33", lastDeparture: minutes(23, 57) },
      CC_LOOP_ANTICLOCKWISE: { code: "CC29", lastDeparture: minutes(23, 30) },
      TE_TO_BAYSHORE: { code: "TE1", lastDeparture: minutes(0, 0) },
      TE_TO_WOODLANDS_NORTH: { code: "TE29", lastDeparture: minutes(0, 12) }
    },
    note:
      "Selected SMRT departure anchors are extended for National Day Eve. Times away from the published anchors are conservatively propagated and remain estimates.",
    sourceId: "smrt-national-day-2026"
  }
];

export function adjustmentsForDate(date: string): ServiceAdjustment[] {
  return SERVICE_ADJUSTMENTS.filter((adjustment) => adjustment.dates.includes(date));
}
