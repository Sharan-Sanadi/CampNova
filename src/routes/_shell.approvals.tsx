import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/common/components/button";
import { toast } from "sonner";
import {
  EmptyState,
  PageHeader,
  Panel,
  SectionHeading,
  StatusPill,
} from "@/shared/primitives";
import { getBookings, getPendingApprovals } from "@/data/campus";
import { approvalAssessment, dayLabelFor, decideBooking } from "@/data/bookingEngine";
import { Tag } from "@/shared/primitives";
import { useCampusVersion } from "@/common/lib/useCampus";

export const Route = createFileRoute("/_shell/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — CampusOS AI" },
      {
        name: "description",
        content:
          "AI-assisted approval queue with conflict risk assessment for every pending campus booking request.",
      },
      { property: "og:title", content: "Approvals — CampusOS AI" },
      {
        property: "og:description",
        content: "Operate the approval queue with AI risk assessment.",
      },
    ],
  }),
  component: ApprovalsPage,
});

const riskTone = { Low: "success", Medium: "warning", High: "critical" } as const;

function ApprovalsPage() {
  useCampusVersion();
  const pending = getPendingApprovals();
  const recent = getBookings().filter((b) => b.status === "approved" || b.status === "rejected");

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Approvals"
        subtitle="Each request arrives with a CampusOS assessment so you can decide in seconds, not minutes."
      />

      <section aria-label="Pending approvals" className="mb-8">
        <SectionHeading
          label="Queue"
          title="Pending approvals"
          action={<StatusPill tone="warning">{pending.length} waiting</StatusPill>}
        />
        {pending.length === 0 ? (
          <EmptyState title="Queue is clear" body="No campus requests are waiting on you." />
        ) : (
          <div className="space-y-3">
            {pending.map((b) => {
              const assessment = approvalAssessment(b);
              return (
                <Panel key={b.id} className="p-5">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-muted-foreground/70 text-[11px] tnum">{b.id}</p>
                      <h3 className="mt-1 truncate text-sm font-medium">{b.title}</h3>
                      <p className="text-meta mt-1 truncate tnum">
                        {b.organiser} · {b.resourceName} · {dayLabelFor(b.date)} {b.start}–{b.end} ·{" "}
                        {b.attendees} attendees
                      </p>
                      <p className="text-primary mt-3 inline-flex items-center gap-1.5 text-xs font-medium">
                        <Sparkles className="size-3.5" aria-hidden />
                        CampusOS recommends: {assessment.recommendation}
                      </p>
                      <ul className="text-muted-foreground mt-1.5 space-y-1 text-xs">
                        {assessment.lines.map((l) => (
                          <li key={l}>· {l}</li>
                        ))}
                      </ul>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill tone={riskTone[assessment.risk]}>
                          {assessment.risk} conflict risk
                        </StatusPill>
                        {assessment.checks.slice(0, 3).map((c) => (
                          <Tag key={c.label}>
                            {c.passed ? "\u2713" : "\u2715"} {c.label}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    <Button size="sm" onClick={() => {
                        decideBooking(b.id, "approved");
                        toast.success(`${b.title} approved`);
                      }}>
                      Approve
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/bookings/$id" params={{ id: b.id }}>
                        Review
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                        decideBooking(b.id, "rejected");
                        toast.error(`${b.title} rejected`);
                      }}>
                      Reject
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
          </div>
        )}
      </section>

      <section aria-label="Decision history">
        <SectionHeading label="History" title="Recent decisions" />
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-border text-muted-foreground border-b">
                <th className="px-5 py-3 font-medium">Request</th>
                <th className="px-5 py-3 font-medium">Resource</th>
                <th className="px-5 py-3 font-medium">When</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {recent.map((b) => (
                <tr key={b.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to="/bookings/$id"
                      params={{ id: b.id }}
                      className="font-medium hover:underline"
                    >
                      {b.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">{b.organiser}</span>
                  </td>
                  <td className="text-muted-foreground px-5 py-3">{b.resourceName}</td>
                  <td className="text-muted-foreground px-5 py-3 tnum">
                    {b.date} · {b.start}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill tone={b.status === "approved" ? "success" : "critical"}>
                      {b.status}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>
    </div>
  );
}
