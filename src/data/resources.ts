/**
 * CAMPUSOS AI — RESOURCE INTELLIGENCE LAYER (MOCK)
 * ------------------------------------------------------------------
 * This module is the ONLY place resource intelligence is produced.
 * Every Resource Intelligence screen reads through the service
 * functions at the bottom of this file. All values are deterministic —
 * the same input always produces the same output, nothing is randomised
 * at render time.
 *
 * TO GO LIVE: replace the bodies of the service functions
 * (`getResourceProfiles`, `getAvailability`, `getResourceInsights`,
 * `matchResources`, ...) with real API / AI calls and keep the exported
 * types. The types below are the integration contract.
 */

import {
  getBookings,
  getBookingsForResource,
  getResources,
  type Booking,
  type Resource,
  type ResourceType,
} from "./campus";

/* ------------------------------------------------------------------ */
/* CONTRACT TYPES                                                      */
/* ------------------------------------------------------------------ */

export type PressureLevel = "Low" | "Moderate" | "Elevated" | "High";
export type MaintenanceState = "Normal" | "Scheduled" | "In progress";
export type DemandLevel = "Low" | "Moderate" | "High" | "Peak";

export interface ResourceAccessibility {
  wheelchair: boolean;
  hearingLoop: boolean;
  stepFreeRoute: boolean;
  note: string;
}

export interface ResourceProfile extends Resource {
  /** Bookable, matchable equipment (subset/normalisation of amenities). */
  equipment: string[];
  accessibility: ResourceAccessibility;
  /** Walking minutes from the central quad — used for the distance signal. */
  walkMinutes: number;
  bookingPressure: PressureLevel;
  conflictRate: number; // %
  cancellationRate: number; // %
  upcomingBookings: number;
  maintenance: MaintenanceState;
  maintenanceNote: string | null;
  healthScore: number; // 0-100
  trendDelta: number; // % vs. previous week
  peakWindow: string;
  lowWindow: string;
  demandByDay: { label: string; value: number }[];
  demandByPart: { label: string; value: number }[];
  predictedDemand: { window: string; level: DemandLevel; note: string };
}

export type SlotStatus = "available" | "reserved" | "in-use" | "maintenance" | "pending";

export interface AvailabilitySlot {
  resourceId: string;
  day: string; // "Today" | "Tomorrow" | weekday
  date: string;
  start: string; // HH:mm
  end: string; // HH:mm
  status: SlotStatus;
  label: string;
  bookingId?: string;
}

export type InsightSeverity = "critical" | "warning" | "info" | "positive";

export interface ResourceInsight {
  id: string;
  resourceId: string;
  type: "Demand" | "Utilization" | "Conflict" | "Maintenance" | "Allocation";
  severity: InsightSeverity;
  title: string;
  description: string;
  recommendation: string;
  confidence: number; // 0-100
}

export interface MatchReason {
  met: boolean;
  label: string;
  detail: string;
}

export interface MatchResult {
  resource: ResourceProfile;
  score: number; // 0-100 product estimate
  reasons: MatchReason[];
  availability: string;
  conflictRisk: "Low" | "Medium" | "High";
}

export interface ResourceQuery {
  text: string;
  capacity: number | null;
  equipment: string[];
  type: ResourceType | null;
  dayLabel: string | null;
  start: string | null;
  end: string | null;
  accessible: boolean;
}

/* ------------------------------------------------------------------ */
/* DETERMINISTIC HELPERS                                               */
/* ------------------------------------------------------------------ */

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

const pick = <T>(seed: string, list: T[]): T => list[hash(seed) % list.length] as T;

export const EQUIPMENT_OPTIONS = [
  "Projector",
  "Air conditioning",
  "Desktop systems",
  "Video conferencing",
  "Whiteboard",
  "PA system",
  "Smart board",
  "Lab benches",
  "Fume hood",
  "Streaming",
] as const;

/** Normalises free-form amenities onto the matchable equipment vocabulary. */
const normaliseEquipment = (amenities: string[]): string[] => {
  const out = new Set<string>();
  for (const a of amenities) {
    const l = a.toLowerCase();
    if (l.includes("projector")) out.add("Projector");
    if (l.includes("air conditioning") || l === "ac") out.add("Air conditioning");
    if (l.includes("desktop") || l.includes("laptop") || l.includes("systems"))
      out.add("Desktop systems");
    if (l.includes("conferencing")) out.add("Video conferencing");
    if (l.includes("whiteboard")) out.add("Whiteboard");
    if (l.includes("pa system") || l.includes("mic")) out.add("PA system");
    if (l.includes("smart board")) out.add("Smart board");
    if (l.includes("bench")) out.add("Lab benches");
    if (l.includes("fume")) out.add("Fume hood");
    if (l.includes("stream")) out.add("Streaming");
  }
  return [...out];
};

