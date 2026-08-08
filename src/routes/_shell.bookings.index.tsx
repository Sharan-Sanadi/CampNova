import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  EmptyState,
  PageHeader,
  Panel,
  SectionHeading,
  StatusPill,
  Tag,
  statusTone,
} from "@/components/campusos/ui/primitives";
import {
  BookingCard,
  PressureMeter,
  RecommendationRow,
  SignalRow,
} from "@/components/campusos/bookings/pieces";
import { ScheduleBoard } from "@/components/campusos/bookings/ScheduleBoard";
import { SmartBookingSearch } from "@/components/campusos/bookings/SmartBookingSearch";
import {
  BookingComposer,
  type ComposerSeed,
} from "@/components/campusos/bookings/BookingComposer";
import { useCampusVersion } from "@/lib/useCampus";
import {
  approvalAssessment,
  bookingInsights,
  bookingPressure,
  bookingSignals,
  campusToday,
  dayLabelFor,
  decideBooking,
  findAlternatives,
  getBookings,
  getConflictedBookings,
  getMyBookings,
  recommendTimes,
  resolveConflict,
  type BookingRecommendation,
} from "@/data/bookingEngine";

type BookingsSearch = {
  compose?: boolean | undefined;
  resource?: string | undefined;
  date?: string | undefined;
  start?: string | undefined;
  end?: string | undefined;
  attendees?: number | undefined;
  purpose?: string | undefined;
  title?: string | undefined;
  tab?: string | undefined;
};

export const Route = createFileRoute("/_shell/bookings/")({
  validateSearch: (search: Record<string, unknown>): BookingsSearch => {
    const str = (k: string) => (typeof search[k] === "string" ? (search[k] as string) : undefined);
    const num = Number(search["attendees"]);
    return {
      compose: search["compose"] === true || search["compose"] === "1" ? true : undefined,
      resource: str("resource"),
      date: str("date"),
      start: str("start"),
      end: str("end"),
      attendees: Number.isFinite(num) && num > 0 ? num : undefined,
      purpose: str("purpose"),
      title: str("title"),
      tab: str("tab"),
    };
  },
  head: () => ({
    meta: [
      { title: "Smart Bookings — CampusOS AI" },
      {
        name: "description",
        content:
          "Schedule campus resources with conflict detection, approval workflow and AI-assisted resolution.",
      },
      { property: "og:title", content: "Smart Bookings — CampusOS AI" },
      {
        property: "og:description",
        content: "AI-assisted scheduling across every campus resource.",
      },
    ],
  }),
  component: BookingsPage,
});

const TABS = ["Schedule", "My bookings", "Pending", "Conflicts", "Recommendations"] as const;
type Tab = (typeof TABS)[number];

