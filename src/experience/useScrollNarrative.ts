import { useEffect } from "react";
import { scrollProgress, transitionEnergy, useExperience } from "./store";
import { SCENES } from "./scenes";

/**
 * ONE master ScrollTrigger drives the entire narrative (0 → 1).
 * Nothing else in the experience creates scroll triggers.
 */
export function useScrollNarrative(target: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const setActiveScene = useExperience((s) => s.setActiveScene);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const el = target.current;
    if (!el) return;

    let killed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      let lastIndex = 0;
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          scrollProgress.target = p;

          // Spike the transition energy when we cross into a new waypoint —
          // this is the only thing that drives chromatic aberration.
          let index = 0;
          for (let i = 0; i < SCENES.length; i++) if (p >= SCENES[i]!.progress - 0.001) index = i;
          if (index !== lastIndex) {
            lastIndex = index;
            transitionEnergy.value = 1;
            setActiveScene(SCENES[index]!.key);
          }
        },
      });

      cleanup = () => st.kill();
    })();

    return () => {
      killed = true;
      cleanup?.();
    };
  }, [target, enabled, setActiveScene]);
}
