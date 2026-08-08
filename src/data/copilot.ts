/**
 * CAMPUSOS AI — COPILOT SERVICE (MOCK)
 * ------------------------------------------------------------------
 * The Copilot UI talks ONLY to `runCopilot()`. Everything here is
 * deterministic: the same prompt always produces the same answer, and
 * no value is randomised at render time.
 *
 * To go live, replace the body of `runCopilot()` with a call to the real
 * Copilot API / AI orchestration layer and keep the returned shapes.
 * The exported types below are the integration contract.
 */

import { getBookings, getInsights, getResource, getResources, campusHealth } from "./campus";
import type { Resource } from "./campus";
import type { Tone } from "@/components/campusos/ui/primitives";

export type CopilotIntent =
  | "find-resource"
  | "resolve-conflict"
  | "analyze-utilization"
  | "summarize-operations"
  | "explain-resource"
  | "booking-pressure"
  | "unknown";

export interface CopilotRequirement {
  label: string;
  value: string;
}

export interface CopilotStage {
  label: string;
  detail: string;
}

export interface CopilotSlot {
  dayLabel: string;
  start: string;
  end: string;
}

export interface CopilotCandidate {
  resourceId: string;
  name: string;
  building: string;
  capacity: number;
  amenities: string[];
  score: number;
  availability: string;
  status: Resource["status"];
  utilization: number;
  reason: string;
}

export interface CopilotEvidence {
  label: string;
  value: string;
  note: string;
  tone: Tone;
}

export interface CopilotFinding {
  title: string;
  detail: string;
  tone: Tone;
  link?: { to: "/resources/$id" | "/bookings/$id"; id: string; label: string } | undefined;
}

export interface CopilotAnswer {
  id: string;
  kind: "recommendation" | "briefing" | "conflict" | "no-match" | "error";
  intent: CopilotIntent;
  intentLabel: string;
  headline: string;
  requirements: CopilotRequirement[];
  stages: CopilotStage[];
  evaluated: number;
  matched: number;
  slot?: CopilotSlot | undefined;
  best?: CopilotCandidate | undefined;
  alternatives: CopilotCandidate[];
  evidence: CopilotEvidence[];
  findings: CopilotFinding[];
  summary: string;
  followUps: string[];
}

/* ------------------------------------------------------------------ */
/* Deterministic intent parsing                                        */
/* ------------------------------------------------------------------ */

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

function detectIntent(q: string): CopilotIntent {
  if (has(q, "error", "fail 500")) return "unknown";
  if (has(q, "conflict", "clash", "double book", "double-book")) return "resolve-conflict";
  if (has(q, "underutilis", "underutiliz", "utilization", "utilisation", "wasted"))
    return "analyze-utilization";
  if (has(q, "summar", "brief", "today's operations", "operations today", "digest"))
    return "summarize-operations";
  if (has(q, "pressure", "demand forecast", "tomorrow's booking", "booking pressure"))
    return "booking-pressure";
  if (has(q, "why is", "why was", "unavailable", "blocked")) return "explain-resource";
  if (has(q, "find", "book", "need", "reserve", "room", "lab", "hall", "seats", "space"))
    return "find-resource";
  return "unknown";
}

const intentLabels: Record<CopilotIntent, string> = {
  "find-resource": "Find & reserve a resource",
  "resolve-conflict": "Resolve a scheduling conflict",
  "analyze-utilization": "Analyze campus utilization",
  "summarize-operations": "Summarize campus operations",
  "explain-resource": "Explain resource availability",
  "booking-pressure": "Forecast booking pressure",
  unknown: "Interpret request",
};

function parseCapacity(q: string): number | null {
  const seat = q.match(/(\d{2,4})\s*(?:-|\s)?(?:seat|seats|seater|people|students|attendees|pax)/);
  if (seat?.[1]) return Number(seat[1]);
  const forN = q.match(/for\s+(\d{2,4})/);
  if (forN?.[1]) return Number(forN[1]);
  return null;
}

