import mongoose from "mongoose";
import type { Model, Schema as SchemaType, Types } from "mongoose";
const { Schema, model } = mongoose;
const models = mongoose.models;


import {
  bookingStatuses,
  demandLevels,
  intelDomains,
  intelSeverities,
  maintenanceStates,
  pressureLevels,
  resourceStatuses,
  resourceTypes,
  timeScopes,
  userRoles,
} from "@campus-os/shared-types";

const objectId = Schema.Types.ObjectId;
const datasetImportStatuses = [
  "UPLOADED",
  "PROCESSING",
  "VALIDATING",
  "READY_FOR_REVIEW",
  "IMPORTING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "ROLLED_BACK",
] as const;

function withExternalId(schema: SchemaType): SchemaType {
  schema.add({
    externalId: { type: String, required: true, unique: true, index: true },
  });
  return schema;
}

export const UserSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    role: { type: String, enum: userRoles, required: true, default: "STUDENT" },
    department: { type: String, required: true },
    campusId: { type: String, required: true, index: true, default: "demo-campus" },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: true },
);
UserSchema.index({ clerkUserId: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });

export const BuildingSchema = withExternalId(
  new Schema(
    {
      campusId: { type: String, required: true, index: true, default: "demo-campus" },
      name: { type: String, required: true },
      floors: { type: [String], required: true, default: [] },
      datasetImportId: { type: objectId, ref: "DatasetImport", default: null, index: true },
      sourceRowNumber: { type: Number, default: null },
      dataMode: { type: String, enum: ["live", "demo"], required: true, default: "live", index: true },
      isDemo: { type: Boolean, required: true, default: false, index: true },
    },
    { timestamps: true },
  ),
);
BuildingSchema.index({ campusId: 1, name: 1 }, { unique: true });

const accessibilitySchema = new Schema(
  {
    wheelchair: { type: Boolean, required: true },
    hearingLoop: { type: Boolean, required: true },
    stepFreeRoute: { type: Boolean, required: true },
    note: { type: String, required: true },
  },
  { _id: false },
);

const demandPointSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { _id: false },
);

export const ResourceSchema = withExternalId(
  new Schema(
    {
      campusId: { type: String, required: true, index: true, default: "demo-campus" },
      name: { type: String, required: true },
      type: { type: String, enum: resourceTypes, required: true, index: true },
      building: { type: String, required: true, index: true },
      buildingId: { type: objectId, ref: "Building", required: true, index: true },
      floor: { type: String, required: true },
      capacity: { type: Number, required: true, min: 0, index: true },
      amenities: { type: [String], required: true, default: [] },
      status: { type: String, enum: resourceStatuses, required: true, index: true },
      utilization: { type: Number, required: true, min: 0, max: 100 },
      nextBooking: { type: String, default: null },
      trend: { type: [Number], required: true, default: [] },
      description: { type: String, required: true },
      equipment: { type: [String], required: true, default: [] },
      accessibility: { type: accessibilitySchema, required: true },
      walkMinutes: { type: Number, required: true, default: 5 },
      bookingPressure: { type: String, enum: pressureLevels, required: true },
      conflictRate: { type: Number, required: true, default: 0 },
      cancellationRate: { type: Number, required: true, default: 0 },
      upcomingBookings: { type: Number, required: true, default: 0 },
      maintenance: { type: String, enum: maintenanceStates, required: true, default: "Normal" },
      maintenanceNote: { type: String, default: null },
      healthScore: { type: Number, required: true, min: 0, max: 100, default: 80 },
      trendDelta: { type: Number, required: true, default: 0 },
      peakWindow: { type: String, required: true, default: "14:00-17:00" },
      lowWindow: { type: String, required: true, default: "08:00-10:00" },
      demandByDay: { type: [demandPointSchema], required: true, default: [] },
      demandByPart: { type: [demandPointSchema], required: true, default: [] },
      predictedDemand: {
        window: { type: String, required: true },
        level: { type: String, enum: demandLevels, required: true },
        note: { type: String, required: true },
      },
      datasetImportId: { type: objectId, ref: "DatasetImport", default: null, index: true },
      sourceRowNumber: { type: Number, default: null },
      dataMode: { type: String, enum: ["live", "demo"], required: true, default: "live", index: true },
      isDemo: { type: Boolean, required: true, default: false, index: true },
      geo: {
        type: { type: String, enum: ["Point"], required: true, default: "Point" },
        coordinates: { type: [Number], required: true, default: [77.5946, 12.9716] },
      },
    },
    { timestamps: true },
  ),
);
ResourceSchema.index({ geo: "2dsphere" });
ResourceSchema.index({ name: "text", building: "text", amenities: "text", equipment: "text" });
ResourceSchema.index({ campusId: 1, buildingId: 1, name: 1 });
ResourceSchema.index({ campusId: 1, building: 1, name: 1 });

