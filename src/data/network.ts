import type { CodedStop, Line, LineId, Station } from "../lib/types";

export const DATASET_VERSION = "2026.07.29";
export const NETWORK_AS_OF = "2026-07-29";

export const LINES: Record<LineId, Line> = {
  NS: {
    id: "NS",
    name: "North–South Line",
    shortName: "NSL",
    colour: "#d42e12",
    textColour: "#ffffff",
    operator: "SMRT"
  },
  EW: {
    id: "EW",
    name: "East–West Line",
    shortName: "EWL",
    colour: "#009645",
    textColour: "#ffffff",
    operator: "SMRT"
  },
  CG: {
    id: "CG",
    name: "Changi Airport Branch",
    shortName: "CGL",
    colour: "#009645",
    textColour: "#ffffff",
    operator: "SMRT"
  },
  NE: {
    id: "NE",
    name: "North East Line",
    shortName: "NEL",
    colour: "#9900aa",
    textColour: "#ffffff",
    operator: "SBS Transit"
  },
  CC: {
    id: "CC",
    name: "Circle Line",
    shortName: "CCL",
    colour: "#fa9e0d",
    textColour: "#111827",
    operator: "SMRT"
  },
  DT: {
    id: "DT",
    name: "Downtown Line",
    shortName: "DTL",
    colour: "#005ec4",
    textColour: "#ffffff",
    operator: "SBS Transit"
  },
  TE: {
    id: "TE",
    name: "Thomson–East Coast Line",
    shortName: "TEL",
    colour: "#9d5b25",
    textColour: "#ffffff",
    operator: "SMRT"
  },
  BP: {
    id: "BP",
    name: "Bukit Panjang LRT",
    shortName: "BPLRT",
    colour: "#748477",
    textColour: "#ffffff",
    operator: "SMRT"
  },
  SK: {
    id: "SK",
    name: "Sengkang LRT",
    shortName: "SKLRT",
    colour: "#748477",
    textColour: "#ffffff",
    operator: "SBS Transit"
  },
  PG: {
    id: "PG",
    name: "Punggol LRT",
    shortName: "PGLRT",
    colour: "#748477",
    textColour: "#ffffff",
    operator: "SBS Transit"
  }
};

function parseStops(lineId: LineId, rows: string): CodedStop[] {
  return rows
    .trim()
    .split("\n")
    .map((row) => {
      const [code, name] = row.trim().split("|");
      return { code, name, lineId };
    });
}

