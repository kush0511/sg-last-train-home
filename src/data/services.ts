import type { LineId, ServicePattern } from "../lib/types";
import { LINE_STOPS } from "./network";
import { parseClockTime } from "../lib/time";

const codes = (lineId: LineId) => LINE_STOPS[lineId].map((stop) => stop.code);
const reverse = <T,>(items: T[]) => [...items].reverse();
const reverseLoop = <T,>(items: T[]) => [items[0], ...items.slice(1).reverse()];
const repeated = (count: number, values: number[] = [2, 3]) =>
  Array.from({ length: count }, (_, index) => values[index % values.length]);

function parseLastMap(rows: string): Record<string, number> {
  return Object.fromEntries(
    rows
      .trim()
      .split(/\s+/)
      .map((row) => {
        const [code, time] = row.split("=");
        return [code, parseClockTime(time)];
      })
  );
}

function segmentMinutesFromLastTimes(
  stops: string[],
  lastByStop: Record<string, number>,
  fallback = 2
): number[] {
  return stops.slice(0, -1).map((code, index) => {
    const nextCode = stops[index + 1];
    const current = lastByStop[code];
    const next = lastByStop[nextCode];
    return current != null && next != null && next > current ? next - current : fallback;
  });
}

function makePattern(
  pattern: Omit<ServicePattern, "segmentMinutes"> & { segmentMinutes?: number[] }
): ServicePattern {
  const expected = pattern.circular ? pattern.stops.length : pattern.stops.length - 1;
  return {
    ...pattern,
    segmentMinutes: pattern.segmentMinutes ?? repeated(expected)
  };
}

const dtToExpo = parseLastMap(`
DT1=11:35pm DT2=11:37pm DT3=11:38pm DT4=11:40pm DT5=11:42pm
DT6=11:44pm DT7=11:46pm DT8=11:48pm DT9=11:50pm DT10=11:53pm
DT11=11:55pm DT12=11:58pm DT13=11:59pm DT14=12:01am DT15=12:03am
DT16=12:05am DT17=12:07am DT18=12:08am DT19=12:10am DT20=12:12am
DT21=12:13am DT22=12:15am DT23=12:17am DT24=12:19am DT25=12:22am
DT26=12:24am DT27=12:25am DT28=12:27am DT29=12:29am DT30=12:31am
DT31=12:34am DT32=12:36am DT33=12:38am DT34=12:41am
`);

const dtToBukitPanjang = parseLastMap(`
DT35=11:40pm DT34=11:41pm DT33=11:45pm DT32=11:47pm DT31=11:49pm
DT30=11:51pm DT29=11:54pm DT28=11:56pm DT27=11:58pm DT26=12:00am
DT25=12:02am DT24=12:04am DT23=12:06am DT22=12:08am DT21=12:10am
DT20=12:11am DT19=12:14am DT18=12:15am DT17=12:16am DT16=12:18am
DT15=12:20am DT14=12:22am DT13=12:24am DT12=12:26am DT11=12:28am
DT10=12:30am DT9=12:32am DT8=12:34am DT7=12:36am DT6=12:38am
DT5=12:40am DT4=12:43am DT3=12:45am DT2=12:46am
`);

const neToHarbourFront = parseLastMap(`
NE18=11:25pm NE17=11:28pm NE16=11:30pm NE15=11:32pm NE14=11:35pm
NE13=11:37pm NE12=11:40pm NE11=11:42pm NE10=11:44pm NE9=11:46pm
NE8=11:48pm NE7=11:50pm NE6=11:52pm NE5=11:55pm NE4=11:56pm
NE3=11:58pm
`);

const neToPunggolCoast = parseLastMap(`
NE1=11:55pm NE3=11:59pm NE4=12:01am NE5=12:02am NE6=12:05am
NE7=12:07am NE8=12:09am NE9=12:11am NE10=12:13am NE11=12:15am
NE12=12:17am NE13=12:20am NE14=12:23am NE15=12:25am NE16=12:27am
NE17=12:30am
`);

const ewWestSegments = [
  3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 2, 3, 2, 3, 2, 3, 5, 3,
  2, 3, 3, 3, 3, 3, 3, 3
];

const ccLoopClockwise = [
  "CC4",
  "CC34",
  "CC33",
  "CC32",
  "CC31",
  "CC30",
  "CC29",
  "CC28",
  "CC27",
  "CC26",
  "CC25",
  "CC24",
  "CC23",
  "CC22",
  "CC21",
  "CC20",
  "CC19",
  "CC17",
  "CC16",
  "CC15",
  "CC14",
  "CC13",
  "CC12",
  "CC11",
  "CC10",
  "CC9",
  "CC8",
  "CC7",
  "CC6",
  "CC5"
];

const bpLoop = ["BP6", "BP7", "BP8", "BP9", "BP10", "BP11", "BP12", "BP13"];
const skEast = ["STC", "SE1", "SE2", "SE3", "SE4", "SE5"];
const skWest = ["STC", "SW1", "SW2", "SW3", "SW4", "SW5", "SW6", "SW7", "SW8"];
const pgEast = ["PTC", "PE1", "PE2", "PE3", "PE4", "PE5", "PE6", "PE7"];
const pgWest = ["PTC", "PW1", "PW2", "PW3", "PW4", "PW5", "PW6", "PW7"];