function parseSlot(q: string): CopilotSlot {
  const dayLabel = has(q, "tomorrow")
    ? "Tomorrow"
    : has(q, "monday", "next week")
      ? "Next Monday"
      : "Today";
  const range = q.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})\s*(?::(\d{2}))?/);
  if (range) {
    const pm = has(q, "pm", "afternoon", "evening");
    const to24 = (h: number) => (pm && h < 12 ? h + 12 : h);
    const s = to24(Number(range[1]));
    const e = to24(Number(range[3]));
    return {
      dayLabel,
      start: `${String(s).padStart(2, "0")}:${range[2] ?? "00"}`,
      end: `${String(e).padStart(2, "0")}:${range[4] ?? "00"}`,
    };
  }
  if (has(q, "morning")) return { dayLabel, start: "09:00", end: "11:00" };
  if (has(q, "evening")) return { dayLabel, start: "17:00", end: "19:00" };
  return { dayLabel, start: "14:00", end: "16:00" };
}

const equipmentMap: { keys: string[]; amenity: string }[] = [
  { keys: ["projector"], amenity: "Projector" },
  { keys: ["ac", "air conditioning", "air-conditioned"], amenity: "Air conditioning" },
  { keys: ["desktop", "computers", "pcs", "systems"], amenity: "desktop systems" },
  { keys: ["whiteboard"], amenity: "Whiteboard" },
  { keys: ["video conferencing", "video call", "zoom"], amenity: "Video conferencing" },
  { keys: ["stage"], amenity: "Stage" },
  { keys: ["pa system", "microphone", "sound"], amenity: "PA system" },
  { keys: ["streaming", "stream", "record"], amenity: "Live streaming" },
  { keys: ["smart board", "smartboard"], amenity: "Smart board" },
];

function parseEquipment(q: string): string[] {
  return equipmentMap.filter((e) => has(q, ...e.keys)).map((e) => e.amenity);
}

function parseType(q: string): Resource["type"] | null {
  if (has(q, "computer lab", "programming lab", "lab with computers")) return "Computer Lab";
  if (has(q, "physics lab", "science lab")) return "Physics Lab";
  if (has(q, "auditorium", "hall", "seminar")) return "Auditorium";
  if (has(q, "meeting room", "committee", "boardroom")) return "Meeting Room";
  if (has(q, "classroom", "lecture room")) return "Classroom";
  if (has(q, "court", "sports", "arena")) return "Sports Facility";
  if (has(q, "lab")) return "Computer Lab";
  return null;
}

/* ------------------------------------------------------------------ */
/* Deterministic scoring                                               */
/* ------------------------------------------------------------------ */

const amenityMatch = (r: Resource, needle: string) =>
  r.amenities.some((a) => a.toLowerCase().includes(needle.toLowerCase()));

function scoreResource(
  r: Resource,
  capacity: number,
  equipment: string[],
  type: Resource["type"] | null,
): number {
  let score = 34;
  if (r.capacity >= capacity) {
    const headroom = (r.capacity - capacity) / Math.max(capacity, 1);
    score += headroom <= 0.35 ? 26 : headroom <= 1 ? 18 : 10;
  } else {
    score -= 30;
  }
  const equipmentHits = equipment.filter((e) => amenityMatch(r, e)).length;
  score += equipment.length ? Math.round((equipmentHits / equipment.length) * 22) : 12;
  // A stated resource type is a strong signal: a lab request should not win with a classroom.
  if (type) score += r.type === type ? 22 : -14;
  if (r.status === "available") score += 12;
  if (r.status === "maintenance") score -= 45;
  score += Math.round((100 - r.utilization) / 8);
  // Soft-scale the weighted total so strong candidates stay distinguishable
  // instead of flattening against the ceiling.
  return Math.max(8, Math.min(97, Math.round(score * 0.82)));


}

function toCandidate(
  r: Resource,
  score: number,
  slot: CopilotSlot,
  equipment: string[],
  capacity: number,
): CopilotCandidate {
  const missing = equipment.filter((e) => !amenityMatch(r, e));
  const reason =
    r.status === "maintenance"
      ? "Under maintenance this week"
      : missing.length
        ? `Missing ${missing[0]?.toLowerCase()}`
        : r.capacity >= capacity * 1.8
          ? "Larger than required — spare capacity"
          : r.utilization < 50
            ? "Consistently free in this window"
            : "Meets every stated requirement";
  return {
    resourceId: r.id,
    name: r.name,
    building: r.building,
    capacity: r.capacity,
    amenities: r.amenities,
    score,
    availability:
      r.status === "maintenance"
        ? "Unavailable · maintenance"
        : `${slot.dayLabel} · ${slot.start}–${slot.end}`,
    status: r.status,
    utilization: r.utilization,
    reason,
  };
}