function BookingsPage() {
  useCampusVersion();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(
    (TABS.find((t) => t.toLowerCase() === (search.tab ?? "").toLowerCase()) ?? "Schedule") as Tab,
  );
  const [seed, setSeed] = useState<ComposerSeed | null>(
    search.compose
      ? {
          resourceId: search.resource ?? null,
          date: search.date ?? campusToday(),
          start: search.start ?? "14:00",
          end: search.end ?? "16:00",
          attendees: search.attendees ?? 40,
          purpose: search.purpose ?? "",
          title: search.title ?? "",
          step: 3,
        }
      : null,
  );
  const [composerOpen, setComposerOpen] = useState(Boolean(search.compose));

  const openComposer = useCallback((next: ComposerSeed) => {
    setSeed(next);
    setComposerOpen(true);
  }, []);

  const closeComposer = useCallback(
    (open: boolean) => {
      setComposerOpen(open);
      if (!open && search.compose) void navigate({ to: "/bookings", search: {}, replace: true });
    },
    [navigate, search.compose],
  );

  const all = getBookings();
  const signals = bookingSignals();
  const pressure = useMemo(() => bookingPressure(), [all.length]);
  const conflicts = getConflictedBookings();
  const pending = all.filter((b) => b.status === "pending");
  const mine = getMyBookings();
  const insights = bookingInsights();

  const recommendations = useMemo<BookingRecommendation[]>(() => {
    const fromConflicts = conflicts.flatMap((c) =>
      findAlternatives(
        {
          resourceId: c.resourceId,
          date: c.date,
          start: c.start,
          end: c.end,
          attendees: c.attendees,
          equipment: c.equipment ?? [],
        },
        2,
      ),
    );
    const fromTimes = recommendTimes("computer-lab-04", campusToday(), { limit: 2 });
    const seen = new Set<string>();
    return [...fromConflicts, ...fromTimes].filter((r) => !seen.has(r.id) && seen.add(r.id));
  }, [conflicts.length, all.length]);

  const primaryConflict = conflicts[0];
  const conflictFix = primaryConflict
    ? findAlternatives(
        {
          resourceId: primaryConflict.resourceId,
          date: primaryConflict.date,
          start: primaryConflict.start,
          end: primaryConflict.end,
          attendees: primaryConflict.attendees,
          equipment: primaryConflict.equipment ?? [],
        },
        3,
      )
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Smart booking intelligence"
        title="Bookings"
        subtitle="Coordinate campus resources without the scheduling friction."
        actions={
          <Button size="sm" onClick={() => openComposer({ step: 0 })}>
            <CalendarPlus className="size-4" aria-hidden />
            New booking
          </Button>
        }
      />

      <div className="mb-6">
        <SignalRow signals={signals} />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SmartBookingSearch
          onRequest={(parsed) =>
            openComposer({
              resourceId: parsed.resourceId,
              date: parsed.date,
              start: parsed.start,
              end: parsed.end,
              attendees: parsed.capacity ?? 40,
              capacity: parsed.capacity,
              equipment: parsed.equipment,
              title: parsed.title,
              purpose: parsed.text,
              step: parsed.resourceId ? 3 : 0,
            })
          }
        />
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="text-primary size-3.5" aria-hidden />
            <p className="text-label text-primary">Booking pressure</p>
          </div>
          <p className="text-metric tnum">{pressure.overall}%</p>
          <p className="text-meta mt-1">
            {pressure.level} campus-wide · peak {pressure.peakWindow}
          </p>
          <div className="mt-4 space-y-2.5">
            {pressure.hotResources.map((r) => (
              <PressureMeter
                key={r.name}
                label={r.name}
                value={r.value}
                level={r.value >= 70 ? "High" : r.value >= 45 ? "Moderate" : "Low"}
              />
            ))}
          </div>
          <ul className="border-border text-muted-foreground mt-4 space-y-1.5 border-t pt-3 text-xs">
            {insights.slice(0, 2).map((i) => (
              <li key={i}>· {i}</li>
            ))}
          </ul>
        </Panel>
      </div>

      {primaryConflict ? (
        <Panel className="border-destructive/30 enter-up mb-8 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="text-destructive size-3.5" aria-hidden />
            <p className="text-label text-destructive">Scheduling conflict</p>
          </div>
          <p className="text-sm font-medium">
            {primaryConflict.resourceName} · {primaryConflict.start}–{primaryConflict.end} —{" "}
            {conflicts.length} overlapping request{conflicts.length > 1 ? "s" : ""}.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {conflictFix[0]
              ? `CampusOS recommendation: move ${primaryConflict.title} to ${conflictFix[0].resourceName} at ${conflictFix[0].start}–${conflictFix[0].end}.`
              : "CampusOS is evaluating resolution options."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {conflictFix[0] ? (
              <Button
                size="sm"
                onClick={() => {
                  resolveConflict(primaryConflict.id, conflictFix[0]!);
                  toast.success("Conflict resolved", {
                    description: `${primaryConflict.title} moved to ${conflictFix[0]!.resourceName}.`,
                  });
                }}
              >
                Use recommendation
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => setTab("Conflicts")}>
              View alternatives
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/bookings/$id" params={{ id: primaryConflict.id }}>
                Open booking
              </Link>
            </Button>
          </div>
        </Panel>
      ) : null}

      <div role="tablist" aria-label="Booking views" className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Schedule" ? (
        <section aria-label="Resource schedule">
          <SectionHeading label="Schedule" title="Resource timeline" />
          <ScheduleBoard
            onSlotSelect={(slot) =>
              openComposer({ resourceId: slot.resourceId, date: slot.date, start: slot.start, end: slot.end, step: 3 })
            }
          />
        </section>
      ) : null}

      {tab === "My bookings" ? (
        <section aria-label="My bookings">
          <SectionHeading label="Yours" title="My bookings" />
          {mine.length === 0 ? (
            <EmptyState title="No bookings yet" body="Create a booking and it appears here instantly." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {mine.map((b, i) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  index={i}
                  footer={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() =>
                        openComposer({
                          bookingId: b.id,
                          resourceId: b.resourceId,
                          date: b.date,
                          start: b.start,
                          end: b.end,
                          attendees: b.attendees,
                          title: b.title,
                          purpose: b.purpose ?? b.note,
                          step: 1,
                        })
                      }
                    >
                      Modify
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "Pending" ? (
        <section aria-label="Pending approvals">
          <SectionHeading
            label="Queue"
            title="Pending approvals"
            action={<StatusPill tone="warning">{pending.length} waiting</StatusPill>}
          />
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" body="No requests are waiting on a decision." />
          ) : (
            <div className="space-y-3">
              {pending.map((b, i) => {
                const assessment = approvalAssessment(b);
                return (
                  <Panel key={b.id} className="enter-up p-5" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <p className="text-muted-foreground/70 text-[11px] tnum">{b.id}</p>
                        <h3 className="mt-1 truncate text-sm font-medium">{b.title}</h3>
                        <p className="text-meta mt-1 truncate tnum">
                          {b.organiser} · {b.resourceName} · {dayLabelFor(b.date)} {b.start}–{b.end} ·{" "}
                          {b.attendees} attendees
                        </p>
                        <p className="text-primary mt-3 inline-flex items-center gap-1.5 text-xs font-medium">
                          <Sparkles className="size-3.5" aria-hidden /> CampusOS recommends:{" "}
                          {assessment.recommendation}
                        </p>
                        <ul className="text-muted-foreground mt-1.5 space-y-1 text-xs">
                          {assessment.lines.map((l) => (
                            <li key={l}>· {l}</li>
                          ))}
                        </ul>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <Tag>{assessment.risk} risk</Tag>
                          {assessment.checks.slice(0, 3).map((c) => (
                            <Tag key={c.label}>{c.passed ? "✓" : "✕"} {c.label}</Tag>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col">
                        <Button
                          size="sm"
                          onClick={() => {
                            decideBooking(b.id, "approved");
                            toast.success(`${b.title} approved`);
                          }}
                        >
                          Approve
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/bookings/$id" params={{ id: b.id }}>
                            Review
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            decideBooking(b.id, "rejected");
                            toast.error(`${b.title} rejected`);
                          }}
                        >
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
      ) : null}

      {tab === "Conflicts" ? (
        <section aria-label="Conflict center">
          <SectionHeading label="Conflict center" title="Active conflicts" />
          {conflicts.length === 0 ? (
            <EmptyState title="No active conflicts" body="Every reservation on campus is currently clear." />
          ) : (
            <div className="space-y-4">
              {conflicts.map((c) => {
                const options = findAlternatives(
                  {
                    resourceId: c.resourceId,
                    date: c.date,
                    start: c.start,
                    end: c.end,
                    attendees: c.attendees,
                    equipment: c.equipment ?? [],
                  },
                  2,
                );
                return (
                  <Panel key={c.id} className="border-destructive/25 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <StatusPill tone="critical">High priority</StatusPill>
                        <h3 className="mt-2 truncate text-sm font-medium">{c.title}</h3>
                        <p className="text-meta mt-1 tnum">
                          {c.resourceName} · {dayLabelFor(c.date)} {c.start}–{c.end}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/bookings/$id" params={{ id: c.id }}>
                          Resolve
                        </Link>
                      </Button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {options.map((rec, i) => (
                        <RecommendationRow
                          key={rec.id}
                          rec={rec}
                          index={i}
                          onApply={(r) => {
                            resolveConflict(c.id, r);
                            toast.success("Conflict resolved", {
                              description: `${c.title} → ${r.resourceName} ${r.start}–${r.end}`,
                            });
                          }}
                        />
                      ))}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "Recommendations" ? (
        <section aria-label="AI scheduling recommendations">
          <SectionHeading label="CampusOS" title="Scheduling recommendations" />
          {recommendations.length === 0 ? (
            <EmptyState title="Nothing to recommend" body="CampusOS has no scheduling improvements right now." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {recommendations.map((rec, i) => (
                <RecommendationRow
                  key={rec.id}
                  rec={rec}
                  index={i}
                  applyLabel="Book this slot"
                  onApply={(r) =>
                    openComposer({
                      resourceId: r.resourceId,
                      date: r.date,
                      start: r.start,
                      end: r.end,
                      step: 3,
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <BookingComposer open={composerOpen} onOpenChange={closeComposer} seed={seed} />
    </div>
  );
}
