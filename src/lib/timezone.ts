import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export type BusinessHourPeriod = {
  opens: string;
  closes: string;
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateString(dateStr: string) {
  const match = DATE_RE.exec(dateStr);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isValidDateString(dateStr: string) {
  return parseDateString(dateStr) !== null;
}

export function dateStringToUtcDate(dateStr: string) {
  const parsed = parseDateString(dateStr);
  if (!parsed) throw new Error(`Invalid date string: ${dateStr}`);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

export function addDaysToDateString(dateStr: string, days: number) {
  const date = dateStringToUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonthsToMonthStartDateString(dateStr: string, months: number) {
  const parsed = parseDateString(dateStr);
  if (!parsed) throw new Error(`Invalid date string: ${dateStr}`);
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}

export function dayOfWeekFromDateString(dateStr: string) {
  return dateStringToUtcDate(dateStr).getUTCDay();
}

export function currentDateStringInZone(timeZone: string) {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
}

export function formatDateInZone(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function formatLocalDateString(
  dateStr: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(dateStringToUtcDate(dateStr));
}

export function startOfZonedDayUtc(dateStr: string, timeZone: string) {
  return fromZonedTime(`${dateStr}T00:00:00`, timeZone);
}

export function nextZonedDayUtc(dateStr: string, timeZone: string) {
  return startOfZonedDayUtc(addDaysToDateString(dateStr, 1), timeZone);
}

export function zonedDateTimeToUtc(dateStr: string, timeStr: string, timeZone: string) {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return fromZonedTime(`${dateStr}T${normalized}`, timeZone);
}

export function minutesInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function formatTimeInZone(date: Date, timeZone: string, compact = false) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);

  return compact ? formatted.toLowerCase().replace(" ", "") : formatted;
}

function normalizePeriod(value: unknown): BusinessHourPeriod | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const opens = record.opens ?? record.open;
  const closes = record.closes ?? record.close;

  if (typeof opens !== "string" || typeof closes !== "string") return null;
  return { opens, closes };
}

export function getBusinessHourPeriods(raw: unknown, dayIndex: number): BusinessHourPeriod[] {
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;
  const value = record[DAY_NAMES[dayIndex]] ?? record[String(dayIndex)];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const period = normalizePeriod(item);
      return period ? [period] : [];
    });
  }

  const period = normalizePeriod(value);
  return period ? [period] : [];
}
