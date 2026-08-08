import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Operational campus context indicator — real local browser time.
 * Ticks once per minute (aligned to the minute boundary) so it never
 * re-renders more than it needs to.
 */
function format(now: Date) {
  return {
    time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    date: now
      .toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" })
      .replace(",", "")
      .toUpperCase(),
  };
}

export function CampusClock({
  className,
  label,
}: {
  className?: string | undefined;
  label?: string | undefined;
}) {

  const [stamp, setStamp] = useState<{ time: string; date: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setStamp(format(now));
      // align the next update to the top of the next minute
      timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  if (!stamp) {
    // reserve layout so the header does not shift on hydration
    return <span className={cn("h-9 w-[104px] shrink-0", className)} aria-hidden />;
  }

  return (
    <div
      className={cn(
        "border-border text-right leading-none tabular-nums shrink-0 rounded-md border px-2.5 py-1.5",
        className,
      )}
    >
      <span className="text-foreground block font-mono text-[13px] font-medium tracking-tight tnum">
        {stamp.time}
      </span>
      <span className="text-muted-foreground/80 mt-0.5 block text-[9.5px] tracking-[0.11em]">
        {stamp.date}
        {label ? ` · ${label.toUpperCase()}` : ""}
      </span>
    </div>
  );
}
