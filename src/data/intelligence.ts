/* ------------------------------------------------------------------ *
 * CAMPUS INTELLIGENCE — deterministic mock intelligence layer.
 *
 * Everything in this file is MOCKED but shaped like the future API /
 * AI service contract:
 *
 *   CAMPUS DATA -> DATA PREP -> AI SERVICE -> PREDICTIONS ->
 *   RECOMMENDATIONS -> CAMPUSOS UI -> HUMAN ACTION
 *
 * To integrate a real model (e.g. the IBM AI stack) replace the
 * getX() service functions at the bottom with fetch calls that return
 * the same shapes. No UI component reads raw objects directly.
 * ------------------------------------------------------------------ */

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

/* ------------------------------- DATA ----------------------------- */

const SIGNALS: CampusSignal[] = [
  {
    id: "sig-01",
    type: "detected",
    domain: "bookings",
    severity: "high",
    minutesAgo: 2,
    source: "Booking Intelligence",
    title: "High booking pressure in Engineering Block",
    description:
      "18 requests already logged for tomorrow afternoon against a 17-request baseline.",
    followUpLabel: "Recommendation",
    followUp: "Consider opening Computer Lab 05 for overflow.",
    scope: ["now", "today", "tomorrow", "week"],
    relatedResource: "computer-lab-05",
    askCampusOS: "Why is booking pressure high in Engineering Block tomorrow?",
  },
  {
    id: "sig-02",
    type: "detected",
    domain: "demand",
    severity: "medium",
    minutesAgo: 12,
    source: "Demand model (mock)",
    title: "Auditorium demand is 28% above normal",
    description: "Seminar Hall A requests are clustering into Friday afternoon slots.",
    followUpLabel: "Recommendation",
    followUp: "Review Friday afternoon availability before approvals close.",
    scope: ["today", "tomorrow", "week"],
    relatedResource: "seminar-hall-a",
    askCampusOS: "Why is auditorium demand above normal this week?",
  },
  {
    id: "sig-03",
    type: "observed",
    domain: "resources",
    severity: "low",
    minutesAgo: 26,
    source: "Resource Intelligence",
    title: "Innovation Lab utilization is low this morning",
    description: "Only 1 of 6 morning slots is in use against a typical 4.",
    followUpLabel: "Opportunity",
    followUp: "Potentially redirect compatible requests here.",
    scope: ["now", "today"],
    relatedResource: "innovation-lab",
    askCampusOS: "Why is Innovation Lab utilization low this morning?",
  },
  {
    id: "sig-04",
    type: "predicted",
    domain: "operations",
    severity: "medium",
    minutesAgo: 41,
    source: "Operations model (mock)",
    title: "Two high-demand requests overlap on Auditorium A",
    description: "Both requests target 10:00–12:00 on Friday with equal priority.",
    followUpLabel: "Watch",
    followUp: "Resolve in Booking Intelligence before the approval window closes.",
    scope: ["today", "tomorrow", "week"],
    relatedResource: "seminar-hall-a",
    askCampusOS: "Which Auditorium A bookings overlap on Friday?",
  },
  {
    id: "sig-05",
    type: "observed",
    domain: "operations",
    severity: "low",
    minutesAgo: 58,
    source: "Approvals queue",
    title: "Approval latency is trending down",
    description: "Median decision time is 3.4h versus a 5.1h baseline.",
    followUpLabel: "Watch",
    followUp: "No action required — approval throughput is healthy.",
    scope: ["now", "today", "week"],
    askCampusOS: "What changed in approval latency this week?",
  },
];