export const LINE_STOPS: Record<LineId, CodedStop[]> = {
  NS: parseStops(
    "NS",
    `
NS1|Jurong East
NS2|Bukit Batok
NS3|Bukit Gombak
NS4|Choa Chu Kang
NS5|Yew Tee
NS7|Kranji
NS8|Marsiling
NS9|Woodlands
NS10|Admiralty
NS11|Sembawang
NS12|Canberra
NS13|Yishun
NS14|Khatib
NS15|Yio Chu Kang
NS16|Ang Mo Kio
NS17|Bishan
NS18|Braddell
NS19|Toa Payoh
NS20|Novena
NS21|Newton
NS22|Orchard
NS23|Somerset
NS24|Dhoby Ghaut
NS25|City Hall
NS26|Raffles Place
NS27|Marina Bay
NS28|Marina South Pier
`
  ),
  EW: parseStops(
    "EW",
    `
EW1|Pasir Ris
EW2|Tampines
EW3|Simei
EW4|Tanah Merah
EW5|Bedok
EW6|Kembangan
EW7|Eunos
EW8|Paya Lebar
EW9|Aljunied
EW10|Kallang
EW11|Lavender
EW12|Bugis
EW13|City Hall
EW14|Raffles Place
EW15|Tanjong Pagar
EW16|Outram Park
EW17|Tiong Bahru
EW18|Redhill
EW19|Queenstown
EW20|Commonwealth
EW21|Buona Vista
EW22|Dover
EW23|Clementi
EW24|Jurong East
EW25|Chinese Garden
EW26|Lakeside
EW27|Boon Lay
EW28|Pioneer
EW29|Joo Koon
EW30|Gul Circle
EW31|Tuas Crescent
EW32|Tuas West Road
EW33|Tuas Link
`
  ),
  CG: parseStops(
    "CG",
    `
EW4|Tanah Merah
CG1|Expo
CG2|Changi Airport
`
  ),
  NE: parseStops(
    "NE",
    `
NE1|HarbourFront
NE3|Outram Park
NE4|Chinatown
NE5|Clarke Quay
NE6|Dhoby Ghaut
NE7|Little India
NE8|Farrer Park
NE9|Boon Keng
NE10|Potong Pasir
NE11|Woodleigh
NE12|Serangoon
NE13|Kovan
NE14|Hougang
NE15|Buangkok
NE16|Sengkang
NE17|Punggol
NE18|Punggol Coast
`
  ),
  CC: parseStops(
    "CC",
    `
CC1|Dhoby Ghaut
CC2|Bras Basah
CC3|Esplanade
CC4|Promenade
CC5|Nicoll Highway
CC6|Stadium
CC7|Mountbatten
CC8|Dakota
CC9|Paya Lebar
CC10|MacPherson
CC11|Tai Seng
CC12|Bartley
CC13|Serangoon
CC14|Lorong Chuan
CC15|Bishan
CC16|Marymount
CC17|Caldecott
CC19|Botanic Gardens
CC20|Farrer Road
CC21|Holland Village
CC22|Buona Vista
CC23|one-north
CC24|Kent Ridge
CC25|Haw Par Villa
CC26|Pasir Panjang
CC27|Labrador Park
CC28|Telok Blangah
CC29|HarbourFront
CC30|Keppel
CC31|Cantonment
CC32|Prince Edward Road
CC33|Marina Bay
CC34|Bayfront
`
  ),
  DT: parseStops(
    "DT",
    `
DT1|Bukit Panjang
DT2|Cashew
DT3|Hillview
DT4|Hume
DT5|Beauty World
DT6|King Albert Park
DT7|Sixth Avenue
DT8|Tan Kah Kee
DT9|Botanic Gardens
DT10|Stevens
DT11|Newton
DT12|Little India
DT13|Rochor
DT14|Bugis
DT15|Promenade
DT16|Bayfront
DT17|Downtown
DT18|Telok Ayer
DT19|Chinatown
DT20|Fort Canning
DT21|Bencoolen
DT22|Jalan Besar
DT23|Bendemeer
DT24|Geylang Bahru
DT25|Mattar
DT26|MacPherson
DT27|Ubi
DT28|Kaki Bukit
DT29|Bedok North
DT30|Bedok Reservoir
DT31|Tampines West
DT32|Tampines
DT33|Tampines East
DT34|Upper Changi
DT35|Expo
`
  ),
  TE: parseStops(
    "TE",
    `
TE1|Woodlands North
TE2|Woodlands
TE3|Woodlands South
TE4|Springleaf
TE5|Lentor
TE6|Mayflower
TE7|Bright Hill
TE8|Upper Thomson
TE9|Caldecott
TE11|Stevens
TE12|Napier
TE13|Orchard Boulevard
TE14|Orchard
TE15|Great World
TE16|Havelock
TE17|Outram Park
TE18|Maxwell
TE19|Shenton Way
TE20|Marina Bay
TE22|Gardens by the Bay
TE23|Tanjong Rhu
TE24|Katong Park
TE25|Tanjong Katong
TE26|Marine Parade
TE27|Marine Terrace
TE28|Siglap
TE29|Bayshore
`
  ),
  BP: parseStops(
    "BP",
    `
BP1|Choa Chu Kang
BP2|South View
BP3|Keat Hong
BP4|Teck Whye
BP5|Phoenix
BP6|Bukit Panjang
BP7|Petir
BP8|Pending
BP9|Bangkit
BP10|Fajar
BP11|Segar
BP12|Jelapang
BP13|Senja
`
  ),
  SK: parseStops(
    "SK",
    `
STC|Sengkang
SE1|Compassvale
SE2|Rumbia
SE3|Bakau
SE4|Kangkar
SE5|Ranggung
SW1|Cheng Lim
SW2|Farmway
SW3|Kupang
SW4|Thanggam
SW5|Fernvale
SW6|Layar
SW7|Tongkang
SW8|Renjong
`
  ),
  PG: parseStops(
    "PG",
    `
PTC|Punggol
PE1|Cove
PE2|Meridian
PE3|Coral Edge
PE4|Riviera
PE5|Kadaloor
PE6|Oasis
PE7|Damai
PW1|Sam Kee
PW2|Teck Lee
PW3|Punggol Point
PW4|Samudera
PW5|Nibong
PW6|Sumang
PW7|Soo Teck
`
  )
};

export const CODED_STOPS = Object.values(LINE_STOPS).flat();

export function stationId(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const stationMap = new Map<string, Station>();
for (const stop of CODED_STOPS) {
  const id = stationId(stop.name);
  const existing = stationMap.get(id);
  if (existing) {
    if (!existing.codes.includes(stop.code)) existing.codes.push(stop.code);
    if (!existing.lineIds.includes(stop.lineId)) existing.lineIds.push(stop.lineId);
  } else {
    stationMap.set(id, {
      id,
      name: stop.name,
      codes: [stop.code],
      lineIds: [stop.lineId],
      searchLabel: ""
    });
  }
}

export const STATIONS: Station[] = [...stationMap.values()]
  .map((station) => ({
    ...station,
    searchLabel: `${station.name} · ${station.codes.join(" / ")}`
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en-SG"));

export const STATION_BY_ID = new Map(STATIONS.map((station) => [station.id, station]));
export const STOP_BY_CODE = new Map<string, CodedStop>();
for (const stop of CODED_STOPS) {
  if (!STOP_BY_CODE.has(stop.code)) STOP_BY_CODE.set(stop.code, stop);
}

export const STATION_ID_BY_CODE = new Map(
  CODED_STOPS.map((stop) => [stop.code, stationId(stop.name)])
);

export function stationFromInput(value: string): Station | undefined {
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return STATIONS.find(
    (station) =>
      station.searchLabel.toLowerCase() === normalised ||
      station.name.toLowerCase() === normalised ||
      station.codes.some((code) => code.toLowerCase() === normalised)
  );
}
