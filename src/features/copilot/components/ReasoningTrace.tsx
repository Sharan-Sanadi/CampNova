import { Check, Loader2, Circle } from "lucide-react";
import { Panel } from "@/shared/primitives";
import type { CopilotAnswer } from "@/data/copilot";
import { cn } from "@/common/lib/utils";

export function UnderstandingBlock({ answer }: { answer: CopilotAnswer }) {
  return (
    <div className="border-border grid gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-2">
      {answer.requirements.map((r) => (
        <div key={r.label} className="min-w-0">
          <p className="text-label text-muted-foreground/80">{r.label}</p>
          <p className="mt-1 truncate text-[13px] font-medium">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Combined thinking / searching / reasoning trace. Reads like an operational
 * system log rather than a chat typing indicator.
 */
export function ReasoningTrace({
  answer,
  stage,
  done,
}: {
  answer: CopilotAnswer | null;
  stage: number;
  done: boolean;
}) {
  const stages = answer?.stages ?? [
    { label: "Understanding request", detail: "parsing intent and constraints" },
  ];

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label text-muted-foreground flex items-center gap-2">
          {done ? (
            <Check className="text-success size-3.5" aria-hidden />
          ) : (
            <Loader2 className="text-primary size-3.5 animate-spin" aria-hidden />
          )}
          {done ? "Reasoning complete" : (stages[Math.min(stage, stages.length - 1)]?.label ?? "Working")}
        </p>
        {answer && done ? (
          <p className="text-meta tnum">
            {answer.evaluated} evaluated · {answer.matched} matched
          </p>
        ) : null}
      </div>

      <ol className="mt-4 space-y-2.5" aria-live="polite">
        {stages.map((s, i) => {
          const complete = done || i < stage;
          const active = !done && i === stage;
          if (!complete && !active) {
            return (
              <li key={s.label} className="flex items-start gap-2.5 opacity-45">
                <Circle className="text-muted-foreground/50 mt-1 size-3 shrink-0" aria-hidden />
                <span className="text-muted-foreground text-[13px]">{s.label}</span>
              </li>
            );
          }
          return (
            <li key={s.label} className="flex items-start gap-2.5">
              {complete ? (
                <Check className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
              ) : (
                <Loader2 className="text-primary mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden />
              )}
              <span className="min-w-0">
                <span className={cn("text-[13px]", active ? "font-medium" : "font-medium")}>
                  {s.label}
                </span>
                <span className="text-meta block font-mono text-[11px]">{s.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {answer && done ? <UnderstandingBlock answer={answer} /> : null}
    </Panel>
  );
}
