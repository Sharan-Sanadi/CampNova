import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import {
  MetricCard,
  Panel,
  PageHeader,
  SectionHeading,
  StatusDot,
  StatusPill,
} from "@/components/campusos/ui/primitives";
import { InsightCallout } from "@/components/campusos/dashboard/InsightCallout";
import { OperationsTimeline } from "@/components/campusos/dashboard/OperationsTimeline";
import { LiveActivity } from "@/components/campusos/dashboard/LiveActivity";
import { QuickActions } from "@/components/campusos/dashboard/QuickActions";
import { currentUser } from "@/data/campus";
import { livePulseMetrics } from "@/data/bookingEngine";
import { useCampusVersion } from "@/lib/useCampus";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Campus Command Center — CampusOS AI" },
      {
        name: "description",
        content:
          "A live operating picture of your campus: utilization, bookings, conflicts and AI recommendations in one command center.",
      },
      { property: "og:title", content: "Campus Command Center — CampusOS AI" },
      {
        property: "og:description",
        content: "Understand, predict and act on campus operations with CampusOS AI.",
      },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  useCampusVersion();
  const pulseMetrics = livePulseMetrics();
  // Greeting follows real campus time. Resolved after mount so the
  // prerendered markup and the hydrated markup never disagree.
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  }, []);
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <PageHeader
        eyebrow="Command Center"
        title={`${greeting}, Dr. ${currentUser.name.split(" ").slice(-1)[0]}.`}
        subtitle="Here's what needs your attention across campus."
        actions={
          <span className="text-meta hidden items-center gap-2 sm:inline-flex">
            <StatusDot tone="success" pulse /> {today} · {currentUser.campus}
          </span>
        }
      />

      <section aria-label="Campus pulse" className="mb-8">
        <SectionHeading label="Campus pulse" title="Operating signal for today" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pulseMetrics.map((m, i) => (
            <MetricCard key={m.label} {...m} index={i} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <InsightCallout />
          <section aria-label="Today's operations">
            <SectionHeading
              label="Today"
              title="Campus operations"
              action={
                <Link
                  to="/bookings"
                  className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  All bookings <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            <OperationsTimeline />
          </section>
          <section aria-label="Ask CampusOS">
            <Panel className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="text-primary size-3.5" aria-hidden />
                <p className="text-label text-muted-foreground">Ask CampusOS</p>
              </div>
              <Link
                to="/copilot"
                className="border-border bg-surface-2 hover:border-border-strong flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="text-muted-foreground flex-1 truncate text-sm">
                  Ask CampusOS anything — “find a 60-seat room tomorrow 2–4 PM with a projector”
                </span>
                <kbd className="border-border text-muted-foreground hidden rounded border px-1.5 py-0.5 text-[10px] sm:inline-flex">
                  <CornerDownLeft className="size-3" aria-hidden />
                </kbd>
              </Link>
            </Panel>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section aria-label="Quick actions">
            <SectionHeading label="Shortcuts" title="Quick actions" />
            <QuickActions />
          </section>
          <section aria-label="Live activity">
            <SectionHeading
              label="Live"
              title="Campus activity"
              action={<StatusPill tone="success">Streaming</StatusPill>}
            />
            <LiveActivity limit={5} />
          </section>
        </div>
      </div>
    </div>
  );
}
