import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BookingRequestSchema } from "@campus-os/shared-types";

import { requireAuth } from "../../shared/middleware/auth.js";
import {
  BOOKING_RULES,
  cancelBooking,
  checkAvailability,
  createBooking,
  findBookingAlternatives,
  getBookingForUser,
  listBookings,
  recommendTimes,
  updateBooking,
} from "./booking.service.js";

const bookingPatchSchema = BookingRequestSchema.partial().extend({
  note: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "confirmed", "rejected", "cancelled", "completed", "conflict"]).optional(),
});

export async function bookingsRoutes(app: FastifyInstance) {
  app.get(
    "/bookings/policy",
    { preHandler: requireAuth, schema: { tags: ["Bookings"] } },
    async () => BOOKING_RULES,
  );

  app.get(
    "/bookings",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Bookings"],
        querystring: z.object({
          mine: z.coerce.boolean().optional(),
          status: z.string().optional(),
          resourceId: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const query = z
        .object({ mine: z.coerce.boolean().optional(), status: z.string().optional(), resourceId: z.string().optional() })
        .parse(request.query);
      return listBookings(request.user!, query as any);
    },
  );

  app.get(
    "/bookings/:id",
    { preHandler: requireAuth, schema: { tags: ["Bookings"], params: z.object({ id: z.string() }) } },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      return getBookingForUser(id, request.user!);
    },
  );

  app.post(
    "/bookings/check",
    { preHandler: requireAuth, schema: { tags: ["Bookings"], body: BookingRequestSchema } },
    async (request) => {
      const body = BookingRequestSchema.parse(request.body);
      if (!body.resourceId) return { resource: undefined, available: false, conflicts: [], checks: [], match: { total: 0, parts: [], risk: "High" } };
      return checkAvailability(body.resourceId, body.date, body.start, body.end, {
        attendees: body.attendees,
        equipment: body.equipment,
      });
    },
  );

  app.post(
    "/bookings/recommendations",
    { preHandler: requireAuth, schema: { tags: ["Bookings"], body: BookingRequestSchema } },
    async (request) => {
      const body = BookingRequestSchema.parse(request.body);
      return findBookingAlternatives(body);
    },
  );

  app.post(
    "/bookings",
    { preHandler: requireAuth, schema: { tags: ["Bookings"], body: BookingRequestSchema } },
    async (request) => {
      return createBooking(BookingRequestSchema.parse(request.body), request.user!, request.headers["idempotency-key"] as string | undefined);
    },
  );

  app.patch(
    "/bookings/:id",
    {
      preHandler: requireAuth,
      schema: { tags: ["Bookings"], params: z.object({ id: z.string() }), body: bookingPatchSchema },
    },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      return updateBooking(id, bookingPatchSchema.parse(request.body) as any, request.user!);
    },
  );

  app.delete(
    "/bookings/:id",
    { preHandler: requireAuth, schema: { tags: ["Bookings"], params: z.object({ id: z.string() }) } },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      return cancelBooking(id, request.user!);
    },
  );

  app.post(
    "/bookings/:id/resolve-conflict",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Bookings"],
        params: z.object({ id: z.string() }),
        body: z.object({ resourceId: z.string(), date: z.string(), start: z.string(), end: z.string() }),
      },
    },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const patch = z.object({ resourceId: z.string(), date: z.string(), start: z.string(), end: z.string() }).parse(request.body);
      return updateBooking(id, patch, request.user!);
    },
  );

  app.get(
    "/resources/:id/times",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Bookings"],
        params: z.object({ id: z.string() }),
        querystring: z.object({
          date: z.string(),
          duration: z.coerce.number().int().positive().optional(),
          attendees: z.coerce.number().int().nonnegative().optional(),
        }),
      },
    },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const query = z
        .object({
          date: z.string(),
          duration: z.coerce.number().int().positive().optional(),
          attendees: z.coerce.number().int().nonnegative().optional(),
        })
        .parse(request.query);
      return recommendTimes(id, query.date, query as any);
    },
  );
}
