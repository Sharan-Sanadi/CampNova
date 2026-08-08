import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useCampusVersion } from "@/lib/useCampus";
import {
  PageHeader,
  Panel,
  SectionHeading,
  StatusPill,
} from "@/components/campusos/ui/primitives";
import { CampusClock } from "@/components/campusos/layout/CampusClock";
import {
  AskCampusOS,
  CampusHealthPanel,
  CampusPulseChart,
  CrossSystemChain,
  IntelAlert,
  OpportunityList,
  PredictionCard,
  RecommendationList,
  RiskList,
  SignalFeed,
  SignalMetric,
} from "@/components/campusos/intelligence/pieces";
import {
  INTEL_FILTERS,
  TIME_SCOPES,
  getCampusHealthReport,
  getCampusOpportunities,
  getCampusPredictions,
  getCampusPulse,
  getCampusRecommendations,
  getCampusRisks,
  getCampusSignals,
  getCrossSystemChain,
  getFeaturedPrediction,
  getSignalMetrics,
  type IntelFilter,
  type TimeScope,
} from "@/data/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/intelligence")({
  head: () => ({
    meta: [
      { title: "Campus Intelligence — CampusOS AI" },
      {
        name: "description",
        content:
          "Understand what is happening across campus before it becomes a problem: live signals, predictions, risks, opportunities and recommended actions.",
      },
      { property: "og:title", content: "Campus Intelligence — CampusOS AI" },
      {
        property: "og:description",
        content: "The predictive operations layer behind CampusOS.",
      },
    ],
  }),
  component: IntelligencePage,
});

const domainOf = (f: IntelFilter) => f.toLowerCase();

function FilterRow<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "border-border rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
            value === o.id
              ? "bg-surface-2 text-foreground border-border-strong"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IntelligencePage() {
  useCampusVersion();
  const [filter, setFilter] = useState<IntelFilter>("All");
  const [scope, setScope] = useState<TimeScope>("today");

  const featured = getFeaturedPrediction();
  const health = getCampusHealthReport();

  const inScope = <T extends { scope: TimeScope[] }>(items: T[]) =>
    items.filter((i) => i.scope.includes(scope));

  const signals = useMemo(() => {
    const base = inScope(getCampusSignals());
    if (filter === "All") return base;
    if (filter === "Risks") return base.filter((s) => s.severity !== "low");
    if (filter === "Opportunities") return base.filter((s) => s.followUpLabel === "Opportunity");
    return base.filter((s) => s.domain === domainOf(filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, scope]);

  const predictions = useMemo(() => {
    const base = inScope(getCampusPredictions());
    if (filter === "All" || filter === "Risks" || filter === "Opportunities") return base;
    return base.filter((p) => p.domain === domainOf(filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, scope]);

  const risks = useMemo(() => {
    const base = inScope(getCampusRisks());
    if (filter === "All" || filter === "Risks") return base;
    if (filter === "Opportunities") return [];
    return base.filter((r) => r.domain === domainOf(filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, scope]);

  const opportunities = useMemo(() => {
    const base = inScope(getCampusOpportunities());
    if (filter === "All" || filter === "Opportunities") return base;
    if (filter === "Risks") return [];
    return base.filter((o) => o.domain === domainOf(filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, scope]);

  return (
    <div>
      <PageHeader
        eyebrow="Campus intelligence"
        title="Campus Intelligence"
        subtitle="Understand what is happening across campus — before it becomes a problem."
        actions={
          <div className="flex items-center gap-2">
            <span className="border-border flex items-center gap-2 rounded-md border px-2.5 py-1.5">
              <StatusPill tone="success" className="border-0 bg-transparent px-0">
                Operational
              </StatusPill>
            </span>
            <CampusClock className="hidden sm:block" label="Campus" />
          </div>
        }
      />

      {/* Filters + time context */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FilterRow
          label="Intelligence filters"
          options={INTEL_FILTERS.map((f) => ({ id: f, label: f }))}
          value={filter}
          onChange={setFilter}
        />
        <FilterRow label="Time context" options={TIME_SCOPES} value={scope} onChange={setScope} />
      </div>

      {/* Key campus signals */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {getSignalMetrics().map((m, i) => (
          <SignalMetric key={m.label} {...m} index={i} />
        ))}
      </div>

      {/* DEMO MOMENT — featured prediction */}
      <section aria-label="Headline prediction" className="mb-8">
        <SectionHeading
          label="What's next"
          title="CampusOS detected increased scheduling pressure tomorrow"
          action={<StatusPill tone="critical">Priority</StatusPill>}
        />
        <PredictionCard prediction={featured} featured />
      </section>

      <div className="mb-8">
        <CampusPulseChart points={getCampusPulse()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <section aria-label="Intelligence feed">
            <SectionHeading
              label="Observe · understand · detect"
              title="Intelligence feed"
              action={<StatusPill tone="info">{signals.length} active</StatusPill>}
            />
            {signals.length ? (
              <SignalFeed signals={signals} />
            ) : (
              <Panel className="px-5 py-10 text-center">
                <p className="text-sm font-medium">No signals in this view</p>
                <p className="text-meta mt-1.5">Try another filter or time context.</p>
              </Panel>
            )}
          </section>

          <section aria-label="Predictive operations">
            <SectionHeading label="Predict" title="Predictive operations" />
            <div className="space-y-3">
              {predictions.map((p, i) => (
                <PredictionCard key={p.id} prediction={p} index={i} />
              ))}
            </div>
            <div className="mt-3">
              <IntelAlert>
                Predictions are deterministic demo intelligence generated inside CampusOS. They are
                not live model output — the intelligence service boundary is ready for a real AI
                backend.
              </IntelAlert>
            </div>
          </section>

          <section aria-label="Recommended actions">
            <SectionHeading
              label="Recommend · act"
              title="Recommended actions"
              action={<AskCampusOS question="Summarise today's campus recommendations." />}
            />
            <RecommendationList items={getCampusRecommendations()} />
          </section>
        </div>

        <div className="space-y-6">
          <section aria-label="Risks to watch">
            <SectionHeading label="Detect" title="Risks to watch" />
            {risks.length ? (
              <RiskList risks={risks} />
            ) : (
              <Panel className="px-5 py-8 text-center">
                <p className="text-meta">No risks match this view.</p>
              </Panel>
            )}
          </section>

          <section aria-label="Opportunities">
            <SectionHeading label="Proactive" title="Opportunities" />
            {opportunities.length ? (
              <OpportunityList items={opportunities} />
            ) : (
              <Panel className="px-5 py-8 text-center">
                <p className="text-meta">No opportunities match this view.</p>
              </Panel>
            )}
          </section>

          <CampusHealthPanel overall={health.overall} categories={health.categories} />

          <CrossSystemChain chain={getCrossSystemChain()} />

          <Panel className="p-5">
            <p className="text-label text-primary mb-2">Human control</p>
            <p className="text-sm leading-relaxed">
              CampusOS operates in <span className="font-medium">advisory mode</span>. Every
              recommendation requires an operator to review, resolve or ignore it — nothing is
              actioned automatically.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/settings">Configure autonomy</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/analytics">See the data</Link>
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
