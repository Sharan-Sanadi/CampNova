import { AlertTriangle, CalendarCheck, CheckSquare, Sparkles, Undo2 } from "lucide-react";
import { Panel } from "@/shared/primitives";
import { getActivity } from "@/data/campus";

const iconMap = {
  booking: CalendarCheck,
  release: Undo2,
  approval: CheckSquare,
  conflict: AlertTriangle,
  ai: Sparkles,
} as const;

const toneMap = {
  booking: "text-success",
  release: "text-muted-foreground",
  approval: "text-warning",
  conflict: "text-destructive",
  ai: "text-primary",
} as const;

export function LiveActivity({ limit }: { limit?: number }) {
  const events = limit ? getActivity().slice(0, limit) : getActivity();

  return (
    <Panel className="divide-border divide-y">
      {events.map((e) => {
        const Icon = iconMap[e.kind];
        return (
          <div key={e.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <Icon className={`mt-0.5 size-3.5 shrink-0 ${toneMap[e.kind]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug font-medium">{e.message}</p>
              <p className="text-meta mt-0.5 truncate">{e.detail}</p>
            </div>
            <span className="text-muted-foreground/70 shrink-0 text-[11px] tnum">{e.time}</span>
          </div>
        );
      })}
    </Panel>
  );
}
