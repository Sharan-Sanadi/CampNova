import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PARTICLE_BUDGET, type QualityTier } from "../store";
import { ParticleMaterialImpl, type ParticleMaterialType } from "../shaders/particleMaterial";

void ParticleMaterialImpl; // keep the extend() side effect

/**
 * GPU data field. Positions are uploaded once; every frame only three
 * uniforms change. Count is driven by the detected quality tier.
 */
export function DataField({
  tier,
  color,
  fog,
  progressRef,
  motion,
}: {
  tier: QualityTier;
  color: string;
  fog: string;
  progressRef: { value: number };
  motion: number;
}) {
  const count = PARTICLE_BUDGET[tier];

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Distribute in a flattened cylinder around the campus footprint.
      const radius = 3 + Math.pow(Math.random(), 0.6) * 15;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 9 - 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
    return geo;
  }, [count]);

  const matRef = useRef<ParticleMaterialType>(null);

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uTime += Math.min(delta, 0.05) * motion;
    m.uProgress = THREE.MathUtils.damp(m.uProgress, progressRef.value, 5, Math.min(delta, 0.05));
    m.uMotion = motion;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <particleMaterial
        ref={matRef}
        uColor={color}
        uFogColor={fog}
        uSize={tier === "mobile" ? 1.2 : 1.7}
        uMotion={motion}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
