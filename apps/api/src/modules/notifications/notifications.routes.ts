import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { Notification } from "../../db/models.js";
import { notFound } from "../../shared/errors/AppError.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { notificationToDto } from "./notification.service.js";

export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/notifications", { preHandler: requireAuth, schema: { tags: ["Notifications"] } }, async (request) => {
    const docs = await Notification.find({
      $or: [{ userId: null }, { userId: request.user!.mongoId }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return docs.map(notificationToDto);
  });

  app.patch(
    "/notifications/:id/read",
    { preHandler: requireAuth, schema: { tags: ["Notifications"], params: z.object({ id: z.string() }) } },
    async (request) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const doc = await Notification.findOneAndUpdate(
        { externalId: id, $or: [{ userId: null }, { userId: request.user!.mongoId }] },
        { $set: { unread: false } },
        { new: true },
      ).lean();
      if (!doc) throw notFound("Notification not found");
      return notificationToDto(doc);
    },
  );
}
