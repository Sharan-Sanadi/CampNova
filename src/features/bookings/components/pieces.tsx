import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/common/lib/utils";
import { Button } from "@/common/components/button";
import {
  Panel,
  StatusPill,
  Tag,
  statusTone,
  type Tone,
} from "@/shared/primitives";
import type { Booking } from "@/data/campus";
import {
  LIFECYCLE_STEPS,
  dayLabelFor,
  durationLabel,
  lifecycleIndex,
  type BookingCheck,
  type BookingRecommendation,
  type MatchBreakdown,
} from "@/data/bookingEngine";

/* Booking Intelligence presentation pieces — all styling comes from the
   existing CampusOS design system. No booking-specific visual identity. */

export function SignalRow({ signals }: { signals: { label: string; value: string }[] }) {
  return (
    <div className="border-border bg-surface grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4">
      {signals.map((s, i) => (
        <div key={s.label} className="bg-surface enter-up p-4" style={{ animationDelay: `${i * 50}ms` }}>
          <p className="text-metric tnum">{s.value}</p>
          <p className="text-label text-muted-foreground mt-1.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function CheckList({ checks }: { checks: BookingCheck[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-2.5 text-[13px]">
          {c.passed ? (
            <Check className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
          ) : (
            <X className="text-destructive mt-0.5 size-3.5 shrink-0" aria-hidden />
          )}
          <span className="min-w-0">
            <span className="font-medium">{c.label}</span>
            <span className="text-muted-foreground"> — {c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MatchScore({ match, compact }: { match: MatchBreakdown; compact?: boolean }) {
  const tone: Tone = match.total >= 85 ? "success" : match.total >= 65 ? "info" : "warning";
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-metric tnum">{match.total}%</span>
        <span className="text-label text-muted-foreground">match</span>
        <StatusPill tone={match.risk === "Low" ? "success" : match.risk === "Medium" ? "warning" : "critical"} className="ml-auto">
          {match.risk} conflict risk
        </StatusPill>
      </div>
      {compact ? null : (
        <dl className="mt-4 space-y-2.5">
          {match.parts.map((p) => (
            <div key={p.label}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[13px]">{p.label}</dt>
                <dd className="tnum text-[13px] font-medium">{Math.round(p.value)}%</dd>
              </div>
              <div className="bg-surface-2 mt-1 h-1 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    tone === "success" ? "bg-success" : tone === "info" ? "bg-primary" : "bg-warning",
                  )}
                  style={{ width: `${Math.min(100, p.value)}%` }}
                />
              </div>
              <p className="text-meta mt-1">{p.note}</p>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function BookingLifecycle({ status }: { status: Booking["status"] }) {
  const current = lifecycleIndex(status);
  const halted = status === "cancelled" || status === "rejected";
  return (
    <ol className="space-y-0">
      {LIFECYCLE_STEPS.map((step, i) => {
        const done = !halted && i < current;
        const active = !halted && i === current;
        return (
          <li key={step} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-1 grid size-4 place-items-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary-soft"
                    : done
                      ? "border-success bg-success/15"
                      : "border-border bg-surface-2",
                )}
              >
                {done ? <Check className="text-success size-2.5" /> : null}
                {active ? <span className="bg-primary size-1.5 rounded-full" /> : null}
              </span>
              {i < LIFECYCLE_STEPS.length - 1 ? (
                <span className={cn("my-1 w-px flex-1", done ? "bg-success/40" : "bg-border")} />
              ) : null}
            </div>
            <div className="pb-4">
              <p className={cn("text-[13px]", active ? "font-medium" : done ? "" : "text-muted-foreground")}>
                {step}
              </p>
              {active ? <p className="text-meta mt-0.5">Current state</p> : null}
            </div>
          </li>
        );
      })}
      {halted ? (
        <li className="text-destructive flex items-center gap-2 text-[13px] font-medium">
          <AlertTriangle className="size-3.5" aria-hidden /> {status === "cancelled" ? "Cancelled" : "Rejected"}
        </li>
      ) : null}
    </ol>
  );
}

export function PressureMeter({
  label,
  value,
  level,
}: {
  label: string;
  value: number;
  level: "Low" | "Moderate" | "High";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px]">{label}</span>
        <span
          className={cn(
            "text-label",
            level === "High" ? "text-destructive" : level === "Moderate" ? "text-warning" : "text-success",
          )}
        >
          {level}
        </span>
      </div>
      <div className="bg-surface-2 mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            level === "High" ? "bg-destructive" : level === "Moderate" ? "bg-warning" : "bg-success",
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function RecommendationRow({
  rec,
  onApply,
  applyLabel = "Use recommendation",
  index = 0,
}: {
  rec: BookingRecommendation;
  onApply?: (rec: BookingRecommendation) => void;
  applyLabel?: string;
  index?: number;
}) {
  return (
    <Panel className="enter-up p-4 sm:p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label text-primary flex items-center gap-1.5">
            <Sparkles className="size-3" aria-hidden />
            {rec.typeLabel}
          </p>
          <p className="mt-1.5 truncate text-sm font-medium">{rec.resourceName}</p>
          <p className="text-meta tnum mt-1">
            {rec.dayLabel} · {rec.start}–{rec.end} · {durationLabel(rec.start, rec.end)} · {rec.capacity} seats
          </p>
        </div>
        <div className="text-right">
          <p className="tnum text-lg font-medium">{rec.score}%</p>
          <p className="text-label text-muted-foreground">match</p>
        </div>
      </div>
      <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">{rec.rationale}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {rec.reasons.map((r) => (
          <li key={r} className="flex items-start gap-2 text-xs">
            <Check className="text-success mt-0.5 size-3 shrink-0" aria-hidden />
            {r}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onApply ? (
          <Button size="sm" onClick={() => onApply(rec)}>
            {applyLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link to="/resources/$id" params={{ id: rec.resourceId }}>
            View resource
          </Link>
        </Button>
        <Tag className="ml-auto">{rec.risk} risk</Tag>
      </div>
    </Panel>
  );
}

export function BookingCard({
  booking,
  index = 0,
  footer,
}: {
  booking: Booking;
  index?: number;
  footer?: ReactNode;
}) {
  return (
    <div className="panel panel-hover enter-up min-w-0 p-5" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground/70 text-[11px] tnum">{booking.id}</p>
          <Link
            to="/bookings/$id"
            params={{ id: booking.id }}
            className="hover:text-primary mt-1 block truncate text-sm font-medium transition-colors"
          >
            {booking.title}
          </Link>
        </div>
        <StatusPill tone={statusTone(booking.status)}>{booking.status}</StatusPill>
      </div>
      <p className="text-meta mt-3 truncate">{booking.resourceName}</p>
      <p className="text-meta mt-1 tnum">
        {dayLabelFor(booking.date)} · {booking.start}–{booking.end} · {booking.attendees} attendees
      </p>
      <div className="border-border text-muted-foreground mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
        <span className="truncate">
          {booking.organiser} · {booking.department}
        </span>
        {footer ? <span className="ml-auto flex shrink-0 gap-1.5">{footer}</span> : null}
      </div>
    </div>
  );
}