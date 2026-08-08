import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ScenePalette } from "../../palette";
import type { QualityTier } from "../../store";

/* ------------------------------------------------------------------ *
 * CAMPUS ENVIRONMENT
 * Fog, floating dust and a faint horizon. Adapts to the active theme:
 * deeper atmosphere in dark, cleaner architectural air in light.
 * ------------------------------------------------------------------ */

const BUDGET: Record<QualityTier, number> = { high: 1400, medium: 800, low: 420, mobile: 240 };

export function CampusEnvironment({
  palette,
  tier,
  motion,
}: {
  palette: ScenePalette;
  tier: QualityTier;
  motion: number;
}) {
  const count = BUDGET[tier];
  const points = useRef<THREE.Points>(null);
  const t = useRef(0);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 * 7;
      const r = 4 + (((i * 37) % 100) / 100) * 26;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (((i * 53) % 100) / 100) * 11 + 0.2;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt * motion;
    if (points.current) {
      points.current.rotation.y += dt * 0.012 * motion;
      points.current.position.y = Math.sin(t.current * 0.24) * 0.28 * motion;
    }
  });

  return (
    <group>
      <fog attach="fog" args={[palette.fog, 18, 62]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={[palette.buildingTop, palette.ground, 0.5]} />
      <directionalLight position={[8, 12, 6]} intensity={1.05} color={palette.buildingTop} />
      <directionalLight position={[-9, 4, -7]} intensity={0.35} color={palette.accent} />
      <points ref={points} geometry={geometry}>
        <pointsMaterial
          color={palette.particle}
          size={0.035}
          transparent
          opacity={0.42}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
