import type { CopilotAnswer, CopilotCandidate, CopilotEvidence, CopilotFinding } from "@campus-os/shared-types";

import { CampusInsight } from "../../../db/models.js";
import { bookingPressure } from "../../../modules/bookings/booking.service.js";
import { dateForDayLabel } from "../../../modules/bookings/time.js";
import { matchResources } from "../../../modules/resources/resource.service.js";
import { naturalLanguageResourceQuery } from "./tools.js";

function intentFor(query: string) {
  const q = query.toLowerCase();
  if (/conflict|clash|double/.test(q)) return "resolve-conflict" as const;
  if (/underutil|utilization|utilisation|wasted/.test(q)) return "analyze-utilization" as const;
  if (/summar|brief|operations|digest/.test(q)) return "summarize-operations" as const;
  if (/pressure|demand/.test(q)) return "booking-pressure" as const;
  if (/why|unavailable|blocked/.test(q)) return "explain-resource" as const;
  if (/find|book|need|reserve|room|lab|hall|seat|space/.test(q)) return "find-resource" as const;
  return "unknown" as const;
}

const labels = {
  "find-resource": "Find & reserve a resource",
  "resolve-conflict": "Resolve a scheduling conflict",
  "analyze-utilization": "Analyze campus utilization",
  "summarize-operations": "Summarize campus operations",
  "explain-resource": "Explain resource availability",
  "booking-pressure": "Forecast booking pressure",
  unknown: "Interpret request",
};