export const BookingSchema = withExternalId(
  new Schema(
    {
      campusId: { type: String, required: true, index: true, default: "demo-campus" },
      title: { type: String, required: true },
      resourceRef: { type: objectId, ref: "Resource", required: true, index: true },
      resourceId: { type: String, required: true, index: true },
      resourceName: { type: String, required: true },
      organiserId: { type: objectId, ref: "User", required: true, index: true },
      organiser: { type: String, required: true },
      department: { type: String, required: true },
      date: { type: String, required: true, index: true },
      start: { type: String, required: true },
      end: { type: String, required: true },
      startMinutes: { type: Number, required: true, index: true },
      endMinutes: { type: Number, required: true, index: true },
      attendees: { type: Number, required: true, min: 0 },
      status: { type: String, enum: bookingStatuses, required: true, index: true },
      riskLabel: {
        type: String,
        enum: ["Low conflict risk", "Medium conflict risk", "High conflict risk"],
        required: true,
      },
      note: { type: String, required: true },
      purpose: { type: String, default: undefined },
      equipment: { type: [String], default: undefined },
      conflictWith: { type: [String], default: undefined },
      datasetImportId: { type: objectId, ref: "DatasetImport", default: null, index: true },
      sourceRowNumber: { type: Number, default: null },
      dataMode: { type: String, enum: ["live", "demo"], required: true, default: "live", index: true },
      isDemo: { type: Boolean, required: true, default: false, index: true },
    },
    { timestamps: { createdAt: true, updatedAt: true } },
  ),
);
BookingSchema.index({ resourceId: 1, date: 1, status: 1 });
BookingSchema.index(
  { resourceId: 1, date: 1, startMinutes: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "approved", "confirmed", "conflict"] },
    },
  },
);

export const BookingConflictSchema = new Schema(
  {
    bookingId: { type: objectId, ref: "Booking", required: true, index: true },
    conflictingBookingId: { type: objectId, ref: "Booking", required: true, index: true },
    detectedAt: { type: Date, required: true, default: () => new Date() },
    resolution: { type: String, default: null },
  },
  { timestamps: true },
);

export const ApprovalDecisionSchema = new Schema(
  {
    bookingId: { type: objectId, ref: "Booking", required: true, index: true },
    decidedBy: { type: objectId, ref: "User", required: true, index: true },
    decision: { type: String, enum: ["Approve", "Review", "Reject", "approved", "rejected"], required: true },
    riskScore: { type: Number, required: true },
    reasonCodes: { type: [String], required: true, default: [] },
    decidedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

export const ActivityEventSchema = withExternalId(
  new Schema(
    {
      kind: { type: String, enum: ["booking", "release", "approval", "conflict", "ai"], required: true },
      message: { type: String, required: true },
      detail: { type: String, required: true },
      time: { type: String, required: true },
      createdAt: { type: Date, required: true, default: () => new Date(), index: true },
    },
    { timestamps: false },
  ),
);
ActivityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 120 });

export const NotificationSchema = withExternalId(
  new Schema(
    {
      userId: { type: objectId, ref: "User", default: null, index: true },
      category: {
        type: String,
        enum: ["Booking", "Approval", "Conflict", "AI insight", "System"],
        required: true,
      },
      title: { type: String, required: true },
      body: { type: String, required: true },
      time: { type: String, required: true },
      unread: { type: Boolean, required: true, default: true, index: true },
      actionLabel: { type: String, required: true },
      actionTo: { type: String, required: true },
      createdAt: { type: Date, required: true, default: () => new Date(), index: true },
    },
    { timestamps: false },
  ),
);
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 120 });

