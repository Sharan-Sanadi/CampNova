import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatusPill } from "@/shared/primitives";
import { LiveActivity } from "@/features/dashboard/components/LiveActivity";
import { useCampusVersion } from "@/common/lib/useCampus";

export const Route = createFileRoute("/_shell/activity")({
  head: () => ({
    meta: [
      { title: "Campus Activity — CampusOS AI" },
      {
        name: "description",
        content:
          "A live operational log of bookings, releases, approvals, conflicts and AI recommendations across campus.",
      },
      { property: "og:title", content: "Campus Activity — CampusOS AI" },
      { property: "og:description", content: "Every campus operation, as it happens." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  useCampusVersion();
  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Activity"
        subtitle="Everything CampusOS and your operators have done across campus today."
        actions={<StatusPill tone="success">Live</StatusPill>}
      />
      <LiveActivity />
    </div>
  );
}
