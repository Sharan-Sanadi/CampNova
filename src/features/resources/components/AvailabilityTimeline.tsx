import { useState } from "react";
import { AVAILABILITY_DAYS, getAvailability, type SlotStatus } from "@/data/resources";
import { cn } from "@/common/lib/utils";
import { Panel, SectionHeading, StatusPill, type Tone } from "@/shared/primitives";

const slotTone: Record<SlotStatus, Tone> = {
  available: "success",
  reserved: "info",
  "in-use": "warning",
  maintenance: "critical",
  pending: "warning",
};

const slotSurface: Record<SlotStatus, string> = {
  available: "border-success/35 bg-success/10",
  reserved: "border-primary/30 bg-primary-soft",
  "in-use": "border-warning/35 bg-warning/10",
  maintenance: "border-destructive/35 bg-destructive/10",
  pending: "border-warning/35 bg-warning/10",
};

const slotLabel: Record<SlotStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  "in-use": "In use",
  maintenance: "Maintenance",
  pending: "Pending approval",
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const segmentFill: Record<SlotStatus, string> = {
  available: "bg-success/45 hover:bg-success/60",
  reserved: "bg-primary/55 hover:bg-primary/70",
  "in-use": "bg-warning/60 hover:bg-warning/75",
  maintenance: "bg-destructive/55 hover:bg-destructive/70",
  pending: "bg-warning/45 hover:bg-warning/60",
};

export function AvailabilityTimeline({
  resourceId,
  onReserve,
}: {
  resourceId: string;
  onReserve?: (slot: { day: string; start: string; end: string }) => void;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const slots = getAvailability(resourceId, dayIndex);
  const freeCount = slots.filter((s) => s.status === "available").length;

  const dayStart = Math.min(...slots.map((s) => toMinutes(s.start)));
  const dayEnd = Math.max(...slots.map((s) => toMinutes(s.end)));
  const span = Math.max(dayEnd - dayStart, 1);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowPct = ((nowMinutes - dayStart) / span) * 100;
  const showNow = dayIndex === 0 && nowPct >= 0 && nowPct <= 100;
  const hourTicks: number[] = [];
  for (let m = Math.ceil(dayStart / 120) * 120; m <= dayEnd; m += 120) hourTicks.push(m);

  return (
    <Panel className="p-4 sm:p-5">
      <SectionHeading
        label="Schedule"
        title="Availability timeline"
        action={
          <StatusPill tone={freeCount ? "success" : "warning"}>
            {freeCount} of {slots.length} slots free
          </StatusPill>
        }
      />

      <div
        className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Availability day"
      >
        {AVAILABILITY_DAYS.map((d, i) => (
          <button
            key={d}
            role="tab"
            aria-selected={i === dayIndex}
            onClick={() => setDayIndex(i)}
            className={cn(
              "press shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
              i === dayIndex
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Horizontal timeline */}
      <div className="mb-2">
        <div className="border-border bg-surface-2 relative h-9 w-full overflow-hidden rounded-md border">
          {slots.map((s) => {
            const left = ((toMinutes(s.start) - dayStart) / span) * 100;
            const width = ((toMinutes(s.end) - toMinutes(s.start)) / span) * 100;
            return (
              <button
                key={`bar-${s.start}`}
                type="button"
                title={`${s.start}–${s.end} · ${slotLabel[s.status]} · ${s.label}`}
                aria-label={`${s.start} to ${s.end}, ${slotLabel[s.status]}, ${s.label}`}
                onClick={() =>
                  s.status === "available" && onReserve
                    ? onReserve({ day: s.day, start: s.start, end: s.end })
                    : undefined
                }
                className={cn(
                  "absolute inset-y-0 border-r border-[color:var(--color-background)] transition-colors duration-150",
                  segmentFill[s.status],
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
          {showNow ? (
            <span
              aria-hidden
              className="bg-foreground absolute inset-y-0 z-10 w-px"
              style={{ left: `${nowPct}%` }}
            >
              <span className="bg-foreground absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full" />
            </span>
          ) : null}
        </div>
        <div className="text-muted-foreground relative mt-1 h-3.5">
          {hourTicks.map((m) => (
            <span
              key={m}
              className="tnum absolute -translate-x-1/2 text-[10px]"
              style={{ left: `${((m - dayStart) / span) * 100}%` }}
            >
              {String(Math.floor(m / 60)).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
        {(["available", "in-use", "reserved", "maintenance"] as SlotStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-[3px]", segmentFill[s].split(" ")[0])} />
            {slotLabel[s]}
          </span>
        ))}
        {showNow ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="bg-foreground h-2.5 w-px" /> Now
          </span>
        ) : null}
      </div>

      <ul className="space-y-1">
        {slots.map((s) => (
          <li
            key={`${s.start}-${s.day}`}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-200",
              slotSurface[s.status],
            )}
          >
            <span className="tnum text-muted-foreground w-24 shrink-0 text-xs font-medium">
              {s.start}–{s.end}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{s.label}</span>
            <StatusPill tone={slotTone[s.status]} className="shrink-0">
              {slotLabel[s.status]}
            </StatusPill>
            {s.status === "available" && onReserve ? (
              <button
                onClick={() => onReserve({ day: s.day, start: s.start, end: s.end })}
                className="text-primary hover:bg-primary-soft press shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors"
              >
                Reserve
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