export const UtilizationSnapshotSchema = new Schema(
  {
    resourceId: { type: objectId, ref: "Resource", required: true, index: true },
    date: { type: String, required: true, index: true },
    hourlyBuckets: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { timestamps: true },
);
UtilizationSnapshotSchema.index({ resourceId: 1, date: 1 }, { unique: true });

export const CampusInsightSchema = withExternalId(
  new Schema(
    {
      severity: { type: String, enum: ["critical", "attention", "info"], required: true },
      category: { type: String, enum: ["Demand", "Utilization", "Anomaly", "Capacity"], required: true },
      title: { type: String, required: true },
      explanation: { type: String, required: true },
      evidence: { type: [String], required: true, default: [] },
      recommendation: { type: String, required: true },
    },
    { timestamps: true },
  ),
);

export const ResourceInsightSchema = withExternalId(
  new Schema(
    {
      resourceId: { type: String, required: true, index: true },
      type: { type: String, enum: ["Demand", "Utilization", "Conflict", "Maintenance", "Allocation"], required: true },
      severity: { type: String, enum: ["critical", "warning", "info", "positive"], required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      recommendation: { type: String, required: true },
      confidence: { type: Number, required: true },
    },
    { timestamps: true },
  ),
);

export const CampusSignalSchema = withExternalId(
  new Schema(
    {
      type: { type: String, enum: ["detected", "observed", "predicted"], required: true },
      domain: { type: String, enum: intelDomains, required: true },
      severity: { type: String, enum: intelSeverities, required: true },
      minutesAgo: { type: Number, required: true },
      source: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      followUpLabel: { type: String, enum: ["Recommendation", "Opportunity", "Watch"], required: true },
      followUp: { type: String, required: true },
      scope: { type: [String], enum: timeScopes, required: true },
      relatedResource: { type: String, default: undefined },
      askCampusOS: { type: String, required: true },
    },
    { timestamps: true },
  ),
);

const recommendationBase = {
  title: { type: String, required: true },
  domain: { type: String, enum: intelDomains, required: true },
  relatedResource: { type: String, default: undefined },
  askCampusOS: { type: String, required: true },
};

export const CampusPredictionSchema = withExternalId(
  new Schema(
    {
      category: {
        type: String,
        enum: ["High resource demand", "Low utilization", "Scheduling pressure"],
        required: true,
      },
      domain: { type: String, enum: intelDomains, required: true },
      severity: { type: String, enum: intelSeverities, required: true },
      when: { type: String, required: true },
      timeRange: { type: String, required: true },
      observed: { type: String, required: true },
      expectedValue: { type: String, required: true },
      baseline: { type: String, required: true },
      deltaLabel: { type: String, required: true },
      confidence: { type: String, enum: ["High", "Moderate", "Indicative"], required: true },
      affected: { type: [String], required: true, default: [] },
      reason: { type: String, required: true },
      recommendation: { type: String, required: true },
      why: { type: [String], required: true, default: [] },
      scope: { type: [String], enum: timeScopes, required: true },
      relatedResource: { type: String, default: undefined },
      askCampusOS: { type: String, required: true },
    },
    { timestamps: true },
  ),
);

export const CampusRiskSchema = withExternalId(
  new Schema(
    {
      severity: { type: String, enum: intelSeverities, required: true },
      title: { type: String, required: true },
      area: { type: String, required: true },
      window: { type: String, required: true },
      reason: { type: String, required: true },
      recommendation: { type: String, required: true },
      domain: { type: String, enum: intelDomains, required: true },
      scope: { type: [String], enum: timeScopes, required: true },
      relatedResource: { type: String, default: undefined },
      askCampusOS: { type: String, required: true },
    },
    { timestamps: true },
  ),
);

export const CampusOpportunitySchema = withExternalId(
  new Schema(
    {
      ...recommendationBase,
      detail: { type: String, required: true },
      impact: { type: String, required: true },
      scope: { type: [String], enum: timeScopes, required: true },
      actionLabel: { type: String, required: true },
    },
    { timestamps: true },
  ),
);

export const CampusRecommendationSchema = withExternalId(
  new Schema(
    {
      ...recommendationBase,
      reason: { type: String, required: true },
      impact: { type: String, required: true },
      actionLabel: { type: String, enum: ["Review", "Resolve", "Explore"], required: true },
      relatedBooking: { type: String, default: undefined },
    },
    { timestamps: true },
  ),
);

export const PulsePointSchema = withExternalId(
  new Schema(
    {
      time: { type: String, required: true },
      level: { type: String, enum: ["Normal", "Increasing", "Moderate", "High"], required: true },
      value: { type: Number, required: true },
    },
    { timestamps: true },
  ),
);

export const CopilotSessionSchema = withExternalId(
  new Schema(
    {
      userId: { type: objectId, ref: "User", default: null, index: true },
      title: { type: String, required: true },
    },
    { timestamps: true },
  ),
);

export const CopilotMessageSchema = new Schema(
  {
    sessionId: { type: objectId, ref: "CopilotSession", required: true, index: true },
    userId: { type: objectId, ref: "User", default: null, index: true },
    role: { type: String, enum: ["user", "assistant", "tool"], required: true },
    content: { type: String, required: true },
    toolTrace: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

export const AuditLogSchema = new Schema(
  {
    actorId: { type: objectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const CampusSchema = withExternalId(
  new Schema(
    {
      name: { type: String, required: true },
      code: { type: String, required: true, index: true },
      timezone: { type: String, required: true },
      address: { type: String, default: null },
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: undefined },
      },
      datasetVersion: { type: Number, required: true, default: 0 },
      dataMode: { type: String, enum: ["production", "demo"], required: true, default: "production", index: true },
      onboardingComplete: { type: Boolean, required: true, default: false },
      lastDatasetImportId: { type: objectId, ref: "DatasetImport", default: null },
    },
    { timestamps: true },
  ),
);

export const DatasetImportSchema = new Schema(
  {
    campusId: { type: String, required: true, index: true },
    uploadedBy: { type: objectId, ref: "User", required: true, index: true },
    originalFilename: { type: String, required: true },
    storedObjectKey: { type: String, required: true },
    fileType: { type: String, enum: ["csv", "pdf", "docx", "xlsx"], required: true, index: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
    status: { type: String, enum: datasetImportStatuses, required: true, default: "UPLOADED", index: true },
    sourceType: { type: String, enum: ["upload"], required: true, default: "upload" },
    parser: { type: String, required: true },
    recordCount: { type: Number, required: true, default: 0 },
    importedCount: { type: Number, required: true, default: 0 },
    updatedCount: { type: Number, required: true, default: 0 },
    skippedCount: { type: Number, required: true, default: 0 },
    errorCount: { type: Number, required: true, default: 0 },
    warningCount: { type: Number, required: true, default: 0 },
    warnings: { type: [String], required: true, default: [] },
    checksum: { type: String, required: true, index: true },
    version: { type: Number, required: true, default: 1 },
    createdAt: { type: Date, required: true, default: () => new Date() },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failedStage: { type: String, default: null },
    errorSummary: { type: String, default: null },
    mapping: { type: Schema.Types.Mixed, default: null },
    preview: { type: Schema.Types.Mixed, default: null },
    qualityScore: { type: Number, min: 0, max: 100, default: null },
    intelligenceReadiness: { type: Number, min: 0, max: 100, default: null },
    importStrategy: { type: String, enum: ["MERGE", "APPEND", "REPLACE_DATASET"], default: "MERGE" },
    rollbackRecords: { type: [Schema.Types.Mixed], required: true, default: [] },
    rolledBackAt: { type: Date, default: null },
  },
  { timestamps: false },
);
DatasetImportSchema.index({ campusId: 1, checksum: 1 });
DatasetImportSchema.index({ campusId: 1, status: 1 });

export const User = (models.User as Model<any>) || model("User", UserSchema);
export const Building = (models.Building as Model<any>) || model("Building", BuildingSchema);
export const Resource = (models.Resource as Model<any>) || model("Resource", ResourceSchema);
export const Booking = (models.Booking as Model<any>) || model("Booking", BookingSchema);
export const BookingConflict =
  (models.BookingConflict as Model<any>) || model("BookingConflict", BookingConflictSchema);
export const ApprovalDecision =
  (models.ApprovalDecision as Model<any>) || model("ApprovalDecision", ApprovalDecisionSchema);
export const ActivityEvent = (models.ActivityEvent as Model<any>) || model("ActivityEvent", ActivityEventSchema);
export const Notification = (models.Notification as Model<any>) || model("Notification", NotificationSchema);
export const UtilizationSnapshot =
  (models.UtilizationSnapshot as Model<any>) || model("UtilizationSnapshot", UtilizationSnapshotSchema);
export const CampusInsight = (models.CampusInsight as Model<any>) || model("CampusInsight", CampusInsightSchema);
export const ResourceInsight =
  (models.ResourceInsight as Model<any>) || model("ResourceInsight", ResourceInsightSchema);
export const CampusSignal = (models.CampusSignal as Model<any>) || model("CampusSignal", CampusSignalSchema);
export const CampusPrediction =
  (models.CampusPrediction as Model<any>) || model("CampusPrediction", CampusPredictionSchema);
export const CampusRisk = (models.CampusRisk as Model<any>) || model("CampusRisk", CampusRiskSchema);
export const CampusOpportunity =
  (models.CampusOpportunity as Model<any>) || model("CampusOpportunity", CampusOpportunitySchema);
export const CampusRecommendation =
  (models.CampusRecommendation as Model<any>) || model("CampusRecommendation", CampusRecommendationSchema);
export const PulsePoint = (models.PulsePoint as Model<any>) || model("PulsePoint", PulsePointSchema);
export const CopilotSession =
  (models.CopilotSession as Model<any>) || model("CopilotSession", CopilotSessionSchema);
export const CopilotMessage = (models.CopilotMessage as Model<any>) || model("CopilotMessage", CopilotMessageSchema);
export const AuditLog = (models.AuditLog as Model<any>) || model("AuditLog", AuditLogSchema);
export const Campus = (models.Campus as Model<any>) || model("Campus", CampusSchema);
export const DatasetImport =
  (models.DatasetImport as Model<any>) || model("DatasetImport", DatasetImportSchema);

export type MongoId = mongoose.Types.ObjectId;
export type DatasetImportStatus = (typeof datasetImportStatuses)[number];
