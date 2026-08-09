import mongoose from "mongoose";
import type {
  AvailabilityResult,
  Booking as BookingDto,
  BookingCheck,
  BookingConflict,
  BookingRecommendation,
  BookingRequest,
  MatchBreakdown,
} from "@campus-os/shared-types";
import { BOOKING_RULES } from "@campus-os/shared-types";

import { env } from "../../config/env.js";
import { getRedis } from "../../db/redis.js";
import { ApprovalDecision, Booking, Resource } from "../../db/models.js";
import { bookingEngineConflicts, bookingEngineCreated } from "../../shared/http/metrics.js";
import { withResourceDateLock } from "../../shared/locks/redlock.js";
import type { AuthUser } from "../../shared/middleware/auth.js";
import { canManageBooking, roleRank } from "../../shared/middleware/auth.js";
import { conflict, forbidden, notFound, validation } from "../../shared/errors/AppError.js";
import { appendActivity, appendNotification } from "../notifications/notification.service.js";
import { emitBookingStatus } from "../realtime/realtime.service.js";
import { freeWindows, getResourceProfile, listResourceProfiles } from "../resources/resource.service.js";
import { toBookingDto } from "./booking.mapper.js";
import {
  BLOCKING_STATUSES,
  bookingWindowDays,
  dayLabelFor,
  durationLabel,
  fromMinutes,
  longDate,
  overlapMinutes,
  shiftDate,
  toMinutes,
} from "./time.js";

export { BOOKING_RULES };

export async function detectConflicts(
  resourceId: string,
  date: string,
  start: string,
  end: string,
  ignoreBookingId?: string,
): Promise<BookingConflict[]> {
  const query: Record<string, unknown> = {
    resourceId,
    date,
    status: { $in: BLOCKING_STATUSES },
    startMinutes: { $lt: toMinutes(end) },
    endMinutes: { $gt: toMinutes(start) },
  };
  if (ignoreBookingId) query.externalId = { $ne: ignoreBookingId };

  const bookings = await Booking.find(query).sort({ startMinutes: 1 }).lean();
  return bookings.map((booking) => {
    const minutes = overlapMinutes(start, end, booking.start, booking.end);
    const severity: BookingConflict["severity"] =
      minutes >= 90 ? "high" : minutes >= 45 ? "medium" : "low";
    return {
      bookingId: ignoreBookingId ?? "new-request",
      conflictingBookingId: booking.externalId,
      resourceId,
      severity,
      overlap: `${booking.start}-${booking.end}`,
      overlapMinutes: minutes,
      title: booking.title,
      organiser: booking.organiser,
      recommendation:
        severity === "high"
          ? "Move to a comparable resource or shift the window."
          : "Trim the requested window or shift by one slot.",
    };
  });
}