/* ------------------------------------------------------------------ */
/* Answer builders                                                     */
/* ------------------------------------------------------------------ */

function findResource(query: string, q: string): CopilotAnswer {
  const capacity = parseCapacity(q) ?? 60;
  const equipment = parseEquipment(q);
  const type = parseType(q);
  const slot = parseSlot(q);
  const resources = getResources();

  const ranked = resources
    .map((r) => ({ r, score: scoreResource(r, capacity, equipment, type) }))
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name));

  const viable = ranked.filter(
    ({ r }) =>
      r.capacity >= capacity &&
      r.status !== "maintenance" &&
      equipment.every((e) => amenityMatch(r, e)),
  );

  const requirements: CopilotRequirement[] = [
    { label: "Capacity", value: `≥ ${capacity} seats` },
    { label: "Window", value: `${slot.dayLabel} · ${slot.start}–${slot.end}` },
    { label: "Equipment", value: equipment.length ? equipment.join(" · ") : "Not specified" },
    { label: "Resource type", value: type ?? "Any bookable space" },
  ];

  const stages: CopilotStage[] = [
    { label: "Understanding request", detail: `Intent: find resource · ${capacity}+ seats` },
    { label: "Querying resource index", detail: `${resources.length} bookable resources` },
    {
      label: "Checking availability",
      detail: `cross-referenced ${getBookings().length} bookings for ${slot.dayLabel.toLowerCase()}`,
    },
    { label: "Comparing options", detail: "capacity fit · equipment · conflict risk · history" },
    { label: "Preparing recommendation", detail: "ranked by weighted match score" },
  ];

  if (!viable.length) {
    const nearest = ranked[0];
    return {
      id: `ans-${capacity}-nomatch`,
      kind: "no-match",
      intent: "find-resource",
      intentLabel: intentLabels["find-resource"],
      headline: `No resource satisfies every requirement ${slot.dayLabel.toLowerCase()}`,
      requirements,
      stages,
      evaluated: resources.length,
      matched: 0,
      slot,
      alternatives: nearest
        ? [toCandidate(nearest.r, nearest.score, slot, equipment, capacity)]
        : [],
      evidence: [],
      findings: [
        {
          title: "Largest available space is smaller than requested",
          detail: `Campus maximum in this window is ${Math.max(
            ...resources.filter((r) => r.status !== "maintenance").map((r) => r.capacity),
          )} seats.`,
          tone: "warning",
        },
        {
          title: "Split the cohort or move the window",
          detail: "Two parallel sessions in Engineering Block Level 2 satisfy the same headcount.",
          tone: "info",
        },
      ],
      summary:
        "CampusOS could not satisfy all constraints together. Relax capacity, drop an equipment requirement, or move the window.",
      followUps: [
        "Find two rooms that together seat this cohort",
        "Show the largest available space tomorrow",
        "Which windows are free for 200 students?",
      ],
    };
  }

  const bestEntry = viable[0]!;
  const best = toCandidate(bestEntry.r, bestEntry.score, slot, equipment, capacity);
  const alternatives = viable
    .slice(1, 4)
    .map(({ r, score }) => toCandidate(r, score, slot, equipment, capacity));

  const evidence: CopilotEvidence[] = [
    {
      label: "Capacity fit",
      value: `${best.capacity} / ${capacity} seats`,
      note: `${best.capacity - capacity} seats of headroom`,
      tone: "success",
    },
    {
      label: "Availability",
      value: `${slot.start}–${slot.end}`,
      note: "No overlapping reservation in this window",
      tone: "success",
    },
    {
      label: "Equipment",
      value: equipment.length ? equipment.join(", ") : "Standard fit-out",
      note: "All requested equipment present in the room record",
      tone: "success",
    },
    {
      label: "Location",
      value: best.building,
      note: "Within the requesting department's teaching cluster",
      tone: "info",
    },
    {
      label: "Utilization",
      value: `${best.utilization}% weekly`,
      note:
        best.utilization < 60
          ? "Below campus average — low displacement risk"
          : "At campus average — book early",
      tone: best.utilization < 60 ? "success" : "warning",
    },
    {
      label: "Conflict risk",
      value: best.utilization > 75 ? "Medium" : "Low",
      note: "Based on 7-day booking history for this slot",
      tone: best.utilization > 75 ? "warning" : "success",
    },
  ];

  return {
    id: `ans-${best.resourceId}-${capacity}-${slot.start}`,
    kind: "recommendation",
    intent: "find-resource",
    intentLabel: intentLabels["find-resource"],
    headline: `${best.name} is the strongest match`,
    requirements,
    stages,
    evaluated: resources.length,
    matched: viable.length,
    slot,
    best,
    alternatives,
    evidence,
    findings: [],
    summary: `${best.name} in ${best.building} meets the capacity, equipment and availability constraints with a ${best.score}% weighted match. ${alternatives.length} viable alternatives were retained.`,
    followUps: [
      "Compare this with Computer Lab 05",
      "Reserve it for the whole afternoon instead",
      "Show tomorrow's booking pressure",
    ],
  };
}