const ACCESSIBILITY: Record<string, Partial<ResourceAccessibility>> = {
  "computer-lab-04": { wheelchair: true, hearingLoop: true, stepFreeRoute: true },
  "computer-lab-05": { wheelchair: true, stepFreeRoute: true },
  "computer-lab-03": { wheelchair: true, stepFreeRoute: true },
  "seminar-hall-a": { wheelchair: true, hearingLoop: true, stepFreeRoute: true },
  "physics-lab-01": { wheelchair: false, stepFreeRoute: false },
  "chemistry-lab-02": { wheelchair: true, stepFreeRoute: true },
  "indoor-arena": { wheelchair: true, stepFreeRoute: true },
};

const WALK_MINUTES: Record<string, number> = {
  "Engineering Block": 4,
  "Science Wing": 7,
  "Central Block": 2,
  Administration: 3,
  "Humanities Block": 6,
  "Sports Complex": 11,
  "Innovation Hub": 8,
};

const MAINTENANCE_NOTE: Record<string, string> = {
  "indoor-arena": "Flooring maintenance in progress until Thursday.",
  "av-equipment-cart": "Scheduled firmware service next Monday.",
};

const pressureFor = (utilization: number): PressureLevel =>
  utilization >= 80 ? "High" : utilization >= 65 ? "Elevated" : utilization >= 45 ? "Moderate" : "Low";

const demandLevel = (value: number): DemandLevel =>
  value >= 85 ? "Peak" : value >= 65 ? "High" : value >= 40 ? "Moderate" : "Low";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PART_LABELS = ["Morning", "Afternoon", "Evening"];

function buildProfile(r: Resource): ResourceProfile {
  const seed = hash(r.id);
  const equipment = normaliseEquipment(r.amenities);
  const acc = ACCESSIBILITY[r.id] ?? {};
  const bookings = getBookingsForResource(r.id);
  const conflictRate = Number(((seed % 40) / 10).toFixed(1));
  const cancellationRate = Number((2 + ((seed >> 3) % 55) / 10).toFixed(1));
  const trendDelta = Number((((seed >> 5) % 130) / 10 - 5).toFixed(1));

  const demandByDay = DAY_LABELS.map((label, i) => ({
    label,
    value: Math.max(
      12,
      Math.min(98, Math.round(r.utilization + ((seed >> (i + 1)) % 26) - 10 + (i === 2 ? 8 : 0))),
    ),
  }));
  const demandByPart = PART_LABELS.map((label, i) => ({
    label,
    value: Math.max(
      10,
      Math.min(
        98,
        Math.round(r.utilization * [0.7, 1.25, 0.55][i]! + (((seed >> (i + 4)) % 14) - 6)),
      ),
    ),
  }));

  const peak = [...demandByPart].sort((a, b) => b.value - a.value)[0]!;
  const predictedValue = Math.max(15, Math.min(97, Math.round(peak.value + trendDelta * 1.6)));

  const availabilityScore = r.status === "available" ? 100 : r.status === "in-use" ? 72 : 30;
  const utilScore = 100 - Math.abs(r.utilization - 65);
  const maintenance: MaintenanceState =
    r.status === "maintenance" ? "In progress" : MAINTENANCE_NOTE[r.id] ? "Scheduled" : "Normal";
  const healthScore = Math.max(
    38,
    Math.min(
      99,
      Math.round(
        availabilityScore * 0.4 +
          utilScore * 0.3 +
          (100 - conflictRate * 12) * 0.2 +
          (maintenance === "Normal" ? 100 : 55) * 0.1,
      ),
    ),
  );

  return {
    ...r,
    equipment,
    accessibility: {
      wheelchair: acc.wheelchair ?? seed % 3 !== 0,
      hearingLoop: acc.hearingLoop ?? seed % 4 === 0,
      stepFreeRoute: acc.stepFreeRoute ?? seed % 3 !== 0,
      note:
        acc.wheelchair === false
          ? "Stair access only — lift service does not reach this level."
          : "Step-free route from the main entrance.",
    },
    walkMinutes: WALK_MINUTES[r.building] ?? 5,
    bookingPressure: pressureFor(r.utilization),
    conflictRate,
    cancellationRate,
    upcomingBookings: bookings.filter((b) => b.status !== "cancelled" && b.status !== "rejected")
      .length,
    maintenance,
    maintenanceNote: MAINTENANCE_NOTE[r.id] ?? null,
    healthScore,
    trendDelta,
    peakWindow: pick(r.id + "peak", ["14:00–17:00", "10:00–13:00", "13:00–16:00", "15:00–18:00"]),
    lowWindow: pick(r.id + "low", ["08:00–10:00", "17:00–19:00", "08:00–09:30"]),
    demandByDay,
    demandByPart,
    predictedDemand: {
      window: `Tomorrow · ${pick(r.id + "peak", ["14:00–17:00", "10:00–13:00", "13:00–16:00", "15:00–18:00"])}`,
      level: demandLevel(predictedValue),
      note: `Projected ${predictedValue}% of capacity booked in this window.`,
    },
  };
}

