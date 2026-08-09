import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/common/components/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusPill,
  Tag,
  UtilizationBar,
  statusTone,
} from "@/shared/primitives";
import { MatchScore } from "@/features/resources/components/intelligence";
import {
  getResourceProfile,
  parseResourceQuery,
  scoreResource,
  type ResourceProfile,
} from "@/data/resources";

export const Route = createFileRoute("/_shell/resources/compare")({
  validateSearch: (search: Record<string, unknown>) => ({
    ids: typeof search["ids"] === "string" ? search["ids"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Compare resources — CampusOS AI" },
      {
        name: "description",
        content:
          "Compare campus resources side by side on capacity, availability, equipment, utilization and demand.",
      },
      { property: "og:title", content: "Compare resources — CampusOS AI" },
      {
        property: "og:description",
        content: "Side-by-side resource comparison across the signals that decide a booking.",
      },
    ],
  }),
  component: ComparePage,
});

const statusLabel = (s: string) =>
  s === "in-use" ? "In use" : s === "maintenance" ? "Maintenance" : "Available";

function ComparePage() {
  const { ids } = Route.useSearch() as { ids: string };
  const resources = ids
    .split(",")
    .map((id) => getResourceProfile(id.trim()))
    .filter((r): r is ResourceProfile => Boolean(r))
    .slice(0, 3);

  const baseQuery = parseResourceQuery("");

  if (resources.length < 2) {
    return (
      <div>
        <PageHeader eyebrow="Resource intelligence" title="Compare resources" />
        <EmptyState
          title="Pick at least two resources"
          body="Select resources from the discovery console using the Compare action on each result."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/resources">Back to resources</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const rows: { label: string; render: (r: ResourceProfile) => React.ReactNode }[] = [
    { label: "Type", render: (r) => <span className="text-sm">{r.type}</span> },
    {
      label: "Location",
      render: (r) => (
        <span className="text-sm">
          {r.building} · {r.floor}
        </span>
      ),
    },
    { label: "Capacity", render: (r) => <span className="tnum text-sm font-medium">{r.capacity} seats</span> },
    {
      label: "Availability",
      render: (r) => <StatusPill tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusPill>,
    },
    {
      label: "Equipment",
      render: (r) => (
        <span className="flex flex-wrap gap-1.5">
          {r.equipment.map((e) => (
            <Tag key={e}>{e}</Tag>
          ))}
        </span>
      ),
    },
    {
      label: "Utilization",
      render: (r) => (
        <span className="block w-full">
          <span className="tnum mb-1.5 block text-sm font-medium">{r.utilization}%</span>
          <UtilizationBar value={r.utilization} />
        </span>
      ),
    },
    {
      label: "Demand (afternoon)",
      render: (r) => <span className="tnum text-sm">{r.demandByPart[1]!.value}%</span>,
    },
    { label: "Booking pressure", render: (r) => <span className="text-sm">{r.bookingPressure}</span> },
    { label: "Distance", render: (r) => <span className="text-sm">{r.walkMinutes} min walk</span> },
    {
      label: "Accessibility",
      render: (r) => (
        <span className="text-sm">{r.accessibility.wheelchair ? "Wheelchair accessible" : "Stair access only"}</span>
      ),
    },
    { label: "Health score", render: (r) => <span className="tnum text-sm">{r.healthScore} / 100</span> },
  ];

  return (
    <div>
      <Link
        to="/resources"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Resources
      </Link>

      <PageHeader
        eyebrow="Resource intelligence"
        title="Compare resources"
        subtitle="The signals that decide a booking, side by side."
      />

      <Panel className="enter-up overflow-x-auto p-0">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <caption className="sr-only">Resource comparison</caption>
          <thead>
            <tr className="border-border border-b">
              <th scope="col" className="text-label text-muted-foreground w-40 px-5 py-4 font-medium">
                Signal
              </th>
              {resources.map((r) => {
                const match = scoreResource(r, baseQuery);
                return (
                  <th key={r.id} scope="col" className="min-w-[12rem] px-5 py-4 align-top">
                    <Link
                      to="/resources/$id"
                      params={{ id: r.id }}
                      className="hover:text-primary block text-sm font-medium transition-colors"
                    >
                      {r.name}
                    </Link>
                    <span className="mt-1 block">
                      <MatchScore score={match.score} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-border border-b last:border-b-0">
                <th
                  scope="row"
                  className="text-muted-foreground px-5 py-3.5 align-top text-xs font-medium"
                >
                  {row.label}
                </th>
                {resources.map((r) => (
                  <td key={r.id} className="px-5 py-3.5 align-top">
                    {row.render(r)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-5 py-4" />
              {resources.map((r) => (
                <td key={r.id} className="px-5 py-4">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/resources/$id" params={{ id: r.id }}>
                      Open resource
                    </Link>
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
