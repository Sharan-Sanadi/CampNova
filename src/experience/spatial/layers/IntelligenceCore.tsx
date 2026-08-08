import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpatial, type IntelligenceState } from "../state";

/* ------------------------------------------------------------------ *
 * INTELLIGENCE CORE
 * The Copilot's spatial presence. One object, six restrained states.
 * ------------------------------------------------------------------ */

interface Profile {
  scale: number;
  spin: number;
  orbit: number;
  radius: number;
  glow: number;
}

const PROFILES: Record<IntelligenceState, Profile> = {
  idle: { scale: 1, spin: 0.08, orbit: 0.25, radius: 1.9, glow: 0.16 },
  listening: { scale: 1.1, spin: 0.12, orbit: 0.4, radius: 2.05, glow: 0.24 },
  thinking: { scale: 1.06, spin: 0.32, orbit: 1.5, radius: 1.7, glow: 0.34 },
  searching: { scale: 1.04, spin: 0.26, orbit: 1.1, radius: 2.6, glow: 0.3 },
  responding: { scale: 1.14, spin: 0.18, orbit: 0.8, radius: 2.0, glow: 0.42 },
  action: { scale: 1.2, spin: 0.14, orbit: 0.6, radius: 1.85, glow: 0.55 },
};

export function IntelligenceCore({
  accent,
  base,
  motion,
  count = 220,
  position = [0, 1.7, 0],
}: {
  accent: string;
  base: string;
  motion: number;
  count?: number;
  position?: [number, number, number];
}) {
  const state = useSpatial((s) => s.intelligenceState);
  const profile = PROFILES[state];

  const inner = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const orbiters = useRef<THREE.Points>(null);
  const t = useRef(0);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const y = (i % 7) / 7 - 0.5;
      positions[i * 3] = Math.cos(a);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a);
      seeds[i] = (i % 13) / 13;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt * motion;

    if (inner.current) {
      const breathe = 1 + Math.sin(t.current * 1.5) * 0.03;
      const s = profile.scale * breathe;
      inner.current.scale.setScalar(THREE.MathUtils.damp(inner.current.scale.x, s, 4, dt));
      inner.current.rotation.y += dt * profile.spin * motion;
      inner.current.rotation.x += dt * profile.spin * 0.3 * motion;
    }
    if (shell.current) {
      shell.current.rotation.y -= dt * profile.spin * 0.6 * motion;
      const m = shell.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.damp(m.opacity, profile.glow * 0.5, 4, dt);
      const s = profile.radius / 1.9;
      shell.current.scale.setScalar(THREE.MathUtils.damp(shell.current.scale.x, s, 3, dt));
    }
    if (orbiters.current) {
      orbiters.current.rotation.y += dt * profile.orbit * motion;
      const s = profile.radius / 1.9;
      orbiters.current.scale.setScalar(THREE.MathUtils.damp(orbiters.current.scale.x, s, 2.6, dt));
      const m = orbiters.current.material as THREE.PointsMaterial;
      m.opacity = THREE.MathUtils.damp(m.opacity, 0.3 + profile.glow, 4, dt);
    }
  });

  return (
    <group position={position}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          color={base}
          emissive={accent}
          emissiveIntensity={profile.glow * 1.6}
          roughness={0.42}
          metalness={0.35}
          flatShading
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.9, 1]} />
        <meshBasicMaterial color={accent} wireframe transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <points ref={orbiters} geometry={geometry} scale={1.9}>
        <pointsMaterial
          color={accent}
          size={0.05}
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
