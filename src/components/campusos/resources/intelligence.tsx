import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Footprints,
  Info,
  Lightbulb,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Panel,
  SectionHeading,
  Sparkline,
  StatusPill,
  Tag,
  type Tone,
} from "@/components/campusos/ui/primitives";
import type {
  InsightSeverity,
  MatchResult,
  ResourceInsight,
  ResourceProfile,
} from "@/data/resources";

/* ── Match score ─────────────────────────────────────────── */

export function MatchScore({
  score,
  size = "sm",
  label = "match",
}: {
  score: number;
  size?: "sm" | "lg";
  label?: string;
}) {
  const tone = score >= 85 ? "text-success" : score >= 65 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-medium tnum", tone)}>
      <span className={size === "lg" ? "text-2xl" : "text-sm"}>{score}%</span>
      <span className="text-muted-foreground text-[11px] font-normal">{label}</span>
    </span>
  );
}

export function MatchReasons({ result }: { result: MatchResult }) {
  return (
    <ul className="space-y-2">
      {result.reasons.map((r) => (
        <li key={r.label} className="flex items-start gap-2.5 text-sm">
          {r.met ? (
            <Check className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0">
            <span className={cn("font-medium", !r.met && "text-muted-foreground")}>{r.label}</span>
            {r.detail ? <span className="text-meta block">{r.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Demand bars ─────────────────────────────────────────── */

export function DemandBars({
  data,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  ariaLabel: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 100);
  return (
    <div className="flex items-end gap-2" role="img" aria-label={ariaLabel}>
      {data.map((d) => {
        const tone =
          d.value >= 85 ? "bg-destructive" : d.value >= 65 ? "bg-warning" : "bg-primary/70";
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="bg-surface-2 flex h-24 w-full items-end overflow-hidden rounded-md">
              <div
                className={cn("w-full rounded-md transition-all duration-500", tone)}
                style={{ height: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground truncate text-[11px]">{d.label}</span>
            <span className="tnum text-[11px] font-medium">{d.value}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Insights ────────────────────────────────────────────── */

const severityTone: Record<InsightSeverity, Tone> = {
  critical: "critical",
  warning: "warning",
  info: "info",
  positive: "success",
};

const severityIcon: Record<InsightSeverity, typeof Info> = {
  critical: AlertTriangle,
  warning: TrendingUp,
  info: Info,
  positive: Lightbulb,
};

export function InsightRow({ insight }: { insight: ResourceInsight }) {
  const Icon = severityIcon[insight.severity];
  const tone = severityTone[insight.severity];
  const accent =
    tone === "critical"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-primary";
  return (
    <div className="border-border border-t py-3.5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 size-4 shrink-0", accent)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{insight.title}</p>
            <Tag>{insight.type}</Tag>
            <span className="text-meta ml-auto shrink-0">Confidence {insight.confidence}%</span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {insight.description}
          </p>
          <div className="mt-2.5 grid gap-1.5">
            <p className="border-primary/40 bg-primary-soft/60 text-foreground/90 rounded-md border-l-2 px-2.5 py-1.5 text-xs leading-relaxed">
              <span className="text-primary text-label mr-2">Recommendation</span>
              {insight.recommendation}
            </p>
            {insight.severity === "critical" || insight.severity === "warning" ? (
              <p
                className={cn(
                  "rounded-md border-l-2 px-2.5 py-1.5 text-xs leading-relaxed",
                  insight.severity === "critical"
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-warning/50 bg-warning/10",
                )}
              >
                <span className={cn("text-label mr-2", accent)}>Risk</span>
                {insight.severity === "critical"
                  ? "Unresolved — likely to affect scheduled sessions."
                  : "Monitor — booking pressure may escalate this week."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Health ──────────────────────────────────────────────── */

function healthTone(label: string): Tone {
  switch (label) {
    case "Excellent":
    case "Healthy":
    case "Normal":
    case "Low":
      return "success";
    case "Elevated":
    case "Moderate":
    case "Scheduled":
      return "warning";
    case "High":
    case "In progress":
      return "critical";
    default:
      return "neutral";
  }
}

export function HealthPanel({ resource }: { resource: ResourceProfile }) {
  const trend = resource.trend;
  const inverse = [...trend].reverse();
  const rising = resource.trendDelta >= 0;

  const rows: {
    label: string;
    value: string;
    note: string;
    direction?: "up" | "down";
    series?: number[];
  }[] = [
    {
      label: "Availability",
      value:
        resource.status === "available" ? "Excellent" : resource.status === "in-use" ? "Moderate" : "High",
      note: resource.status === "available" ? "Free right now" : "Occupied in current slot",
    },
    {
      label: "Utilization",
      value: resource.utilization >= 80 ? "Elevated" : resource.utilization >= 45 ? "Healthy" : "Low",
      note: Math.abs(resource.trendDelta) < 3 ? "Utilization stable" : rising ? "Trending upward" : "Easing off",
      direction: rising ? "up" : "down",
      series: trend,
    },
    {
      label: "Booking pressure",
      value: resource.bookingPressure,
      note:
        resource.bookingPressure === "High" || resource.bookingPressure === "Elevated"
          ? "Booking pressure rising"
          : "Comfortable headroom",
      direction: resource.bookingPressure === "Low" ? "down" : "up",
      series: inverse,
    },
    {
      label: "Conflict rate",
      value: `${resource.conflictRate}%`,
      note: resource.conflictRate >= 2.5 ? "Above campus median" : "Within tolerance",
      direction: resource.conflictRate >= 2.5 ? "up" : "down",
    },
    {
      label: "Cancellations",
      value: `${resource.cancellationRate}%`,
      note: resource.cancellationRate >= 8 ? "Recovery slots often free" : "Reliable bookings",
      direction: resource.cancellationRate >= 8 ? "up" : "down",
    },
    {
      label: "Maintenance",
      value: resource.maintenance,
      note: resource.maintenance === "Normal" ? "No open work orders" : "Work order in queue",
    },
  ];

  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading label="Diagnostics" title="System diagnostics" />
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-metric">{resource.healthScore}</span>
          <span className="text-muted-foreground text-sm">/ 100</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium tnum",
            rising ? "text-warning" : "text-success",
          )}
        >
          {rising ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )}
          {resource.trendDelta > 0 ? "+" : ""}
          {resource.trendDelta}% wk
        </span>
      </div>
      <dl className="divide-border divide-y">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <dt className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground truncate">{r.label}</span>
                {r.direction ? (
                  r.direction === "up" ? (
                    <ArrowUp className="text-muted-foreground/70 size-3 shrink-0" aria-hidden />
                  ) : (
                    <ArrowDown className="text-muted-foreground/70 size-3 shrink-0" aria-hidden />
                  )
                ) : null}
              </dt>
              <dd className="text-meta truncate">{r.note}</dd>
            </div>
            {r.series ? (
              <span className="hidden w-14 shrink-0 sm:block">
                <Sparkline values={r.series} tone="muted" />
              </span>
            ) : null}
            <dd className="shrink-0">
              <StatusPill tone={healthTone(r.value)}>{r.value}</StatusPill>
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ── Location ────────────────────────────────────────────── */

export function LocationPanel({ resource }: { resource: ResourceProfile }) {
  const floors = [
    { name: "Level 1", use: "Classrooms & teaching rooms" },
    { name: "Level 2", use: "Laboratories" },
    { name: "Level 3", use: "Innovation & research spaces" },
    { name: "Ground", use: "Halls, reception & stores" },
  ];
  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading label="Orientation" title="Location context" />

      {/* Mini map placeholder */}
      <div
        aria-label={`Map preview for ${resource.building}`}
        role="img"
        className="border-border bg-surface-2 relative mb-3 h-24 overflow-hidden rounded-lg border"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--color-border) 90%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-border) 90%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        <span
          aria-hidden
          className="bg-primary/20 absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
        />
        <span
          aria-hidden
          className="border-primary/25 absolute top-1/2 left-1/2 h-px w-full -translate-y-1/2 border-t border-dashed"
        />
        <span className="border-primary/40 bg-primary-soft absolute top-1/2 left-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border">
          <MapPin className="text-primary size-4" aria-hidden />
        </span>
        <span className="border-border bg-surface text-meta absolute top-1.5 right-2 rounded border px-1.5 py-0.5">
          {resource.floor}
        </span>

        <span className="text-meta absolute bottom-1.5 left-2">{resource.building}</span>
      </div>

      <div className="border-border mb-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <span className="min-w-0">
          <span className="text-label text-muted-foreground block">Walking distance</span>
          <span className="text-muted-foreground text-[11px]">from the central quad</span>
        </span>
        <span className="flex shrink-0 items-baseline gap-1">
          <Footprints className="text-primary size-3.5 self-center" aria-hidden />
          <span className="tnum text-xl font-medium tracking-tight">{resource.walkMinutes}</span>
          <span className="text-muted-foreground text-xs">min</span>
        </span>
      </div>

      <ul className="space-y-1">
        {floors.map((f) => {
          const active = resource.floor.toLowerCase().includes(f.name.toLowerCase());
          return (
            <li
              key={f.name}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              <span className="font-medium">{f.name}</span>
              <span className="truncate">{f.use}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── Ask CampusOS ────────────────────────────────────────── */

export function AskCampusOS({
  prompt,
  children,
  className,
}: {
  prompt: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to="/copilot"
      search={{ q: prompt }}
      className={cn(
        "border-border bg-surface hover:border-border-strong hover:bg-surface-2 text-foreground/90 hover:text-foreground inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        className,
      )}
    >
      <Sparkles className="text-primary size-3.5" aria-hidden />
      {children}
    </Link>
  );
}
