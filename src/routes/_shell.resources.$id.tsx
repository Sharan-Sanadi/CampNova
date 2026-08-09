import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Accessibility,
  Armchair,
  Boxes,
  CalendarClock,
  FlaskConical,
  Mic,
  MonitorPlay,
  PenLine,
  Plug,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Wifi,
} from "lucide-react";
import { Button } from "@/common/components/button";
import { toast } from "sonner";
import { cn } from "@/common/lib/utils";
import {
  EmptyState,
  Panel,
  SectionHeading,
  Sparkline,
  StatusDot,
  StatusPill,
  Tag,
  UtilizationBar,
  statusTone,
} from "@/shared/primitives";
import { AvailabilityTimeline } from "@/features/resources/components/AvailabilityTimeline";
import {
  AskCampusOS,
  DemandBars,
  HealthPanel,
  InsightRow,
  LocationPanel,
  MatchScore,
} from "@/features/resources/components/intelligence";
import { ReserveDialog, type ReservePrefill } from "@/features/resources/components/ReserveDialog";
import {
  alternativeRationale,
  findAlternatives,
  getResourceBookings,
  getResourceInsights,
  getResourceProfile,
  type ResourceProfile,
} from "@/data/resources";

export const Route = createFileRoute("/_shell/resources/$id")({
  loader: ({ params }): { resourceId: string } => {
    const resource = getResourceProfile(params.id);
    if (!resource) throw notFound();
    return { resourceId: resource.id };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Resource unavailable — CampusOS AI" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const resource = getResourceProfile(loaderData.resourceId)!;
    const description = `${resource.name} · ${resource.building} · ${resource.capacity} seats. Availability, utilization, demand and AI insights.`;
    return {
      meta: [
        { title: `${resource.name} — CampusOS AI` },
        { name: "description", content: description },
        { property: "og:title", content: `${resource.name} — CampusOS AI` },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: ResourceNotFound,
  component: ResourceDetail,
});

function ResourceNotFound() {
  return (
    <EmptyState
      title="Resource not found"
      body="This resource may have been decommissioned or renamed."
      action={
        <Button asChild size="sm" variant="outline" className="press">
          <Link to="/resources">Back to resources</Link>
        </Button>
      }
    />
  );
}

const statusLabel = (s: string) =>
  s === "in-use" ? "In use" : s === "maintenance" ? "Maintenance" : "Available";

function amenityIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("wifi") || n.includes("network")) return Wifi;
  if (n.includes("mic") || n.includes("audio") || n.includes("sound")) return Mic;
  if (n.includes("camera") || n.includes("video") || n.includes("stream")) return Video;
  if (n.includes("projector") || n.includes("display") || n.includes("screen")) return MonitorPlay;
  if (n.includes("whiteboard") || n.includes("board")) return PenLine;
  if (n.includes("lab") || n.includes("fume") || n.includes("bench")) return FlaskConical;
  if (n.includes("power") || n.includes("charging")) return Plug;
  if (n.includes("desk") || n.includes("seat") || n.includes("chair")) return Armchair;
  return Boxes;
}


function ResourceDetail() {
  const { resourceId } = Route.useLoaderData();
  const resource = getResourceProfile(resourceId) as ResourceProfile;
  const insights = getResourceInsights(resource.id);
  const bookings = getResourceBookings(resource.id);
  const alternatives = findAlternatives(resource.id);
  const unavailable = resource.status === "maintenance";
  const aiConfidence = insights.length
    ? Math.round(insights.reduce((s, i) => s + i.confidence, 0) / insights.length)
    : 92;

  const [reserve, setReserve] = useState<ReservePrefill | null>(null);

  return (
    <div>
      <Link
        to="/resources"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Resources
      </Link>

      <header className="border-border mb-5 grid gap-3 border-b pb-4 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-label text-primary">{resource.type}</p>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                resource.status === "available"
                  ? "border-success/35 bg-success/10 text-success"
                  : resource.status === "in-use"
                    ? "border-warning/35 bg-warning/10 text-warning"
                    : "border-destructive/35 bg-destructive/10 text-destructive",
              )}
            >
              <StatusDot tone={statusTone(resource.status)} pulse />
              {statusLabel(resource.status)}
            </span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{resource.name}</h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span>
              {resource.building} · {resource.floor}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {resource.capacity} seats
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-primary inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" aria-hidden />
              AI confidence {aiConfidence}%
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="press"
            disabled={unavailable}
            onClick={() => setReserve({ day: "Today", start: "14:00", end: "16:00" })}
          >
            Reserve
          </Button>
          <Button asChild size="sm" variant="outline" className="press">
            <Link to="/resources/compare" search={{ ids: [resource.id, alternatives[0]?.resource.id].filter(Boolean).join(",") }}>
              Compare
            </Link>
          </Button>
          <AskCampusOS prompt={`Explain utilization and demand for ${resource.name}.`}>
            Ask CampusOS
          </AskCampusOS>
        </div>
      </header>


      {unavailable ? (
        <Panel className="border-destructive/30 enter-up mb-4 p-4 sm:p-5">
          <p className="text-sm font-medium">This resource is unavailable</p>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {resource.maintenanceNote ?? "Maintenance work is in progress."} CampusOS found{" "}
            {alternatives.length} suitable alternatives.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {alternatives.map((a) => (
              <li key={a.resource.id}>
                <Link
                  to="/resources/$id"
                  params={{ id: a.resource.id }}
                  className="border-border hover:border-border-strong hover:bg-surface-2 lift block rounded-lg border p-3"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{a.resource.name}</span>
                    <MatchScore score={a.score} label="" />
                  </span>
                  <span className="text-meta mt-1.5 block">
                    {alternativeRationale(resource, a.resource)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <AskCampusOS
            prompt={`Find an alternative to ${resource.name} for a similar session.`}
            className="mt-4"
          >
            Ask CampusOS to find another
          </AskCampusOS>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {/* Key information */}
          <Panel className="p-4 sm:p-5">
            <SectionHeading label="Overview" title="Key information" />
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              {resource.description}
            </p>
            <div className="mb-4 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="border-border bg-surface-2 flex items-baseline gap-2 rounded-lg border px-3.5 py-2.5">
                <span className="tnum text-3xl leading-none font-semibold tracking-tight">
                  {resource.capacity}
                </span>
                <span className="text-muted-foreground text-xs">seat capacity</span>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-label text-muted-foreground">Type</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">{resource.type}</dd>
                </div>
                <div>
                  <dt className="text-label text-muted-foreground">Location</dt>
                  <dd className="mt-0.5 truncate text-sm font-medium">{resource.floor}</dd>
                </div>
              </dl>
            </div>
            <dl className="grid gap-3">
              <div>
                <dt className="text-label text-muted-foreground">Equipment</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {resource.amenities.map((a) => {
                    const Icon = amenityIcon(a);
                    return (
                      <span
                        key={a}
                        className="border-border text-muted-foreground hover:border-border-strong hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors"
                      >
                        <Icon className="size-3 shrink-0" aria-hidden />
                        {a}
                      </span>
                    );
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-label text-muted-foreground">Accessibility</dt>
                <dd className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <Accessibility className="text-muted-foreground size-3.5" aria-hidden />
                  {resource.accessibility.wheelchair
                    ? "Wheelchair accessible"
                    : "Not wheelchair accessible"}
                  <span className="text-meta">· {resource.accessibility.note}</span>
                </dd>
              </div>
            </dl>
          </Panel>

          <AvailabilityTimeline
            resourceId={resource.id}
            onReserve={(slot) => setReserve(slot)}
          />

          {/* Utilization */}
          <Panel className="p-4 sm:p-5">
            <SectionHeading
              label="Operations"
              title="Utilization"
              action={
                <span className="text-success inline-flex items-center gap-1 text-xs font-medium tnum">
                  <TrendingUp className="size-3" aria-hidden />
                  {resource.trendDelta > 0 ? "+" : ""}
                  {resource.trendDelta}%
                </span>
              }
            />
            <div className="flex items-baseline gap-2">
              <span className="text-metric">{resource.utilization}%</span>
              <span className="text-muted-foreground text-sm">weekly</span>
            </div>
            <div className="mt-3">
              <UtilizationBar value={resource.utilization} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-label text-muted-foreground">Peak</p>
                <p className="mt-1 text-sm font-medium">{resource.peakWindow}</p>
              </div>
              <div>
                <p className="text-label text-muted-foreground">Lowest</p>
                <p className="mt-1 text-sm font-medium">{resource.lowWindow}</p>
              </div>
              <div>
                <p className="text-label text-muted-foreground">7-day trend</p>
                <Sparkline values={resource.trend} className="mt-1 w-full" />
              </div>
            </div>
            <p className="border-border text-muted-foreground mt-4 border-t pt-4 text-sm">
              <span className="text-label text-primary mr-2">AI observation</span>
              Demand for this resource is concentrated between {resource.peakWindow}.
            </p>
          </Panel>

          {/* Demand */}
          <Panel className="p-4 sm:p-5">
            <SectionHeading label="Prediction" title="Resource demand" />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-label text-muted-foreground mb-3">By weekday</p>
                <DemandBars data={resource.demandByDay} ariaLabel="Demand by weekday" />
              </div>
              <div>
                <p className="text-label text-muted-foreground mb-3">By part of day</p>
                <DemandBars data={resource.demandByPart} ariaLabel="Demand by part of day" />
              </div>
            </div>
            <div className="border-border mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
              <CalendarClock className="text-muted-foreground size-4" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Predicted demand · {resource.predictedDemand.window}
                </p>
                <p className="text-meta mt-0.5">{resource.predictedDemand.note}</p>
              </div>
              <StatusPill
                tone={
                  resource.predictedDemand.level === "Peak"
                    ? "critical"
                    : resource.predictedDemand.level === "High"
                      ? "warning"
                      : "success"
                }
                className="ml-auto"
              >
                {resource.predictedDemand.level}
              </StatusPill>
            </div>
          </Panel>

          {/* AI recommendation engine */}
          <Panel className="p-4 sm:p-5">
            <SectionHeading
              label="Intelligence"
              title="AI recommendation engine"
              action={
                <span className="text-primary bg-primary-soft inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  <Sparkles className="size-3" aria-hidden />
                  {insights.length} signals · {aiConfidence}% confidence
                </span>
              }
            />
            <div>
              {insights.map((i) => (
                <InsightRow key={i.id} insight={i} />
              ))}
            </div>
            <div className="border-border mt-4 flex flex-wrap gap-2 border-t pt-3.5">
              <AskCampusOS prompt={`What should I change about ${resource.name} this week?`}>
                Ask for a plan
              </AskCampusOS>
              <Button asChild size="sm" variant="outline" className="press">
                <Link to="/intelligence">Open campus intelligence</Link>
              </Button>
            </div>
          </Panel>


          {/* Admin operations */}
          <Panel className="p-4 sm:p-5">
            <SectionHeading
              label="Administration"
              title="Resource operations"
              action={<Settings2 className="text-muted-foreground size-4" aria-hidden />}
            />
            <dl className="grid gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-label text-muted-foreground">Status</dt>
                <dd className="mt-1.5">
                  <StatusPill tone={statusTone(resource.status)}>
                    {statusLabel(resource.status)}
                  </StatusPill>
                </dd>
              </div>
              <div>
                <dt className="text-label text-muted-foreground">Upcoming bookings</dt>
                <dd className="tnum mt-1.5 text-sm font-medium">{resource.upcomingBookings}</dd>
              </div>
              <div>
                <dt className="text-label text-muted-foreground">Conflict risk</dt>
                <dd className="mt-1.5 text-sm font-medium">
                  {resource.conflictRate >= 2.5 ? "Elevated" : "Low"}
                </dd>
              </div>
              <div>
                <dt className="text-label text-muted-foreground">Cancellations</dt>
                <dd className="tnum mt-1.5 text-sm font-medium">{resource.cancellationRate}%</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast("Edit resource", {
                    description: "Resource editing opens here in the live build.",
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast("Change status", {
                    description: `${resource.name} status change requires operations approval.`,
                  })
                }
              >
                Change status
              </Button>
              <Button asChild size="sm" variant="outline" className="press">
                <Link to="/bookings">View bookings</Link>
              </Button>
            </div>
          </Panel>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <HealthPanel resource={resource} />
          <LocationPanel resource={resource} />

          <Panel className="p-4 sm:p-5">
            <SectionHeading label="Options" title="Similar resources" />
            <ul className="space-y-2">
              {alternatives.map((a) => (
                <li key={a.resource.id}>
                  <Link
                    to="/resources/$id"
                    params={{ id: a.resource.id }}
                    className="border-border hover:border-border-strong hover:bg-surface-2 lift block rounded-lg border p-3"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{a.resource.name}</span>
                      <MatchScore score={a.score} label="" />
                    </span>
                    <span className="text-meta mt-1 block">
                      {alternativeRationale(resource, a.resource)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <SectionHeading label="Schedule" title="Upcoming bookings" />
            {bookings.length === 0 ? (
              <p className="text-meta">No bookings on record for this resource.</p>
            ) : (
              <ul className="space-y-2.5">
                {bookings.slice(0, 4).map((b) => (
                  <li key={b.id}>
                    <Link
                      to="/bookings/$id"
                      params={{ id: b.id }}
                      className="hover:bg-surface-2 -mx-2 flex items-start justify-between gap-3 rounded-md px-2 py-1.5 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{b.title}</span>
                        <span className="text-meta block">
                          {b.date} · {b.start}–{b.end}
                        </span>
                      </span>
                      <StatusPill tone={statusTone(b.status)}>{b.status}</StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>

      {reserve ? (
        <ReserveDialog
          resource={resource}
          prefill={reserve}
          open={Boolean(reserve)}
          onOpenChange={(v) => !v && setReserve(null)}
        />
      ) : null}
    </div>
  );
}
