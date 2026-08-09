import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/common/components/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
} from "@/shared/primitives";
import { getNotifications, type NotificationItem } from "@/data/campus";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CampusOS AI" },
      {
        name: "description",
        content:
          "Actionable campus notifications for bookings, approvals, conflicts, AI insights and system events.",
      },
      { property: "og:title", content: "Notifications — CampusOS AI" },
      { property: "og:description", content: "Every alert arrives with an action." },
    ],
  }),
  component: NotificationsPage,
});

const categories: (NotificationItem["category"] | "All")[] = [
  "All",
  "Booking",
  "Approval",
  "Conflict",
  "AI insight",
  "System",
];

const tone = {
  Booking: "info",
  Approval: "warning",
  Conflict: "critical",
  "AI insight": "info",
  System: "neutral",
} as const;

function NotificationsPage() {
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const items = getNotifications().filter((n) => cat === "All" || n.category === cat);

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Notifications"
        subtitle="Campus events that need a decision — never a feed you scroll past."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              cat === c
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing here" body="No notifications in this category right now." />
      ) : (
        <Panel className="divide-border divide-y">
          {items.map((n) => (
            <div key={n.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={tone[n.category]}>{n.category}</StatusPill>
                  <span className="text-muted-foreground/70 text-[11px]">{n.time}</span>
                  {n.unread ? <span className="bg-primary size-1.5 rounded-full" aria-label="Unread" /> : null}
                </div>
                <p className="mt-2 text-[13px] font-medium">{n.title}</p>
                <p className="text-meta mt-0.5">{n.body}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={n.actionTo}>{n.actionLabel}</Link>
              </Button>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
