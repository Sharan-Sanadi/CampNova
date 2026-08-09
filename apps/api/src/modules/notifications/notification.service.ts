import type { ActivityEvent as ActivityEventDto, NotificationItem } from "@campus-os/shared-types";

import { ActivityEvent, Notification } from "../../db/models.js";
import { emitActivity, emitNotification } from "../realtime/realtime.service.js";

export async function appendActivity(event: ActivityEventDto): Promise<ActivityEventDto> {
  await ActivityEvent.findOneAndUpdate(
    { externalId: event.id },
    { $set: { ...event, externalId: event.id, createdAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  emitActivity(event);
  return event;
}

export async function appendNotification(
  item: NotificationItem,
  options: { userMongoId?: string } = {},
): Promise<NotificationItem> {
  await Notification.findOneAndUpdate(
    { externalId: item.id },
    {
      $set: {
        ...item,
        externalId: item.id,
        userId: options.userMongoId ?? null,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  emitNotification(item, options.userMongoId);
  return item;
}

export function notificationToDto(doc: any): NotificationItem {
  return {
    id: doc.externalId ?? String(doc._id ?? ""),
    category: doc.category,
    title: doc.title,
    body: doc.body,
    time: doc.time,
    unread: doc.unread,
    actionLabel: doc.actionLabel,
    actionTo: doc.actionTo,
  };
}

export function activityToDto(doc: any): ActivityEventDto {
  return {
    id: doc.externalId ?? String(doc._id ?? ""),
    kind: doc.kind,
    message: doc.message,
    detail: doc.detail,
    time: doc.time,
  };
}
