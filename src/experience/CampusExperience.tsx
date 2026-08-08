import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { paletteForTheme } from "./palette";
import { scrollProgress, transitionEnergy, useExperience, type QualityTier } from "./store";
import { CameraRig } from "./components/CameraRig";
import { CampusCore } from "./components/CampusCore";
import { DataField } from "./components/DataField";
import { DataPathways } from "./components/DataPathways";
import { Postfx } from "./components/Postfx";
import { AdaptivePerformance, ContextGuard } from "./safety";

/** Damps the raw scroll target into the value every visual reads. */
function ProgressDriver({ reducedMotion }: { reducedMotion: boolean }) {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    scrollProgress.value = reducedMotion
      ? scrollProgress.target
      : THREE.MathUtils.damp(scrollProgress.value, scrollProgress.target, 3.2, dt);
  });
  return null;
}

/** Compiles shaders during the intro phase instead of on first scroll. */
function WarmUp({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    gl.compile(scene, camera);
    onReady();
  });
  return null;
}

/** Frees GPU resources belonging to this canvas on unmount / route change. */
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

export default function CampusExperience({
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
  const setReady = useExperience((s) => s.setReady);
  const motion = reducedMotion ? 0.25 : 1;
  const isDesktop = tier === "high" || tier === "medium";

  const dpr = useMemo<[number, number]>(() => {
    if (tier === "high") return [1, 1.85];
    if (tier === "medium") return [1, 1.5];
    return [1, 1.25];
  }, [tier]);

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: tier === "high", powerPreference: "high-performance", alpha: true }}
      camera={{ position: [1.5, 9.5, 21], fov: 42, near: 0.1, far: 120 }}
      // The canvas is a visual layer: it must never intercept DOM interaction.
      style={{ pointerEvents: "none" }}
      frameloop="demand"
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, 16, 52]} />

      {/* Architectural lighting: soft key, subtle rim, ambient fill. */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 4]} intensity={1.05} color={palette.buildingTop} />
      <directionalLight position={[-8, 3, -6]} intensity={0.35} color={palette.accent} />

      <ProgressDriver reducedMotion={reducedMotion} />
      <CameraRig
        progressRef={scrollProgress}
        reducedMotion={reducedMotion}
        parallax={isDesktop && !reducedMotion}
      />

      <CampusCore
        palette={palette}
        progressRef={scrollProgress}
        motion={motion}
        enableHover={isDesktop}
      />
      <DataPathways accent={palette.accent} progressRef={scrollProgress} motion={motion} />
      <DataField
        tier={tier}
        color={palette.particle}
        fog={palette.fog}
        progressRef={scrollProgress}
        motion={motion}
      />

      <Postfx tier={tier} energyRef={transitionEnergy} />
      <ContextGuard onLost={() => onContextLost?.()} />
      <AdaptivePerformance tier={tier} maxDpr={dpr[1]} />
      <WarmUp onReady={() => setReady(true)} />
      <DisposeOnUnmount />
    </Canvas>
  );
}
