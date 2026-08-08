/**
 * CAMPUSOS AI — SMART BOOKING INTELLIGENCE ENGINE (v4)
 * ------------------------------------------------------------------
 * All booking logic lives here. The UI never computes availability,
 * conflicts or recommendations itself — it calls these functions.
 *
 * Everything is deterministic MOCK intelligence over the shared mock
 * state in `campus.ts`. To go live, replace the function bodies only:
 * the exported types are the contract the Booking module depends on.
 */

import {
  getBooking,
  getBookings,
  getResource,
  patchBooking,
  pushActivityEvent,
  pushNotification,
  upsertBooking,
  pulseMetrics,
  type Booking,
  type BookingStatus,
} from "./campus";
import { getResourceProfile, getResourceProfiles, parseResourceQuery } from "./resources";
import type { ResourceProfile } from "./resources";

/* ------------------------------------------------------------------ */
/* TYPES — future API contract                                         */
/* ------------------------------------------------------------------ */

export interface BookingRequest {
  resourceId: string | null;
  date: string; // ISO
  start: string; // HH:mm
  end: string; // HH:mm
  title: string;
  purpose: string;
  attendees: number;
  equipment: string[];
  organiser: string;
  department: string;
}

export interface BookingConflict {
  bookingId: string;
  conflictingBookingId: string;
  resourceId: string;
  severity: "low" | "medium" | "high";
  overlap: string; // "14:00–15:30"
  overlapMinutes: number;
  title: string;
  organiser: string;
  recommendation: string;
}

export interface BookingCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AvailabilityResult {
  resource: ResourceProfile | undefined;
  available: boolean;
  conflicts: BookingConflict[];
  checks: BookingCheck[];
  match: MatchBreakdown;
}

export interface MatchBreakdown {
  total: number;
  parts: { label: string; value: number; note: string }[];
  risk: "Low" | "Medium" | "High";
}

export type RecommendationType = "same-resource-later" | "alternative-resource" | "alternative-day";

export interface BookingRecommendation {
  id: string;
  type: RecommendationType;
  typeLabel: string;
  resourceId: string;
  resourceName: string;
  building: string;
  capacity: number;
  date: string;
  dayLabel: string;
  start: string;
  end: string;
  score: number;
  reasons: string[];
  risk: "Low" | "Medium" | "High";
  rationale: string;
}

export interface ParsedBookingRequest {
  text: string;
  resourceId: string | null;
  resourceName: string | null;
  capacity: number | null;
  equipment: string[];
  dayLabel: string;
  date: string;
  start: string;
  end: string;
  title: string;
  interpreted: string[];
}

/* ------------------------------------------------------------------ */
/* DATE / TIME HELPERS                                                 */
/* ------------------------------------------------------------------ */

const two = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

export const campusToday = (): string => toISODate(new Date());

export const shiftDate = (iso: string, days: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + days);
  return toISODate(date);
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAY_OFFSETS: Record<string, number> = { wed: 2, thu: 3, fri: 4, mon: 5, tue: 6 };

/** Resolves a human day label ("Today", "Tomorrow", "Fri") to an ISO date. */
export const dateForDayLabel = (label: string): string => {
  const key = label.trim().toLowerCase();
  if (key === "tomorrow") return shiftDate(campusToday(), 1);
  if (key === "today") return campusToday();
  return shiftDate(campusToday(), WEEKDAY_OFFSETS[key.slice(0, 3)] ?? 0);
};

export const dayLabelFor = (iso: string): string => {
  const today = campusToday();
  if (iso === today) return "Today";
  if (iso === shiftDate(today, 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1).getDay()] ?? iso;
};

export const longDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
};

/** Horizon of bookable days, honouring the 14-day booking window rule. */
export const bookingDays = (count = 7): { date: string; label: string; short: string }[] =>
  Array.from({ length: count }, (_, i) => {
    const date = shiftDate(campusToday(), i);
    return { date, label: dayLabelFor(date), short: longDate(date) };
  });

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const fromMinutes = (mins: number): string => `${two(Math.floor(mins / 60))}:${two(mins % 60)}`;

