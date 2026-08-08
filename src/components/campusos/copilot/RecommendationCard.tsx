import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronDown, Users } from "lucide-react";
import { Panel, StatusPill, Tag, UtilizationBar } from "@/components/campusos/ui/primitives";
import { Button } from "@/components/ui/button";
import type { CopilotAnswer, CopilotCandidate, CopilotEvidence } from "@/data/copilot";
import { cn } from "@/lib/utils";
import { dateForDayLabel } from "@/data/bookingEngine";

function toneText(tone: CopilotEvidence["tone"]) {
  return tone === "success"
    ? "text-success"
    : tone === "warning"
      ? "text-warning"
      : tone === "critical"
        ? "text-destructive"
        : tone === "info"
          ? "text-primary"
          : "text-muted-foreground";
}

export function EvidencePanel({ evidence }: { evidence: CopilotEvidence[] }) {
  const [open, setOpen] = useState(false);
  if (!evidence.length) return null;

  return (
    <div className="border-border mt-5 border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-3 text-left transition-colors"
      >
        <span className="text-label">Why CampusOS recommends this</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <dl className="enter-up divide-border mt-3 divide-y">
          {evidence.map((e) => (
            <div key={e.label} className="grid gap-1 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground text-[12px]">{e.label}</dt>
              <dd className="min-w-0">
                <span className={cn("text-[13px] font-medium tnum", toneText(e.tone))}>
                  {e.value}
                </span>
                <span className="text-meta block">{e.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-meta mt-2">
          {evidence.length} signals checked — capacity, availability, equipment, location,
          utilization and conflict risk.
        </p>
      )}
    </div>
  );
}

export function AlternativeCard({ candidate }: { candidate: CopilotCandidate }) {
  return (
    <Link
      to="/resources/$id"
      params={{ id: candidate.resourceId }}
      className="panel panel-hover flex flex-col gap-2.5 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-medium">{candidate.name}</p>
        <span className="text-muted-foreground shrink-0 text-xs font-medium tnum">
          {candidate.score}%
        </span>
      </div>
      <p className="text-meta">
        {candidate.building} · {candidate.capacity} seats
      </p>
      <UtilizationBar value={candidate.utilization} />
      <p className="text-meta">{candidate.reason}</p>
    </Link>
  );
}

export function RecommendationCard({
  answer,
  onReserve,
  reserved,
}: {
  answer: CopilotAnswer;
  onReserve: () => void;
  reserved: boolean;
}) {
  const best = answer.best;
  if (!best) return null;

  return (
    <div className="space-y-4">
      <Panel className="overflow-hidden">
        <div className="border-border bg-surface-2/60 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-5">
          <p className="text-label text-primary">
            {answer.kind === "conflict" ? "Recommended resolution" : "Best match"}
          </p>
          <span className="text-xs font-medium tnum">{best.score}% match</span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-medium tracking-tight">{best.name}</h3>
              <p className="text-meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5" aria-hidden />
                  {best.building}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden />
                  {best.capacity} seats
                </span>
              </p>
            </div>
            <StatusPill tone={reserved ? "info" : "success"}>
              {reserved ? "Reserved" : "Available"} · {best.availability}
            </StatusPill>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {best.amenities.map((a) => (
              <Tag key={a}>{a}</Tag>
            ))}
          </div>

          <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
            {answer.evidence.slice(0, 4).map((e) => (
              <li key={e.label} className="flex items-start gap-2 text-[13px]">
                <Check className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">
                  {e.label}: <span className="text-muted-foreground">{e.value}</span>
                </span>
              </li>
            ))}
          </ul>

          <EvidencePanel evidence={answer.evidence} />

          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={onReserve} disabled={reserved}>
              {reserved ? "Reservation confirmed" : "Reserve resource"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                to="/bookings"
                search={{
                  compose: true,
                  resource: best.resourceId,
                  date: dateForDayLabel(answer.slot?.dayLabel ?? "Today"),
                  start: answer.slot?.start ?? "14:00",
                  end: answer.slot?.end ?? "16:00",
                }}
              >
                Review booking
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/resources/$id" params={{ id: best.resourceId }}>
                View details
              </Link>
            </Button>
            {answer.alternatives.length ? (
              <Button asChild size="sm" variant="ghost">
                <Link to="/resources">Compare alternatives</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      {answer.alternatives.length ? (
        <div>
          <p className="text-label text-muted-foreground mb-2.5">
            Alternatives ({answer.alternatives.length})
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {answer.alternatives.map((c) => (
              <AlternativeCard key={c.resourceId} candidate={c} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
