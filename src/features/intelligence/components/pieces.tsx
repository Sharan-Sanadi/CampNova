import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/button";
import { Panel, StatusPill } from "@/shared/primitives";
import { cn } from "@/common/lib/utils";
import {
  askCampusOSLink,
  severityLabel,
  severityTone,
  type CampusOpportunity,
  type CampusPrediction,
  type CampusRecommendation,
  type CampusRisk,
  type CampusSignal,
  type PulsePoint,
} from "@/data/intelligence";

/* ---------------------------------------------------------------- */
/* Shared small pieces                                              */
/* ---------------------------------------------------------------- */

export function AskCampusOS({ question, className }: { question: string; className?: string }) {
  const link = askCampusOSLink(question);
  return (
    <Button asChild size="sm" variant="ghost" className={className}>
      <Link to={link.to} search={link.search}>
        <Sparkles className="size-3.5" aria-hidden />
        Ask CampusOS
      </Link>
    </Button>
  );
}

function ResourceLink({ id, label }: { id: string; label: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <Link to="/resources/$id" params={{ id }}>
        {label}
      </Link>
    </Button>
  );
}

export function SignalMetric({
  label,
  value,
  meaning,
  index = 0,
}: {
  label: string;
  value: string;
  meaning: string;
  index?: number;
}) {
  return (
    <Panel className="enter-up p-4" style={{ animationDelay: `${index * 40}ms` }}>
      <p className="text-label text-muted-foreground">{label}</p>
      <p className="tnum mt-2.5 text-xl font-medium tracking-tight">{value}</p>
      <p className="text-meta mt-1.5">{meaning}</p>
    </Panel>
  );
}

/* ---------------------------------------------------------------- */
/* Campus pulse                                                     */
/* ---------------------------------------------------------------- */

const pulseTone = (level: PulsePoint["level"]) =>
  level === "High" ? "bg-warning" : level === "Moderate" ? "bg-primary" : "bg-primary/45";

