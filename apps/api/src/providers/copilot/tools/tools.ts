import { z } from "zod";
import type { BookingRequest, ResourceQuery } from "@campus-os/shared-types";
import { ResourceQuerySchema } from "@campus-os/shared-types";

import { CampusSignal } from "../../../db/models.js";
import { checkAvailability } from "../../../modules/bookings/booking.service.js";
import { bookingPressure, findBookingAlternatives } from "../../../modules/bookings/booking.service.js";
import { dateForDayLabel } from "../../../modules/bookings/time.js";
import { matchResources } from "../../../modules/resources/resource.service.js";

const availabilityArgs = z.object({
  resourceId: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  attendees: z.number().int().nonnegative().default(0),
  equipment: z.array(z.string()).default([]),
});

const draftArgs = z.object({
  resourceId: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  title: z.string(),
  purpose: z.string().default("Created by CampusOS Copilot"),
  attendees: z.number().int().nonnegative(),
  equipment: z.array(z.string()).default([]),
  organiser: z.string(),
  department: z.string(),
});

export const copilotToolDefinitions = [
  {
    type: "function",
    function: {
      name: "search_resources",
      description: "Search and rank campus resources by capacity, equipment, type, accessibility, and availability.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          capacity: { type: ["number", "null"] },
          equipment: { type: "array", items: { type: "string" } },
          type: { type: ["string", "null"] },
          dayLabel: { type: ["string", "null"] },
          start: { type: ["string", "null"] },
          end: { type: ["string", "null"] },
          accessible: { type: "boolean" },
        },
        required: ["text", "capacity", "equipment", "type", "dayLabel", "start", "end", "accessible"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check a specific resource/date/time for policy checks and conflicts.",
      parameters: {
        type: "object",
        properties: {
          resourceId: { type: "string" },
          date: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          attendees: { type: "number" },
          equipment: { type: "array", items: { type: "string" } },
        },
        required: ["resourceId", "date", "start", "end"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_booking_draft",
      description: "Validate a booking request and return the draft plus alternatives. Does not confirm a booking.",
      parameters: {
        type: "object",
        properties: {
          resourceId: { type: "string" },
          date: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          title: { type: "string" },
          purpose: { type: "string" },
          attendees: { type: "number" },
          equipment: { type: "array", items: { type: "string" } },
          organiser: { type: "string" },
          department: { type: "string" },
        },
        required: ["resourceId", "date", "start", "end", "title", "attendees", "organiser", "department"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_campus_signals",
      description: "Return current campus intelligence signals and booking pressure.",
      parameters: { type: "object", properties: { date: { type: "string" } } },
    },
  },
] as const;

export type ToolTrace = { name: string; args: unknown; result: unknown };

export async function executeCopilotTool(name: string, args: unknown): Promise<unknown> {
  switch (name) {
    case "search_resources": {
      const parsed = ResourceQuerySchema.parse(args);
      const results = await matchResources(parsed);
      return results.slice(0, 5);
    }
    case "check_availability": {
      const parsed = availabilityArgs.parse(args);
      return checkAvailability(parsed.resourceId, parsed.date, parsed.start, parsed.end, {
        attendees: parsed.attendees,
        equipment: parsed.equipment,
      });
    }
    case "create_booking_draft": {
      const parsed = draftArgs.parse(args) satisfies BookingRequest;
      const availability = await checkAvailability(parsed.resourceId, parsed.date, parsed.start, parsed.end, {
        attendees: parsed.attendees,
        equipment: parsed.equipment,
      });
      const alternatives = availability.available ? [] : await findBookingAlternatives(parsed);
      return { draft: { ...parsed, status: "draft" }, availability, alternatives };
    }
    case "get_campus_signals": {
      const parsed = z.object({ date: z.string().optional() }).parse(args ?? {});
      const signals = await CampusSignal.find().sort({ externalId: 1 }).limit(10).lean();
      return {
        pressure: await bookingPressure(parsed.date ?? dateForDayLabel("Today")),
        signals: signals.map((signal) => ({ id: signal.externalId, ...signal })),
      };
    }
    default:
      throw new Error(`Unknown copilot tool: ${name}`);
  }
}

export function naturalLanguageResourceQuery(text: string): ResourceQuery {
  const q = text.toLowerCase();
  const capacityMatch =
    q.match(/(\d{1,4})\s*(?:\+)?\s*(?:seat|seats|seater|people|persons|students|attendees)/) ??
    q.match(/(?:for|of)\s+(\d{1,4})\b/);
  const capacity = capacityMatch?.[1] ? Number(capacityMatch[1]) : null;
  const equipment = [
    [/projector/, "Projector"],
    [/\bac\b|air condition/, "Air conditioning"],
    [/desktop|computer|pc|systems/, "Desktop systems"],
    [/video conferenc|zoom|hybrid/, "Video conferencing"],
    [/whiteboard/, "Whiteboard"],
    [/pa system|mic|sound/, "PA system"],
    [/stream/, "Streaming"],
  ]
    .filter(([re]) => (re as RegExp).test(q))
    .map(([, value]) => value as string);
  const type = /computer lab|programming lab|pc lab|lab/.test(q)
    ? "Computer Lab"
    : /meeting/.test(q)
      ? "Meeting Room"
      : /classroom|lecture/.test(q)
        ? "Classroom"
        : /auditorium|hall|seminar/.test(q)
          ? "Auditorium"
          : null;
  const dayLabel = /tomorrow/.test(q) ? "Tomorrow" : /today|now|afternoon|morning/.test(q) ? "Today" : null;
  const range = q.match(/(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  let start: string | null = null;
  let end: string | null = null;
  if (range) {
    const pm = range[5] === "pm" || /pm|afternoon|evening/.test(q);
    let s = Number(range[1]);
    let e = Number(range[3]);
    if (pm && s < 12) s += 12;
    if (pm && e < 12) e += 12;
    start = `${String(s).padStart(2, "0")}:${range[2] ?? "00"}`;
    end = `${String(e).padStart(2, "0")}:${range[4] ?? "00"}`;
  } else if (/morning/.test(q)) {
    start = "09:00";
    end = "11:00";
  } else if (/evening/.test(q)) {
    start = "17:00";
    end = "19:00";
  } else if (/afternoon/.test(q)) {
    start = "14:00";
    end = "16:00";
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
