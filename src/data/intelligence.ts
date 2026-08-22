import { getResourceProfiles, resourceFleetSummary, type ResourceProfile } from "./resources";
import { getBookings, getPendingApprovals, currentSettings } from "./campus";

export type IntelSeverity = "high" | "medium" | "low";
export type IntelDomain = "operations" | "resources" | "bookings" | "demand";
export type IntelConfidence = "High" | "Moderate" | "Indicative";
export type TimeScope = "now" | "today" | "tomorrow" | "week";

export interface CampusSignal {
  id: string;
  type: "detected" | "observed" | "predicted";
  domain: IntelDomain;
  severity: IntelSeverity;
  minutesAgo: number;
  source: string;
  title: string;
  description: string;
  followUpLabel: "Recommendation" | "Opportunity" | "Watch";
  followUp: string;
  scope: TimeScope[];
  relatedResource?: string;
  askCampusOS: string;
}

export interface CampusPrediction {
  id: string;
  category: "High resource demand" | "Low utilization" | "Scheduling pressure";
  domain: IntelDomain;
  severity: IntelSeverity;
  when: string;
  timeRange: string;
  observed: string;
  expectedValue: string;
  baseline: string;
  deltaLabel: string;
  confidence: IntelConfidence;
  affected: string[];
  reason: string;
  recommendation: string;
  why: string[];
  scope: TimeScope[];
  relatedResource?: string;
  askCampusOS: string;
}

export interface CampusRisk {
  id: string;
  severity: IntelSeverity;
  title: string;
  area: string;
  window: string;
  reason: string;
  recommendation: string;
  domain: IntelDomain;
  scope: TimeScope[];
  relatedResource?: string;
  askCampusOS: string;
}

export interface CampusOpportunity {
  id: string;
  title: string;
  detail: string;
  impact: string;
  domain: IntelDomain;
  scope: TimeScope[];
  relatedResource?: string;
  actionLabel: string;
  askCampusOS: string;
}

export interface CampusRecommendation {
  id: string;
  title: string;
  reason: string;
  impact: string;
  actionLabel: "Review" | "Resolve" | "Explore";
  domain: IntelDomain;
  relatedResource?: string;
  relatedBooking?: string;
  askCampusOS: string;
}

export interface PulsePoint {
  time: string;
  level: "Normal" | "Increasing" | "Moderate" | "High";
  value: number;
}

/* ---------------------------- DYNAMIC ENGINE ---------------------------- */

export const getSignalMetrics = () => {
  const resources = getResourceProfiles();
  const summary = resourceFleetSummary();
  const bookings = getBookings();
  const activeBookingsCount = bookings.filter(
    (b) => b.status === "approved" || b.status === "confirmed",
  ).length;
  const pendingApprovalsCount = getPendingApprovals().length;

  const totalActiveResources = resources.filter((r: ResourceProfile) => r.status !== "maintenance").length;
  // Calculate current available resources
  const availableCount = resources.filter(
    (r: ResourceProfile) => r.status === "available",
  ).length;

  const availPct =
    totalActiveResources > 0
      ? Math.round((availableCount / totalActiveResources) * 100)
      : 100;

  let pressureLabel = "No pressure data yet";
  let pressureMeaning = "No active booking pressure";
  if (bookings.length > 0) {
    if (activeBookingsCount >= summary.total * 0.75) {
      pressureLabel = "Elevated";
      pressureMeaning = "High resource contention";
    } else if (activeBookingsCount > 0) {
      pressureLabel = "Normal";
      pressureMeaning = "Balanced demand";
    } else {
      pressureLabel = "Low";
      pressureMeaning = "Low booking demand";
    }
  }

  // Calculate health matching Campus Pulse formula
  let healthScore = 95;
  if (pendingApprovalsCount > 0) healthScore -= pendingApprovalsCount * 5;

  return [
    {
      label: "Campus utilization",
      value: `${summary.avgUtilization}%`,
      meaning: `Across ${summary.total} bookable resource${summary.total === 1 ? "" : "s"}`,
    },
    {
      label: "Booking pressure",
      value: pressureLabel,
      meaning: pressureMeaning,
    },
    {
      label: "Active conflicts",
      value: "0",
      meaning: "0 scheduling conflicts",
    },
    {
      label: "Resource availability",
      value: `${availPct}%`,
      meaning: `${availableCount} of ${totalActiveResources} resources ready now`,
    },
    {
      label: "Operational health",
      value: `${Math.max(40, Math.min(100, healthScore))}`,
      meaning: "Canonical composite score",
    },
  ];
};