const PREDICTIONS: CampusPrediction[] = [
  {
    id: "pred-01",
    category: "High resource demand",
    domain: "demand",
    severity: "high",
    when: "Tomorrow",
    timeRange: "14:00–17:00",
    observed: "18 booking requests",
    expectedValue: "22–25 requests",
    baseline: "17 requests",
    deltaLabel: "+29% expected demand",
    confidence: "High",
    affected: ["Computer Labs", "Seminar Rooms"],
    reason:
      "Three departments have shifted practical sessions into the same afternoon window.",
    recommendation: "Open additional lab capacity before 14:00.",
    why: [
      "72 seats available in Computer Lab 05",
      "Projector and lab imaging already provisioned",
      "Currently unbooked in the affected window",
      "Low conflict risk against existing schedules",
    ],
    scope: ["today", "tomorrow", "week"],
    relatedResource: "computer-lab-05",
    askCampusOS: "Why is booking pressure expected to increase tomorrow?",
  },
  {
    id: "pred-02",
    category: "Low utilization",
    domain: "resources",
    severity: "low",
    when: "Friday",
    timeRange: "10:00–12:00",
    observed: "1 of 6 slots used",
    expectedValue: "1–2 slots",
    baseline: "4 slots",
    deltaLabel: "−55% versus baseline",
    confidence: "Moderate",
    affected: ["Innovation spaces"],
    reason: "Recurring Friday sessions were moved earlier in the week.",
    recommendation: "Consider reallocating compatible sessions into this window.",
    why: [
      "Innovation Lab is unbooked for the window",
      "Compatible with seminar-style requests",
      "Reduces pressure on Seminar Hall A",
    ],
    scope: ["week"],
    relatedResource: "innovation-lab",
    askCampusOS: "Why is Friday utilization low in innovation spaces?",
  },
  {
    id: "pred-03",
    category: "Scheduling pressure",
    domain: "bookings",
    severity: "medium",
    when: "This week",
    timeRange: "Fri 10:00–12:00",
    observed: "2 overlapping requests",
    expectedValue: "3–4 requests",
    baseline: "1 request",
    deltaLabel: "Conflict risk elevated",
    confidence: "Moderate",
    affected: ["Seminar Hall A"],
    reason: "Two faculty requests target the same slot with equal priority.",
    recommendation: "Resolve the overlap in Booking Intelligence.",
    why: [
      "Both requests are still pending",
      "Smart alternatives exist for one of them",
      "Resolving early avoids a same-day escalation",
    ],
    scope: ["today", "tomorrow", "week"],
    relatedResource: "seminar-hall-a",
    askCampusOS: "How should I resolve the Seminar Hall A overlap on Friday?",
  },
];

const RISKS: CampusRisk[] = [
  {
    id: "risk-01",
    severity: "high",
    title: "Booking pressure",
    area: "Engineering Block",
    window: "Tomorrow · 14:00–17:00",
    reason: "Expected requests exceed comfortable lab capacity by roughly 29%.",
    recommendation: "Open Computer Lab 05 before the window begins.",
    domain: "bookings",
    scope: ["today", "tomorrow", "week"],
    relatedResource: "computer-lab-05",
    askCampusOS: "What is causing booking pressure in Engineering Block?",
  },
  {
    id: "risk-02",
    severity: "medium",
    title: "Auditorium demand",
    area: "Seminar Hall A",
    window: "Friday afternoon",
    reason: "Demand is 28% above the seasonal baseline for this slot.",
    recommendation: "Review Friday availability and stagger two of the requests.",
    domain: "demand",
    scope: ["today", "week"],
    relatedResource: "seminar-hall-a",
    askCampusOS: "Why is Seminar Hall A demand elevated on Friday?",
  },
  {
    id: "risk-03",
    severity: "low",
    title: "Resource underutilization",
    area: "Innovation Lab",
    window: "Weekday mornings",
    reason: "Morning occupancy has stayed below 30% for three weeks.",
    recommendation: "Promote availability to departments with overflow demand.",
    domain: "resources",
    scope: ["now", "today", "week"],
    relatedResource: "innovation-lab",
    askCampusOS: "Why is the Innovation Lab underutilized in the mornings?",
  },
];

const OPPORTUNITIES: CampusOpportunity[] = [
  {
    id: "opp-01",
    title: "Computer Lab 02 is underutilized between 08:00–10:00",
    detail: "Two consecutive morning slots stay empty most weekdays.",
    impact: "Better resource utilization without new capacity.",
    domain: "resources",
    scope: ["now", "today", "week"],
    relatedResource: "computer-lab-03",
    actionLabel: "View resource",
    askCampusOS: "Which requests could move into Computer Lab morning slots?",
  },
  {
    id: "opp-02",
    title: "Seminar Room B2 has unused capacity on Thursday afternoon",
    detail: "Capacity of 48 with only one 45-minute booking held.",
    impact: "Absorbs seminar overflow away from Seminar Hall A.",
    domain: "bookings",
    scope: ["today", "week"],
    relatedResource: "seminar-room-b2",
    actionLabel: "Explore bookings",
    askCampusOS: "Can Seminar Room B2 absorb Thursday seminar overflow?",
  },
  {
    id: "opp-03",
    title: "Innovation Lab can host compatible design sessions",
    detail: "Low morning demand with equipment suited to workshop formats.",
    impact: "Raises utilization by an estimated 12 points.",
    domain: "resources",
    scope: ["now", "today", "tomorrow"],
    relatedResource: "innovation-lab",
    actionLabel: "View resource",
    askCampusOS: "What sessions fit the Innovation Lab this week?",
  },
];

