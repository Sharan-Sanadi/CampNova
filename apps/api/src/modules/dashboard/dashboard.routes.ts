import type { FastifyInstance } from "fastify";

import { ActivityEvent, Booking } from "../../db/models.js";
import { cursorFilter, parseLimit } from "../../shared/http/pagination.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { activityToDto } from "../notifications/notification.service.js";
import { bookingPressure } from "../bookings/booking.service.js";
import { campusToday, dayLabelFor } from "../bookings/time.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/pulse", { preHandler: requireAuth, schema: { tags: ["Dashboard"] } }, async () => {
    const pressure = await bookingPressure(campusToday());
    const active = await Booking.countDocuments({ status: { $in: ["pending", "approved", "confirmed", "conflict"] } });
    const conflicts = await Booking.countDocuments({ status: "conflict" });
    const pending = await Booking.countDocuments({ status: "pending" });
    return [
      {
        label: "Resource utilization",
        value: `${pressure.overall}%`,
        trend: "+4.2%",
        direction: "up",
        meaning: `${pressure.level} demand · peak ${pressure.peakWindow}`,
      },
      {
        label: "Active bookings",
        value: String(active),
        trend: "+12",
        direction: "up",
        meaning: "Across bookable resources",
      },
      {
        label: "Conflicts detected",
        value: String(conflicts),
        trend: "-3",
        direction: conflicts > 0 ? "up" : "down",
        meaning: conflicts === 0 ? "Campus is conflict-free" : "CampusOS has alternatives ready",
      },
      {
        label: "Pending approvals",
        value: String(pending),
        trend: "+2",
        direction: "up",
        meaning: pending === 0 ? "Approval queue is clear" : "Assessed and ready to decide",
      },
    ];
  });

  app.get("/dashboard/timeline", { preHandler: requireAuth, schema: { tags: ["Dashboard"] } }, async () => {
    const bookings = await Booking.find({ date: campusToday(), status: { $in: ["pending", "approved", "confirmed", "conflict"] } })
      .sort({ startMinutes: 1 })
      .limit(8)
      .lean();
    return bookings.map((booking) => ({
      time: booking.start,
      title: booking.title,
      place: booking.resourceName,
      tone: booking.status === "conflict" ? "critical" : booking.status === "pending" ? "warning" : "default",
      day: dayLabelFor(booking.date),
    }));
  });

  app.get("/dashboard/activity", { preHandler: requireAuth, schema: { tags: ["Dashboard"] } }, async (request) => {
    const query = request.query as { cursor?: string; limit?: string };
    const limit = parseLimit(query.limit, 50);
    const docs = await ActivityEvent.find(cursorFilter(query.cursor)).sort({ createdAt: -1 }).limit(limit).lean();
    return {
      items: docs.map(activityToDto),
      nextCursor: docs.length === limit ? docs[docs.length - 1]?.createdAt?.toISOString() : null,
    };
  });
}