function resolveConflict(): CopilotAnswer {
  const conflicts = getBookings().filter((b) => b.status === "conflict");
  const primary = conflicts[0];
  const target = getResource("computer-lab-05");
  const slot: CopilotSlot = {
    dayLabel: "Today",
    start: primary?.start ?? "14:00",
    end: primary?.end ?? "16:00",
  };

  return {
    id: "ans-conflict",
    kind: "conflict",
    intent: "resolve-conflict",
    intentLabel: intentLabels["resolve-conflict"],
    headline: primary
      ? `${primary.resourceName} is double-booked at ${primary.start}`
      : "No open conflicts on campus",
    requirements: [
      { label: "Conflict", value: primary ? primary.resourceName : "None" },
      { label: "Window", value: `${slot.start}–${slot.end}` },
      { label: "Affected bookings", value: `${Math.max(conflicts.length, 1) + 1} reservations` },
      { label: "Objective", value: "Zero displaced sessions" },
    ],
    stages: [
      { label: "Understanding request", detail: "Intent: resolve scheduling conflict" },
      { label: "Locating conflicts", detail: `${conflicts.length || 1} flagged reservation(s)` },
      { label: "Scoring both claims", detail: "cohort size · course criticality · lead time" },
      { label: "Searching relocation targets", detail: "identical hardware, same building" },
      { label: "Preparing resolution", detail: "single-move plan with no displacement" },
    ],
    evaluated: getBookings().length,
    matched: 1,
    slot,
    best: target
      ? {
          resourceId: target.id,
          name: target.name,
          building: target.building,
          capacity: target.capacity,
          amenities: target.amenities,
          score: 91,
          availability: `Today · ${slot.start}–${slot.end}`,
          status: target.status,
          utilization: target.utilization,
          reason: "Identical hardware, free in the contested window",
        }
      : undefined,
    alternatives: [],
    evidence: [
      {
        label: "Displacement",
        value: "0 sessions",
        note: "The relocated cohort keeps its original time",
        tone: "success",
      },
      {
        label: "Hardware parity",
        value: "Identical",
        note: "Same desktop image and projector model as the contested lab",
        tone: "success",
      },
      {
        label: "Walk distance",
        value: "Same floor",
        note: "Engineering Block Level 2 — no cross-campus movement",
        tone: "info",
      },
      {
        label: "Recurrence risk",
        value: "High without action",
        note: "This slot has produced 2 conflicts in the last 14 days",
        tone: "warning",
      },
    ],
    findings: [
      {
        title: "Move the lower-priority session to Computer Lab 05",
        detail: "41% utilised, seats 70, identical equipment, free for the full window.",
        tone: "success",
        link: { to: "/resources/$id", id: "computer-lab-05", label: "Open Computer Lab 05" },
      },
      ...(primary
        ? [
            {
              title: "Notify both organisers automatically",
              detail: `${primary.organiser} and the competing organiser receive the change with one action.`,
              tone: "info" as Tone,
              link: {
                to: "/bookings/$id" as const,
                id: primary.id,
                label: `Open ${primary.id}`,
              },
            },
          ]
        : []),
      {
        title: "Add a standing rule for this window",
        detail: "Route overflow requests for 14:00–16:00 to Level 2 overflow labs by default.",
        tone: "warning",
      },
    ],
    summary:
      "One relocation resolves the conflict with zero displaced sessions. CampusOS recommends applying the move and adding a standing overflow rule for this window.",
    followUps: [
      "Apply the relocation",
      "Show today's campus conflicts",
      "Why is Lab 03 unavailable?",
    ],
  };
}

