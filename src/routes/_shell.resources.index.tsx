import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  GitCompare,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  EmptyState,
  PageHeader,
  Panel,
  SectionHeading,
  StatusPill,
  Tag,
} from "@/shared/primitives";
import { Input } from "@/common/components/input";
import { Button } from "@/common/components/button";
import { Checkbox } from "@/common/components/checkbox";
import { Slider } from "@/common/components/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/popover";
import { Skeleton } from "@/common/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { ResourceResultCard } from "@/features/resources/components/ResourceResultCard";
import { AskCampusOS, MatchReasons, MatchScore } from "@/features/resources/components/intelligence";
import { ReserveDialog } from "@/features/resources/components/ReserveDialog";
import {
  EQUIPMENT_OPTIONS,
  buildings,
  exampleQueries,
  matchResources,
  parseResourceQuery,
  resourceCategories,
  resourceFleetSummary,
  type MatchResult,
  type ResourceProfile,
} from "@/data/resources";
import type { ResourceType } from "@/data/campus";

export const Route = createFileRoute("/_shell/resources/")({
  head: () => ({
    meta: [
      { title: "Resource Intelligence — CampusOS AI" },
      {
        name: "description",
        content:
          "Discover, compare and reserve campus spaces with live availability, utilization and AI matching.",
      },
      { property: "og:title", content: "Resource Intelligence — CampusOS AI" },
      {
        property: "og:description",
        content:
          "A campus resource discovery console: natural-language search, AI matching, demand and availability intelligence.",
      },
    ],
  }),
  component: ResourcesPage,
});

type SortKey = "match" | "availability" | "capacity" | "utilization" | "distance" | "demand";

const sortLabels: Record<SortKey, string> = {
  match: "Best match",
  availability: "Availability",
  capacity: "Capacity",
  utilization: "Utilization",
  distance: "Distance",
  demand: "Demand",
};

function ResourcesPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searching, setSearching] = useState(false);

  const [types, setTypes] = useState<ResourceType[]>([]);
  const [minCapacity, setMinCapacity] = useState(0);
  const [building, setBuilding] = useState("all");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("match");
  const [compare, setCompare] = useState<string[]>([]);
  const [reserveFor, setReserveFor] = useState<ResourceProfile | null>(null);

  const fleet = resourceFleetSummary();
  const categories = resourceCategories();

  useEffect(() => {
    if (!submitted) return;
    setSearching(true);
    const t = window.setTimeout(() => setSearching(false), 260);
    return () => window.clearTimeout(t);
  }, [submitted]);

  const query = useMemo(() => parseResourceQuery(submitted), [submitted]);

  const scored = useMemo<MatchResult[]>(() => {
    const merged = {
      ...query,
      capacity: minCapacity > 0 ? Math.max(minCapacity, query.capacity ?? 0) : query.capacity,
      equipment: [...new Set([...query.equipment, ...equipment])],
      type: types.length === 1 ? types[0]! : query.type,
      accessible: query.accessible || accessibleOnly,
    };
    return matchResources(merged);
  }, [query, minCapacity, equipment, types, accessibleOnly]);

  const results = useMemo(() => {
    const words = submitted.toLowerCase();
    const filtered = scored.filter(({ resource: r }) => {
      if (types.length && !types.includes(r.type)) return false;
      if (minCapacity > 0 && r.capacity < minCapacity) return false;
      if (building !== "all" && r.building !== building) return false;
      if (equipment.length && !equipment.every((e) => r.equipment.includes(e))) return false;
      if (availableOnly && r.status !== "available") return false;
      if (accessibleOnly && !r.accessibility.wheelchair) return false;
      if (words && !query.capacity && !query.type && !query.equipment.length) {
        const hay = `${r.name} ${r.type} ${r.building} ${r.amenities.join(" ")}`.toLowerCase();
        if (!hay.includes(words)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "availability":
          return (
            Number(b.resource.status === "available") - Number(a.resource.status === "available") ||
            b.score - a.score
          );
        case "capacity":
          return b.resource.capacity - a.resource.capacity;
        case "utilization":
          return a.resource.utilization - b.resource.utilization;
        case "distance":
          return a.resource.walkMinutes - b.resource.walkMinutes;
        case "demand":
          return b.resource.demandByPart[1]!.value - a.resource.demandByPart[1]!.value;
        default:
          return b.score - a.score;
      }
    });
    return sorted;
  }, [scored, types, minCapacity, building, equipment, availableOnly, accessibleOnly, sort, submitted, query]);

  const hasRequirements =
    Boolean(query.capacity || query.type || query.equipment.length || query.start) ;
  const best = hasRequirements && results.length ? results[0]! : null;
  const alternatives = best ? results.slice(1, 4) : [];

  const activeFilters: { label: string; clear: () => void }[] = [
    ...types.map((t) => ({ label: t, clear: () => setTypes((v) => v.filter((x) => x !== t)) })),
    ...(minCapacity > 0 ? [{ label: `${minCapacity}+ seats`, clear: () => setMinCapacity(0) }] : []),
    ...(building !== "all" ? [{ label: building, clear: () => setBuilding("all") }] : []),
    ...equipment.map((e) => ({
      label: e,
      clear: () => setEquipment((v) => v.filter((x) => x !== e)),
    })),
    ...(availableOnly ? [{ label: "Available now", clear: () => setAvailableOnly(false) }] : []),
    ...(accessibleOnly ? [{ label: "Accessible", clear: () => setAccessibleOnly(false) }] : []),
  ];

  const clearAll = () => {
    setTypes([]);
    setMinCapacity(0);
    setBuilding("all");
    setEquipment([]);
    setAvailableOnly(false);
    setAccessibleOnly(false);
  };

  const relax = () => {
    setMinCapacity(0);
    setEquipment([]);
    setAvailableOnly(false);
  };

  const toggleCompare = (id: string) =>
    setCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );

  return (
    <div className="pb-20">
      <PageHeader
        eyebrow="Resource intelligence"
        title="Resources"
        subtitle="Find the right space, facility or equipment for what you need — with availability, utilization and demand explained."
        actions={
          <AskCampusOS prompt="Find me a 60-seat lab tomorrow from 2–4 PM with a projector.">
            Ask CampusOS
          </AskCampusOS>
        }
      />

      {/* Fleet summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Bookable resources", value: String(fleet.total), meaning: `${categories.length} categories` },
          { label: "Available now", value: String(fleet.availableNow), meaning: "Free for immediate use" },
          { label: "Average utilization", value: `${fleet.avgUtilization}%`, meaning: "Across the fleet this week" },
          { label: "Under pressure", value: String(fleet.pressured), meaning: "Elevated or high demand" },
        ].map((m, i) => (
          <div key={m.label} className="panel enter-up p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-label text-muted-foreground">{m.label}</p>
            <p className="text-metric mt-2">{m.value}</p>
            <p className="text-meta mt-1.5">{m.meaning}</p>
          </div>
        ))}
      </div>

      {/* Search surface */}
      <Panel className="mb-5 p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(text);
          }}
        >
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!e.target.value) setSubmitted("");
              }}
              placeholder="Search rooms, labs, auditoriums, equipment…"
              aria-label="Search resources in natural language"
              className="bg-surface h-11 pr-24 pl-9"
            />
            <Button type="submit" size="sm" className="absolute top-1/2 right-1.5 -translate-y-1/2">
              Search
            </Button>
          </div>
        </form>

        <p className="text-meta mt-2.5 flex items-center gap-1.5">
          <Sparkles className="text-primary size-3" aria-hidden />
          Natural language supported — describe what you need and CampusOS matches it.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {exampleQueries.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setText(q);
                setSubmitted(q);
              }}
              className="border-border text-muted-foreground hover:text-foreground hover:border-border-strong rounded-full border px-3 py-1 text-[11px] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="border-border mt-4 flex flex-wrap items-center gap-1.5 border-t pt-4">
          <Popover>
            <PopoverTrigger className="border-border text-muted-foreground hover:text-foreground hover:border-border-strong inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors">
              <SlidersHorizontal className="size-3.5" aria-hidden /> Type
              {types.length ? <span className="text-primary">· {types.length}</span> : null}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-3">
              <p className="text-label text-muted-foreground mb-2">Resource type</p>
              <div className="space-y-2">
                {categories.map((c) => (
                  <label key={c.type} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={types.includes(c.type)}
                      onCheckedChange={() =>
                        setTypes((v) =>
                          v.includes(c.type) ? v.filter((x) => x !== c.type) : [...v, c.type],
                        )
                      }
                    />
                    <span className="flex-1">{c.type}</span>
                    <span className="text-muted-foreground tnum text-xs">{c.count}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className="border-border text-muted-foreground hover:text-foreground hover:border-border-strong inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors">
              Capacity{minCapacity ? <span className="text-primary">· {minCapacity}+</span> : null}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-label text-muted-foreground">Minimum capacity</p>
                <span className="tnum text-sm font-medium">{minCapacity || "Any"}</span>
              </div>
              <Slider
                value={[minCapacity]}
                onValueChange={([v]) => setMinCapacity(v ?? 0)}
                max={300}
                step={10}
                aria-label="Minimum capacity"
              />
            </PopoverContent>
          </Popover>

          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger className="text-muted-foreground h-9 w-auto gap-1.5 text-xs" aria-label="Building">
              <SelectValue placeholder="Building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {buildings().map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger className="border-border text-muted-foreground hover:text-foreground hover:border-border-strong inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors">
              Equipment
              {equipment.length ? <span className="text-primary">· {equipment.length}</span> : null}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-3">
              <p className="text-label text-muted-foreground mb-2">Required equipment</p>
              <div className="space-y-2">
                {EQUIPMENT_OPTIONS.map((e) => (
                  <label key={e} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={equipment.includes(e)}
                      onCheckedChange={() =>
                        setEquipment((v) => (v.includes(e) ? v.filter((x) => x !== e) : [...v, e]))
                      }
                    />
                    {e}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setAvailableOnly((v) => !v)}
            aria-pressed={availableOnly}
            className={`min-h-9 rounded-md border px-3 text-xs font-medium transition-colors ${
              availableOnly
                ? "border-success/40 text-success bg-success/10"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
          >
            Available now
          </button>
          <button
            onClick={() => setAccessibleOnly((v) => !v)}
            aria-pressed={accessibleOnly}
            className={`min-h-9 rounded-md border px-3 text-xs font-medium transition-colors ${
              accessibleOnly
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
          >
            Accessible
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-label text-muted-foreground hidden sm:inline">Sort</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-[9.5rem] text-xs" aria-label="Sort results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {sortLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilters.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <button
                key={f.label}
                onClick={f.clear}
                className="border-border bg-surface-2 text-foreground/80 hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
              >
                {f.label}
                <X className="size-3" aria-hidden />
              </button>
            ))}
            <button
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground px-1.5 text-[11px] font-medium underline-offset-2 transition-colors hover:underline"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </Panel>

      {/* Interpretation of the request */}
      {submitted && hasRequirements ? (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <span className="text-label text-muted-foreground">CampusOS understood</span>
          {query.capacity ? <Tag className="text-foreground/80">{query.capacity}+ seats</Tag> : null}
          {query.type ? <Tag className="text-foreground/80">{query.type}</Tag> : null}
          {query.equipment.map((e) => (
            <Tag key={e} className="text-foreground/80">
              {e}
            </Tag>
          ))}
          {query.start ? (
            <Tag className="text-foreground/80">
              {query.dayLabel ?? "Today"} · {query.start}–{query.end}
            </Tag>
          ) : null}
          {query.accessible ? <Tag className="text-foreground/80">Accessible</Tag> : null}
        </div>
      ) : null}

      {/* Best match */}
      {searching ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search className="size-5" aria-hidden />}
          title="No resources match all your requirements"
          body="Try reducing the capacity requirement, removing an equipment filter, or expanding the time window."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={relax}>
                Relax requirements
              </Button>
              <AskCampusOS prompt={submitted || "Find me an available room this afternoon."}>
                Ask CampusOS to find one
              </AskCampusOS>
            </div>
          }
        />
      ) : (
        <>
          {best ? (
            <Panel className="border-primary/30 enter-up mb-5 p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-label text-primary mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="size-3" aria-hidden /> Best match
                  </p>
                  <h2 className="text-lg font-medium tracking-tight">{best.resource.name}</h2>
                  <p className="text-meta mt-1">
                    {best.resource.building} · {best.resource.floor} · {best.resource.capacity} seats ·{" "}
                    {best.resource.walkMinutes} min walk
                  </p>
                </div>
                <div className="text-right">
                  <MatchScore score={best.score} size="lg" />
                  <p className="text-meta mt-1">{best.conflictRisk} conflict risk</p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                  <p className="text-label text-muted-foreground mb-2.5">Why this resource</p>
                  <MatchReasons result={best} />
                </div>
                <div className="space-y-3">
                  <StatusPill tone={best.resource.status === "available" ? "success" : "warning"}>
                    {best.availability}
                  </StatusPill>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setReserveFor(best.resource)}>
                      Reserve
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/resources/$id" params={{ id: best.resource.id }}>
                        View resource
                      </Link>
                    </Button>
                  </div>
                  <AskCampusOS
                    prompt={`Why is ${best.resource.name} recommended for: ${submitted}`}
                    className="w-full justify-center"
                  >
                    Ask CampusOS why
                  </AskCampusOS>
                </div>
              </div>

              {alternatives.length ? (
                <div className="border-border mt-5 border-t pt-4">
                  <p className="text-label text-muted-foreground mb-2.5">Alternatives</p>
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {alternatives.map((a) => (
                      <li key={a.resource.id}>
                        <Link
                          to="/resources/$id"
                          params={{ id: a.resource.id }}
                          className="border-border hover:border-border-strong hover:bg-surface-2 flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{a.resource.name}</span>
                            <span className="text-meta block truncate">
                              {a.resource.capacity} seats · {a.resource.building}
                            </span>
                          </span>
                          <MatchScore score={a.score} label="" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>
          ) : null}

          <SectionHeading
            label={`${results.length} resources`}
            title={sortLabels[sort]}
            action={
              compare.length >= 2 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate({ to: "/resources/compare", search: { ids: compare.join(",") } })}
                >
                  <GitCompare className="size-3.5" aria-hidden /> Compare {compare.length}
                </Button>
              ) : null
            }
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.map((r, i) => (
              <ResourceResultCard
                key={r.resource.id}
                result={r}
                index={i}
                showScore={hasRequirements}
                compared={compare.includes(r.resource.id)}
                onCompare={() => toggleCompare(r.resource.id)}
                onReserve={() => setReserveFor(r.resource)}
              />
            ))}
          </div>
        </>
      )}

      {/* Compare tray */}
      {compare.length ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className="border-border bg-surface/95 mx-auto flex max-w-2xl items-center gap-3 rounded-xl border p-2.5 shadow-lg backdrop-blur-md">
            <span className="text-muted-foreground pl-1.5 text-xs">
              {compare.length} selected {compare.length === 1 ? "· pick one more" : ""}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCompare([])}>
                Clear
              </Button>
              <Button
                size="sm"
                disabled={compare.length < 2}
                onClick={() => navigate({ to: "/resources/compare", search: { ids: compare.join(",") } })}
              >
                Compare <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {reserveFor ? (
        <ReserveDialog
          resource={reserveFor}
          prefill={{
            day: query.dayLabel ?? "Today",
            start: query.start ?? "14:00",
            end: query.end ?? "16:00",
            ...(query.capacity ? { attendees: query.capacity } : {}),
          }}
          open={Boolean(reserveFor)}
          onOpenChange={(v) => !v && setReserveFor(null)}
        />
      ) : null}
    </div>
  );
}
