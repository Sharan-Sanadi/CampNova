import type {
  AvailabilitySlot,
  MatchReason,
  MatchResult,
  ResourceProfile,
  ResourceQuery,
} from "@campus-os/shared-types";

import { Booking, Resource } from "../../db/models.js";
import { env } from "../../config/env.js";
import { BLOCKING_STATUSES, dateForDayLabel, dayLabelFor, fromMinutes, overlapMinutes, shiftDate, TIMELINE_HOURS, toMinutes } from "../bookings/time.js";
import { toResourceDto, toResourceProfileDto } from "./resource.mapper.js";

const two = (n: number) => String(n).padStart(2, "0");
const dataModeFilter = () => (env.DATA_MODE === "demo" ? "demo" : "live");

export async function listResources(campusId: string) {
  const resources = await Resource.find({ campusId, dataMode: dataModeFilter() }).sort({ name: 1 }).lean();
  return resources.map(toResourceDto);
}

export async function listResourceProfiles(campusId: string): Promise<ResourceProfile[]> {
  const resources = await Resource.find({ campusId, dataMode: dataModeFilter() }).sort({ name: 1 }).lean();
  return resources.map(toResourceProfileDto);
}

export async function createResource(data: {
  name: string;
  type: string;
  building: string;
  floor: string;
  capacity: number;
  description: string;
  amenities?: string[] | undefined;
  equipment?: string[] | undefined;
}, user: { campusId: string; mongoId: string }) {
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const externalId = `${slug}-${Date.now().toString(36)}`;
  
  const created = await Resource.create({
    externalId,
    campusId: user.campusId,
    name: data.name,
    type: data.type,
    building: data.building,
    buildingId: "000000000000000000000000", // fallback mongo id for building
    floor: data.floor,
    capacity: data.capacity,
    amenities: data.amenities ?? [],
    equipment: data.equipment ?? [],
    status: "available",
    utilization: 0,
    nextBooking: null,
    trend: [0, 0, 0, 0, 0, 0, 0],
    description: data.description,
    accessibility: {
      wheelchair: true,
      hearingLoop: false,
      stepFreeRoute: true,
      note: "Standard accessibility",
    },
    walkMinutes: 5,
    bookingPressure: "Low",
    conflictRate: 0,
    cancellationRate: 0,
    upcomingBookings: 0,
    maintenance: "Normal",
    healthScore: 100,
    trendDelta: 0,
    peakWindow: "14:00-16:00",
    lowWindow: "08:00-10:00",
    demandByDay: [],
    demandByPart: [],
    predictedDemand: {
      window: "14:00-16:00",
      level: "Low",
      note: "Normal capacity",
    },
    dataMode: dataModeFilter(),
    isDemo: false,
  });

  return toResourceProfileDto(created.toObject());
}

export async function getResourceProfile(id: string, campusId?: string): Promise<ResourceProfile | undefined> {
  const resource = await Resource.findOne({
    externalId: id,
    ...(campusId ? { campusId, dataMode: dataModeFilter() } : {}),
  }).lean();
  return resource ? toResourceProfileDto(resource) : undefined;
}

export async function getAvailability(resourceId: string, dayIndex = 0, campusId?: string): Promise<AvailabilitySlot[]> {
  const resource = await getResourceProfile(resourceId, campusId);
  if (!resource) return [];
  const date = shiftDate(dateForDayLabel("Today"), dayIndex);
  const day = dayLabelFor(date);
  const bookings = await Booking.find({
    resourceId,
    ...(campusId ? { campusId, dataMode: dataModeFilter() } : {}),
    date,
    status: { $in: BLOCKING_STATUSES },
  })
    .sort({ startMinutes: 1 })
    .lean();

  return [8, 10, 12, 14, 16, 18].map((h) => {
    const start = `${two(h)}:00`;
    const end = `${two(h + 2)}:00`;
    const booking = bookings.find(
      (b) => overlapMinutes(start, end, b.start, b.end) > 0,
    );

    if (resource.status === "maintenance") {
      return { resourceId, day, date, start, end, status: "maintenance", label: "Maintenance window" };
    }
    if (booking) {
      return {
        resourceId,
        day,
        date,
        start,
        end,
        status: booking.status === "pending" ? "pending" : "reserved",
        label: booking.title,
        bookingId: booking.externalId,
      } satisfies AvailabilitySlot;
    }
    return { resourceId, day, date, start, end, status: "available", label: "Available" };
  });
}

async function slotFree(
  resourceId: string,
  dayLabel: string | null,
  start: string | null,
  end: string | null,
  campusId?: string,
) {
  if (!start || !end) return true;
  const date = dateForDayLabel(dayLabel);
  const count = await Booking.countDocuments({
    resourceId,
    ...(campusId ? { campusId, dataMode: dataModeFilter() } : {}),
    date,
    status: { $in: BLOCKING_STATUSES },
    startMinutes: { $lt: toMinutes(end) },
    endMinutes: { $gt: toMinutes(start) },
  });
  return count === 0;
}

