import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { detectQualityTier, detectWebgl, useExperience, type QualityTier } from "./store";
import { useScrollNarrative } from "./useScrollNarrative";
import { StaticCampusFallback } from "./components/StaticCampusFallback";
import { SceneOverlays } from "./components/SceneOverlays";
import { SceneErrorBoundary } from "./safety";

const CampusExperience = lazy(() => import("./CampusExperience"));

/**
 * The immersive layer wrapper.
 *
 * Mounts a fixed, pointer-events-none WebGL backdrop behind the existing
 * CampusOS DOM content. It renders nothing that the product depends on:
 * remove this component and the landing page is unchanged.
 */
export function ImmersiveCampus({
  scrollTarget,
}: {
  scrollTarget: React.RefObject<HTMLElement | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const [tier, setTier] = useState<QualityTier>("medium");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [sceneFailed, setSceneFailed] = useState(false);
  const ready = useExperience((s) => s.ready);
  const store = useExperience;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const detectedTier = detectQualityTier();
    const hasWebgl = detectWebgl();

    setTier(detectedTier);
    setReducedMotion(mq.matches);
    setWebgl(hasWebgl);
    setMounted(true);

    store.getState().setQualityTier(detectedTier);
    store.getState().setReducedMotion(mq.matches);
    store.getState().setWebglAvailable(hasWebgl);
    if (!hasWebgl) store.getState().setReady(true);

    const onChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      store.getState().setReducedMotion(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [store]);

  useScrollNarrative(scrollTarget, mounted);

  const showWebgl = mounted && webgl && !sceneFailed;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {showWebgl ? (
          <SceneErrorBoundary
            fallback={<StaticCampusFallback />}
            onError={() => store.getState().setReady(true)}
          >
            <Suspense fallback={null}>
              <CampusExperience
                tier={tier}
                reducedMotion={reducedMotion}
                onContextLost={() => {
                  store.getState().setReady(true);
                  setSceneFailed(true);
                }}
              />
            </Suspense>
          </SceneErrorBoundary>
        ) : (
          <StaticCampusFallback />
        )}

        {/* Readability scrim: keeps the DOM headline dominant over the scene. */}
        <div className="from-background/90 via-background/70 to-background/88 dark:from-background/80 dark:via-background/35 dark:to-background/70 absolute inset-0 bg-gradient-to-b" />
        <div className="from-background/90 dark:from-background/80 absolute inset-y-0 left-0 w-full bg-gradient-to-r via-transparent to-transparent lg:w-1/2" />
      </div>

      <IntroCurtain visible={mounted && showWebgl && !ready} />
      <SceneOverlays />
    </>
  );
}

/** Minimal intro. Disappears the moment shaders are compiled — no fake timer. */
function IntroCurtain({ visible }: { visible: boolean }) {
  const shown = useRef(false);
  if (visible) shown.current = true;
  if (!shown.current) return null;

  return (
    <div
      className="bg-background pointer-events-none fixed inset-0 z-40 flex items-end justify-start p-6 sm:p-10"
      style={{
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        transition: "opacity 700ms var(--ease-out-soft), visibility 700ms",
      }}
      aria-hidden
    >
      <div>
        <p className="text-label text-primary">CampusOS AI</p>
        <p className="text-muted-foreground mt-2 text-[13px]">Initialising intelligence layer</p>
        <div className="bg-border mt-4 h-px w-40 overflow-hidden">
          <div className="bg-primary h-px w-1/3 animate-[slide-in-right_1.1s_var(--ease-out-soft)_infinite]" />
        </div>
      </div>
    </div>
  );
}