export function CampusPulseChart({ points }: { points: PulsePoint[] }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-label text-muted-foreground">Campus pulse</p>
          <p className="mt-1 text-sm">How active the campus is across the day</p>
        </div>
        <StatusPill tone="warning">Peak 14:00</StatusPill>
      </div>
      <div className="flex items-end gap-2 sm:gap-3">
        {points.map((p, i) => (
          <div key={p.time} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-muted-foreground tnum text-[10px]">{p.value}</span>
            <div className="bg-surface-2 flex h-28 w-full items-end overflow-hidden rounded-md">
              <div
                className={cn("w-full rounded-md transition-all duration-500", pulseTone(p.level))}
                style={{ height: `${p.value}%`, transitionDelay: `${i * 40}ms` }}
              />
            </div>
            <span className="tnum text-[11px] font-medium">{p.time}</span>
            <span className="text-muted-foreground truncate text-[10px]">{p.level}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- */
/* Intelligence feed                                                */
/* ---------------------------------------------------------------- */

const signalVerb = (t: CampusSignal["type"]) =>
  t === "detected" ? "CampusOS detected" : t === "observed" ? "CampusOS observed" : "CampusOS predicts";

export function SignalFeed({ signals }: { signals: CampusSignal[] }) {
  return (
    <div className="space-y-3">
      {signals.map((s, i) => (
        <Panel key={s.id} className="enter-up p-5" style={{ animationDelay: `${i * 45}ms` }}>
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <StatusPill tone={severityTone(s.severity)}>{signalVerb(s.type)}</StatusPill>
            <span className="text-muted-foreground/70 text-[11px]">
              {s.source} · {s.minutesAgo} min ago
            </span>
          </div>
          <h3 className="text-sm font-medium">{s.title}</h3>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{s.description}</p>
          <div className="border-border mt-3.5 flex gap-2.5 border-t pt-3">
            <ArrowRight className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p className="text-[13px]">
              <span className="text-primary font-medium">{s.followUpLabel} — </span>
              {s.followUp}
            </p>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {s.relatedResource ? <ResourceLink id={s.relatedResource} label="Open resource" /> : null}
            <Button asChild size="sm" variant="ghost">
              <Link to="/bookings">View bookings</Link>
            </Button>
            <AskCampusOS question={s.askCampusOS} />
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Predictions — "What's next"                                      */
/* ---------------------------------------------------------------- */

export function PredictionCard({
  prediction,
  featured,
  index = 0,
}: {
  prediction: CampusPrediction;
  featured?: boolean;
  index?: number;
}) {
  const [open, setOpen] = useState(Boolean(featured));
  const p = prediction;

  return (
    <Panel
      className={cn("enter-up p-5", featured && "border-border-strong")}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={severityTone(p.severity)}>{p.category}</StatusPill>
        <span className="text-muted-foreground text-[11px]">
          {p.when} · {p.timeRange}
        </span>
        <span className="text-muted-foreground/70 ml-auto text-[11px]">
          Confidence: {p.confidence}
        </span>
      </div>

      <p className="text-[15px] font-medium tracking-tight">
        {p.severity === "low" ? (
          <TrendingDown className="text-primary mr-1.5 inline size-4" aria-hidden />
        ) : (
          <TrendingUp className="text-warning mr-1.5 inline size-4" aria-hidden />
        )}
        {p.deltaLabel}
      </p>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        CampusOS estimates this from current requests. {p.reason}
      </p>

      <dl className="border-border mt-4 grid grid-cols-3 gap-3 border-t pt-3.5">
        {[
          ["Observed", p.observed],
          ["Expected", p.expectedValue],
          ["Baseline", p.baseline],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-label text-muted-foreground">{k}</dt>
            <dd className="tnum mt-1 text-[13px] font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-label text-muted-foreground mr-1">Affected</span>
        {p.affected.map((a) => (
          <span
            key={a}
            className="border-border text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px]"
          >
            {a}
          </span>
        ))}
      </div>

      <p className="mt-4 text-[13px]">
        <span className="text-primary font-medium">CampusOS recommends — </span>
        {p.recommendation}
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground mt-3 text-[11px] font-medium tracking-wide uppercase transition-colors"
      >
        {open ? "Hide explanation" : "Why this matters"}
      </button>

      {open ? (
        <div className="border-border enter-up mt-3 space-y-3 border-t pt-3.5">
          <div>
            <p className="text-label text-muted-foreground mb-1.5">What CampusOS observed</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {p.observed} against a baseline of {p.baseline}.
            </p>
          </div>
          <div>
            <p className="text-label text-muted-foreground mb-1.5">What CampusOS expects</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {p.expectedValue} in the {p.timeRange} window ({p.confidence.toLowerCase()} confidence).
            </p>
          </div>
          <div>
            <p className="text-label text-muted-foreground mb-1.5">Why this recommendation</p>
            <ul className="space-y-1">
              {p.why.map((w) => (
                <li key={w} className="text-muted-foreground text-xs">
                  ✓ {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {p.relatedResource ? <ResourceLink id={p.relatedResource} label="Review resource" /> : null}
        <Button asChild size="sm" variant="ghost">
          <Link to="/bookings">View bookings</Link>
        </Button>
        <AskCampusOS question={p.askCampusOS} />
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- */
/* Risks                                                            */
/* ---------------------------------------------------------------- */

export function RiskList({ risks }: { risks: CampusRisk[] }) {
  return (
    <Panel className="divide-border divide-y">
      {risks.map((r) => (
        <div key={r.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={severityTone(r.severity)}>{severityLabel(r.severity)}</StatusPill>
            <p className="text-[13px] font-medium">{r.title}</p>
            <span className="text-muted-foreground/70 text-[11px]">{r.area}</span>
          </div>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            {r.window} — {r.reason}
          </p>
          <p className="mt-2 text-xs">
            <span className="text-primary font-medium">Recommendation — </span>
            {r.recommendation}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.relatedResource ? <ResourceLink id={r.relatedResource} label="View" /> : null}
            <Button asChild size="sm" variant="ghost">
              <Link to="/bookings">Resolve</Link>
            </Button>
            <AskCampusOS question={r.askCampusOS} />
          </div>
        </div>
      ))}
    </Panel>
  );
}

/* ---------------------------------------------------------------- */
/* Opportunities                                                    */
/* ---------------------------------------------------------------- */

export function OpportunityList({ items }: { items: CampusOpportunity[] }) {
  return (
    <div className="space-y-3">
      {items.map((o, i) => (
        <Panel key={o.id} className="enter-up p-5" style={{ animationDelay: `${i * 45}ms` }}>
          <div className="flex gap-2.5">
            <Lightbulb className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{o.title}</p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{o.detail}</p>
              <p className="text-meta mt-2">Potential impact — {o.impact}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.relatedResource && o.actionLabel === "View resource" ? (
                  <ResourceLink id={o.relatedResource} label="View resource" />
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/bookings">Explore bookings</Link>
                  </Button>
                )}
                <AskCampusOS question={o.askCampusOS} />
              </div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Recommended actions                                              */
/* ---------------------------------------------------------------- */

export function RecommendationList({ items }: { items: CampusRecommendation[] }) {
  return (
    <Panel className="divide-border divide-y">
      {items.map((r, i) => (
        <div key={r.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
          <span className="border-border text-muted-foreground tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border text-[11px]">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">{r.title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{r.reason}</p>
            <p className="text-meta mt-1.5">{r.impact}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {r.relatedResource && r.actionLabel !== "Resolve" ? (
              <ResourceLink id={r.relatedResource} label={r.actionLabel} />
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link to="/bookings">{r.actionLabel}</Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast.success("Marked for review", { description: r.title })}
            >
              Acknowledge
            </Button>
          </div>
        </div>
      ))}
    </Panel>
  );
}

/* ---------------------------------------------------------------- */
/* Campus health + cross-system chain                               */
/* ---------------------------------------------------------------- */

export function CampusHealthPanel({
  overall,
  categories,
}: {
  overall: number;
  categories: { label: string; score: number }[];
}) {
  return (
    <Panel className="p-5">
      <p className="text-label text-muted-foreground">Campus health</p>
      <p className="tnum text-success mt-2.5 text-3xl font-medium tracking-tight">
        {overall}
        <span className="text-muted-foreground ml-1 text-sm font-normal">/ 100</span>
      </p>
      <div className="mt-4 space-y-2.5">
        {categories.map((c) => (
          <div key={c.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-xs">{c.label}</span>
              <span className="tnum text-xs font-medium">{c.score}</span>
            </div>
            <div className="bg-surface-2 h-[3px] w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${c.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function CrossSystemChain({
  chain,
}: {
  chain: { step: string; value: string; source: string }[];
}) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="text-primary size-3.5" aria-hidden />
        <p className="text-label text-primary">CampusOS connects the dots</p>
      </div>
      <ol className="space-y-0">
        {chain.map((c, i) => (
          <li key={c.step} className="relative pb-4 pl-6 last:pb-0">
            {i < chain.length - 1 ? (
              <span className="bg-border absolute top-2 left-[5px] h-full w-px" aria-hidden />
            ) : null}
            <span className="bg-primary absolute top-1.5 left-0 size-[11px] rounded-full border-[3px] border-[var(--color-card)]" aria-hidden />
            <p className="text-label text-muted-foreground">{c.step}</p>
            <p className="mt-0.5 text-[13px] font-medium">{c.value}</p>
            <p className="text-meta">{c.source}</p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function IntelAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface-2 flex gap-2.5 rounded-md border px-4 py-3">
      <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p className="text-muted-foreground text-xs leading-relaxed">{children}</p>
    </div>
  );
}
