import { Panel, StatusDot } from "@/components/campusos/ui/primitives";
import { todaySchedule } from "@/data/campus";

const toneMap = {
  info: "info",
  critical: "critical",
  warning: "warning",
  default: "neutral",
} as const;

export function OperationsTimeline() {
  return (
    <Panel className="divide-border divide-y">
      {todaySchedule.map((item) => (
        <div
          key={item.time + item.title}
          className="hover:bg-surface-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-4 py-3.5 transition-colors sm:px-5"
        >
          <span className="text-muted-foreground w-12 text-xs font-medium tnum">{item.time}</span>
          <div className="flex min-w-0 items-center gap-3">
            <StatusDot tone={toneMap[item.tone]} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="text-meta truncate">{item.place}</p>
            </div>
          </div>
        </div>
      ))}
    </Panel>
  );
}