function analyzeUtilization(): CopilotAnswer {
  const resources = getResources();
  const under = resources.filter((r) => r.utilization < 45);
  const over = resources.filter((r) => r.utilization >= 75);

  return {
    id: "ans-utilization",
    kind: "briefing",
    intent: "analyze-utilization",
    intentLabel: intentLabels["analyze-utilization"],
    headline: `${under.length} resources are underutilised while ${over.length} run hot`,
    requirements: [
      { label: "Scope", value: `${resources.length} bookable resources` },
      { label: "Window", value: "Trailing 7 days" },
      { label: "Threshold", value: "Under 45% / over 75%" },
      { label: "Objective", value: "Rebalance demand" },
    ],
    stages: [
      { label: "Understanding request", detail: "Intent: utilization analysis" },
      { label: "Aggregating utilization", detail: "7-day series per resource" },
      { label: "Detecting imbalance", detail: "comparing against seasonal baseline" },
      { label: "Preparing recommendation", detail: "rebalancing plan" },
    ],
    evaluated: resources.length,
    matched: under.length + over.length,
    alternatives: [],
    evidence: [
      {
        label: "Campus utilization",
        value: `${campusHealth.utilization}%`,
        note: "Above the 68% seasonal baseline",
        tone: "warning",
      },
      {
        label: "Spare seat-hours",
        value: "480 next week",
        note: "Concentrated in Science Wing and Seminar Hall A",
        tone: "success",
      },
      {
        label: "Pressure point",
        value: "14:00–17:00",
        note: "9 overlapping requests in Engineering Block",
        tone: "critical",
      },
    ],
    findings: [
      ...under.slice(0, 3).map(
        (r): CopilotFinding => ({
          title: `${r.name} — ${r.utilization}% utilised`,
          detail: `${r.capacity} seats in ${r.building}. Absorbs overflow without new capacity.`,
          tone: "success",
          link: { to: "/resources/$id", id: r.id, label: `Open ${r.name}` },
        }),
      ),
      ...over.slice(0, 2).map(
        (r): CopilotFinding => ({
          title: `${r.name} — ${r.utilization}% utilised`,
          detail: `Persistent scheduling pressure in ${r.building}. Cap new recurring bookings.`,
          tone: "critical",
          link: { to: "/resources/$id", id: r.id, label: `Open ${r.name}` },
        }),
      ),
    ],
    summary:
      "Demand is concentrated, not exceeded. Routing two recurring sessions from the hottest labs into the underutilised ones removes the pressure without adding capacity.",
    followUps: [
      "Move a recurring session to Computer Lab 05",
      "Show tomorrow's booking pressure",
      "Summarize today's operations",
    ],
  };
}

function summarizeOperations(): CopilotAnswer {
  const insights = getInsights();
  const pending = getBookings().filter((b) => b.status === "pending");

  return {
    id: "ans-summary",
    kind: "briefing",
    intent: "summarize-operations",
    intentLabel: intentLabels["summarize-operations"],
    headline: "Campus is healthy with two items needing a decision today",
    requirements: [
      { label: "Campus health", value: `${campusHealth.score} / 100` },
      { label: "Utilization", value: `${campusHealth.utilization}%` },
      { label: "Open conflicts", value: `${getBookings().filter((b) => b.status === "conflict").length}` },
      { label: "Pending approvals", value: `${pending.length}` },
    ],
    stages: [
      { label: "Understanding request", detail: "Intent: operations briefing" },
      { label: "Reading campus signals", detail: "bookings · approvals · conflicts · anomalies" },
      { label: "Ranking by impact", detail: "severity × affected cohorts" },
      { label: "Preparing briefing", detail: "decision-first summary" },
    ],
    evaluated: getBookings().length + insights.length,
    matched: insights.length,
    alternatives: [],
    evidence: [
      {
        label: "Booking pressure",
        value: `${campusHealth.bookingPressure}%`,
        note: "Peaks between 14:00 and 17:00",
        tone: "warning",
      },
      {
        label: "Conflict rate",
        value: `${campusHealth.conflictRate}%`,
        note: "Down from 4.4% last week",
        tone: "success",
      },
      {
        label: "Waiting on you",
        value: `${campusHealth.pendingActions} actions`,
        note: "2 have been open more than 24 hours",
        tone: "warning",
      },
    ],
    findings: insights.slice(0, 4).map(
      (i): CopilotFinding => ({
        title: i.title,
        detail: i.recommendation,
        tone: i.severity === "critical" ? "critical" : i.severity === "attention" ? "warning" : "info",
      }),
    ),
    summary:
      "Two decisions matter today: resolve the Engineering Block lab conflict and clear the two approvals older than 24 hours. Everything else is within tolerance.",
    followUps: [
      "Show today's campus conflicts",
      "Which resources are underutilised?",
      "Find a 60-seat lab tomorrow 2–4 PM with a projector",
    ],
  };
}

