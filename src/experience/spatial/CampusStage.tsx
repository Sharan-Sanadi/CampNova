import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { paletteForTheme } from "../palette";
import { PARTICLE_BUDGET, type QualityTier } from "../store";
import { tonesForTheme } from "./tones";
import { pointer, useSpatial } from "./state";
import { CampusEnvironment } from "./layers/CampusEnvironment";
import { CampusWorld } from "./layers/CampusWorld";
import { IntelligenceNetwork } from "./layers/IntelligenceNetwork";
import { IntelligenceCore } from "./layers/IntelligenceCore";
import { BookingLayer } from "./layers/BookingLayer";
import { DataLandscape } from "./layers/DataLandscape";
import { ModuleCamera } from "./layers/ModuleCamera";
import { AdaptivePerformance, ContextGuard } from "../safety";

void PARTICLE_BUDGET;

/** Frees every GPU resource this canvas owns when the shell unmounts. */
function DisposeOnUnmount() {
  const { gl, scene } = useThree();
  useEffect(
    () => () => {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      gl.dispose();
    },
    [gl, scene],
  );
  return null;
}

function useIsDark() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

/**
 * THE SHARED CAMPUSOS WORLD — a single WebGL context for the whole product.
 * Layers are mounted/unmounted by the active module; the camera travels
 * between them so every screen belongs to one campus.
 */
export default function CampusStage({
  tier,
  reducedMotion,
  onContextLost,
}: {
  tier: QualityTier;
  reducedMotion: boolean;
  onContextLost?: () => void;
}) {
  const isDark = useIsDark();
  const palette = useMemo(() => paletteForTheme(isDark), [isDark]);
  const tones = useMemo(() => tonesForTheme(isDark), [isDark]);
  const activeModule = useSpatial((s) => s.activeModule);
  const motion = reducedMotion ? 0.2 : 1;
  const isDesktop = tier === "high" || tier === "medium";

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  const dpr = useMemo<[number, number]>(
    () => (tier === "high" ? [1, 1.8] : tier === "medium" ? [1, 1.5] : [1, 1.2]),
    [tier],
  );

  const showCampus = activeModule !== "analytics";
  const showNetwork = isDesktop && activeModule !== "analytics";
  const showCore =
    activeModule === "copilot" ||
    activeModule === "dashboard" ||
    activeModule === "intelligence" ||
    activeModule === "notifications";
  const showBookings = activeModule === "bookings" || activeModule === "booking-detail";

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: tier === "high", powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0.5, 12.5, 19], fov: 40, near: 0.1, far: 140 }}
      style={{ pointerEvents: "none" }}
      frameloop="demand"
    >
      <color attach="background" args={[palette.background]} />
      <CampusEnvironment palette={palette} tier={tier} motion={motion} />
      <ModuleCamera reducedMotion={reducedMotion} parallax={isDesktop} />

      {showCampus ? (
        <CampusWorld
          palette={palette}
          tones={tones}
          motion={motion}
          parallax={isDesktop && !reducedMotion}
        />
      ) : null}
      {showNetwork ? (
        <IntelligenceNetwork accent={palette.accent} motion={motion} tier={tier} />
      ) : null}
      {showCore ? (
        <IntelligenceCore
          accent={palette.core}
          base={palette.building}
          motion={motion}
          count={tier === "high" ? 260 : tier === "medium" ? 160 : 90}
          position={activeModule === "copilot" ? [0, 1.8, 0] : [0, 2.4, 0]}
        />
      ) : null}
      {showBookings ? <BookingLayer palette={palette} tones={tones} motion={motion} /> : null}
      {activeModule === "analytics" ? <DataLandscape palette={palette} motion={motion} /> : null}

      <ContextGuard onLost={() => onContextLost?.()} />
      <AdaptivePerformance tier={tier} maxDpr={dpr[1]} />
      <DisposeOnUnmount />
    </Canvas>
  );
}
