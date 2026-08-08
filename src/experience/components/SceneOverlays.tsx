import { useExperience } from "../store";
import { SCENES } from "../scenes";

/**
 * DOM overlays for the 3D layer. Deliberately DOM (not canvas text) so the
 * existing CampusOS typography, tokens and contrast are reused verbatim.
 */
export function SceneOverlays() {
  const hovered = useExperience((s) => s.hovered);
  const activeScene = useExperience((s) => s.activeScene);
  const ready = useExperience((s) => s.ready);
  const active = SCENES.find((s) => s.key === activeScene) ?? SCENES[0]!;

  return (
    <>
      {/* Scene indicator — small spatial annotation, not product copy */}
      <div
        className="pointer-events-none fixed bottom-6 left-5 z-20 hidden items-center gap-2.5 sm:left-8 lg:flex"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 600ms var(--ease-out-soft)" }}
        aria-hidden
      >
        <span className="bg-primary size-1.5 rounded-full" />
        <span className="text-label text-muted-foreground/80">{active.title}</span>
      </div>

      {/* Hover label for a campus system */}
      {hovered ? (
        <div
          className="panel pointer-events-none fixed z-20 hidden px-3 py-2 lg:block"
          style={{
            left: Math.min(Math.max(hovered.x + 14, 12), window.innerWidth - 240),
            top: Math.min(Math.max(hovered.y - 10, 12), window.innerHeight - 96),
            boxShadow: "var(--shadow-panel)",
          }}
          aria-hidden
        >
          <p className="text-label text-primary">{hovered.label}</p>
          <p className="mt-1.5 text-[13px] font-medium">{hovered.stat}</p>
          <p className="text-meta mt-0.5">{hovered.note}</p>
        </div>
      ) : null}
    </>
  );
}