export function scoreMatch(
  resource: NonNullable<Awaited<ReturnType<typeof getResourceProfile>>>,
  request: Pick<BookingRequest, "attendees" | "equipment" | "date" | "start" | "end">,
  conflicts: BookingConflict[],
): MatchBreakdown {
  const capacityFit =
    request.attendees <= 0
      ? 90
      : request.attendees > resource.capacity
        ? 30
        : Math.round(70 + 30 * (1 - Math.abs(resource.capacity - request.attendees) / resource.capacity));
  const equipmentMet = request.equipment.filter((item) =>
    resource.equipment.some((equipment) => equipment.toLowerCase().includes(item.toLowerCase())),
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

function riskLabelFromRisk(risk: MatchBreakdown["risk"]): BookingDto["riskLabel"] {
  return risk === "High" ? "High conflict risk" : risk === "Medium" ? "Medium conflict risk" : "Low conflict risk";
}

export async function checkAvailability(
  resourceId: string,
  date: string,
  start: string,
  end: string,
  options: { attendees?: number; equipment?: string[]; ignoreBookingId?: string } = {},
): Promise<AvailabilityResult> {
  const resource = await getResourceProfile(resourceId);
  const attendees = options.attendees ?? 0;
  const equipment = options.equipment ?? [];
  const conflicts = resource ? await detectConflicts(resourceId, date, start, end, options.ignoreBookingId) : [];
  const duration = toMinutes(end) - toMinutes(start);
  const windowDays = bookingWindowDays(date);
  const equipmentMissing = equipment.filter(
    (item) => !resource?.equipment.some((equipmentItem) => equipmentItem.toLowerCase().includes(item.toLowerCase())),
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
      detail: resource ? `${attendees || "-"} of ${resource.capacity} seats` : "Unknown capacity",
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
    available: checks.every((check) => check.passed),
    conflicts,
    checks,
    match: resource
      ? scoreMatch(resource, { attendees, equipment, date, start, end }, conflicts)
      : { total: 0, parts: [], risk: "High" },
  };
}

export function approvalAssessmentFromAvailability(result: AvailabilityResult): {
  risk: "Low" | "Medium" | "High";
  riskScore: number;
  recommendation: "Approve" | "Review" | "Reject";
  reasonCodes: string[];
  checks: BookingCheck[];
} {
  const failed = result.checks.filter((check) => !check.passed);
  const hardFailure = failed.some((check) =>
    ["Resource available", "Capacity satisfied", "Equipment available", "Booking window valid"].includes(check.label),
  );
  const risk = hardFailure ? "High" : result.match.risk;
  return {
    risk,
    riskScore: result.match.total,
    recommendation: hardFailure ? "Reject" : risk === "High" ? "Review" : "Approve",
    reasonCodes: failed.map((check) => check.label),
    checks: result.checks,
  };
}

function requirePassedPolicy(result: AvailabilityResult) {
  const failed = result.checks.filter((check) => !check.passed);
  const conflicts = result.conflicts;
  if (conflicts.length > 0) {
    bookingEngineConflicts.inc(conflicts.length);
    throw conflict("Requested booking overlaps an existing reservation", {
      conflicts,
      checks: result.checks,
    });
  }
  if (failed.length > 0) {
    throw validation("Booking request violates campus booking policy", {
      checks: result.checks,
      rules: BOOKING_RULES,
    });
  }
}

async function nextBookingId(): Promise<string> {
  const latest = await Booking.find({ externalId: /^BK-\d+$/ })
    .sort({ createdAt: -1 })
    .select({ externalId: 1 })
    .lean();
  const max = latest.reduce((acc, booking) => {
    const n = Number((booking.externalId ?? "").replace("BK-", ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 2500);
  return `BK-${max + 1}`;
}

function bookingStatusFor(user: AuthUser, assessment: ReturnType<typeof approvalAssessmentFromAvailability>) {
  if (assessment.recommendation === "Reject") return "rejected" as const;
  if (roleRank[user.role] >= roleRank.DEPT_LEAD && assessment.risk === "Low") return "confirmed" as const;
  return "pending" as const;
}

export async function listBookings(user: AuthUser, filters: { mine?: boolean; status?: string; resourceId?: string }) {
  const query: Record<string, unknown> = {};
  if (filters.mine) query.organiserId = new mongoose.Types.ObjectId(user.mongoId);
  if (filters.status) query.status = filters.status;
  if (filters.resourceId) query.resourceId = filters.resourceId;
  const bookings = await Booking.find(query).sort({ date: -1, startMinutes: 1 }).lean();
  return bookings.map((booking) => toBookingDto(booking, user.mongoId));
}

export async function getBookingForUser(id: string, user: AuthUser) {
  const booking = await Booking.findOne({ externalId: id }).lean();
  if (!booking) throw notFound("Booking not found");
  return toBookingDto(booking, user.mongoId);
}

async function getCachedIdempotentResponse(key: string): Promise<BookingDto | undefined> {
  const raw = await getRedis().get(`idempotency:booking:${key}`);
  return raw ? (JSON.parse(raw) as BookingDto) : undefined;
}

async function cacheIdempotentResponse(key: string, booking: BookingDto): Promise<void> {
  await getRedis().set(`idempotency:booking:${key}`, JSON.stringify(booking), "EX", 60 * 60 * 24);
}

export async function createBooking(request: BookingRequest, user: AuthUser, idempotencyKey: string | undefined) {
  if (!idempotencyKey) throw validation("Idempotency-Key header is required");
  const cached = await getCachedIdempotentResponse(idempotencyKey);
  if (cached) return cached;
  if (!request.resourceId) throw validation("resourceId is required");

  return withResourceDateLock(request.resourceId, request.date, async () => {
    const resource = (await Resource.findOne({ externalId: request.resourceId }).lean()) as any;
    if (!resource) throw notFound("Resource not found");

    const precheck = await checkAvailability(resource.externalId, request.date, request.start, request.end, {
      attendees: request.attendees,
      equipment: request.equipment,
    });
    requirePassedPolicy(precheck);
    const assessment = approvalAssessmentFromAvailability(precheck);
    const externalId = await nextBookingId();
    const session = await mongoose.startSession();
    let created: BookingDto | undefined;

    try {
      await session.withTransaction(async () => {
        const conflicts = (await Booking.find({
          resourceId: resource.externalId,
          date: request.date,
          status: { $in: BLOCKING_STATUSES },
          startMinutes: { $lt: toMinutes(request.end) },
          endMinutes: { $gt: toMinutes(request.start) },
        })
          .session(session)
          .lean()) as any[];
        if (conflicts.length > 0) {
          bookingEngineConflicts.inc(conflicts.length);
          throw conflict("Requested booking overlaps an existing reservation", {
            conflicts: conflicts.map((item) => item.externalId),
          });
        }

        const status = bookingStatusFor(user, assessment);
        const [booking] = await Booking.create(
          [
            {
              externalId,
              title: request.title || "Campus booking",
              resourceRef: resource._id,
              resourceId: resource.externalId,
              resourceName: resource.name,
              organiserId: user.mongoId,
              organiser: request.organiser || user.name,
              department: request.department || user.department,
              date: request.date,
              start: request.start,
              end: request.end,
              startMinutes: toMinutes(request.start),
              endMinutes: toMinutes(request.end),
              attendees: request.attendees,
              status,
              riskLabel: riskLabelFromRisk(assessment.risk),
              note: request.purpose || "Created through CampusOS Smart Booking.",
              purpose: request.purpose,
              equipment: request.equipment,
              conflictWith: [],
            },
          ],
          { session },
        );

        await ApprovalDecision.create(
          [
            {
              bookingId: booking!._id,
              decidedBy: user.mongoId,
              decision: assessment.recommendation,
              riskScore: assessment.riskScore,
              reasonCodes: assessment.reasonCodes,
              decidedAt: new Date(),
            },
          ],
          { session },
        );

        created = toBookingDto(booking!.toObject(), user.mongoId);
      });
    } finally {
      await session.endSession();
    }

    if (!created) throw validation("Booking could not be created");
    bookingEngineCreated.inc();
    await cacheIdempotentResponse(idempotencyKey, created);
    await appendActivity({
      id: `AC-${created.id}`,
      kind: created.status === "pending" ? "approval" : "booking",
      message: created.status === "pending" ? `Approval requested by ${created.organiser}` : `${created.title} booked in ${created.resourceName}`,
      detail: `${created.resourceName} · ${dayLabelFor(created.date)} ${created.start}-${created.end}`,
      time: "just now",
    });
    await appendNotification(
      {
        id: `NT-${created.id}`,
        category: created.status === "pending" ? "Approval" : "Booking",
        title: created.status === "pending" ? `${created.organiser} requested ${created.resourceName}` : "Booking confirmed",
        body: `${created.title} · ${created.resourceName} · ${dayLabelFor(created.date)} ${created.start}-${created.end}.`,
        time: "just now",
        unread: true,
        actionLabel: created.status === "pending" ? "Open approval" : "View booking",
        actionTo: created.status === "pending" ? "/approvals" : `/bookings/${created.id}`,
      },
      { userMongoId: user.mongoId },
    );
    emitBookingStatus(created);
    return created;
  });
}

export async function updateBooking(id: string, patch: Partial<BookingRequest> & Partial<BookingDto>, user: AuthUser) {
  const booking = await Booking.findOne({ externalId: id });
  if (!booking) throw notFound("Booking not found");
  if (!canManageBooking(user, String(booking.organiserId))) throw forbidden();

  const resourceId = patch.resourceId ?? booking.resourceId;
  const resource = (await Resource.findOne({ externalId: resourceId }).lean()) as any;
  if (!resource) throw notFound("Resource not found");
  const next = {
    resourceId,
    date: patch.date ?? booking.date,
    start: patch.start ?? booking.start,
    end: patch.end ?? booking.end,
    attendees: patch.attendees ?? booking.attendees,
    equipment: patch.equipment ?? booking.equipment ?? [],
  };

  const result = await checkAvailability(next.resourceId, next.date, next.start, next.end, {
    attendees: next.attendees,
    equipment: next.equipment,
    ignoreBookingId: id,
  });
  requirePassedPolicy(result);
  const assessment = approvalAssessmentFromAvailability(result);

  booking.set({
    title: patch.title ?? booking.title,
    resourceRef: resource._id,
    resourceId: resource.externalId,
    resourceName: resource.name,
    date: next.date,
    start: next.start,
    end: next.end,
    startMinutes: toMinutes(next.start),
    endMinutes: toMinutes(next.end),
    attendees: next.attendees,
    riskLabel: riskLabelFromRisk(assessment.risk),
    note: patch.note ?? booking.note,
    purpose: patch.purpose ?? booking.purpose,
    equipment: next.equipment,
    conflictWith: [],
  });
  await booking.save();
  const dto = toBookingDto(booking.toObject(), user.mongoId);
  await appendActivity({
    id: `AC-${id}-${Date.now()}`,
    kind: "booking",
    message: `${dto.title} updated`,
    detail: `${dto.resourceName} · ${dayLabelFor(dto.date)} ${dto.start}-${dto.end}`,
    time: "just now",
  });
  emitBookingStatus(dto);
  return dto;
}

export async function cancelBooking(id: string, user: AuthUser) {
  const booking = await Booking.findOne({ externalId: id });
  if (!booking) throw notFound("Booking not found");
  if (!canManageBooking(user, String(booking.organiserId))) throw forbidden();
  booking.status = "cancelled";
  booking.conflictWith = [];
  await booking.save();
  const dto = toBookingDto(booking.toObject(), user.mongoId);
  await appendActivity({
    id: `AC-cancel-${id}-${Date.now()}`,
    kind: "release",
    message: `${dto.title} cancelled`,
    detail: `${dto.resourceName} is available again · ${dto.start}-${dto.end}`,
    time: "just now",
  });
  await appendNotification(
    {
      id: `NT-cancel-${id}-${Date.now()}`,
      category: "Booking",
      title: "Booking cancelled",
      body: `${dto.title} was cancelled. ${dto.resourceName} is available again.`,
      time: "just now",
      unread: true,
      actionLabel: "View booking",
      actionTo: `/bookings/${dto.id}`,
    },
    { userMongoId: user.mongoId },
  );
  emitBookingStatus(dto);
  return dto;
}

export async function decideBooking(id: string, decision: "approved" | "rejected", user: AuthUser, reason?: string) {
  const booking = await Booking.findOne({ externalId: id });
  if (!booking) throw notFound("Booking not found");

  if (decision === "approved") {
    const result = await checkAvailability(booking.resourceId, booking.date, booking.start, booking.end, {
      attendees: booking.attendees,
      equipment: booking.equipment ?? [],
      ignoreBookingId: booking.externalId,
    });
    requirePassedPolicy(result);
  }

  booking.status = decision === "approved" ? "confirmed" : "rejected";
  await booking.save();
  const dto = toBookingDto(booking.toObject(), user.mongoId);
  await ApprovalDecision.create({
    bookingId: booking._id,
    decidedBy: user.mongoId,
    decision,
    riskScore: dto.riskLabel.startsWith("High") ? 30 : dto.riskLabel.startsWith("Medium") ? 65 : 90,
    reasonCodes: reason ? [reason] : [],
    decidedAt: new Date(),
  });
  await appendActivity({
    id: `AC-${decision}-${id}-${Date.now()}`,
    kind: "approval",
    message: `${dto.title} ${decision}`,
    detail: `${dto.resourceName} · ${dayLabelFor(dto.date)} ${dto.start}-${dto.end}`,
    time: "just now",
  });
  await appendNotification({
    id: `NT-${decision}-${id}-${Date.now()}`,
    category: "Approval",
    title: decision === "approved" ? "Booking approved" : "Booking rejected",
    body: `${dto.title} · ${dto.resourceName} · ${dayLabelFor(dto.date)} ${dto.start}-${dto.end}.`,
    time: "just now",
    unread: true,
    actionLabel: "View booking",
    actionTo: `/bookings/${dto.id}`,
  });
  emitBookingStatus(dto);
  return dto;
}

export async function getPendingApprovals(user: AuthUser) {
  const bookings = (await Booking.find({ status: "pending" }).sort({ createdAt: 1 }).lean()) as any[];
  return bookings.map((booking) => toBookingDto(booking, user.mongoId));
}

export async function recommendTimes(
  resourceId: string,
  date: string,
  options: { duration?: number; attendees?: number; equipment?: string[]; limit?: number } = {},
): Promise<BookingRecommendation[]> {
  const resource = await getResourceProfile(resourceId);
  if (!resource) return [];
  const duration = options.duration ?? 120;
  const windows = await freeWindows(resourceId, date, duration);
  return windows
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
        type: "same-resource-later",
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
          peakPenalty ? "Inside the 14:00-17:00 peak window" : "Outside peak scheduling hours",
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

export async function findBookingAlternatives(
  request: Pick<BookingRequest, "resourceId" | "date" | "start" | "end" | "attendees" | "equipment">,
  limit = 4,
): Promise<BookingRecommendation[]> {
  const duration = Math.max(30, toMinutes(request.end) - toMinutes(request.start));
  const target = request.resourceId ? await getResourceProfile(request.resourceId) : undefined;
  const out: BookingRecommendation[] = [];

  if (target) {
    const later = (await freeWindows(target.id, request.date, duration)).find(
      (window) => toMinutes(window.start) > toMinutes(request.start),
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
        rationale: `Keeps ${target.name} - only the time shifts by ${durationLabel(request.start, later.start)}.`,
      });
    }
  }

  const profiles = await listResourceProfiles(env.DEFAULT_CAMPUS_ID);
  const candidates = [];
  for (const profile of profiles) {
    if (profile.id === request.resourceId || profile.status === "maintenance") continue;
    if (request.attendees && profile.capacity < request.attendees) continue;
    if (target && profile.type !== target.type && profile.capacity < target.capacity * 0.8) continue;
    const conflicts = await detectConflicts(profile.id, request.date, request.start, request.end);
    if (conflicts.length) continue;
    candidates.push({ profile, match: scoreMatch(profile, request, []) });
  }

  for (const { profile, match } of candidates.sort((a, b) => b.match.total - a.match.total).slice(0, 2)) {
    out.push({
      id: `ALT-res-${profile.id}`,
      type: "alternative-resource",
      typeLabel: "Alternative resource",
      resourceId: profile.id,
      resourceName: profile.name,
      building: profile.building,
      capacity: profile.capacity,
      date: request.date,
      dayLabel: dayLabelFor(request.date),
      start: request.start,
      end: request.end,
      score: match.total,
      risk: match.risk,
      reasons: [
        target && profile.capacity >= target.capacity ? "Same or greater capacity" : `${profile.capacity} seats`,
        "Comparable equipment",
        "No overlap in the requested window",
        `${profile.utilization}% utilization - lower pressure`,
      ],
      rationale: "Keeps your exact time while reducing scheduling pressure.",
    });
  }

  if (target) {
    for (let day = 1; day <= 5; day += 1) {
      const date = shiftDate(request.date, day);
      if ((await detectConflicts(target.id, date, request.start, request.end)).length === 0) {
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
          rationale: `Same slot on ${longDate(date)} - everything else is unchanged.`,
        });
        break;
      }
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function bookingPressure(date: string) {
  const active = await Booking.find({ status: { $in: BLOCKING_STATUSES } }).lean();
  const byHour = Array.from({ length: 12 }, (_, index) => index + 8).map((hour) => {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = fromMinutes(hour * 60 + 60);
    const count = active.filter((booking) => booking.date === date && overlapMinutes(start, end, booking.start, booking.end) > 0)
      .length;
    const base = hour >= 14 && hour < 17 ? 58 : hour >= 10 && hour < 13 ? 38 : 18;
    const value = Math.min(100, base + count * 14);
    return { hour: start, value, level: value >= 70 ? "High" : value >= 40 ? "Moderate" : "Low" };
  });
  const overall = Math.round(byHour.reduce((sum, point) => sum + point.value, 0) / byHour.length);
  return {
    overall,
    level: overall >= 60 ? "High" : overall >= 38 ? "Moderate" : "Low",
    byHour,
    peakWindow: "14:00-17:00",
    hotResources: Object.entries(
      active.reduce<Record<string, number>>((acc, booking) => {
        acc[booking.resourceName] = (acc[booking.resourceName] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([name, count]) => ({ name, value: Math.min(100, 40 + count * 18) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3),
  };
}