const PROFILES: ResourceProfile[] = getResources().map(buildProfile);

/* ------------------------------------------------------------------ */
/* AVAILABILITY                                                        */
/* ------------------------------------------------------------------ */

export const AVAILABILITY_DAYS = ["Today", "Tomorrow", "Wed", "Thu", "Fri"] as const;
const SLOT_HOURS = [8, 10, 12, 14, 16, 18];

const two = (n: number) => String(n).padStart(2, "0");

const dayDate = (dayIndex: number): string => {
  const base = new Date("2026-08-08T00:00:00Z");
  base.setUTCDate(base.getUTCDate() + dayIndex);
  return base.toISOString().slice(0, 10);
};

function buildSlots(resource: ResourceProfile, dayIndex: number): AvailabilitySlot[] {
  const day = AVAILABILITY_DAYS[dayIndex]!;
  const date = dayDate(dayIndex);
  const bookings = getBookingsForResource(resource.id).filter((b) => b.date === date);

  return SLOT_HOURS.map((h) => {
    const start = `${two(h)}:00`;
    const end = `${two(h + 2)}:00`;
    const booking = bookings.find((b) => {
      const bs = Number(b.start.slice(0, 2));
      const be = Number(b.end.slice(0, 2));
      return bs < h + 2 && be > h && b.status !== "cancelled" && b.status !== "rejected";
    });

    if (resource.status === "maintenance") {
      return {
        resourceId: resource.id,
        day,
        date,
        start,
        end,
        status: "maintenance" as SlotStatus,
        label: "Maintenance window",
      };
    }
    if (booking) {
      return {
        resourceId: resource.id,
        day,
        date,
        start,
        end,
        status: (booking.status === "pending" ? "pending" : "reserved") as SlotStatus,
        label: booking.title,
        bookingId: booking.id,
      };
    }

    const seed = hash(`${resource.id}-${dayIndex}-${h}`);
    const load = resource.utilization + (h >= 14 && h <= 16 ? 18 : h <= 9 ? -22 : 0);
    const busy = seed % 100 < load;
    if (!busy) {
      return {
        resourceId: resource.id,
        day,
        date,
        start,
        end,
        status: "available" as SlotStatus,
        label: "Available",
      };
    }
    const inUse = dayIndex === 0 && h <= 12;
    return {
      resourceId: resource.id,
      day,
      date,
      start,
      end,
      status: (inUse ? "in-use" : "reserved") as SlotStatus,
      label: inUse ? "In use" : pick(`${resource.id}${dayIndex}${h}`, [
        "Departmental session",
        "Scheduled class",
        "Club activity",
        "Reserved — internal",
      ]),
    };
  });
}

/* ------------------------------------------------------------------ */
/* INSIGHTS                                                            */
/* ------------------------------------------------------------------ */

