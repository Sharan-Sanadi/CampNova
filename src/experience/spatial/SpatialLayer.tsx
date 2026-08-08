import { Suspense, lazy, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { detectQualityTier, detectWebgl, type QualityTier } from "../store";
import { moduleForPath, useSpatial } from "./state";
import { SceneErrorBoundary } from "../safety";

const CampusStage = lazy(() => import("./CampusStage"));

/**
 * SPATIAL LAYER — mounts the single shared CampusOS world behind the app.
 *
 * It is a pure visual layer: pointer-events are disabled, all product
 * information stays in the DOM, and removing this component leaves the
 * application functionally identical.
 */
export function SpatialLayer() {
  const [tier, setTier] = useState<QualityTier>("medium");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setActiveModule = useSpatial((s) => s.setActiveModule);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setTier(detectQualityTier());
    setReducedMotion(mq.matches);
    setWebgl(detectWebgl());
    setMounted(true);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setActiveModule(moduleForPath(pathname));
  }, [pathname, setActiveModule]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {mounted && webgl && !sceneFailed ? (
        <SceneErrorBoundary fallback={<StaticAtmosphere />}>
          <Suspense fallback={<StaticAtmosphere />}>
            <CampusStage
              tier={tier}
              reducedMotion={reducedMotion}
              onContextLost={() => setSceneFailed(true)}
            />
          </Suspense>
        </SceneErrorBoundary>
      ) : (
        <StaticAtmosphere />
      )}
      {/* Readability scrim — the DOM interface always stays dominant. */}
      {/* Light mode needs a heavier scrim: architectural depth, not grey blocks. */}
      <div className="from-background/96 via-background/93 to-background/97 dark:from-background/86 dark:via-background/54 dark:to-background/88 absolute inset-0 bg-gradient-to-b" />
      <div className="from-background/85 dark:from-background/70 absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r to-transparent" />
    </div>
  );
}

/** CSS-only fallback for low-end / no-WebGL environments. */
function StaticAtmosphere() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(60% 45% at 50% 30%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