function bookingPressure(): CopilotAnswer {
  return {
    id: "ans-pressure",
    kind: "briefing",
    intent: "booking-pressure",
    intentLabel: intentLabels["booking-pressure"],
    headline: "Tomorrow peaks at 14:00 with 9 competing requests",
    requirements: [
      { label: "Horizon", value: "Next 24 hours" },
      { label: "Peak window", value: "14:00–17:00" },
      { label: "Pressure index", value: `${campusHealth.bookingPressure}%` },
      { label: "Objective", value: "Avoid new conflicts" },
    ],
    stages: [
      { label: "Understanding request", detail: "Intent: demand forecast" },
      { label: "Projecting demand", detail: "7-day pattern + confirmed reservations" },
      { label: "Locating collision windows", detail: "per building and resource type" },
      { label: "Preparing forecast", detail: "with pre-emptive actions" },
    ],
    evaluated: getBookings().length,
    matched: 3,
    alternatives: [],
    evidence: [
      {
        label: "Peak load",
        value: "9 requests / 4 labs",
        note: "Engineering Block, 14:00–17:00",
        tone: "critical",
      },
      {
        label: "Headroom",
        value: "3 rooms free",
        note: "Humanities Block and Science Wing in the same window",
        tone: "success",
      },
      {
        label: "Forecast confidence",
        value: "High",
        note: "Pattern held for 3 consecutive weeks",
        tone: "info",
      },
    ],
    findings: [
      {
        title: "Pre-release two Level 2 overflow labs",
        detail: "Opens 142 seats in the contested window before requests arrive.",
        tone: "success",
        link: { to: "/resources/$id", id: "computer-lab-05", label: "Open Computer Lab 05" },
      },
      {
        title: "Hold Seminar Hall A for large cohorts",
        detail: "220 seats currently unbooked tomorrow afternoon.",
        tone: "info",
        link: { to: "/resources/$id", id: "seminar-hall-a", label: "Open Seminar Hall A" },
      },
    ],
    summary:
      "Pressure is predictable and containable. Pre-releasing overflow labs before 12:00 removes the projected collision entirely.",
    followUps: [
      "Reserve an overflow lab for tomorrow afternoon",
      "Resolve this scheduling conflict",
      "Which resources are underutilised?",
    ],
  };
}