export const SERVICE_PATTERNS: ServicePattern[] = [
  makePattern({
    id: "NS_TO_MARINA_SOUTH_PIER",
    lineId: "NS",
    label: "North–South Line",
    destination: "Marina South Pier",
    direction: "southbound",
    stops: codes("NS"),
    estimatedOriginLast: parseClockTime("11:00pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "NS_TO_JURONG_EAST",
    lineId: "NS",
    label: "North–South Line",
    destination: "Jurong East",
    direction: "northbound",
    stops: reverse(codes("NS")),
    estimatedOriginLast: parseClockTime("11:10pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "NS_SHORT_TO_KRANJI",
    lineId: "NS",
    label: "North–South Line short working",
    destination: "Kranji",
    direction: "northbound short-turn",
    stops: codes("NS").slice(0, 6),
    shortTurn: true,
    estimatedOriginLast: parseClockTime("11:00pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-short-turn",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "EW_TO_TUAS_LINK",
    lineId: "EW",
    label: "East–West Line",
    destination: "Tuas Link",
    direction: "westbound",
    stops: codes("EW"),
    segmentMinutes: ewWestSegments,
    estimatedOriginLast: parseClockTime("11:23pm"),
    lateHeadwayMinutes: 7,
    sourceId: "smrt-station-pages",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "EW_TO_PASIR_RIS",
    lineId: "EW",
    label: "East–West Line",
    destination: "Pasir Ris",
    direction: "eastbound",
    stops: reverse(codes("EW")),
    segmentMinutes: reverse(ewWestSegments),
    estimatedOriginLast: parseClockTime("11:05pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "EW_SHORT_TO_JOO_KOON",
    lineId: "EW",
    label: "East–West Line short working",
    destination: "Joo Koon",
    direction: "westbound short-turn",
    stops: codes("EW").slice(0, 29),
    segmentMinutes: ewWestSegments.slice(0, 28),
    shortTurn: true,
    estimatedOriginLast: parseClockTime("11:23pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-short-turn",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "CG_TO_CHANGI_AIRPORT",
    lineId: "CG",
    label: "Changi Airport shuttle",
    destination: "Changi Airport",
    direction: "airport-bound",
    stops: codes("CG"),
    segmentMinutes: [4, 5],
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 12,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "CG_TO_TANAH_MERAH",
    lineId: "CG",
    label: "Changi Airport shuttle",
    destination: "Tanah Merah",
    direction: "city-bound",
    stops: reverse(codes("CG")),
    segmentMinutes: [5, 4],
    estimatedOriginLast: parseClockTime("11:18pm"),
    lateHeadwayMinutes: 12,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "NE_TO_PUNGGOL_COAST",
    lineId: "NE",
    label: "North East Line",
    destination: "Punggol Coast",
    direction: "northbound",
    stops: codes("NE"),
    exactLastByStop: neToPunggolCoast,
    segmentMinutes: segmentMinutesFromLastTimes(codes("NE"), neToPunggolCoast),
    lateHeadwayMinutes: 7,
    sourceId: "sbs-first-last",
    dataAsOf: "2024-12-10"
  }),
  makePattern({
    id: "NE_TO_HARBOURFRONT",
    lineId: "NE",
    label: "North East Line",
    destination: "HarbourFront",
    direction: "southbound",
    stops: reverse(codes("NE")),
    exactLastByStop: neToHarbourFront,
    segmentMinutes: segmentMinutesFromLastTimes(reverse(codes("NE")), neToHarbourFront),
    lateHeadwayMinutes: 7,
    sourceId: "sbs-first-last",
    dataAsOf: "2024-12-10"
  }),
  makePattern({
    id: "CC_LOOP_CLOCKWISE",
    lineId: "CC",
    label: "Circle Line main loop",
    destination: "clockwise via Bayfront",
    direction: "clockwise",
    stops: ccLoopClockwise,
    circular: true,
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "CC_LOOP_ANTICLOCKWISE",
    lineId: "CC",
    label: "Circle Line main loop",
    destination: "anti-clockwise via Nicoll Highway",
    direction: "anti-clockwise",
    stops: reverse(ccLoopClockwise),
    circular: true,
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "CC_SPUR_TO_STADIUM",
    lineId: "CC",
    label: "Circle Line Dhoby Ghaut spur",
    destination: "Stadium",
    direction: "outbound short-turn",
    stops: ["CC1", "CC2", "CC3", "CC4", "CC5", "CC6"],
    shortTurn: true,
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-ccl6-service-pattern",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "CC_SPUR_TO_DHOBY_GHAUT",
    lineId: "CC",
    label: "Circle Line Dhoby Ghaut spur",
    destination: "Dhoby Ghaut",
    direction: "inbound short-turn",
    stops: ["CC6", "CC5", "CC4", "CC3", "CC2", "CC1"],
    shortTurn: true,
    estimatedOriginLast: parseClockTime("11:35pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-ccl6-service-pattern",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "DT_TO_EXPO",
    lineId: "DT",
    label: "Downtown Line",
    destination: "Expo",
    direction: "eastbound",
    stops: codes("DT"),
    exactLastByStop: dtToExpo,
    segmentMinutes: segmentMinutesFromLastTimes(codes("DT"), dtToExpo),
    lateHeadwayMinutes: 7,
    sourceId: "sbs-first-last",
    dataAsOf: "2025-02-28"
  }),
  makePattern({
    id: "DT_TO_BUKIT_PANJANG",
    lineId: "DT",
    label: "Downtown Line",
    destination: "Bukit Panjang",
    direction: "westbound",
    stops: reverse(codes("DT")),
    exactLastByStop: dtToBukitPanjang,
    segmentMinutes: segmentMinutesFromLastTimes(reverse(codes("DT")), dtToBukitPanjang),
    lateHeadwayMinutes: 7,
    sourceId: "sbs-first-last",
    dataAsOf: "2025-02-28"
  }),
  makePattern({
    id: "TE_TO_BAYSHORE",
    lineId: "TE",
    label: "Thomson–East Coast Line",
    destination: "Bayshore",
    direction: "eastbound",
    stops: codes("TE"),
    estimatedOriginLast: parseClockTime("11:00pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "TE_TO_WOODLANDS_NORTH",
    lineId: "TE",
    label: "Thomson–East Coast Line",
    destination: "Woodlands North",
    direction: "westbound",
    stops: reverse(codes("TE")),
    estimatedOriginLast: parseClockTime("11:10pm"),
    lateHeadwayMinutes: 7,
    sourceId: "model-smrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "BP_TRUNK_TO_BUKIT_PANJANG",
    lineId: "BP",
    label: "Bukit Panjang LRT trunk",
    destination: "Bukit Panjang",
    direction: "towards Bukit Panjang",
    stops: codes("BP").slice(0, 6),
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 8,
    sourceId: "model-lrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "BP_TRUNK_TO_CHOA_CHU_KANG",
    lineId: "BP",
    label: "Bukit Panjang LRT trunk",
    destination: "Choa Chu Kang",
    direction: "towards Choa Chu Kang",
    stops: reverse(codes("BP").slice(0, 6)),
    estimatedOriginLast: parseClockTime("11:35pm"),
    lateHeadwayMinutes: 8,
    sourceId: "model-lrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "BP_LOOP_A",
    lineId: "BP",
    label: "Bukit Panjang LRT Service A",
    destination: "loop via Petir",
    direction: "Service A",
    stops: bpLoop,
    circular: true,
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 8,
    sourceId: "model-lrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  makePattern({
    id: "BP_LOOP_B",
    lineId: "BP",
    label: "Bukit Panjang LRT Service B",
    destination: "loop via Senja",
    direction: "Service B",
    stops: reverse(bpLoop),
    circular: true,
    estimatedOriginLast: parseClockTime("11:30pm"),
    lateHeadwayMinutes: 8,
    sourceId: "model-lrt-conservative",
    dataAsOf: "2026-07-29"
  }),
  ...[
    ["SK_EAST_INNER", skEast, "East Loop via Compassvale", "inner", "12:35am"],
    ["SK_EAST_OUTER", reverseLoop(skEast), "East Loop via Ranggung", "outer", "12:35am"],
    ["SK_WEST_INNER", skWest, "West Loop via Cheng Lim", "inner", "12:37am"],
    ["SK_WEST_OUTER", reverseLoop(skWest), "West Loop via Renjong", "outer", "12:37am"]
  ].map(([id, stops, destination, direction, originLast]) =>
    makePattern({
      id: id as string,
      lineId: "SK",
      label: "Sengkang LRT",
      destination: destination as string,
      direction: direction as string,
      stops: stops as string[],
      circular: true,
      estimatedOriginLast: parseClockTime(originLast as string),
      lateHeadwayMinutes: 8,
      sourceId: "sbs-lrt-town-centre",
      dataAsOf: "2020-06-02"
    })
  ),
  ...[
    ["PG_EAST_INNER", pgEast, "East Loop via Cove", "inner", "12:38am"],
    ["PG_EAST_OUTER", reverseLoop(pgEast), "East Loop via Damai", "outer", "12:38am"],
    ["PG_WEST_INNER", pgWest, "West Loop via Sam Kee", "inner", "12:40am"],
    ["PG_WEST_OUTER", reverseLoop(pgWest), "West Loop via Soo Teck", "outer", "12:40am"]
  ].map(([id, stops, destination, direction, originLast]) =>
    makePattern({
      id: id as string,
      lineId: "PG",
      label: "Punggol LRT",
      destination: destination as string,
      direction: direction as string,
      stops: stops as string[],
      circular: true,
      estimatedOriginLast: parseClockTime(originLast as string),
      lateHeadwayMinutes: 8,
      sourceId: "sbs-lrt-town-centre",
      dataAsOf: "2020-06-02"
    })
  )
];

export const PATTERN_BY_ID = new Map(SERVICE_PATTERNS.map((pattern) => [pattern.id, pattern]));
