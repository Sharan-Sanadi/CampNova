import { DateTime } from "luxon";

import { env } from "../../config/env.js";

const two = (n: number) => String(n).padStart(2, "0");

export function campusNow(): DateTime {
  return DateTime.now().setZone(env.CAMPUS_TIMEZONE);
}

export function campusToday(): string {
  return campusNow().toISODate() ?? "2026-08-09";
}

export function shiftDate(iso: string, days: number): string {
  const dt = DateTime.fromISO(iso, { zone: env.CAMPUS_TIMEZONE }).plus({ days });
  return dt.toISODate() ?? iso;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMinutes(mins: number): string {
  return `${two(Math.floor(mins / 60))}:${two(mins % 60)}`;
}

export function durationLabel(start: string, end: string): string {
  const mins = Math.max(0, toMinutes(end) - toMinutes(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h ? `${h}h` : ""}${m ? ` ${m}m` : ""}`.trim() || "0m";
}

export function overlapMinutes(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  return Math.max(0, Math.min(toMinutes(aEnd), toMinutes(bEnd)) - Math.max(toMinutes(aStart), toMinutes(bStart)));
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayLabelFor(iso: string): string {
  const today = campusToday();
  if (iso === today) return "Today";
  if (iso === shiftDate(today, 1)) return "Tomorrow";
  const dt = DateTime.fromISO(iso, { zone: env.CAMPUS_TIMEZONE });
  return weekdays[dt.weekday % 7] ?? iso;
}

export function longDate(iso: string): string {
  return DateTime.fromISO(iso, { zone: env.CAMPUS_TIMEZONE }).toLocaleString({
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function dateForDayLabel(label: string | null | undefined): string {
  const key = (label ?? "Today").trim().toLowerCase();
  if (key === "today") return campusToday();
  if (key === "tomorrow") return shiftDate(campusToday(), 1);
  const target = weekdays.findIndex((day) => key.startsWith(day.toLowerCase()));
  if (target >= 0) {
    const today = campusNow().weekday % 7;
    const offset = ((target - today + 7) % 7) || 7;
    return shiftDate(campusToday(), offset);
  }
  return campusToday();
}

export function bookingWindowDays(date: string): number {
  const target = DateTime.fromISO(date, { zone: env.CAMPUS_TIMEZONE }).startOf("day");
  const now = campusNow().startOf("day");
  return Math.round(target.diff(now, "days").days);
}

export const TIMELINE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;
export const BLOCKING_STATUSES = ["pending", "approved", "confirmed", "conflict"] as const;