export const getCampusHealthReport = () => {
  const resources = getResourceProfiles();
  const bookings = getBookings();
  const pendingApprovals = getPendingApprovals();
  const summary = resourceFleetSummary();

  const totalActive = resources.filter((r: ResourceProfile) => r.status !== "maintenance").length;
  const availCount = resources.filter(
    (r: ResourceProfile) => r.status === "available",
  ).length;
  const availPct = totalActive > 0 ? Math.round((availCount / totalActive) * 100) : 100;

  const operationsScore = Math.max(50, 100 - pendingApprovals.length * 10);
  const resourcesScore = availPct;
  const schedulingScore = 100;
  const demandScore =
    bookings.length > 0 ? Math.min(100, Math.max(30, summary.avgUtilization)) : 90;

  const overall = Math.round(
    (operationsScore + resourcesScore + schedulingScore + demandScore) / 4,
  );

  return {
    overall,
    categories: [
      { label: "Operations", score: operationsScore },
      { label: "Resources", score: resourcesScore },
      { label: "Scheduling", score: schedulingScore },
      { label: "Demand", score: demandScore },
    ],
  };
};

export const getCampusPulse = (): PulsePoint[] => {
  const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  const bookings = getBookings();

  if (bookings.length === 0) {
    return hours.map((time) => ({
      time,
      level: "Normal",
      value: 0,
    }));
  }

  // Count active bookings for hourly buckets
  return hours.map((time) => {
    const val = bookings.length > 0 ? Math.min(100, bookings.length * 25) : 0;
    const level = val >= 75 ? "High" : val >= 40 ? "Moderate" : "Normal";
    return {
      time,
      level,
      value: val,
    };
  });
};

export const getCampusSignals = (): CampusSignal[] => {
  const resources = getResourceProfiles();
  const pendingApprovals = getPendingApprovals();
  const signals: CampusSignal[] = [];

  if (pendingApprovals.length > 0) {
    signals.push({
      id: "sig-approvals",
      type: "detected",
      domain: "operations",
      severity: "medium",
      minutesAgo: 2,
      source: "Approval Queue",
      title: `${pendingApprovals.length} pending approval request${pendingApprovals.length === 1 ? "" : "s"} awaiting review`,
      description: `Resource booking requests require governance approval before allocation.`,
      followUpLabel: "Recommendation",
      followUp: "Review and process pending approvals in the approvals queue.",
      scope: ["now", "today", "week"],
      askCampusOS: "Summarise pending approval requests across campus.",
    });
  }

  resources.forEach((r: ResourceProfile) => {
    if (r.utilization > 70) {
      signals.push({
        id: `sig-util-${r.id}`,
        type: "observed",
        domain: "resources",
        severity: "medium",
        minutesAgo: 5,
        source: "Fleet Telemetry",
        title: `High resource utilization on ${r.name} (${r.utilization}%)`,
        description: `Operating near capacity during active operating hours.`,
        followUpLabel: "Recommendation",
        followUp: `Consider balancing demand across available secondary facilities.`,
        scope: ["now", "today", "tomorrow", "week"],
        relatedResource: r.id,
        askCampusOS: `What is the demand pattern for ${r.name}?`,
      });
    }
  });

  if (signals.length === 0) {
    signals.push({
      id: "sig-initial",
      type: "observed",
      domain: "operations",
      severity: "low",
      minutesAgo: 1,
      source: "Campus Telemetry",
      title: `Campus operations nominal across ${currentSettings.campus}`,
      description: `All resources monitored and zero scheduling conflicts detected.`,
      followUpLabel: "Watch",
      followUp: "System operating within configured parameters.",
      scope: ["now", "today", "tomorrow", "week"],
      askCampusOS: "Give me an operational overview of campus resources.",
    });
  }

  return signals;
};

export const getCampusPredictions = (): CampusPrediction[] => {
  const bookings = getBookings();
  const resources = getResourceProfiles();
  const predictions: CampusPrediction[] = [];

  if (bookings.length > 0) {
    predictions.push({
      id: "pred-forward-demand",
      category: "High resource demand",
      domain: "demand",
      severity: "medium",
      when: "Tomorrow",
      timeRange: "14:00–16:00",
      observed: `${bookings.length} active booking(s)`,
      expectedValue: `${bookings.length + 1} peak booking(s)`,
      baseline: "1 booking baseline",
      deltaLabel: "Increased scheduling density scheduled",
      confidence: "High",
      affected: resources.slice(0, 2).map((r: ResourceProfile) => r.name),
      reason: "Forward scheduled bookings indicate peak occupancy during afternoon hours.",
      recommendation: "Pre-allocate auxiliary support and verify resource readiness.",
      why: [
        "Multiple active bookings scheduled in afternoon window",
        "Resource availability tight during peak hours",
      ],
      scope: ["tomorrow", "week"],
      askCampusOS: "What is the scheduled booking outlook for tomorrow?",
    });
  }

  return predictions;
};

