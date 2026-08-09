import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/common/components/button";
import { toast } from "sonner";
import {
  EmptyState,
  Panel,
  SectionHeading,
  StatusPill,
  Tag,
  statusTone,
} from "@/shared/primitives";
import {
  BookingLifecycle,
  CheckList,
  MatchScore,
  RecommendationRow,
} from "@/features/bookings/components/pieces";
import {
  BookingComposer,
  type ComposerSeed,
} from "@/features/bookings/components/BookingComposer";
import { useCampusVersion } from "@/common/lib/useCampus";
import {
  approvalAssessment,
  cancelBooking,
  checkAvailability,
  decideBooking,
  durationLabel,
  findAlternatives,
  longDate,
  resolveConflict,
  getBooking,
} from "@/data/bookingEngine";

export const Route = createFileRoute("/_shell/bookings/$id")({
  loader: ({ params }) => {
    const booking = getBooking(params.id);
    if (!booking) throw notFound();
    return { bookingId: booking.id, title: booking.title };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Booking unavailable — CampusOS AI" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const description = `Smart booking intelligence for ${loaderData.title}: conflicts, constraint checks and AI alternatives.`;
    return {
      meta: [
        { title: `${loaderData.title} — CampusOS AI` },
        { name: "description", content: description },
        { property: "og:title", content: `${loaderData.title} — CampusOS AI` },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <EmptyState
      title="Booking not found"
      body="This reservation may have been cancelled or archived."
      action={
        <Button asChild size="sm" variant="outline">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      }
    />
  ),
  component: BookingDetail,
});

function BookingDetail() {
  useCampusVersion();
  const { bookingId } = Route.useLoaderData();
  const booking = getBooking(bookingId);
  const [composerOpen, setComposerOpen] = useState(false);

  if (!booking) {
    return (
      <EmptyState
        title="Booking no longer available"
        body="This reservation was cancelled or removed."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/bookings">Back to bookings</Link>
          </Button>
        }
      />
    );
  }

  const request = {
    resourceId: booking.resourceId,
    date: booking.date,
    start: booking.start,
    end: booking.end,
    attendees: booking.attendees,
    equipment: booking.equipment ?? [],
  };

  const availability = useMemo(
    () => checkAvailability(booking.resourceId, booking.date, booking.start, booking.end, {
      attendees: booking.attendees,
      equipment: booking.equipment ?? [],
      ignoreBookingId: booking.id,
    }),
    [booking.id, booking.resourceId, booking.date, booking.start, booking.end, booking.attendees],
  );

  const alternatives = useMemo(() => findAlternatives(request, 3), [
    booking.id,
    booking.resourceId,
    booking.date,
    booking.start,
  ]);

  const assessment = approvalAssessment(booking);
  const isConflict = booking.status === "conflict";
  const isOpen = booking.status === "pending" || isConflict;

  const seed: ComposerSeed = {
    bookingId: booking.id,
    resourceId: booking.resourceId,
    date: booking.date,
    start: booking.start,
    end: booking.end,
    attendees: booking.attendees,
    title: booking.title,
    step: 1,
    ...(booking.purpose ?? booking.note ? { purpose: booking.purpose ?? booking.note ?? "" } : {}),
  };

  return (
    <div>
      <Link
        to="/bookings"
        className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Bookings
      </Link>

      <header className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-label text-muted-foreground mb-2">{booking.id}</p>
          <h1 className="truncate text-2xl font-medium tracking-tight">{booking.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm tnum">
            {booking.resourceName} · {longDate(booking.date)} · {booking.start}–{booking.end} ·{" "}
            {durationLabel(booking.start, booking.end)} · {booking.attendees} attendees
          </p>
        </div>
        <StatusPill tone={statusTone(booking.status)}>{booking.status}</StatusPill>
      </header>

      <Panel className="mb-6 p-5">
        <BookingLifecycle status={booking.status} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {isConflict ? (
            <Panel className="border-destructive/30 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="text-destructive size-3.5" aria-hidden />
                <p className="text-label text-destructive">Conflict detected</p>
              </div>
              <ul className="space-y-2">
                {availability.conflicts.map((c) => (
                  <li key={c.conflictingBookingId} className="text-[13px]">
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {c.organiser} · overlaps {c.overlap} · {c.severity} severity
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-3 text-sm">
                {alternatives[0]
                  ? `CampusOS recommends moving this booking to ${alternatives[0].resourceName} at ${alternatives[0].start}–${alternatives[0].end}.`
                  : "No clean alternative found — consider splitting the session."}
              </p>
            </Panel>
          ) : null}

          <section aria-label="Constraint checks">
            <SectionHeading
              label="Understanding"
              title="What CampusOS checked"
              action={
                <StatusPill tone={availability.available ? "success" : "critical"}>
                  {availability.available ? "All clear" : "Blocked"}
                </StatusPill>
              }
            />
            <Panel className="p-5">
              <CheckList checks={availability.checks} />
              <div className="border-border mt-4 border-t pt-4">
                <MatchScore match={availability.match} />
              </div>
            </Panel>
          </section>

          <section aria-label="Alternatives">
            <SectionHeading label="Recommendations" title="Better options" />
            {alternatives.length === 0 ? (
              <EmptyState
                title="This is the best slot"
                body="CampusOS found no stronger alternative for this request."
              />
            ) : (
              <div className="space-y-3">
                {alternatives.map((rec, i) => (
                  <RecommendationRow
                    key={rec.id}
                    rec={rec}
                    index={i}
                    applyLabel={isConflict ? "Resolve with this" : "Move booking here"}
                    onApply={(r) => {
                      resolveConflict(booking.id, r);
                      toast.success("Booking updated", {
                        description: `${booking.title} → ${r.resourceName} ${r.start}–${r.end}`,
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-label="Request detail">
            <SectionHeading label="Request" title="Booking detail" />
            <Panel className="divide-border divide-y">
              {[
                ["Organiser", booking.organiser],
                ["Department", booking.department],
                ["Resource", booking.resourceName],
                ["Date", longDate(booking.date)],
                ["Time", `${booking.start}–${booking.end}`],
                ["Attendees", String(booking.attendees)],
                ["Assessment", booking.riskLabel],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-3">
                  <span className="text-muted-foreground text-[13px]">{k}</span>
                  <span className="text-right text-[13px] font-medium">{v}</span>
                </div>
              ))}
            </Panel>
            {booking.purpose || booking.note ? (
              <p className="text-meta mt-3">{booking.purpose ?? booking.note}</p>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <Panel className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="text-primary size-3.5" aria-hidden />
              <p className="text-label text-primary">CampusOS assessment</p>
            </div>
            <p className="text-metric">{assessment.recommendation}</p>
            <p className="text-meta mt-2">{assessment.risk} conflict risk</p>
            <ul className="text-muted-foreground mt-3 space-y-1.5 text-xs">
              {assessment.lines.map((l) => (
                <li key={l}>· {l}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {assessment.checks.slice(0, 4).map((c) => (
                <Tag key={c.label}>
                  {c.passed ? "✓" : "✕"} {c.label}
                </Tag>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {isOpen ? (
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    decideBooking(booking.id, "approved");
                    toast.success(`${booking.title} approved`);
                  }}
                >
                  Approve request
                </Button>
              ) : null}
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                onClick={() => setComposerOpen(true)}
              >
                Modify booking
              </Button>
              {isOpen ? (
                <Button
                  className="w-full"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    decideBooking(booking.id, "rejected");
                    toast.error(`${booking.title} rejected`);
                  }}
                >
                  Reject request
                </Button>
              ) : null}
              {booking.status !== "cancelled" ? (
                <Button
                  className="w-full"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    cancelBooking(booking.id);
                    toast("Booking cancelled", { description: booking.title });
                  }}
                >
                  Cancel booking
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <p className="text-label text-muted-foreground mb-3">Resource</p>
            <p className="text-sm font-medium">{booking.resourceName}</p>
            <Button asChild size="sm" variant="outline" className="mt-4 w-full">
              <Link to="/resources/$id" params={{ id: booking.resourceId }}>
                Open resource intelligence
              </Link>
            </Button>
          </Panel>
        </div>
      </div>

      <BookingComposer open={composerOpen} onOpenChange={setComposerOpen} seed={seed} />
    </div>
  );
}