export async function buildLocalCopilotAnswer(query: string): Promise<CopilotAnswer> {
  const intent = intentFor(query);
  const resourceQuery = naturalLanguageResourceQuery(query);
  const results = await matchResources(resourceQuery);
  const slot =
    resourceQuery.start && resourceQuery.end
      ? { dayLabel: resourceQuery.dayLabel ?? "Today", start: resourceQuery.start, end: resourceQuery.end }
      : undefined;

  const candidates: CopilotCandidate[] = results.slice(0, 4).map((result) => ({
    resourceId: result.resource.id,
    name: result.resource.name,
    building: result.resource.building,
    capacity: result.resource.capacity,
    amenities: result.resource.amenities,
    score: result.score,
    availability: result.availability,
    status: result.resource.status,
    utilization: result.resource.utilization,
    reason: result.reasons.find((reason) => reason.met)?.label ?? result.availability,
  }));
  const best = candidates[0];

  if (intent === "booking-pressure") {
    const pressure = await bookingPressure(dateForDayLabel(resourceQuery.dayLabel ?? "Today"));
    return {
      id: `ans-pressure-${Date.now()}`,
      kind: "briefing",
      intent,
      intentLabel: labels[intent],
      headline: `${pressure.level} booking pressure with peak ${pressure.peakWindow}`,
      requirements: [
        { label: "Horizon", value: resourceQuery.dayLabel ?? "Today" },
        { label: "Pressure index", value: `${pressure.overall}%` },
      ],
      stages: [
        { label: "Understanding request", detail: "Intent: demand forecast" },
        { label: "Aggregating bookings", detail: "Mongo overlap aggregation across active statuses" },
        { label: "Preparing forecast", detail: "ranked hot resources and pressure windows" },
      ],
      evaluated: pressure.byHour.length,
      matched: pressure.hotResources.length,
      alternatives: [],
      evidence: pressure.hotResources.map(
        (item): CopilotEvidence => ({
          label: item.name,
          value: `${item.value}%`,
          note: "High relative booking concentration",
          tone: item.value >= 70 ? "critical" : "warning",
        }),
      ),
      findings: [],
      summary: `CampusOS sees ${pressure.level.toLowerCase()} pressure today. The safest action is to pre-release overflow capacity before ${pressure.peakWindow}.`,
      followUps: ["Find overflow labs for the peak window", "Show pending approvals", "Which resources are underutilised?"],
    };
  }

  if (intent === "summarize-operations" || intent === "analyze-utilization") {
    const insights = await CampusInsight.find().sort({ externalId: 1 }).limit(4).lean();
    return {
      id: `ans-briefing-${Date.now()}`,
      kind: "briefing",
      intent,
      intentLabel: labels[intent],
      headline: insights[0]?.title ?? "Campus operations are within normal range",
      requirements: [{ label: "Scope", value: "Bookings · resources · intelligence" }],
      stages: [
        { label: "Understanding request", detail: `Intent: ${labels[intent]}` },
        { label: "Reading campus signals", detail: "resources · bookings · insights" },
        { label: "Ranking by impact", detail: "severity and operational blast radius" },
      ],
      evaluated: insights.length,
      matched: insights.length,
      alternatives: [],
      evidence: insights.map((insight) => ({
        label: insight.category,
        value: insight.severity,
        note: insight.recommendation,
        tone: insight.severity === "critical" ? "critical" : insight.severity === "attention" ? "warning" : "info",
      })),
      findings: insights.map(
        (insight): CopilotFinding => ({
          title: insight.title,
          detail: insight.explanation,
          tone: insight.severity === "critical" ? "critical" : insight.severity === "attention" ? "warning" : "info",
        }),
      ),
      summary: "The highest leverage action is to rebalance pressured lab demand into available overflow capacity.",
      followUps: ["Show tomorrow's booking pressure", "Find an available computer lab", "Review pending approvals"],
    };
  }

  if (!best) {
    return {
      id: `ans-error-${Date.now()}`,
      kind: "no-match",
      intent,
      intentLabel: labels[intent],
      headline: "CampusOS needs a little more to work with",
      requirements: [{ label: "Received", value: query.slice(0, 80) || "Empty request" }],
      stages: [
        { label: "Understanding request", detail: "No operational intent detected" },
        { label: "Matching against capabilities", detail: "resources · bookings · conflicts · analytics" },
      ],
      evaluated: 0,
      matched: 0,
      alternatives: [],
      evidence: [],
      findings: [{ title: "Try an operational request", detail: "Add a capacity, time, resource, or equipment constraint.", tone: "info" }],
      summary: "CampusOS answers operational questions about campus resources, bookings, conflicts and utilization.",
      followUps: ["Find a 60-seat lab tomorrow 2-4 PM with a projector", "Show today's campus conflicts", "Summarize today's operations"],
    };
  }

  return {
    id: `ans-${best.resourceId}-${Date.now()}`,
    kind: "recommendation",
    intent: intent === "unknown" ? "find-resource" : intent,
    intentLabel: labels[intent === "unknown" ? "find-resource" : intent],
    headline: `${best.name} is the strongest match`,
    requirements: [
      { label: "Capacity", value: resourceQuery.capacity ? `>= ${resourceQuery.capacity} seats` : "Not specified" },
      { label: "Window", value: slot ? `${slot.dayLabel} · ${slot.start}-${slot.end}` : "Flexible" },
      { label: "Equipment", value: resourceQuery.equipment.length ? resourceQuery.equipment.join(" · ") : "Not specified" },
      { label: "Resource type", value: resourceQuery.type ?? "Any bookable space" },
    ],
    stages: [
      { label: "Understanding request", detail: `Intent: ${labels[intent === "unknown" ? "find-resource" : intent]}` },
      { label: "Querying resource index", detail: `${results.length} bookable resources evaluated` },
      { label: "Checking availability", detail: "Mongo overlap checks against active bookings" },
      { label: "Preparing recommendation", detail: "ranked by weighted match score" },
    ],
    evaluated: results.length,
    matched: candidates.length,
    ...(slot ? { slot } : {}),
    best,
    alternatives: candidates.slice(1),
    evidence: [
      {
        label: "Capacity fit",
        value: `${best.capacity} seats`,
        note: resourceQuery.capacity ? `${best.capacity - resourceQuery.capacity} seats of headroom` : "Capacity constraint not specified",
        tone: "success",
      },
      {
        label: "Availability",
        value: best.availability,
        note: "Derived from live booking records",
        tone: best.status === "maintenance" ? "critical" : "success",
      },
      {
        label: "Utilization",
        value: `${best.utilization}% weekly`,
        note: best.utilization < 70 ? "Healthy booking pressure" : "Book early due to demand",
        tone: best.utilization < 70 ? "success" : "warning",
      },
    ],
    findings: [],
    summary: `${best.name} in ${best.building} is the best available fit with a ${best.score}% weighted match.`,
    followUps: ["Compare alternatives", "Check the same slot tomorrow", "Create a booking request"],
  };
}