function explainResource(q: string): CopilotAnswer {
  const target =
    getResources().find((r) => q.includes(r.name.toLowerCase())) ?? getResource("computer-lab-03")!;
  const bookings = getBookings().filter((b) => b.resourceId === target.id);

  return {
    id: `ans-explain-${target.id}`,
    kind: "briefing",
    intent: "explain-resource",
    intentLabel: intentLabels["explain-resource"],
    headline: `${target.name} is ${target.status === "available" ? "bookable but heavily contested" : "not bookable right now"}`,
    requirements: [
      { label: "Resource", value: target.name },
      { label: "Status", value: target.status },
      { label: "Utilization", value: `${target.utilization}%` },
      { label: "Next booking", value: target.nextBooking ?? "None scheduled" },
    ],
    stages: [
      { label: "Understanding request", detail: `Intent: explain ${target.name}` },
      { label: "Reading resource record", detail: `${bookings.length} reservations on file` },
      { label: "Checking blockers", detail: "status · maintenance · overlapping claims" },
      { label: "Preparing explanation", detail: "cause and remedy" },
    ],
    evaluated: bookings.length || 1,
    matched: 1,
    alternatives: [],
    evidence: [
      {
        label: "Status",
        value: target.status,
        note:
          target.status === "maintenance"
            ? "Maintenance window active — bookings blocked"
            : target.status === "in-use"
              ? "Currently occupied by a confirmed session"
              : "Bookable, subject to approval",
        tone: target.status === "available" ? "success" : "warning",
      },
      {
        label: "Utilization",
        value: `${target.utilization}%`,
        note: "Highest-demand resource in its building",
        tone: target.utilization > 75 ? "critical" : "info",
      },
      {
        label: "Next free window",
        value: target.nextBooking ?? "Open",
        note: "Derived from confirmed reservations",
        tone: "info",
      },
    ],
    findings: [
      {
        title: "Use the identical overflow lab instead",
        detail: "Computer Lab 05 has the same hardware at 41% utilization.",
        tone: "success",
        link: { to: "/resources/$id", id: "computer-lab-05", label: "Open Computer Lab 05" },
      },
      {
        title: "Review the reservations holding this slot",
        detail: `${bookings.length || 2} reservations compete for this resource this week.`,
        tone: "info",
        link: { to: "/resources/$id", id: target.id, label: `Open ${target.name}` },
      },
    ],
    summary: `${target.name} is constrained by demand, not by capacity. Routing this request to the identical overflow lab resolves it immediately.`,
    followUps: [
      "Reserve Computer Lab 05 instead",
      "Show today's campus conflicts",
      "Which resources are underutilised?",
    ],
  };
}

function unknownAnswer(query: string): CopilotAnswer {
  return {
    id: "ans-unknown",
    kind: "no-match",
    intent: "unknown",
    intentLabel: intentLabels.unknown,
    headline: "CampusOS needs a little more to work with",
    requirements: [{ label: "Received", value: query.slice(0, 80) || "Empty request" }],
    stages: [
      { label: "Understanding request", detail: "no operational intent detected" },
      { label: "Matching against capabilities", detail: "resources · bookings · conflicts · analytics" },
    ],
    evaluated: 0,
    matched: 0,
    alternatives: [],
    evidence: [],
    findings: [
      {
        title: "Try an operational request",
        detail: "CampusOS reasons over resources, bookings, conflicts, utilization and operations.",
        tone: "info",
      },
    ],
    summary:
      "CampusOS answers operational questions about campus resources, bookings, conflicts and utilization. Add a constraint — capacity, time or equipment — and it will reason over the campus.",
    followUps: [
      "Find a 60-seat lab tomorrow 2–4 PM with a projector",
      "Show today's campus conflicts",
      "Summarize today's operations",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* PUBLIC ENTRY POINT — swap this body for the real Copilot API        */
/* ------------------------------------------------------------------ */

export function runCopilot(query: string): CopilotAnswer {
  const q = query.toLowerCase().trim();
  const intent = detectIntent(q);
  switch (intent) {
    case "find-resource":
      return findResource(query, q);
    case "resolve-conflict":
      return resolveConflict();
    case "analyze-utilization":
      return analyzeUtilization();
    case "summarize-operations":
      return summarizeOperations();
    case "booking-pressure":
      return bookingPressure();
    case "explain-resource":
      return explainResource(q);
    default:
      return unknownAnswer(query);
  }
}

/** Quick actions shown in the Copilot empty state. */
export const copilotQuickActions = [
  {
    label: "Find a resource",
    icon: "search" as const,
    prompt: "Find an available computer lab this afternoon for 60 students",
  },
  {
    label: "Book a room",
    icon: "calendar" as const,
    prompt: "I need a 60-seat lab tomorrow from 2–4 PM with a projector",
  },
  {
    label: "Resolve a conflict",
    icon: "alert" as const,
    prompt: "Resolve the Computer Lab 03 scheduling conflict at 14:00",
  },
  {
    label: "Analyze campus",
    icon: "chart" as const,
    prompt: "Which resources are underutilised?",
  },
  {
    label: "Summarize operations",
    icon: "file" as const,
    prompt: "Summarize today's campus operations",
  },
];

/** Longer example commands surfaced under the quick actions. */
export const copilotCommands = [
  "Find a room for 80 students tomorrow morning",
  "Show today's campus conflicts",
  "Show me tomorrow's booking pressure",
  "Why is Computer Lab 03 unavailable?",
  "Find a seminar hall with streaming for 200 people",
  "Which resources are underutilised?",
];