function buildInsights(p: ResourceProfile): ResourceInsight[] {
  const out: ResourceInsight[] = [];

  if (p.maintenance !== "Normal") {
    out.push({
      id: `${p.id}-maint`,
      resourceId: p.id,
      type: "Maintenance",
      severity: p.maintenance === "In progress" ? "critical" : "info",
      title:
        p.maintenance === "In progress"
          ? "Resource withdrawn for maintenance"
          : "Maintenance scheduled",
      description: p.maintenanceNote ?? "Maintenance work affects availability for this resource.",
      recommendation: "Route requests to a comparable resource until the window closes.",
      confidence: 96,
    });
  }

  if (p.utilization >= 78) {
    out.push({
      id: `${p.id}-pressure`,
      resourceId: p.id,
      type: "Demand",
      severity: "warning",
      title: `Booking pressure is ${p.bookingPressure.toLowerCase()}`,
      description: `Weekly utilization sits at ${p.utilization}% with demand concentrated in ${p.peakWindow}.`,
      recommendation: "Consider opening an overflow resource for the peak window.",
      confidence: 88,
    });
  }

  if (p.trendDelta >= 3) {
    out.push({
      id: `${p.id}-trend`,
      resourceId: p.id,
      type: "Demand",
      severity: p.trendDelta >= 7 ? "warning" : "info",
      title: `Demand is ${p.trendDelta}% above the weekly baseline`,
      description: `Requests for ${p.name} have risen steadily across the last two weeks.`,
      recommendation: "Reserve earlier than usual for afternoon sessions.",
      confidence: 81,
    });
  }

  if (p.utilization <= 50 && p.status !== "maintenance") {
    out.push({
      id: `${p.id}-under`,
      resourceId: p.id,
      type: "Allocation",
      severity: "positive",
      title: "Spare capacity available",
      description: `${p.name} runs at ${p.utilization}% utilization and is consistently free during ${p.lowWindow}.`,
      recommendation: "Suitable as overflow for pressured resources in the same block.",
      confidence: 84,
    });
  }

  if (p.conflictRate >= 2.5) {
    out.push({
      id: `${p.id}-conflict`,
      resourceId: p.id,
      type: "Conflict",
      severity: "critical",
      title: "Elevated conflict rate",
      description: `${p.conflictRate}% of requests for this resource overlapped an existing reservation.`,
      recommendation: "Enable approval review for overlapping requests in the peak window.",
      confidence: 79,
    });
  }

  out.push({
    id: `${p.id}-pattern`,
    resourceId: p.id,
    type: "Utilization",
    severity: "info",
    title: "Usage pattern",
    description: `Demand is concentrated between ${p.peakWindow}; ${p.lowWindow} is consistently quiet.`,
    recommendation: "Schedule low-priority sessions in the quiet window.",
    confidence: 90,
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* NATURAL-LANGUAGE QUERY PARSING (deterministic, replaceable by NLU)  */
/* ------------------------------------------------------------------ */

const TYPE_HINTS: [RegExp, ResourceType][] = [
  [/computer lab|programming lab|pc lab/, "Computer Lab"],
  [/physics/, "Physics Lab"],
  [/chemistry|wet lab/, "Chemistry Lab"],
  [/classroom|lecture room/, "Classroom"],
  [/meeting room|quiet room|huddle/, "Meeting Room"],
  [/seminar/, "Seminar Hall"],
  [/auditorium|hall for|stage/, "Auditorium"],
  [/innovation|maker|workshop space/, "Innovation Space"],
  [/court|sports|arena|gym/, "Sports Facility"],
  [/equipment|av kit|projector kit|mic/, "Equipment"],
];

const EQUIPMENT_HINTS: [RegExp, string][] = [
  [/projector/, "Projector"],
  [/\bac\b|air condition/, "Air conditioning"],
  [/desktop|computers|pcs|systems/, "Desktop systems"],
  [/video conferenc|zoom|hybrid/, "Video conferencing"],
  [/whiteboard/, "Whiteboard"],
  [/pa system|mic|sound/, "PA system"],
  [/smart board/, "Smart board"],
  [/fume/, "Fume hood"],
  [/stream/, "Streaming"],
];

export function parseResourceQuery(text: string): ResourceQuery {
  const q = text.toLowerCase();

  const capacityMatch =
    q.match(/(\d{1,4})\s*(?:\+)?\s*(?:seat|seats|seater|people|persons|students|attendees)/) ??
    q.match(/(?:for|of)\s+(\d{1,4})\b/);
  const capacity = capacityMatch?.[1] ? Number(capacityMatch[1]) : null;

  const type = TYPE_HINTS.find(([re]) => re.test(q))?.[1] ?? null;
  const equipment = EQUIPMENT_HINTS.filter(([re]) => re.test(q)).map(([, v]) => v);

  const dayLabel = /tomorrow/.test(q)
    ? "Tomorrow"
    : /today|now|this afternoon|this morning/.test(q)
      ? "Today"
      : null;

  const range = q.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let start: string | null = null;
  let end: string | null = null;
  if (range) {
    const pm = range[5] === "pm" || /pm|afternoon|evening/.test(q);
    let s = Number(range[1]);
    let e = Number(range[3]);
    if (pm && s < 12) s += 12;
    if (pm && e < 12) e += 12;
    start = `${two(s)}:${range[2] ?? "00"}`;
    end = `${two(e)}:${range[4] ?? "00"}`;
  } else if (/after\s+(\d{1,2})/.test(q)) {
    const m = q.match(/after\s+(\d{1,2})/)!;
    let s = Number(m[1]);
    if (/pm/.test(q) && s < 12) s += 12;
    start = `${two(s)}:00`;
    end = `${two(Math.min(s + 2, 20))}:00`;
  } else if (/afternoon/.test(q)) {
    start = "14:00";
    end = "16:00";
  } else if (/morning/.test(q)) {
    start = "09:00";
    end = "11:00";
  }

  return {
    text,
    capacity,
    equipment,
    type,
    dayLabel,
    start,
    end,
    accessible: /accessible|wheelchair|step-free/.test(q),
  };
}

/* ------------------------------------------------------------------ */
/* MATCHING ENGINE — deterministic product estimate, NOT a ML model    */
/* ------------------------------------------------------------------ */

const slotFree = (resourceId: string, dayLabel: string | null, start: string | null, end: string | null) => {
  if (!start || !end) return true;
  const dayIndex = Math.max(0, AVAILABILITY_DAYS.indexOf((dayLabel ?? "Today") as never));
  const slots = getAvailability(resourceId, dayIndex);
  const s = Number(start.slice(0, 2));
  const e = Number(end.slice(0, 2));
  return slots
    .filter((sl) => Number(sl.start.slice(0, 2)) < e && Number(sl.end.slice(0, 2)) > s)
    .every((sl) => sl.status === "available");
};

export function scoreResource(p: ResourceProfile, query: ResourceQuery): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 55;

  // Capacity fit
  if (query.capacity) {
    const fits = p.capacity >= query.capacity;
    const overshoot = p.capacity - query.capacity;
    if (fits) {
      score += overshoot <= 20 ? 20 : 12;
      reasons.push({
        met: true,
        label: "Capacity requirement satisfied",
        detail: `${p.capacity} seats for ${query.capacity} requested${overshoot <= 20 ? " — efficient fit" : ""}.`,
      });
    } else {
      score -= 30;
      reasons.push({
        met: false,
        label: "Below requested capacity",
        detail: `${p.capacity} seats against ${query.capacity} requested.`,
      });
    }
  } else {
    score += 6;
  }

  // Equipment fit
  if (query.equipment.length) {
    const missing = query.equipment.filter((e) => !p.equipment.includes(e));
    if (missing.length === 0) {
      score += 16;
      reasons.push({
        met: true,
        label: "All requested equipment present",
        detail: query.equipment.join(" · "),
      });
    } else {
      score -= missing.length * 12;
      reasons.push({
        met: false,
        label: "Missing equipment",
        detail: missing.join(" · "),
      });
    }
  }

  // Type fit
  if (query.type) {
    if (p.type === query.type) {
      score += 10;
      reasons.push({ met: true, label: "Matches requested resource type", detail: p.type });
    } else {
      score -= 14;
      reasons.push({ met: false, label: "Different resource type", detail: p.type });
    }
  }

  // Accessibility
  if (query.accessible) {
    if (p.accessibility.wheelchair) {
      score += 8;
      reasons.push({ met: true, label: "Step-free and wheelchair accessible", detail: p.accessibility.note });
    } else {
      score -= 25;
      reasons.push({ met: false, label: "Not wheelchair accessible", detail: p.accessibility.note });
    }
  }

  // Availability
  const free = p.status !== "maintenance" && slotFree(p.id, query.dayLabel, query.start, query.end);
  const window =
    query.start && query.end
      ? `${query.dayLabel ?? "Today"} · ${query.start}–${query.end}`
      : "the requested window";
  if (p.status === "maintenance") {
    score -= 45;
    reasons.push({ met: false, label: "Withdrawn for maintenance", detail: p.maintenanceNote ?? "" });
  } else if (free) {
    score += 14;
    reasons.push({ met: true, label: "No scheduling conflict", detail: `Free across ${window}.` });
  } else {
    score -= 22;
    reasons.push({ met: false, label: "Scheduling conflict", detail: `Already reserved during ${window}.` });
  }

  // Utilization health
  if (p.utilization < 70) {
    score += 6;
    reasons.push({
      met: true,
      label: "Appropriate utilization",
      detail: `${p.utilization}% weekly — headroom available.`,
    });
  } else {
    score -= 4;
    reasons.push({
      met: false,
      label: "Heavily used resource",
      detail: `${p.utilization}% weekly utilization.`,
    });
  }

  // Distance
  score += Math.max(-6, 6 - p.walkMinutes);

  const conflictRisk: MatchResult["conflictRisk"] =
    !free || p.conflictRate >= 2.5 ? "High" : p.utilization >= 70 ? "Medium" : "Low";

  return {
    resource: p,
    score: Math.max(12, Math.min(98, Math.round(score))),
    reasons,
    availability:
      p.status === "maintenance"
        ? "Unavailable · maintenance"
        : free
          ? p.status === "available"
            ? "Available now"
            : "Available in requested window"
          : "Conflicts with an existing reservation",
    conflictRisk,
  };
}

/* ------------------------------------------------------------------ */
/* SERVICE LAYER — replace these bodies with real API calls            */
/* ------------------------------------------------------------------ */

export const getResourceProfiles = (): ResourceProfile[] => PROFILES;

export const getResourceProfile = (id: string): ResourceProfile | undefined =>
  PROFILES.find((p) => p.id === id);

export const getAvailability = (resourceId: string, dayIndex = 0): AvailabilitySlot[] => {
  const p = getResourceProfile(resourceId);
  return p ? buildSlots(p, dayIndex) : [];
};

export const getResourceInsights = (resourceId: string): ResourceInsight[] => {
  const p = getResourceProfile(resourceId);
  return p ? buildInsights(p) : [];
};

export const getResourceBookings = (resourceId: string): Booking[] =>
  getBookingsForResource(resourceId);

export const matchResources = (query: ResourceQuery): MatchResult[] =>
  PROFILES.map((p) => scoreResource(p, query)).sort((a, b) => b.score - a.score);

export const findAlternatives = (resourceId: string, limit = 3): MatchResult[] => {
  const target = getResourceProfile(resourceId);
  if (!target) return [];
  const query: ResourceQuery = {
    text: `Alternatives to ${target.name}`,
    capacity: Math.round(target.capacity * 0.85),
    equipment: target.equipment.slice(0, 2),
    type: null,
    dayLabel: "Today",
    start: null,
    end: null,
    accessible: false,
  };
  return PROFILES.filter((p) => p.id !== resourceId && p.status !== "maintenance")
    .map((p) => scoreResource(p, query))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const alternativeRationale = (target: ResourceProfile, alt: ResourceProfile): string => {
  const parts: string[] = [];
  const capDiff = alt.capacity - target.capacity;
  parts.push(
    capDiff === 0
      ? "Same capacity"
      : capDiff > 0
        ? `${capDiff} more seats`
        : `${Math.abs(capDiff)} fewer seats`,
  );
  const missing = target.equipment.filter((e) => !alt.equipment.includes(e));
  parts.push(missing.length ? `missing ${missing.join(", ").toLowerCase()}` : "same equipment");
  const walk = alt.walkMinutes - target.walkMinutes;
  parts.push(
    walk === 0
      ? "same walking distance"
      : walk > 0
        ? `${walk} min farther`
        : `${Math.abs(walk)} min closer`,
  );
  return `${parts.join(", ")}.`;
};

export const resourceCategories = (): { type: ResourceType; count: number }[] => {
  const map = new Map<ResourceType, number>();
  for (const p of PROFILES) map.set(p.type, (map.get(p.type) ?? 0) + 1);
  return [...map.entries()].map(([type, count]) => ({ type, count }));
};

export const buildings = (): string[] => [...new Set(PROFILES.map((p) => p.building))].sort();

export const resourceFleetSummary = () => {
  const total = PROFILES.length;
  const availableNow = PROFILES.filter((p) => p.status === "available").length;
  const avgUtilization = Math.round(
    PROFILES.reduce((sum, p) => sum + p.utilization, 0) / Math.max(total, 1),
  );
  const pressured = PROFILES.filter(
    (p) => p.bookingPressure === "High" || p.bookingPressure === "Elevated",
  ).length;
  const upcoming = getBookings().filter(
    (b) => b.status === "approved" || b.status === "pending",
  ).length;
  return { total, availableNow, avgUtilization, pressured, upcoming };
};

/** Suggested searches shown in the discovery console. */
export const exampleQueries = [
  "60 seat lab tomorrow 2-4 PM with projector",
  "quiet meeting room for 10 people",
  "auditorium for 200 students",
  "available computer lab after 4 PM",
];