const RECOMMENDATIONS: CampusRecommendation[] = [
  {
    id: "rec-01",
    title: "Open Computer Lab 05",
    reason: "High booking pressure expected tomorrow afternoon.",
    impact: "Absorbs an estimated 5–8 overflow requests.",
    actionLabel: "Review",
    domain: "bookings",
    relatedResource: "computer-lab-05",
    askCampusOS: "Should we open Computer Lab 05 tomorrow afternoon?",
  },
  {
    id: "rec-02",
    title: "Review Seminar Hall A schedule",
    reason: "Two high-demand requests overlap on Friday morning.",
    impact: "Prevents a same-day conflict escalation.",
    actionLabel: "Resolve",
    domain: "operations",
    relatedResource: "seminar-hall-a",
    askCampusOS: "How do I resolve the Seminar Hall A Friday overlap?",
  },
  {
    id: "rec-03",
    title: "Promote Innovation Lab availability",
    reason: "Low morning utilization detected for three weeks.",
    impact: "Improves overall campus utilization balance.",
    actionLabel: "Explore",
    domain: "resources",
    relatedResource: "innovation-lab",
    askCampusOS: "How can we increase Innovation Lab usage?",
  },
];

const PULSE: PulsePoint[] = [
  { time: "08:00", level: "Normal", value: 38 },
  { time: "10:00", level: "Increasing", value: 56 },
  { time: "12:00", level: "Moderate", value: 64 },
  { time: "14:00", level: "High", value: 86 },
  { time: "16:00", level: "High", value: 81 },
  { time: "18:00", level: "Normal", value: 44 },
];

const HEALTH = {
  overall: 94,
  categories: [
    { label: "Operations", score: 96 },
    { label: "Resources", score: 91 },
    { label: "Scheduling", score: 94 },
    { label: "Demand", score: 88 },
  ],
};

const CROSS_SYSTEM = [
  { step: "Resource", value: "Computer Lab 04", source: "Resource Intelligence" },
  { step: "Booking", value: "14:00–16:00", source: "Booking Intelligence" },
  { step: "Demand", value: "High", source: "Demand signals" },
  { step: "Prediction", value: "Pressure increasing", source: "Campus Intelligence" },
  { step: "Recommendation", value: "Open Computer Lab 05", source: "CampusOS" },
];

const SIGNAL_METRICS = [
  { label: "Campus utilization", value: "72%", meaning: "Across bookable space" },
  { label: "Booking pressure", value: "Moderate", meaning: "Rising into tomorrow" },
  { label: "Active conflicts", value: "03", meaning: "Awaiting resolution" },
  { label: "Resource availability", value: "91%", meaning: "Bookable right now" },
  { label: "Operational health", value: "94", meaning: "Composite indicator" },
];

/* ---------------------------- SERVICES ---------------------------- */
/* Replace these bodies with real AI / API calls. Shapes stay stable. */

export const getCampusSignals = (): CampusSignal[] => SIGNALS;
export const getCampusPredictions = (): CampusPrediction[] => PREDICTIONS;
export const getCampusRisks = (): CampusRisk[] => RISKS;
export const getCampusOpportunities = (): CampusOpportunity[] => OPPORTUNITIES;
export const getCampusRecommendations = (): CampusRecommendation[] => RECOMMENDATIONS;
export const getCampusPulse = (): PulsePoint[] => PULSE;
export const getCampusHealthReport = () => HEALTH;
export const getCrossSystemChain = () => CROSS_SYSTEM;
export const getSignalMetrics = () => SIGNAL_METRICS;

/* The one polished demo state used for the hero prediction. */
export const getFeaturedPrediction = (): CampusPrediction => PREDICTIONS[0]!;

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

/** Deep link into the existing Copilot with intelligence context. */
export const askCampusOSLink = (question: string) => ({
  to: "/copilot" as const,
  search: { q: question },
});
