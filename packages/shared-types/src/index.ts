import { z } from "zod";

export const resourceTypes = [
  "Computer Lab",
  "Physics Lab",
  "Chemistry Lab",
  "Classroom",
  "Meeting Room",
  "Seminar Hall",
  "Auditorium",
  "Innovation Space",
  "Sports Facility",
  "Equipment",
] as const;
export const resourceStatuses = ["available", "in-use", "maintenance"] as const;
export const bookingStatuses = [
  "draft",
  "pending",
  "approved",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
  "conflict",
] as const;
export const userRoles = ["STUDENT", "FACULTY", "DEPT_LEAD", "CAMPUS_ADMIN"] as const;

export const pressureLevels = ["Low", "Moderate", "Elevated", "High"] as const;
export const maintenanceStates = ["Normal", "Scheduled", "In progress"] as const;
export const demandLevels = ["Low", "Moderate", "High", "Peak"] as const;
export const slotStatuses = ["available", "reserved", "in-use", "maintenance", "pending"] as const;
export const insightSeverities = ["critical", "warning", "info", "positive"] as const;
export const intelSeverities = ["high", "medium", "low"] as const;
export const intelDomains = ["operations", "resources", "bookings", "demand"] as const;
export const intelConfidences = ["High", "Moderate", "Indicative"] as const;
export const timeScopes = ["now", "today", "tomorrow", "week"] as const;
export const tones = ["success", "warning", "critical", "info", "neutral"] as const;

export const ResourceTypeSchema = z.enum(resourceTypes);
export const ResourceStatusSchema = z.enum(resourceStatuses);
export const BookingStatusSchema = z.enum(bookingStatuses);
export const UserRoleSchema = z.enum(userRoles);

export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ResourceTypeSchema,
  building: z.string(),
  floor: z.string(),
  capacity: z.number().int().nonnegative(),
  amenities: z.array(z.string()),
  status: ResourceStatusSchema,
  utilization: z.number().min(0).max(100),
  nextBooking: z.string().nullable(),
  trend: z.array(z.number()),
  description: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const RiskLabelSchema = z.enum([
  "Low conflict risk",
  "Medium conflict risk",
  "High conflict risk",
]);

export const BookingSchema = z.object({
  id: z.string(),
  title: z.string(),
  resourceId: z.string(),
  resourceName: z.string(),
  organiser: z.string(),
  department: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.number().int().nonnegative(),
  status: BookingStatusSchema,
  riskLabel: RiskLabelSchema,
  note: z.string(),
  purpose: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  mine: z.boolean().optional(),
  conflictWith: z.array(z.string()).optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const CampusInsightSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "attention", "info"]),
  category: z.enum(["Demand", "Utilization", "Anomaly", "Capacity"]),
  title: z.string(),
  explanation: z.string(),
  evidence: z.array(z.string()),
  recommendation: z.string(),
});
export type CampusInsight = z.infer<typeof CampusInsightSchema>;

