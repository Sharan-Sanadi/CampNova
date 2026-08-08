import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Panel, StatusDot } from "@/components/campusos/ui/primitives";
import { useCampusVersion } from "@/lib/useCampus";
import {
  BLOCKING_STATUSES,
  TIMELINE_HOURS,
  bookingDays,
  campusToday,
  dayLabelFor,
  getBookings,
  toMinutes,
} from "@/data/bookingEngine";
import { getResourceProfiles } from "@/data/resources";

type View = "day" | "week" | "timeline";

const START = TIMELINE_HOURS[0]! * 60;
const END = (TIMELINE_HOURS[TIMELINE_HOURS.length - 1]! + 1) * 60;
const SPAN = END - START;
const pct = (mins: number) => `${((mins - START) / SPAN) * 100}%`;

/** Reuses the live browser clock — CampusOS keeps a single time source. */
function useNowMinutes(): number {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now ?? -1;
}

function blockTone(status: string) {
  if (status === "conflict") return "bg-destructive/25 border-destructive/50 text-destructive";
  if (status === "pending") return "bg-warning/20 border-warning/45 text-warning";
  if (status === "completed") return "bg-surface-2 border-border text-muted-foreground";
  return "bg-primary/20 border-primary/45 text-primary";
}

export function ScheduleBoard({
  onSlotSelect,
}: {
  onSlotSelect?: (payload: { resourceId: string; date: string; start: string; end: string }) => void;
}) {
  useCampusVersion();
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(campusToday());
  const days = useMemo(() => bookingDays(7), []);
  const now = useNowMinutes();
  const isToday = date === campusToday();

  const resources = useMemo(() => getResourceProfiles().slice(0, 6), []);
  const bookings = getBookings().filter((b) => BLOCKING_STATUSES.includes(b.status));

  return (
    <Panel className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Schedule view" className="border-border flex rounded-lg border p-0.5">
          {(["day", "week", "timeline"] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                view === v ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="text-muted-foreground ml-auto flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <StatusDot tone="info" /> Reserved
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot tone="warning" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot tone="critical" /> Conflict
          </span>
        </div>
      </div>

      {view !== "week" ? (
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Select day">
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => setDate(d.date)}
              aria-pressed={date === d.date}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                date === d.date
                  ? "border-primary/40 bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      ) : null}

      {view === "week" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="text-muted-foreground/70 mb-2 grid grid-cols-[150px_repeat(7,minmax(0,1fr))] text-[10px]">
              <span />
              {days.map((d) => (
                <span key={d.date} className="truncate px-1">
                  {d.label}
                </span>
              ))}
            </div>
            {resources.map((r) => (
              <div key={r.id} className="grid grid-cols-[150px_repeat(7,minmax(0,1fr))] items-center py-1">
                <span className="text-muted-foreground truncate pr-3 text-xs">{r.name}</span>
                {days.map((d) => {
                  const dayBookings = bookings.filter((b) => b.resourceId === r.id && b.date === d.date);
                  const conflict = dayBookings.some((b) => b.status === "conflict");
                  return (
                    <div key={d.date} className="px-0.5">
                      <button
                        onClick={() => onSlotSelect?.({ resourceId: r.id, date: d.date, start: "14:00", end: "16:00" })}
                        title={`${r.name} · ${d.label} · ${dayBookings.length} booking(s)`}
                        className={cn(
                          "h-7 w-full rounded-sm border transition-colors",
                          conflict
                            ? "border-destructive/50 bg-destructive/25"
                            : dayBookings.length
                              ? "border-primary/40 bg-primary/20"
                              : "border-border bg-surface-2 hover:bg-accent",
                        )}
                      >
                        <span className="sr-only">
                          {r.name} {d.label} {dayBookings.length} bookings
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="relative grid grid-cols-[150px_minmax(0,1fr)]">
              <span />
              <div className="text-muted-foreground/70 relative h-4 text-[10px] tnum">
                {TIMELINE_HOURS.filter((_, i) => i % 2 === 0).map((h) => (
                  <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              {isToday && now >= START && now <= END ? (
                <div
                  aria-hidden
                  className="absolute top-0 bottom-0 z-10 w-px"
                  style={{ left: `calc(150px + (100% - 150px) * ${(now - START) / SPAN})` }}
                >
                  <span className="bg-destructive absolute inset-y-0 w-px" />
                  <span className="bg-destructive absolute -top-1 -left-[3px] size-1.5 rounded-full pulse-dot" />
                  <span className="text-destructive absolute -top-5 -left-4 text-[9px] font-semibold tracking-wide">
                    LIVE
                  </span>
                </div>
              ) : null}

              {resources.map((r) => {
                const rows = bookings
                  .filter((b) => b.resourceId === r.id && b.date === date)
                  .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
                /* Overlapping bookings sit in separate lanes so both stay readable. */
                const laneEnds: number[] = [];
                const lanes = rows.map((b) => {
                  const startMin = toMinutes(b.start);
                  let lane = laneEnds.findIndex((endMin) => endMin <= startMin);
                  if (lane === -1) lane = laneEnds.length;
                  laneEnds[lane] = toMinutes(b.end);
                  return lane;
                });
                const laneCount = Math.max(1, laneEnds.length);
                return (
                  <div key={r.id} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-2 py-1.5">
                    <Link
                      to="/resources/$id"
                      params={{ id: r.id }}
                      className="text-muted-foreground hover:text-foreground truncate pr-3 text-xs transition-colors"
                    >
                      {r.name}
                    </Link>
                    <div className="bg-surface-2 relative h-9 overflow-hidden rounded-md">
                      {TIMELINE_HOURS.map((h) => (
                        <span
                          key={h}
                          aria-hidden
                          className="border-border/60 absolute inset-y-0 border-l"
                          style={{ left: pct(h * 60) }}
                        />
                      ))}
                      {onSlotSelect
                        ? TIMELINE_HOURS.filter((h) => h % 2 === 0).map((h) => (
                            <button
                              key={`slot-${h}`}
                              onClick={() =>
                                onSlotSelect({
                                  resourceId: r.id,
                                  date,
                                  start: `${String(h).padStart(2, "0")}:00`,
                                  end: `${String(h + 2).padStart(2, "0")}:00`,
                                })
                              }
                              className="hover:bg-accent/50 absolute inset-y-0 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                              style={{ left: pct(h * 60), width: `${(120 / SPAN) * 100}%` }}
                            >
                              <span className="sr-only">
                                Book {r.name} at {h}:00 on {dayLabelFor(date)}
                              </span>
                            </button>
                          ))
                        : null}
                      {rows.map((b, bi) => (
                        <Link
                          key={b.id}
                          to="/bookings/$id"
                          params={{ id: b.id }}
                          title={`${b.title} · ${b.start}–${b.end} · ${b.status}`}
                          className={cn(
                            "absolute flex items-center overflow-hidden rounded-sm border px-1.5 text-[10px] font-medium transition-transform duration-150 hover:-translate-y-px",
                            blockTone(b.status),
                          )}
                          style={{
                            left: pct(toMinutes(b.start)),
                            width: `${((toMinutes(b.end) - toMinutes(b.start)) / SPAN) * 100}%`,
                            top: `calc(${((lanes[bi] ?? 0) / laneCount) * 100}% + 2px)`,
                            height: `calc(${100 / laneCount}% - 4px)`,
                          }}
                        >
                          <span className="truncate">{b.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-meta mt-3">
              {onSlotSelect ? "Select any open block to start a booking." : "Select a booking to open its detail."}
            </p>
          </div>
        </div>
      )}
    </Panel>
  );
}