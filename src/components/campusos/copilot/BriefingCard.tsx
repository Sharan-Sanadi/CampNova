import { Link } from "@tanstack/react-router";
import { ArrowRight, Circle } from "lucide-react";
import { Panel } from "@/components/campusos/ui/primitives";
import { EvidencePanel } from "./RecommendationCard";
import type { CopilotAnswer, CopilotFinding } from "@/data/copilot";
import { cn } from "@/lib/utils";

function dotTone(tone: CopilotFinding["tone"]) {
  return tone === "success"
    ? "text-success"
    : tone === "warning"
      ? "text-warning"
      : tone === "critical"
        ? "text-destructive"
        : "text-primary";
}

/** Briefing / conflict / no-match answers: findings + evidence, no chat bubbles. */
export function BriefingCard({ answer }: { answer: CopilotAnswer }) {
  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-label text-primary">
        {answer.kind === "no-match" ? "No exact match" : answer.intentLabel}
      </p>
      <h3 className="mt-2 text-lg leading-snug font-medium tracking-tight">{answer.headline}</h3>
      <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">{answer.summary}</p>

      {answer.findings.length ? (
        <ul className="divide-border border-border mt-5 divide-y border-t">
          {answer.findings.map((f) => (
            <li key={f.title} className="py-3">
              <div className="flex items-start gap-2.5">
                <Circle
                  className={cn("mt-1 size-2.5 shrink-0 fill-current", dotTone(f.tone))}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{f.title}</p>
                  <p className="text-meta mt-1">{f.detail}</p>
                  {f.link ? (
                    <Link
                      to={f.link.to}
                      params={{ id: f.link.id }}
                      className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                    >
                      {f.link.label}
                      <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <EvidencePanel evidence={answer.evidence} />
    </Panel>
  );
}
