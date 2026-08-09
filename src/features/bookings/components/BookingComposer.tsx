import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarCheck, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/common/lib/utils";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/common/components/sheet";
import { StatusPill, Tag } from "@/shared/primitives";
import { CheckList, MatchScore, RecommendationRow } from "./pieces";
import { currentUser, type Booking } from "@/data/campus";
import {
  BOOKING_RULES,
  TIMELINE_HOURS,
  bookingDays,
  campusToday,
  checkAvailability,
  createBooking,
  dayLabelFor,
  durationLabel,
  findAlternatives,
  fromMinutes,
  longDate,
  recommendTimes,
  toMinutes,
  updateBooking,
  type BookingRecommendation,
} from "@/data/bookingEngine";
import { getResourceProfile, getResourceProfiles } from "@/data/resources";

export interface ComposerSeed {
  resourceId?: string | null;
  date?: string;
  start?: string;
  end?: string;
  attendees?: number;
  purpose?: string;
  title?: string;
  equipment?: string[];
  capacity?: number | null;
  /** When present the composer modifies an existing booking. */
  bookingId?: string;
  step?: Step;
}

type Step = 0 | 1 | 2 | 3;
const STEPS = ["Resource", "Schedule", "Details", "Review"] as const;

export function BookingComposer({
  open,
  onOpenChange,
  seed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seed: ComposerSeed | null;
}) {
  const [step, setStep] = useState<Step>(0);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [date, setDate] = useState(campusToday());
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("16:00");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [attendees, setAttendees] = useState("40");
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [working, setWorking] = useState(false);

  const days = useMemo(() => bookingDays(7), []);
  const equipment = seed?.equipment ?? [];

  /* Seed the flow from Copilot / Resource Intelligence / timeline handoff. */
  useEffect(() => {
    if (!open) return;
    setConfirmed(null);
    setWorking(false);
    setResourceId(seed?.resourceId ?? null);
    setDate(seed?.date ?? campusToday());
    setStart(seed?.start ?? "14:00");
    setEnd(seed?.end ?? "16:00");
    setTitle(seed?.title ?? "");
    setPurpose(seed?.purpose ?? "");
    setAttendees(String(seed?.attendees ?? seed?.capacity ?? 40));
    setStep(seed?.step ?? (seed?.resourceId ? 3 : 0));
  }, [open, seed]);

  const resource = resourceId ? getResourceProfile(resourceId) : undefined;
  const attendeeCount = Number(attendees) || 0;

  const result = useMemo(
    () =>
      resourceId
        ? checkAvailability(resourceId, date, start, end, {
            attendees: attendeeCount,
            equipment,
            ignoreBookingId: seed?.bookingId,
          })
        : null,
    [resourceId, date, start, end, attendeeCount, equipment, seed?.bookingId],
  );

  const alternatives = useMemo(
    () =>
      result && !result.available && resourceId
        ? findAlternatives({ resourceId, date, start, end, attendees: attendeeCount, equipment })
        : [],
    [result, resourceId, date, start, end, attendeeCount, equipment],
  );

  const bestTimes = useMemo(
    () =>
      resourceId
        ? recommendTimes(resourceId, date, { duration: toMinutes(end) - toMinutes(start), attendees: attendeeCount, equipment })
        : [],
    [resourceId, date, start, end, attendeeCount, equipment],
  );

  const candidates = useMemo(() => {
    const min = seed?.capacity ?? attendeeCount;
    return getResourceProfiles()
      .filter((p) => (min ? p.capacity >= min : true))
      .slice(0, 8);
  }, [seed?.capacity, attendeeCount]);

  const applyRecommendation = (rec: BookingRecommendation) => {
    setResourceId(rec.resourceId);
    setDate(rec.date);
    setStart(rec.start);
    setEnd(rec.end);
    toast.success("Recommendation applied", {
      description: `${rec.resourceName} · ${rec.dayLabel} ${rec.start}–${rec.end}`,
    });
  };

  const confirm = () => {
    if (!resource) return;
    setWorking(true);
    window.setTimeout(() => {
      const payload = {
        resourceId: resource.id,
        date,
        start,
        end,
        title: title.trim() || purpose.trim() || `${resource.name} reservation`,
        purpose: purpose.trim() || "Campus activity",
        attendees: attendeeCount,
        equipment,
        organiser: currentUser.name,
        department: currentUser.role,
      };
      const booking = seed?.bookingId
        ? updateBooking(seed.bookingId, {
            resourceId: resource.id,
            resourceName: resource.name,
            date,
            start,
            end,
            title: payload.title,
            purpose: payload.purpose,
            attendees: attendeeCount,
          })
        : createBooking(payload);
      setWorking(false);
      setConfirmed(booking ?? null);
      toast.success(seed?.bookingId ? "Booking updated" : "Reservation confirmed", {
        description: `${resource.name} · ${dayLabelFor(date)} ${start}–${end}`,
      });
    }, 520);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-border bg-background/95 sticky top-0 z-10 border-b px-5 py-4 backdrop-blur-md">
          <SheetTitle className="text-base font-medium">
            {confirmed ? "Reservation confirmed" : seed?.bookingId ? "Modify booking" : "New booking"}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {confirmed
              ? "Campus state, dashboard and notifications have been updated."
              : "CampusOS checks availability, capacity, equipment and conflicts as you go."}
          </SheetDescription>
          {confirmed ? null : (
            <ol className="mt-4 flex items-center gap-1.5" aria-label="Booking steps">
              {STEPS.map((s, i) => (
                <li key={s} className="flex min-w-0 flex-1 items-center gap-1.5">
                  <button
                    onClick={() => setStep(i as Step)}
                    aria-current={step === i ? "step" : undefined}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-[11px] font-medium transition-colors",
                      step === i
                        ? "bg-primary-soft text-primary"
                        : i < step
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {i + 1}. {s}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex-1 space-y-5 px-5 py-5">
          {confirmed ? (
            <div className="enter-up space-y-5">
              <div className="border-success/40 bg-success/10 rounded-xl border p-5">
                <div className="flex items-center gap-2">
                  <span className="bg-success/20 text-success grid size-8 place-items-center rounded-full">
                    <CalendarCheck className="size-4" aria-hidden />
                  </span>
                  <p className="text-label text-success">Reservation confirmed</p>
                </div>
                <p className="mt-3 text-lg font-medium tracking-tight">{confirmed.title}</p>
                <p className="text-muted-foreground mt-1 text-sm tnum">
                  {confirmed.resourceName} · {dayLabelFor(confirmed.date)} {confirmed.start}–{confirmed.end}
                </p>
                <p className="text-meta mt-1">{resource?.building}</p>
                <ul className="mt-4 space-y-1.5">
                  {["No conflicts", "Capacity confirmed", "Equipment confirmed"].map((l) => (
                    <li key={l} className="flex items-center gap-2 text-[13px]">
                      <Check className="text-success size-3.5" aria-hidden /> {l}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" onClick={() => onOpenChange(false)}>
                  <Link to="/bookings/$id" params={{ id: confirmed.id }}>
                    View booking
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                  <Link to="/resources/$id" params={{ id: confirmed.resourceId }}>
                    View resource
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toast("Calendar export", {
                      description: "Calendar sync is a planned integration point — not yet connected.",
                    })
                  }
                >
                  Add to calendar
                </Button>
              </div>
            </div>
          ) : null}

          {!confirmed && step === 0 ? (
            <div className="space-y-3">
              <p className="text-label text-muted-foreground">Select resource</p>
              {candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setResourceId(p.id);
                    setStep(1);
                  }}
                  className={cn(
                    "panel panel-hover w-full p-4 text-left",
                    resourceId === p.id && "border-primary/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-meta mt-1">
                        {p.building} · {p.floor} · {p.capacity} seats
                      </p>
                    </div>
                    <StatusPill tone={p.status === "available" ? "success" : p.status === "in-use" ? "info" : "warning"}>
                      {p.status}
                    </StatusPill>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {p.equipment.slice(0, 3).map((e) => (
                      <Tag key={e}>{e}</Tag>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {!confirmed && step === 1 ? (
            <div className="space-y-5">
              <div>
                <p className="text-label text-muted-foreground mb-2">Select date</p>
                <div className="flex flex-wrap gap-1.5">
                  {days.map((d) => (
                    <button
                      key={d.date}
                      onClick={() => setDate(d.date)}
                      aria-pressed={date === d.date}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        date === d.date
                          ? "border-primary/40 bg-primary-soft text-primary"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-meta mt-2">{longDate(date)}</p>
              </div>

              <div>
                <p className="text-label text-muted-foreground mb-2">Select start time</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {TIMELINE_HOURS.map((h) => {
                    const value = `${String(h).padStart(2, "0")}:00`;
                    const duration = Math.max(60, toMinutes(end) - toMinutes(start));
                    const busy = resourceId
                      ? checkAvailability(resourceId, date, value, fromMinutes(h * 60 + duration), {
                          ignoreBookingId: seed?.bookingId,
                        }).conflicts.length > 0
                      : false;
                    return (
                      <button
                        key={h}
                        onClick={() => {
                          setStart(value);
                          setEnd(fromMinutes(h * 60 + duration));
                        }}
                        aria-pressed={start === value}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-xs font-medium tnum transition-colors",
                          start === value
                            ? "border-primary/50 bg-primary-soft text-primary"
                            : busy
                              ? "border-destructive/30 bg-destructive/10 text-destructive"
                              : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bk-start" className="text-xs">
                    Start
                  </Label>
                  <Input id="bk-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="bg-surface" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-end" className="text-xs">
                    End
                  </Label>
                  <Input id="bk-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-surface" />
                </div>
              </div>

              {bestTimes.length ? (
                <div>
                  <p className="text-label text-primary mb-2 flex items-center gap-1.5">
                    <Sparkles className="size-3" aria-hidden /> Best available times
                  </p>
                  <div className="space-y-2">
                    {bestTimes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setStart(r.start);
                          setEnd(r.end);
                        }}
                        className="border-border hover:border-border-strong flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
                      >
                        <span className="text-[13px] font-medium tnum">
                          {r.start}–{r.end}
                        </span>
                        <span className="text-meta min-w-0 flex-1 truncate">{r.rationale}</span>
                        <span className="tnum text-[13px] font-medium">{r.score}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!confirmed && step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-title" className="text-xs">
                  Event title
                </Label>
                <Input
                  id="bk-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="AI Workshop — Applied LLMs"
                  className="bg-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-purpose" className="text-xs">
                  Purpose
                </Label>
                <Input
                  id="bk-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Hands-on workshop for 2nd year cohort"
                  className="bg-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-att" className="text-xs">
                  Attendees
                </Label>
                <Input
                  id="bk-att"
                  inputMode="numeric"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  className="bg-surface"
                />
                {resource ? <p className="text-meta">Capacity {resource.capacity} seats</p> : null}
              </div>
              <div className="border-border rounded-lg border p-4">
                <p className="text-label text-muted-foreground mb-2.5">Booking rules</p>
                <ul className="space-y-1.5">
                  {BOOKING_RULES.map((r) => (
                    <li key={r.label} className="text-[13px]">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground"> — {r.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {!confirmed && step === 3 ? (
            <div className="space-y-5">
              {!resource ? (
                <p className="text-muted-foreground text-sm">Select a resource to review this booking.</p>
              ) : (
                <>
                  <div className="border-border bg-surface-2 rounded-xl border p-4">
                    <p className="text-label text-muted-foreground">Review booking</p>
                    <p className="mt-2 text-base font-medium">{resource.name}</p>
                    <p className="text-meta mt-1">
                      {resource.building} · {resource.floor}
                    </p>
                    <p className="mt-2 text-sm tnum">
                      {dayLabelFor(date)} · {start}–{end} · {durationLabel(start, end)}
                    </p>
                    <dl className="border-border mt-3 grid gap-2 border-t pt-3 text-[13px] sm:grid-cols-2">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Capacity</dt>
                        <dd className="font-medium tnum">
                          {attendeeCount} / {resource.capacity}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Purpose</dt>
                        <dd className="truncate font-medium">{purpose || "—"}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {resource.equipment.slice(0, 5).map((e) => (
                        <Tag key={e}>{e}</Tag>
                      ))}
                    </div>
                  </div>

                  {result ? (
                    <>
                      <div className="border-border rounded-xl border p-4">
                        <p className="text-label text-muted-foreground mb-3">CampusOS checks</p>
                        <CheckList checks={result.checks} />
                      </div>
                      <div className="border-border rounded-xl border p-4">
                        <MatchScore match={result.match} />
                      </div>
                    </>
                  ) : null}

                  {result && !result.available ? (
                    <div className="border-destructive/35 enter-up rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <AlertTriangle className="text-destructive size-3.5" aria-hidden />
                        <p className="text-label text-destructive">
                          {result.conflicts.length ? "Scheduling conflict" : "Request cannot be satisfied"}
                        </p>
                      </div>
                      {result.conflicts.map((c) => (
                        <p key={c.conflictingBookingId} className="text-sm">
                          Requested {start}–{end} overlaps{" "}
                          <Link
                            to="/bookings/$id"
                            params={{ id: c.conflictingBookingId }}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {c.title}
                          </Link>{" "}
                          ({c.overlap}) — {c.overlapMinutes} min overlap.
                        </p>
                      ))}
                      {alternatives.length ? (
                        <div className="mt-4 space-y-3">
                          <p className="text-label text-primary">CampusOS recommends</p>
                          {alternatives.map((rec, i) => (
                            <RecommendationRow key={rec.id} rec={rec} index={i} onApply={applyRecommendation} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>

        {confirmed ? null : (
          <div className="border-border bg-background/95 sticky bottom-0 flex items-center gap-2 border-t px-5 py-3 backdrop-blur-md">
            <Button
              size="sm"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => (Math.max(0, s - 1) as Step))}
            >
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Button>
            {step < 3 ? (
              <Button
                size="sm"
                className="ml-auto"
                disabled={step === 0 && !resourceId}
                onClick={() => setStep((s) => (Math.min(3, s + 1) as Step))}
              >
                Continue <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button size="sm" className="ml-auto" disabled={!resource || working} onClick={confirm}>
                {working
                  ? "Reserving…"
                  : result?.available
                    ? seed?.bookingId
                      ? "Confirm changes"
                      : "Confirm reservation"
                    : "Reserve anyway"}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}