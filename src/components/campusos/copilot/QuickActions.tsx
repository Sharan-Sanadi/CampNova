import { AlertTriangle, BarChart3, CalendarPlus, FileText, Search, ArrowRight } from "lucide-react";
import { copilotCommands, copilotQuickActions } from "@/data/copilot";

const icons = {
  search: Search,
  calendar: CalendarPlus,
  alert: AlertTriangle,
  chart: BarChart3,
  file: FileText,
};

export function QuickActions({ onRun }: { onRun: (prompt: string) => void }) {
  return (
    <div>
      <p className="text-label text-muted-foreground/80 mb-3">Start with</p>
      <div className="flex flex-wrap gap-2">
        {copilotQuickActions.map((a) => {
          const Icon = icons[a.icon];
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => onRun(a.prompt)}
              className="border-border bg-surface hover:border-border-strong hover:bg-surface-2 text-foreground/90 hover:text-foreground inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150"
            >
              <Icon className="text-muted-foreground size-3.5" aria-hidden />
              {a.label}
            </button>
          );
        })}
      </div>

      <p className="text-label text-muted-foreground/80 mt-8 mb-2">Or try</p>
      <ul className="divide-border border-border divide-y border-t">
        {copilotCommands.slice(0, 4).map((c) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => onRun(c)}
              className="text-muted-foreground hover:text-foreground group flex w-full items-center justify-between gap-3 py-2.5 text-left text-[13px] transition-colors"
            >
              <span className="min-w-0 truncate">{c}</span>
              <ArrowRight
                className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