export async function scoreResource(profile: ResourceProfile, query: ResourceQuery, campusId?: string): Promise<MatchResult> {
  const reasons: MatchReason[] = [];
  let score = 55;

  if (query.capacity) {
    const fits = profile.capacity >= query.capacity;
    const overshoot = profile.capacity - query.capacity;
    if (fits) {
      score += overshoot <= 20 ? 20 : 12;
      reasons.push({
        met: true,
        label: "Capacity requirement satisfied",
        detail: `${profile.capacity} seats for ${query.capacity} requested${overshoot <= 20 ? " - efficient fit" : ""}.`,
      });
    } else {
      score -= 30;
      reasons.push({
        met: false,
        label: "Below requested capacity",
        detail: `${profile.capacity} seats against ${query.capacity} requested.`,
      });
    }
  } else {
    score += 6;
  }

  if (query.equipment.length) {
    const missing = query.equipment.filter((item) => !profile.equipment.includes(item));
    if (missing.length === 0) {
      score += 16;
      reasons.push({ met: true, label: "All requested equipment present", detail: query.equipment.join(" · ") });
    } else {
      score -= missing.length * 12;
      reasons.push({ met: false, label: "Missing equipment", detail: missing.join(" · ") });
    }
  }

  if (query.type) {
    if (profile.type === query.type) {
      score += 10;
      reasons.push({ met: true, label: "Matches requested resource type", detail: profile.type });
    } else {
      score -= 14;
      reasons.push({ met: false, label: "Different resource type", detail: profile.type });
    }
  }

  if (query.accessible) {
    if (profile.accessibility.wheelchair) {
      score += 8;
      reasons.push({ met: true, label: "Step-free and wheelchair accessible", detail: profile.accessibility.note });
    } else {
      score -= 25;
      reasons.push({ met: false, label: "Not wheelchair accessible", detail: profile.accessibility.note });
    }
  }

  const free = profile.status !== "maintenance" && (await slotFree(profile.id, query.dayLabel, query.start, query.end, campusId));
  const window =
    query.start && query.end ? `${query.dayLabel ?? "Today"} · ${query.start}-${query.end}` : "the requested window";
  if (profile.status === "maintenance") {
    score -= 45;
    reasons.push({ met: false, label: "Withdrawn for maintenance", detail: profile.maintenanceNote ?? "" });
  } else if (free) {
    score += 14;
    reasons.push({ met: true, label: "No scheduling conflict", detail: `Free across ${window}.` });
  } else {
    score -= 22;
    reasons.push({ met: false, label: "Scheduling conflict", detail: `Already reserved during ${window}.` });
  }

  if (profile.utilization < 70) {
    score += 6;
    reasons.push({
      met: true,
      label: "Appropriate utilization",
      detail: `${profile.utilization}% weekly - headroom available.`,
    });
  } else {
    score -= 4;
    reasons.push({
      met: false,
      label: "Heavily used resource",
      detail: `${profile.utilization}% weekly utilization.`,
    });
  }

  score += Math.max(-6, 6 - profile.walkMinutes);
  const conflictRisk: MatchResult["conflictRisk"] =
    !free || profile.conflictRate >= 2.5 ? "High" : profile.utilization >= 70 ? "Medium" : "Low";

  return {
    resource: profile,
    score: Math.max(12, Math.min(98, Math.round(score))),
    reasons,
    availability:
      profile.status === "maintenance"
        ? "Unavailable · maintenance"
        : free
          ? profile.status === "available"
            ? "Available now"
            : "Available in requested window"
          : "Conflicts with an existing reservation",
    conflictRisk,
  };
}

export async function matchResources(query: ResourceQuery): Promise<MatchResult[]> {
  const profiles = await listResourceProfiles(env.DEFAULT_CAMPUS_ID);
  const scored = await Promise.all(profiles.map((profile) => scoreResource(profile, query)));
  return scored.sort((a, b) => b.score - a.score);
}

export async function matchCampusResources(campusId: string, query: ResourceQuery): Promise<MatchResult[]> {
  const profiles = await listResourceProfiles(campusId);
  const scored = await Promise.all(profiles.map((profile) => scoreResource(profile, query, campusId)));
  return scored.sort((a, b) => b.score - a.score);
}

export async function findResourceAlternatives(resourceId: string, limit = 3, campusId?: string): Promise<MatchResult[]> {
  const target = await getResourceProfile(resourceId, campusId);
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
  const results = campusId ? await matchCampusResources(campusId, query) : await matchResources(query);
  return results
    .filter((result) => result.resource.id !== resourceId && result.resource.status !== "maintenance")
    .slice(0, limit);
}

export async function freeWindows(resourceId: string, date: string, duration: number) {
  const out: { start: string; end: string }[] = [];
  for (const h of TIMELINE_HOURS) {
    const start = `${two(h)}:00`;
    const end = fromMinutes(h * 60 + duration);
    if (toMinutes(end) > 20 * 60) continue;
    const count = await Booking.countDocuments({
      resourceId,
      date,
      status: { $in: BLOCKING_STATUSES },
      startMinutes: { $lt: toMinutes(end) },
      endMinutes: { $gt: toMinutes(start) },
    });
    if (count === 0) out.push({ start, end });
  }
  return out;
}
