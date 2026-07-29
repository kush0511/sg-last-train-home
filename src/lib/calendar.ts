import type { ServiceDay, TimetableCategory } from "./types";
import { addDaysIso } from "./time";
import publicHolidayData from "../data/public-holidays.json";

export const PUBLIC_HOLIDAYS: Record<string, string> = publicHolidayData.holidays;

export function getServiceDay(date: string): ServiceDay {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    !date.match(/^\d{4}-\d{2}-\d{2}$/) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid service date: ${date}`);
  }

  const publicHoliday = PUBLIC_HOLIDAYS[date];
  const weekday = parsed.getUTCDay();
  const dayType = publicHoliday
    ? "sunday-public-holiday"
    : weekday === 0
      ? "sunday-public-holiday"
      : weekday === 6
        ? "saturday"
        : "weekday";

  return {
    date,
    dayType,
    publicHoliday,
    isPublicHolidayEve: Boolean(PUBLIC_HOLIDAYS[addDaysIso(date, 1)])
  };
}

/**
 * Operator public-holiday-eve tables take precedence over the ordinary day of
 * week, but only when that table has a published value for the service.
 */
export function timetableCategoryForDate(date: string): TimetableCategory {
  const serviceDay = getServiceDay(date);
  return serviceDay.isPublicHolidayEve ? "public-holiday-eve" : serviceDay.dayType;
}
