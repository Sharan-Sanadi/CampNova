import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import {
  PageHeader,
  Panel,
  SectionHeading,
  UtilizationBar,
} from "@/components/campusos/ui/primitives";
import {
  conflictSeries,
  getResources,
  peakDemandSeries,
  utilizationSeries,
} from "@/data/campus";

export const Route = createFileRoute("/_shell/analytics")({
  head: () => ({
    meta: [
      { title: "Campus Analytics — CampusOS AI" },
      {
        name: "description",
        content:
          "Utilization, booking trends, peak demand and conflict analytics — each chart paired with an AI observation.",
      },
      { property: "og:title", content: "Campus Analytics — CampusOS AI" },
      {
        property: "og:description",
        content: "Meaningful campus analytics, not a wall of charts.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ stroke: "var(--color-border-strong)" }}
      contentStyle={{
        background: "var(--color-popover)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: 12,
        color: "var(--color-popover-foreground)",
      }}
    />
  );
}

function Observation({ text }: { text: string }) {
  return (
    <div className="border-border mt-4 flex items-start gap-2 border-t pt-3">
      <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p className="text-muted-foreground text-xs leading-relaxed">
        <span className="text-primary font-medium">AI observation — </span>
        {text}
      </p>
    </div>
  );
}

function AnalyticsPage() {
  const resources = [...getResources()].sort((a, b) => b.utilization - a.utilization).slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Campus performance"
        subtitle="Six metrics that actually change decisions — each with the reasoning attached."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Resource utilization", "72%", "+4.2% this week"],
          ["Bookings this week", "280", "+9.1% vs last week"],
          ["Conflict rate", "3.1%", "-0.8% this week"],
        ].map(([label, value, delta]) => (
          <Panel key={label} className="p-5">
            <p className="text-label text-muted-foreground">{label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-metric">{value}</span>
              <span className="text-primary text-xs font-medium tnum">{delta}</span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-label="Utilization trend">
          <SectionHeading label="Trend" title="Resource utilization" />
          <Panel className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={utilizationSeries} margin={{ left: -20, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="util" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" {...axis} />
                  <YAxis {...axis} />
                  {ChartTooltip()}
                  <Area
                    type="monotone"
                    dataKey="utilization"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#util)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Observation text="Midweek carries the load: Wednesday peaks at 74% while the weekend drops below 40%. Shifting flexible sessions to Friday would flatten the curve." />
          </Panel>
        </section>

        <section aria-label="Peak demand">
          <SectionHeading label="Distribution" title="Peak demand periods" />
          <Panel className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakDemandSeries} margin={{ left: -20, right: 4, top: 8 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="hour" {...axis} />
                  <YAxis {...axis} />
                  {ChartTooltip()}
                  <Bar dataKey="demand" fill="var(--color-primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Observation text="Demand concentrates between 14:00 and 17:00. Labs carry the highest scheduling pressure in that window." />
          </Panel>
        </section>

        <section aria-label="Booking volume">
          <SectionHeading label="Volume" title="Booking trends" />
          <Panel className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={utilizationSeries} margin={{ left: -20, right: 4, top: 8 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" {...axis} />
                  <YAxis {...axis} />
                  {ChartTooltip()}
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Observation text="Booking volume is up 9.1% week over week, driven almost entirely by student club activity." />
          </Panel>
        </section>

        <section aria-label="Conflict trend">
          <SectionHeading label="Reliability" title="Conflict trends" />
          <Panel className="p-5">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conflictSeries} margin={{ left: -20, right: 4, top: 8 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="week" {...axis} />
                  <YAxis {...axis} />
                  {ChartTooltip()}
                  <Bar dataKey="conflicts" fill="var(--color-chart-3)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="resolved" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Observation text="Resolution now keeps pace with detection. Average time-to-resolution fell to 42 minutes after AI recommendations were enabled." />
          </Panel>
        </section>
      </div>

      <section aria-label="Resource performance" className="mt-6">
        <SectionHeading label="Ranking" title="Resource performance" />
        <Panel className="divide-border divide-y">
          {resources.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{r.name}</p>
                <p className="text-meta truncate">{r.building}</p>
              </div>
              <div className="hidden sm:block">
                <UtilizationBar value={r.utilization} />
              </div>
              <span className="text-sm font-medium tnum">{r.utilization}%</span>
            </div>
          ))}
        </Panel>
      </section>
    </div>
  );
}