export const ActivityEventSchema = z.object({
  id: z.string(),
  kind: z.enum(["booking", "release", "approval", "conflict", "ai"]),
  message: z.string(),
  detail: z.string(),
  time: z.string(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

export const NotificationItemSchema = z.object({
  id: z.string(),
  category: z.enum(["Booking", "Approval", "Conflict", "AI insight", "System"]),
  title: z.string(),
  body: z.string(),
  time: z.string(),
  unread: z.boolean(),
  actionLabel: z.string(),
  actionTo: z.string(),
});
export type NotificationItem = z.infer<typeof NotificationItemSchema>;

export const ResourceAccessibilitySchema = z.object({
  wheelchair: z.boolean(),
  hearingLoop: z.boolean(),
  stepFreeRoute: z.boolean(),
  note: z.string(),
});
export type ResourceAccessibility = z.infer<typeof ResourceAccessibilitySchema>;

const demandPointSchema = z.object({ label: z.string(), value: z.number() });

export const ResourceProfileSchema = ResourceSchema.extend({
  equipment: z.array(z.string()),
  accessibility: ResourceAccessibilitySchema,
  walkMinutes: z.number(),
  bookingPressure: z.enum(pressureLevels),
  conflictRate: z.number(),
  cancellationRate: z.number(),
  upcomingBookings: z.number().int().nonnegative(),
  maintenance: z.enum(maintenanceStates),
  maintenanceNote: z.string().nullable(),
  healthScore: z.number().min(0).max(100),
  trendDelta: z.number(),
  peakWindow: z.string(),
  lowWindow: z.string(),
  demandByDay: z.array(demandPointSchema),
  demandByPart: z.array(demandPointSchema),
  predictedDemand: z.object({
    window: z.string(),
    level: z.enum(demandLevels),
    note: z.string(),
  }),
});
export type ResourceProfile = z.infer<typeof ResourceProfileSchema>;

export const AvailabilitySlotSchema = z.object({
  resourceId: z.string(),
  day: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  status: z.enum(slotStatuses),
  label: z.string(),
  bookingId: z.string().optional(),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

export const ResourceInsightSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  type: z.enum(["Demand", "Utilization", "Conflict", "Maintenance", "Allocation"]),
  severity: z.enum(insightSeverities),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  confidence: z.number().min(0).max(100),
});
export type ResourceInsight = z.infer<typeof ResourceInsightSchema>;

export const MatchReasonSchema = z.object({
  met: z.boolean(),
  label: z.string(),
  detail: z.string(),
});
export type MatchReason = z.infer<typeof MatchReasonSchema>;

export const MatchResultSchema = z.object({
  resource: ResourceProfileSchema,
  score: z.number().min(0).max(100),
  reasons: z.array(MatchReasonSchema),
  availability: z.string(),
  conflictRisk: z.enum(["Low", "Medium", "High"]),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

export const ResourceQuerySchema = z.object({
  text: z.string(),
  capacity: z.number().int().positive().nullable(),
  equipment: z.array(z.string()),
  type: ResourceTypeSchema.nullable(),
  dayLabel: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  accessible: z.boolean(),
});
export type ResourceQuery = z.infer<typeof ResourceQuerySchema>;

export const BookingRequestSchema = z.object({
  resourceId: z.string().nullable(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  title: z.string(),
  purpose: z.string(),
  attendees: z.number().int().nonnegative(),
  equipment: z.array(z.string()),
  organiser: z.string(),
  department: z.string(),
});
export type BookingRequest = z.infer<typeof BookingRequestSchema>;

export const BookingConflictSchema = z.object({
  bookingId: z.string(),
  conflictingBookingId: z.string(),
  resourceId: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  overlap: z.string(),
  overlapMinutes: z.number().int().nonnegative(),
  title: z.string(),
  organiser: z.string(),
  recommendation: z.string(),
});
export type BookingConflict = z.infer<typeof BookingConflictSchema>;

export const BookingCheckSchema = z.object({
  label: z.string(),
  passed: z.boolean(),
  detail: z.string(),
});
export type BookingCheck = z.infer<typeof BookingCheckSchema>;

export const MatchBreakdownSchema = z.object({
  total: z.number(),
  parts: z.array(z.object({ label: z.string(), value: z.number(), note: z.string() })),
  risk: z.enum(["Low", "Medium", "High"]),
});
export type MatchBreakdown = z.infer<typeof MatchBreakdownSchema>;

export const AvailabilityResultSchema = z.object({
  resource: ResourceProfileSchema.optional(),
  available: z.boolean(),
  conflicts: z.array(BookingConflictSchema),
  checks: z.array(BookingCheckSchema),
  match: MatchBreakdownSchema,
});
export type AvailabilityResult = z.infer<typeof AvailabilityResultSchema>;

export const recommendationTypes = [
  "same-resource-later",
  "alternative-resource",
  "alternative-day",
] as const;
export const BookingRecommendationSchema = z.object({
  id: z.string(),
  type: z.enum(recommendationTypes),
  typeLabel: z.string(),
  resourceId: z.string(),
  resourceName: z.string(),
  building: z.string(),
  capacity: z.number().int().nonnegative(),
  date: z.string(),
  dayLabel: z.string(),
  start: z.string(),
  end: z.string(),
  score: z.number(),
  reasons: z.array(z.string()),
  risk: z.enum(["Low", "Medium", "High"]),
  rationale: z.string(),
});
export type BookingRecommendation = z.infer<typeof BookingRecommendationSchema>;

export const BOOKING_RULES = [
  { label: "Booking window", detail: "Up to 14 days ahead" },
  { label: "Capacity", detail: "Attendees must not exceed resource capacity" },
  { label: "Duration", detail: "Between 30 minutes and 6 hours" },
  { label: "Conflicts", detail: "Cannot overlap a confirmed booking" },
  { label: "Equipment", detail: "Requested equipment must be available" },
] as const;

export const CampusSignalSchema = z.object({
  id: z.string(),
  type: z.enum(["detected", "observed", "predicted"]),
  domain: z.enum(intelDomains),
  severity: z.enum(intelSeverities),
  minutesAgo: z.number().int().nonnegative(),
  source: z.string(),
  title: z.string(),
  description: z.string(),
  followUpLabel: z.enum(["Recommendation", "Opportunity", "Watch"]),
  followUp: z.string(),
  scope: z.array(z.enum(timeScopes)),
  relatedResource: z.string().optional(),
  askCampusOS: z.string(),
});
export type CampusSignal = z.infer<typeof CampusSignalSchema>;

export const CampusPredictionSchema = z.object({
  id: z.string(),
  category: z.enum(["High resource demand", "Low utilization", "Scheduling pressure"]),
  domain: z.enum(intelDomains),
  severity: z.enum(intelSeverities),
  when: z.string(),
  timeRange: z.string(),
  observed: z.string(),
  expectedValue: z.string(),
  baseline: z.string(),
  deltaLabel: z.string(),
  confidence: z.enum(intelConfidences),
  affected: z.array(z.string()),
  reason: z.string(),
  recommendation: z.string(),
  why: z.array(z.string()),
  scope: z.array(z.enum(timeScopes)),
  relatedResource: z.string().optional(),
  askCampusOS: z.string(),
});
export type CampusPrediction = z.infer<typeof CampusPredictionSchema>;

export const CampusRiskSchema = z.object({
  id: z.string(),
  severity: z.enum(intelSeverities),
  title: z.string(),
  area: z.string(),
  window: z.string(),
  reason: z.string(),
  recommendation: z.string(),
  domain: z.enum(intelDomains),
  scope: z.array(z.enum(timeScopes)),
  relatedResource: z.string().optional(),
  askCampusOS: z.string(),
});
export type CampusRisk = z.infer<typeof CampusRiskSchema>;

export const CampusOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  impact: z.string(),
  domain: z.enum(intelDomains),
  scope: z.array(z.enum(timeScopes)),
  relatedResource: z.string().optional(),
  actionLabel: z.string(),
  askCampusOS: z.string(),
});
export type CampusOpportunity = z.infer<typeof CampusOpportunitySchema>;

export const CampusRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  impact: z.string(),
  actionLabel: z.enum(["Review", "Resolve", "Explore"]),
  domain: z.enum(intelDomains),
  relatedResource: z.string().optional(),
  relatedBooking: z.string().optional(),
  askCampusOS: z.string(),
});
export type CampusRecommendation = z.infer<typeof CampusRecommendationSchema>;

export const PulsePointSchema = z.object({
  time: z.string(),
  level: z.enum(["Normal", "Increasing", "Moderate", "High"]),
  value: z.number(),
});
export type PulsePoint = z.infer<typeof PulsePointSchema>;

export const CopilotIntentSchema = z.enum([
  "find-resource",
  "resolve-conflict",
  "analyze-utilization",
  "summarize-operations",
  "explain-resource",
  "booking-pressure",
  "unknown",
]);
export type CopilotIntent = z.infer<typeof CopilotIntentSchema>;

export const CopilotRequirementSchema = z.object({ label: z.string(), value: z.string() });
export const CopilotStageSchema = z.object({ label: z.string(), detail: z.string() });
export const CopilotSlotSchema = z.object({
  dayLabel: z.string(),
  start: z.string(),
  end: z.string(),
});
export const CopilotCandidateSchema = z.object({
  resourceId: z.string(),
  name: z.string(),
  building: z.string(),
  capacity: z.number().int().nonnegative(),
  amenities: z.array(z.string()),
  score: z.number(),
  availability: z.string(),
  status: ResourceStatusSchema,
  utilization: z.number(),
  reason: z.string(),
});
export const CopilotEvidenceSchema = z.object({
  label: z.string(),
  value: z.string(),
  note: z.string(),
  tone: z.enum(tones),
});
export const CopilotFindingSchema = z.object({
  title: z.string(),
  detail: z.string(),
  tone: z.enum(tones),
  link: z
    .object({
      to: z.enum(["/resources/$id", "/bookings/$id"]),
      id: z.string(),
      label: z.string(),
    })
    .optional(),
});
export const CopilotAnswerSchema = z.object({
  id: z.string(),
  kind: z.enum(["recommendation", "briefing", "conflict", "no-match", "error"]),
  intent: CopilotIntentSchema,
  intentLabel: z.string(),
  headline: z.string(),
  requirements: z.array(CopilotRequirementSchema),
  stages: z.array(CopilotStageSchema),
  evaluated: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  slot: CopilotSlotSchema.optional(),
  best: CopilotCandidateSchema.optional(),
  alternatives: z.array(CopilotCandidateSchema),
  evidence: z.array(CopilotEvidenceSchema),
  findings: z.array(CopilotFindingSchema),
  summary: z.string(),
  followUps: z.array(z.string()),
});
export type CopilotRequirement = z.infer<typeof CopilotRequirementSchema>;
export type CopilotStage = z.infer<typeof CopilotStageSchema>;
export type CopilotSlot = z.infer<typeof CopilotSlotSchema>;
export type CopilotCandidate = z.infer<typeof CopilotCandidateSchema>;
export type Tone = z.infer<typeof CopilotEvidenceSchema>["tone"];
export type CopilotEvidence = z.infer<typeof CopilotEvidenceSchema>;
export type CopilotFinding = z.infer<typeof CopilotFindingSchema>;
export type CopilotAnswer = z.infer<typeof CopilotAnswerSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum([
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
