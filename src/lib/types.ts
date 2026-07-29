export type LineId =
  | "NS"
  | "EW"
  | "CG"
  | "NE"
  | "CC"
  | "DT"
  | "TE"
  | "BP"
  | "SK"
  | "PG";

export type Confidence = "exact" | "estimated";

export interface Line {
  id: LineId;
  name: string;
  shortName: string;
  colour: string;
  textColour: string;
  operator: "SMRT" | "SBS Transit";
}

export interface CodedStop {
  code: string;
  name: string;
  lineId: LineId;
}

export interface Station {
  id: string;
  name: string;
  codes: string[];
  lineIds: LineId[];
  searchLabel: string;
}

export interface ServicePattern {
  id: string;
  lineId: LineId;
  label: string;
  destination: string;
  direction: string;
  stops: string[];
  segmentMinutes: number[];
  circular?: boolean;
  shortTurn?: boolean;
  exactLastByStop?: Record<string, number>;
  estimatedOriginLast?: number;
  lateHeadwayMinutes: number;
  sourceId: string;
  dataAsOf: string;
}

export type DayType = "weekday" | "saturday" | "sunday-public-holiday";

export type TimetableCategory = DayType | "public-holiday-eve";

export interface ServiceDay {
  date: string;
  dayType: DayType;
  publicHoliday?: string;
  isPublicHolidayEve: boolean;
}

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  url: string;
  retrievedAt: string;
  dataAsOf?: string;
  use: string;
  authority: "official" | "community" | "model";
  reusePolicy: string;
}

export interface TransferRule {
  stationId: string;
  fromCodePrefix: string;
  toCodePrefix: string;
  walkMinutes: number;
  sourceId: string;
  directionSpecific: boolean;
  outOfSystem?: boolean;
}

export interface GraphEdge {
  fromStationId: string;
  toStationId: string;
  fromCode: string;
  toCode: string;
  patternId: string;
  minutes: number;
}

export interface RideLeg {
  patternId: string;
  fromStationId: string;
  toStationId: string;
  fromCode: string;
  toCode: string;
  stopCodes: string[];
  rideMinutes: number;
}

export interface TransferLeg {
  stationId: string;
  fromPatternId: string;
  toPatternId: string;
  walkMinutes: number;
  bufferMinutes: number;
  sourceId: string;
  directionSpecific: boolean;
  outOfSystem: boolean;
}

export interface RouteCandidate {
  signature: string;
  rides: RideLeg[];
  transfers: TransferLeg[];
  totalRideMinutes: number;
  totalTransferMinutes: number;
}

export interface ScheduleEvidence {
  sourceId: string;
  statement: string;
  confidence: Confidence;
}

export interface ScheduledRide extends RideLeg {
  departure: number;
  arrival: number;
  publishedLastDeparture: number;
  steppedBackByMinutes: number;
  confidence: Confidence;
  scheduleNote: string;
}

export interface JourneyResult {
  origin: Station;
  destination: Station;
  serviceDay: ServiceDay;
  boardBy: number;
  arriveBy: number;
  confidence: Confidence;
  confidenceLabel: string;
  rides: ScheduledRide[];
  transfers: TransferLeg[];
  warnings: string[];
  evidence: ScheduleEvidence[];
  totalRideMinutes: number;
  totalTransferMinutes: number;
  signature: string;
}

export interface CalculationResult {
  recommended: JourneyResult | null;
  alternatives: JourneyResult[];
  notices: string[];
  error?: string;
}