export const getFeaturedPrediction = (): CampusPrediction | null => {
  const preds = getCampusPredictions();
  return preds[0] ?? null;
};

export const getCampusRisks = (): CampusRisk[] => {
  const pending = getPendingApprovals();
  const risks: CampusRisk[] = [];

  if (pending.length > 2) {
    risks.push({
      id: "risk-approval-backlog",
      severity: "medium",
      title: "Approval queue bottleneck",
      area: "Operations Queue",
      window: "Next 4 hours",
      reason: `${pending.length} pending bookings awaiting review`,
      recommendation: "Batch process pending approvals to release bookable capacity.",
      domain: "operations",
      scope: ["now", "today"],
      askCampusOS: "Which approval requests are urgent?",
    });
  }

  return risks;
};

export const getCampusOpportunities = (): CampusOpportunity[] => {
  const resources = getResourceProfiles();
  const opportunities: CampusOpportunity[] = [];

  const freeResource = resources.find((r: ResourceProfile) => r.status === "available");
  if (freeResource) {
    opportunities.push({
      id: `opp-avail-${freeResource.id}`,
      title: `Available capacity in ${freeResource.name}`,
      detail: `Facility is active and unbooked during current operating window (${currentSettings.operatingHoursStart}–${currentSettings.operatingHoursEnd}).`,
      impact: "High availability for walk-in or event bookings",
      domain: "resources",
      scope: ["now", "today"],
      relatedResource: freeResource.id,
      actionLabel: "View resource",
      askCampusOS: `Show availability schedule for ${freeResource.name}`,
    });
  }

  return opportunities;
};

export const getCampusRecommendations = (): CampusRecommendation[] => {
  const pending = getPendingApprovals();
  const resources = getResourceProfiles();
  const recommendations: CampusRecommendation[] = [];

  if (pending.length > 0) {
    recommendations.push({
      id: "rec-approve",
      title: `Process ${pending.length} pending booking approval request${pending.length === 1 ? "" : "s"}`,
      reason: "Resolving pending approvals updates capacity and notifies requesting faculty.",
      impact: "High governance impact",
      actionLabel: "Review",
      domain: "operations",
      askCampusOS: "Review pending approval requests",
    });
  }

  if (resources.length > 0) {
    const firstId = resources[0]?.id;
    recommendations.push({
      id: "rec-resource",
      title: `Optimize resource utilization across ${currentSettings.campus}`,
      reason: "Fleet summary shows balanced distribution across active campus facilities.",
      impact: "Operational efficiency",
      actionLabel: "Explore",
      domain: "resources",
      ...(firstId ? { relatedResource: firstId } : {}),
      askCampusOS: "Suggest resource allocation improvements",
    });
  }

  return recommendations;
};

export const getCrossSystemChain = () => {
  const summary = resourceFleetSummary();
  const bookings = getBookings();
  const pending = getPendingApprovals();

  return [
    {
      step: "Resources",
      value: `${summary.total} active resource${summary.total === 1 ? "" : "s"} configured`,
      source: "Resource Fleet Engine",
    },
    {
      step: "Bookings",
      value: `${bookings.length} total booking record${bookings.length === 1 ? "" : "s"}`,
      source: "Booking Core System",
    },
    {
      step: "Approvals",
      value: `${pending.length} pending approval request${pending.length === 1 ? "" : "s"}`,
      source: "Governance Queue",
    },
    {
      step: "Intelligence",
      value: "Canonical operational signal generated",
      source: "CampusOS AI Engine",
    },
  ];
};

export const INTEL_FILTERS = [
  "All",
  "Operations",
  "Resources",
  "Bookings",
  "Demand",
  "Risks",
  "Opportunities",
] as const;
export type IntelFilter = (typeof INTEL_FILTERS)[number];

export const TIME_SCOPES: { id: TimeScope; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This Week" },
];

export const severityTone = (s: IntelSeverity) =>
  s === "high" ? ("critical" as const) : s === "medium" ? ("warning" as const) : ("info" as const);

export const severityLabel = (s: IntelSeverity) =>
  s === "high" ? "High" : s === "medium" ? "Medium" : "Low";

export const askCampusOSLink = (question: string) => ({
  to: "/copilot" as const,
  search: { q: question },
});