export const durationLabel = (start: string, end: string): string => {
  const mins = Math.max(0, toMinutes(end) - toMinutes(start));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h ? `${h}h` : ""}${m ? ` ${m}m` : ""}`.trim() || "0m";
};

const overlapMinutes = (aS: string, aE: string, bS: string, bE: string): number =>
  Math.max(0, Math.min(toMinutes(aE), toMinutes(bE)) - Math.max(toMinutes(aS), toMinutes(bS)));

export const BLOCKING_STATUSES: BookingStatus[] = ["approved", "confirmed", "pending", "conflict"];

export const TIMELINE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/* ------------------------------------------------------------------ */
/* BOOKING RULES (mock policy)                                         */
/* ------------------------------------------------------------------ */

export const BOOKING_RULES = [
  { label: "Booking window", detail: "Up to 14 days ahead" },
  { label: "Capacity", detail: "Attendees must not exceed resource capacity" },
  { label: "Duration", detail: "Between 30 minutes and 6 hours" },
  { label: "Conflicts", detail: "Cannot overlap a confirmed booking" },
  { label: "Equipment", detail: "Requested equipment must be available" },
] as const;

/* ------------------------------------------------------------------ */
/* NATURAL LANGUAGE REQUEST PARSING                                    */
/* ------------------------------------------------------------------ */

const dayOffsetFromLabel = (label: string | null): number => {
  if (!label) return 1;
  const l = label.toLowerCase();
  if (l.includes("today")) return 0;
  if (l.includes("tomorrow")) return 1;
  const idx = WEEKDAYS.findIndex((d) => l.startsWith(d.toLowerCase()));
  if (idx >= 0) {
    const todayIdx = new Date().getDay();
    return ((idx - todayIdx + 7) % 7) || 7;
  }
  return 1;
};

/** Reuses Resource Intelligence parsing, then resolves a concrete slot. */
export function parseBookingRequest(text: string): ParsedBookingRequest {
  const q = parseResourceQuery(text);
  const lower = text.toLowerCase();
  const named =
    getResourceProfiles().find((p) => lower.includes(p.name.toLowerCase())) ??
    getResourceProfiles().find((p) => {
      const m = /lab\s*0?(\d{1,2})/.exec(lower);
      return m ? p.name.toLowerCase().includes(`lab ${m[1]!.padStart(2, "0")}`) : false;
    }) ??
    null;

  const date = shiftDate(campusToday(), dayOffsetFromLabel(q.dayLabel));
  const start = q.start ?? "14:00";
  const end = q.end ?? fromMinutes(toMinutes(start) + 120);

  const interpreted: string[] = [];
  if (named) interpreted.push(`Resource · ${named.name}`);
  else if (q.type) interpreted.push(`Type · ${q.type}`);
  if (q.capacity) interpreted.push(`Capacity · ${q.capacity}+ seats`);
  if (q.equipment.length) interpreted.push(`Equipment · ${q.equipment.join(", ")}`);
  interpreted.push(`When · ${dayLabelFor(date)} ${start}–${end}`);

  return {
    text,
    resourceId: named?.id ?? null,
    resourceName: named?.name ?? null,
    capacity: q.capacity,
    equipment: q.equipment,
    dayLabel: dayLabelFor(date),
    date,
    start,
    end,
    title: text.trim().slice(0, 60) || "Campus booking",
    interpreted,
  };
}

/* ------------------------------------------------------------------ */
/* AVAILABILITY + CONFLICTS                                            */
/* ------------------------------------------------------------------ */

export function bookingsFor(resourceId: string, date: string): Booking[] {
  return getBookings()
    .filter(
      (b) => b.resourceId === resourceId && b.date === date && BLOCKING_STATUSES.includes(b.status),
    )
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export function detectConflicts(
  resourceId: string,
  date: string,
  start: string,
  end: string,
  ignoreBookingId?: string,
): BookingConflict[] {
  return bookingsFor(resourceId, date)
    .filter((b) => b.id !== ignoreBookingId)
    .map((b) => {
      const mins = overlapMinutes(start, end, b.start, b.end);
      if (mins <= 0) return null;
      const severity: BookingConflict["severity"] =
        mins >= 90 ? "high" : mins >= 45 ? "medium" : "low";
      return {
        bookingId: ignoreBookingId ?? "new-request",
        conflictingBookingId: b.id,
        resourceId,
        severity,
        overlap: `${b.start}–${b.end}`,
        overlapMinutes: mins,
        title: b.title,
        organiser: b.organiser,
        recommendation:
          severity === "high"
            ? "Move to a comparable resource or shift the window."
            : "Trim the requested window or shift by one slot.",
      } satisfies BookingConflict;
    })
    .filter((c): c is BookingConflict => c !== null);
}

export function scoreMatch(
  resource: ResourceProfile,
  request: Pick<BookingRequest, "attendees" | "equipment" | "date" | "start" | "end">,
  conflicts: BookingConflict[],
): MatchBreakdown {
  const capacityFit =
    request.attendees <= 0
      ? 90
      : request.attendees > resource.capacity
        ? 30
        : Math.round(70 + 30 * (1 - Math.abs(resource.capacity - request.attendees) / resource.capacity));
  const equipmentMet = request.equipment.filter((e) =>
    resource.equipment.some((x) => x.toLowerCase().includes(e.toLowerCase())),
  ).length;
  const equipmentFit = request.equipment.length
    ? Math.round((equipmentMet / request.equipment.length) * 100)
    : 100;
  const timeFit = conflicts.length ? Math.max(20, 90 - conflicts.length * 35) : 100;
  const pressure = 100 - resource.utilization;
  const locationFit = resource.status === "maintenance" ? 20 : resource.status === "in-use" ? 72 : 94;
  const total = Math.round(
    capacityFit * 0.3 + equipmentFit * 0.25 + timeFit * 0.25 + pressure * 0.1 + locationFit * 0.1,
  );
  const risk: MatchBreakdown["risk"] =
    conflicts.length || resource.utilization >= 80
      ? conflicts.length > 1 || resource.utilization >= 85
        ? "High"
        : "Medium"
      : "Low";
  return {
    total: Math.max(12, Math.min(99, total)),
    risk,
    parts: [
      { label: "Resource fit", value: capacityFit, note: `${resource.capacity} seats available` },
      { label: "Time fit", value: timeFit, note: conflicts.length ? "Overlapping reservation" : "Window is clear" },
      {
        label: "Equipment",
        value: equipmentFit,
        note: request.equipment.length ? `${equipmentMet}/${request.equipment.length} matched` : "No specific requirement",
      },
      { label: "Scheduling pressure", value: pressure, note: `${resource.utilization}% weekly utilization` },
      { label: "Location", value: locationFit, note: `${resource.building} · ${resource.floor}` },
    ],
  };
}

export function checkAvailability(
  resourceId: string,
  date: string,
  start: string,
  end: string,
  options: { attendees?: number; equipment?: string[]; ignoreBookingId?: string | undefined } = {},
): AvailabilityResult {
  const resource = getResourceProfile(resourceId);
  const attendees = options.attendees ?? 0;
  const equipment = options.equipment ?? [];
  const conflicts = resource ? detectConflicts(resourceId, date, start, end, options.ignoreBookingId) : [];
  const duration = toMinutes(end) - toMinutes(start);
  const windowDays = Math.round(
    (Date.parse(`${date}T00:00:00`) - Date.parse(`${campusToday()}T00:00:00`)) / 86_400_000,
  );
  const equipmentMissing = equipment.filter(
    (e) => !resource?.equipment.some((x) => x.toLowerCase().includes(e.toLowerCase())),
  );

  const checks: BookingCheck[] = [
    {
      label: "Resource available",
      passed: !!resource && resource.status !== "maintenance",
      detail: resource
        ? resource.status === "maintenance"
          ? "Resource is under maintenance"
          : `${resource.name} is bookable`
        : "Resource not found",
    },
    {
      label: "Capacity satisfied",
      passed: !!resource && attendees <= resource.capacity,
      detail: resource ? `${attendees || "—"} of ${resource.capacity} seats` : "Unknown capacity",
    },
    {
      label: "No overlapping booking",
      passed: conflicts.length === 0,
      detail: conflicts.length
        ? `Overlaps ${conflicts[0]!.title} (${conflicts[0]!.overlap})`
        : "Window is clear",
    },
    {
      label: "Equipment available",
      passed: equipmentMissing.length === 0,
      detail: equipmentMissing.length ? `Missing ${equipmentMissing.join(", ")}` : "All requested equipment present",
    },
    {
      label: "Booking window valid",
      passed: windowDays >= 0 && windowDays <= 14 && duration >= 30 && duration <= 360,
      detail:
        windowDays < 0
          ? "Date is in the past"
          : windowDays > 14
            ? "Beyond the 14-day booking window"
            : `${durationLabel(start, end)} · ${windowDays === 0 ? "today" : `in ${windowDays} day${windowDays > 1 ? "s" : ""}`}`,
    },
  ];

  return {
    resource,
    available: checks.every((c) => c.passed),
    conflicts,
    checks,
    match: resource
      ? scoreMatch(resource, { attendees, equipment, date, start, end }, conflicts)
      : { total: 0, parts: [], risk: "High" },
  };
}

/* ------------------------------------------------------------------ */
/* RECOMMENDATIONS                                                     */
/* ------------------------------------------------------------------ */

const freeWindows = (resourceId: string, date: string, duration: number): { start: string; end: string }[] => {
  const out: { start: string; end: string }[] = [];
  for (const h of TIMELINE_HOURS) {
    const start = `${two(h)}:00`;
    const end = fromMinutes(h * 60 + duration);
    if (toMinutes(end) > 20 * 60) continue;
    if (detectConflicts(resourceId, date, start, end).length === 0) out.push({ start, end });
  }
  return out;
};

/** Best available times for a resource on a day, ranked with a match score. */
export function recommendTimes(
  resourceId: string,
  date: string,
  options: {
    duration?: number | undefined;
    attendees?: number | undefined;
    equipment?: string[] | undefined;
    limit?: number | undefined;
  } = {},
): BookingRecommendation[] {
  const resource = getResourceProfile(resourceId);
  if (!resource) return [];
  const duration = options.duration ?? 120;
  return freeWindows(resourceId, date, duration)
    .map(({ start, end }) => {
      const match = scoreMatch(
        resource,
        { attendees: options.attendees ?? 0, equipment: options.equipment ?? [], date, start, end },
        [],
      );
      const hour = toMinutes(start) / 60;
      const peakPenalty = hour >= 14 && hour < 17 ? 9 : 0;
      return {
        id: `REC-${resourceId}-${date}-${start}`,
        type: "same-resource-later" as RecommendationType,
        typeLabel: "Best available time",
        resourceId,
        resourceName: resource.name,
        building: resource.building,
        capacity: resource.capacity,
        date,
        dayLabel: dayLabelFor(date),
        start,
        end,
        score: Math.max(40, match.total - peakPenalty),
        risk: peakPenalty ? "Medium" : match.risk,
        reasons: [
          peakPenalty ? "Inside the 14:00–17:00 peak window" : "Outside peak scheduling hours",
          "No overlapping reservation",
          `${resource.utilization}% weekly utilization`,
        ],
        rationale: peakPenalty
          ? "Available, though this window carries the highest campus booking pressure."
          : "Lower conflict risk and lower booking pressure in this window.",
      } satisfies BookingRecommendation;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 3);
}

/** Ranked alternatives when the exact request cannot be satisfied. */
export function findAlternatives(
  request: Pick<BookingRequest, "resourceId" | "date" | "start" | "end" | "attendees" | "equipment">,
  limit = 4,
): BookingRecommendation[] {
  const duration = Math.max(30, toMinutes(request.end) - toMinutes(request.start));
  const target = request.resourceId ? getResourceProfile(request.resourceId) : undefined;
  const out: BookingRecommendation[] = [];

  // 1. Same resource, later window.
  if (target) {
    const later = freeWindows(target.id, request.date, duration).find(
      (w) => toMinutes(w.start) > toMinutes(request.start),
    );
    if (later) {
      const match = scoreMatch(target, { ...request, ...later }, []);
      out.push({
        id: `ALT-same-${target.id}-${later.start}`,
        type: "same-resource-later",
        typeLabel: "Same resource · later",
        resourceId: target.id,
        resourceName: target.name,
        building: target.building,
        capacity: target.capacity,
        date: request.date,
        dayLabel: dayLabelFor(request.date),
        start: later.start,
        end: later.end,
        score: match.total,
        risk: match.risk,
        reasons: ["Identical resource and equipment", "No change of building", "Window is clear"],
        rationale: `Keeps ${target.name} — only the time shifts by ${durationLabel(request.start, later.start)}.`,
      });
    }
  }

  // 2. Alternative resources at the requested time.
  const candidates = getResourceProfiles()
    .filter((p) => p.id !== request.resourceId && p.status !== "maintenance")
    .filter((p) => (request.attendees ? p.capacity >= request.attendees : true))
    .filter((p) => (target ? p.type === target.type || p.capacity >= (target.capacity ?? 0) * 0.8 : true))
    .filter((p) => detectConflicts(p.id, request.date, request.start, request.end).length === 0)
    .map((p) => ({ p, match: scoreMatch(p, request, []) }))
    .sort((a, b) => b.match.total - a.match.total)
    .slice(0, 2);

  for (const { p, match } of candidates) {
    const sameEquipment =
      !target || target.equipment.every((e) => p.equipment.includes(e)) ? "Same equipment" : "Comparable equipment";
    out.push({
      id: `ALT-res-${p.id}`,
      type: "alternative-resource",
      typeLabel: "Alternative resource",
      resourceId: p.id,
      resourceName: p.name,
      building: p.building,
      capacity: p.capacity,
      date: request.date,
      dayLabel: dayLabelFor(request.date),
      start: request.start,
      end: request.end,
      score: match.total,
      risk: match.risk,
      reasons: [
        target && p.capacity >= target.capacity ? "Same or greater capacity" : `${p.capacity} seats`,
        sameEquipment,
        "No overlap in the requested window",
        `${p.utilization}% utilization — lower pressure`,
      ],
      rationale: `Keeps your exact time. Moving here reduces scheduling pressure by ${Math.max(
        4,
        Math.round(((target?.utilization ?? 70) - p.utilization) / 2 + 8),
      )}% while preserving required equipment.`,
    });
  }

  // 3. Alternative day, same resource and time.
  if (target) {
    for (let d = 1; d <= 5; d += 1) {
      const date = shiftDate(request.date, d);
      if (detectConflicts(target.id, date, request.start, request.end).length === 0) {
        const match = scoreMatch(target, { ...request, date }, []);
        out.push({
          id: `ALT-day-${target.id}-${date}`,
          type: "alternative-day",
          typeLabel: "Alternative day",
          resourceId: target.id,
          resourceName: target.name,
          building: target.building,
          capacity: target.capacity,
          date,
          dayLabel: dayLabelFor(date),
          start: request.start,
          end: request.end,
          score: Math.max(45, match.total - 8),
          risk: match.risk,
          reasons: ["Identical resource and time", "No overlap", "Lower demand day"],
          rationale: `Same slot on ${longDate(date)} — everything else is unchanged.`,
        });
        break;
      }
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* LIFECYCLE                                                           */
/* ------------------------------------------------------------------ */

export const LIFECYCLE_STEPS = ["Requested", "Reviewed", "Approved", "Confirmed", "Completed"] as const;

export function lifecycleIndex(status: BookingStatus): number {
  switch (status) {
    case "draft":
      return 0;
    case "pending":
    case "conflict":
      return 1;
    case "approved":
      return 2;
    case "confirmed":
      return 3;
    case "completed":
      return 4;
    default:
      return 1;
  }
}

/* ------------------------------------------------------------------ */
/* MUTATIONS — shared state, notifications and activity                */
/* ------------------------------------------------------------------ */

let sequence = 2500;
const nextId = (): string => {
  sequence += 1;
  return `BK-${sequence}`;
};

const riskFrom = (risk: MatchBreakdown["risk"]): Booking["riskLabel"] =>
  risk === "High" ? "High conflict risk" : risk === "Medium" ? "Medium conflict risk" : "Low conflict risk";

export function createBooking(
  request: BookingRequest,
  options: { status?: BookingStatus } = {},
): Booking {
  const resource = request.resourceId ? getResourceProfile(request.resourceId) : undefined;
  const check = resource
    ? checkAvailability(resource.id, request.date, request.start, request.end, {
        attendees: request.attendees,
        equipment: request.equipment,
      })
    : undefined;
  const conflicted = (check?.conflicts.length ?? 0) > 0;
  const booking: Booking = {
    id: nextId(),
    title: request.title || "Campus booking",
    resourceId: resource?.id ?? "",
    resourceName: resource?.name ?? "Unassigned",
    organiser: request.organiser,
    department: request.department,
    date: request.date,
    start: request.start,
    end: request.end,
    attendees: request.attendees,
    status: options.status ?? (conflicted ? "conflict" : "confirmed"),
    riskLabel: riskFrom(check?.match.risk ?? "Low"),
    note: request.purpose || "Created through CampusOS Smart Booking.",
    purpose: request.purpose,
    equipment: request.equipment,
    createdAt: new Date().toISOString(),
    mine: true,
    conflictWith: check?.conflicts.map((c) => c.conflictingBookingId) ?? [],
  };

  upsertBooking(booking);
  pushActivityEvent({
    id: `AC-${booking.id}`,
    kind: conflicted ? "conflict" : "booking",
    message: conflicted
      ? `Conflict detected for ${booking.title}`
      : `${booking.title} booked in ${booking.resourceName}`,
    detail: `${booking.resourceName} · ${dayLabelFor(booking.date)} ${booking.start}–${booking.end}`,
    time: "just now",
  });
  pushNotification({
    id: `NT-${booking.id}`,
    category: conflicted ? "Conflict" : "Booking",
    title: conflicted ? "Scheduling conflict detected" : "Booking confirmed",
    body: `${booking.title} · ${booking.resourceName} · ${dayLabelFor(booking.date)} ${booking.start}–${booking.end}.`,
    time: "just now",
    unread: true,
    actionLabel: "View booking",
    actionTo: `/bookings/${booking.id}`,
  });
  return booking;
}

export function updateBooking(id: string, patch: Partial<Booking>): Booking | undefined {
  const next = patchBooking(id, patch);
  if (!next) return undefined;
  const conflicts = detectConflicts(next.resourceId, next.date, next.start, next.end, next.id);
  const resolved = patchBooking(id, {
    status: conflicts.length ? "conflict" : next.status === "conflict" ? "confirmed" : next.status,
    conflictWith: conflicts.map((c) => c.conflictingBookingId),
    riskLabel: riskFrom(conflicts.length > 1 ? "High" : conflicts.length ? "Medium" : "Low"),
  });
  pushActivityEvent({
    id: `AC-${id}-${Date.now()}`,
    kind: conflicts.length ? "conflict" : "booking",
    message: `${next.title} updated`,
    detail: `${next.resourceName} · ${dayLabelFor(next.date)} ${next.start}–${next.end}`,
    time: "just now",
  });
  return resolved ?? next;
}

export function cancelBooking(id: string): Booking | undefined {
  const next = patchBooking(id, { status: "cancelled", conflictWith: [] });
  if (!next) return undefined;
  pushActivityEvent({
    id: `AC-cancel-${id}-${Date.now()}`,
    kind: "release",
    message: `${next.title} cancelled`,
    detail: `${next.resourceName} is available again · ${next.start}–${next.end}`,
    time: "just now",
  });
  pushNotification({
    id: `NT-cancel-${id}-${Date.now()}`,
    category: "Booking",
    title: "Booking cancelled",
    body: `${next.title} was cancelled. ${next.resourceName} is available again.`,
    time: "just now",
    unread: true,
    actionLabel: "View booking",
    actionTo: `/bookings/${next.id}`,
  });
  return next;
}

export function decideBooking(id: string, decision: "approved" | "rejected"): Booking | undefined {
  const next = patchBooking(id, { status: decision === "approved" ? "confirmed" : "rejected" });
  if (!next) return undefined;
  pushActivityEvent({
    id: `AC-${decision}-${id}-${Date.now()}`,
    kind: "approval",
    message: `${next.title} ${decision}`,
    detail: `${next.resourceName} · ${dayLabelFor(next.date)} ${next.start}–${next.end}`,
    time: "just now",
  });
  pushNotification({
    id: `NT-${decision}-${id}-${Date.now()}`,
    category: "Approval",
    title: decision === "approved" ? "Booking approved" : "Booking rejected",
    body: `${next.title} · ${next.resourceName} · ${dayLabelFor(next.date)} ${next.start}–${next.end}.`,
    time: "just now",
    unread: true,
    actionLabel: "View booking",
    actionTo: `/bookings/${next.id}`,
  });
  return next;
}

export function resolveConflict(id: string, recommendation: BookingRecommendation): Booking | undefined {
  return updateBooking(id, {
    resourceId: recommendation.resourceId,
    resourceName: recommendation.resourceName,
    date: recommendation.date,
    start: recommendation.start,
    end: recommendation.end,
  });
}

/* ------------------------------------------------------------------ */
/* PRESSURE + ANALYTICS                                               */
/* ------------------------------------------------------------------ */

export interface PressureReading {
  hour: string;
  value: number;
  level: "Low" | "Moderate" | "High";
}

export function bookingPressure(date = campusToday()): {
  overall: number;
  level: "Low" | "Moderate" | "High";
  byHour: PressureReading[];
  peakWindow: string;
  hotResources: { name: string; value: number }[];
} {
  const active = getBookings().filter((b) => BLOCKING_STATUSES.includes(b.status));
  const byHour: PressureReading[] = TIMELINE_HOURS.map((h) => {
    const start = `${two(h)}:00`;
    const end = `${two(h + 1)}:00`;
    const count = active.filter(
      (b) => b.date === date && overlapMinutes(start, end, b.start, b.end) > 0,
    ).length;
    const base = h >= 14 && h < 17 ? 58 : h >= 10 && h < 13 ? 38 : 18;
    const value = Math.min(100, base + count * 14);
    return { hour: start, value, level: value >= 70 ? "High" : value >= 40 ? "Moderate" : "Low" };
  });
  const overall = Math.round(byHour.reduce((a, b) => a + b.value, 0) / byHour.length);
  const counts = new Map<string, number>();
  active.forEach((b) => counts.set(b.resourceName, (counts.get(b.resourceName) ?? 0) + 1));
  return {
    overall,
    level: overall >= 60 ? "High" : overall >= 38 ? "Moderate" : "Low",
    byHour,
    peakWindow: "14:00–17:00",
    hotResources: [...counts.entries()]
      .map(([name, n]) => ({
        name,
        value: Math.min(100, 40 + n * 18 + (getResource(getBookings().find((b) => b.resourceName === name)?.resourceId ?? "")?.utilization ?? 0) / 4),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3),
  };
}

export function bookingSignals(): { label: string; value: string }[] {
  const all = getBookings();
  const upcoming = all.filter((b) => b.status === "confirmed" || b.status === "approved").length;
  const pending = all.filter((b) => b.status === "pending").length;
  const conflicts = all.filter((b) => b.status === "conflict").length;
  return [
    { label: "Upcoming", value: two(upcoming) },
    { label: "Pending", value: two(pending) },
    { label: "Conflicts", value: two(conflicts) },
    { label: "AI recommendations", value: two(Math.max(2, conflicts * 2)) },
  ];
}

export const bookingInsights = (): string[] => [
  "Booking conflicts decreased 12% this week.",
  "Thursday 14:00–17:00 carries the highest booking pressure.",
  "Median approval time is 3h 40m — down from 5h 10m.",
  "Cancellation rate is 4.1%, concentrated in morning lab slots.",
];

/** AI-assisted approval assessment — deterministic mock reasoning. */
export function approvalAssessment(booking: Booking): {
  risk: "Low" | "Medium" | "High";
  recommendation: "Approve" | "Review" | "Reject";
  lines: string[];
  checks: BookingCheck[];
} {
  const result = checkAvailability(booking.resourceId, booking.date, booking.start, booking.end, {
    attendees: booking.attendees,
    equipment: booking.equipment ?? [],
    ignoreBookingId: booking.id,
  });
  const risk = result.match.risk;
  return {
    risk,
    recommendation: risk === "High" ? "Review" : "Approve",
    lines:
      risk === "High"
        ? [
            "CampusOS found an overlapping reservation in this window.",
            "Resource utilization is above the healthy range.",
            "Similar requests were historically rescheduled rather than rejected.",
          ]
        : [
            "CampusOS found no significant scheduling conflicts.",
            "Resource utilization is within the normal range.",
            "Similar bookings have historically been approved.",
          ],
    checks: result.checks,
  };
}

export const getMyBookings = (): Booking[] =>
  getBookings().filter((b) => b.mine || b.organiser === "AI Club" || b.department === "Computer Science");

export const getConflictedBookings = (): Booking[] =>
  getBookings().filter((b) => b.status === "conflict");

export { getBooking, getBookings };
/* ------------------------------------------------------------------ */
/* LIVE DASHBOARD PULSE                                                */
/* ------------------------------------------------------------------ */

/** Keeps the command center pulse in sync with live booking state. */
export function livePulseMetrics(): typeof pulseMetrics {
  const all = getBookings();
  const active = all.filter((b) => BLOCKING_STATUSES.includes(b.status));
  const conflicts = all.filter((b) => b.status === "conflict").length;
  const pending = all.filter((b) => b.status === "pending").length;
  const pressure = bookingPressure();
  const base = pulseMetrics;
  return [
    { ...base[0]!, value: `${pressure.overall}%`, meaning: `${pressure.level} demand · peak ${pressure.peakWindow}` },
    { ...base[1]!, value: String(active.length), meaning: `Across ${new Set(active.map((b) => b.resourceId)).size} resources` },
    {
      ...base[2]!,
      value: String(conflicts),
      direction: (conflicts > 0 ? "up" : "down") as "up" | "down",
      meaning: conflicts === 0 ? "Campus is conflict-free" : "CampusOS has alternatives ready",
    },
    { ...base[3]!, value: String(pending), meaning: pending === 0 ? "Approval queue is clear" : "Assessed and ready to decide" },
  ];
}
