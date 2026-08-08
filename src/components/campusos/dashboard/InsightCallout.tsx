import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Panel } from "@/components/campusos/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getInsights } from "@/data/campus";

export function InsightCallout() {
  const insight = getInsights()[0];
  if (!insight) return null;


  return (
    <Panel className="relative overflow-hidden p-5">
      <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="text-primary size-3.5" aria-hidden />
          <p className="text-label text-primary">AI insight</p>
          <span className="text-muted-foreground/60 text-[11px]">
            {insight.category} · generated 6 min ago
          </span>
        </div>
        <p className="max-w-2xl text-[15px] leading-relaxed font-medium">{insight.explanation}</p>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          CampusOS recommends: {insight.recommendation}
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {insight.evidence.map((e) => (
            <li key={e} className="text-muted-foreground text-xs">
              · {e}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/intelligence">Review recommendation</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast("Insight dismissed", { description: "It will resurface if the signal persists." })}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Panel>
  );
}
