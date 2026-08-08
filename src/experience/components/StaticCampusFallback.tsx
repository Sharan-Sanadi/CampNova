import { SCENES } from "../scenes";

/**
 * No-WebGL / very-low-tier fallback.
 * A composed CSS-only campus diagram — it still communicates
 * fragmented → connected → intelligent → predictive → autonomous.
 * Purely presentational; all product copy stays in the DOM sections.
 */
export function StaticCampusFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="from-primary/6 absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,var(--primary-soft),transparent_70%)] opacity-70" />
      <div className="grid-fade absolute inset-0" />
      <div className="absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2">
        <div className="border-primary/25 absolute inset-0 animate-[spin_60s_linear_infinite] rounded-full border" />
        <div className="border-primary/15 absolute inset-12 animate-[spin_90s_linear_infinite_reverse] rounded-full border" />
        <div className="bg-primary/25 absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" />
        {SCENES.map((s, i) => {
          const angle = (i / SCENES.length) * Math.PI * 2;
          return (
            <span
              key={s.key}
              className="bg-primary/50 absolute size-1.5 rounded-full"
              style={{
                left: `calc(50% + ${Math.cos(angle) * 210}px)`,
                top: `calc(50% + ${Math.sin(angle) * 210}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
