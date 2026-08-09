import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireRole } from "../../shared/middleware/auth.js";
import { decideBooking, getPendingApprovals } from "../bookings/booking.service.js";

export async function approvalsRoutes(app: FastifyInstance) {
  app.get(
    "/approvals/pending",
    { preHandler: requireRole("DEPT_LEAD"), schema: { tags: ["Approvals"] } },
    async (request) => getPendingApprovals(request.user!),
  );

  app.post(
    "/approvals/:bookingId/decide",
    {
      preHandler: requireRole("DEPT_LEAD"),
      schema: {
        tags: ["Approvals"],
        params: z.object({ bookingId: z.string() }),
        body: z.object({ decision: z.enum(["approved", "rejected"]), reason: z.string().optional() }),
      },
    },
    async (request) => {
      const { bookingId } = z.object({ bookingId: z.string() }).parse(request.params);
      const body = z.object({ decision: z.enum(["approved", "rejected"]), reason: z.string().optional() }).parse(request.body);
      return decideBooking(bookingId, body.decision, request.user!, body.reason);
    },
  );
}
