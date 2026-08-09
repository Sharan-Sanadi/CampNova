import { useRef, type ReactNode } from "react";
import { cn } from "@/common/lib/utils";
import { useSpatial, type CampusMode } from "@/experience/spatial/state";

/* ------------------------------------------------------------------ *
 * SPATIAL DOM PRIMITIVES
 * All typography is inherited — these add depth, never new type.
 * ------------------------------------------------------------------ */

/** Matte translucent instrumentation panel with a slow scanline. */
export function HolographicPanel({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/80 bg-surface/60 relative overflow-hidden rounded-lg border backdrop-blur-md",
        className,
      )}
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 55%, transparent), transparent)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-16 opacity-[0.07]"
        style={{
          background:
            "linear-gradient(180deg, transparent, color-mix(in oklab, var(--primary) 90%, transparent), transparent)",
          animation: "spatial-scan 5.5s var(--ease-out-soft) infinite",
        }}
      />
      {label ? (
        <p className="text-label text-muted-foreground/70 relative px-4 pt-3">{label}</p>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Subtle cursor-reactive depth. Use on hero / intelligence cards only. */
export function TiltCard({
  children,
  className,
  max = 3,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn("transition-transform duration-300 will-change-transform", className)}
    >
      {children}
    </div>
  );
}

const MODES: { id: CampusMode; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "predict", label: "Predict" },
  { id: "energy", label: "Energy" },
  { id: "resources", label: "Resources" },
  { id: "movement", label: "Movement" },
  { id: "alerts", label: "Alerts" },
];

/** Restrained control set for the digital twin view. */
export function CampusModeControls({ className }: { className?: string }) {
  const mode = useSpatial((s) => s.campusMode);
  const setMode = useSpatial((s) => s.setCampusMode);

  return (
    <div
      className={cn("border-border bg-surface/70 inline-flex flex-wrap gap-0.5 rounded-md border p-0.5 backdrop-blur-sm", className)}
      role="group"
      aria-label="Digital twin view"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          aria-pressed={mode === m.id}
          className={cn(
            "text-label rounded px-2 py-1 transition-colors",
            mode === m.id
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
