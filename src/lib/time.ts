const SERVICE_DAY_CUTOFF_HOUR = 4;

export function parseClockTime(value: string): number {
  const match = value.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (!match) {
    throw new Error(`Invalid clock time: ${value}`);
  }

  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3];
  if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) {
    throw new Error(`Invalid clock time: ${value}`);
  }

  let hour = rawHour % 12;
  if (meridiem === "pm") hour += 12;
  if (meridiem === "am" && hour < SERVICE_DAY_CUTOFF_HOUR) hour += 24;
  return hour * 60 + minute;
}

export function formatServiceTime(value: number): string {
  const normalised = ((Math.round(value) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalised / 60);
  const minute = normalised % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function serviceMinutes(hour: number, minute: number): number {
  const adjustedHour = hour < SERVICE_DAY_CUTOFF_HOUR ? hour + 24 : hour;
  return adjustedHour * 60 + minute;
}

export function minutesBetween(start: number, end: number): number {
  return Math.max(0, end - start);
}

export function addDaysIso(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return [
    utc.getUTCFullYear(),
    String(utc.getUTCMonth() + 1).padStart(2, "0"),
    String(utc.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function singaporeToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function singaporeClockParts(now = new Date()): {
  date: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

export function hasDeparturePassed(
  serviceDate: string,
  boardBy: number,
  now = new Date()
): boolean {
  const current = singaporeClockParts(now);
  const clockMinutes = current.hour * 60 + current.minute;
  if (serviceDate > current.date) return false;
  if (serviceDate === current.date) return boardBy <= clockMinutes;
  if (serviceDate === addDaysIso(current.date, -1) && current.hour < SERVICE_DAY_CUTOFF_HOUR) {
    return boardBy <= 24 * 60 + clockMinutes;
  }
  return true;
}
