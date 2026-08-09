import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, GitCompare } from "lucide-react";
import { cn } from "@/common/lib/utils";
import {
  Sparkline,
  StatusPill,
  Tag,
  UtilizationBar,
  statusTone,
} from "@/shared/primitives";
import { MatchScore } from "./intelligence";
import type { MatchResult } from "@/data/resources";

const statusLabel = (s: string) =>
  s === "in-use" ? "In use" : s === "maintenance" ? "Maintenance" : "Available now";

export function ResourceResultCard({
  result,
  index = 0,
  showScore,
  compared,
  onCompare,
  onReserve,
}: {
  result: MatchResult;
  index?: number;
  showScore?: boolean;
  compared?: boolean;
  onCompare?: () => void;
  onReserve?: () => void;
}) {
  const r = result.resource;
  return (
    <article
      className="panel panel-hover enter-up flex flex-col p-4 sm:p-5"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            <Link
              to="/resources/$id"
              params={{ id: r.id }}
              className="hover:text-primary transition-colors after:absolute after:inset-0 after:content-['']"
            >
              {r.name}
            </Link>
          </h3>
          <p className="text-meta mt-1 truncate">
            {r.type} · {r.building} · {r.floor}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusPill tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusPill>
          {showScore ? <MatchScore score={result.score} /> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Tag className="text-foreground/80">{r.capacity} seats</Tag>
        {r.equipment.slice(0, 3).map((e) => (
          <Tag key={e}>{e}</Tag>
        ))}
        {r.equipment.length > 3 ? <Tag>+{r.equipment.length - 3}</Tag> : null}
      </div>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-label text-muted-foreground">Weekly utilization</span>
          <span className="tnum text-sm font-medium">{r.utilization}%</span>
        </div>
        <UtilizationBar value={r.utilization} />

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-meta truncate">
            {r.nextBooking ? `Next · ${r.nextBooking}` : "No upcoming bookings"}
          </span>
          <Sparkline values={r.trend} className="w-14" />
        </div>

        <div className="border-border relative z-10 mt-4 flex items-center gap-2 border-t pt-3">
          <Link
            to="/resources/$id"
            params={{ id: r.id }}
            className="border-border hover:border-border-strong hover:bg-surface-2 inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
          >
            View resource <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
          {onReserve ? (
            <button
              onClick={onReserve}
              disabled={r.status === "maintenance"}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-9 items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            >
              Reserve
            </button>
          ) : null}
          {onCompare ? (
            <button
              onClick={onCompare}
              aria-pressed={compared}
              className={cn(
                "ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                compared
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong",
              )}
            >
              {compared ? <Check className="size-3.5" aria-hidden /> : <GitCompare className="size-3.5" aria-hidden />}
              Compare
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
