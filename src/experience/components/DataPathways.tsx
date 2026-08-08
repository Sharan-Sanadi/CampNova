import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BUILDINGS } from "../scenes";

/* ==================================================================
 * DATA PATHWAYS
 * Thin luminous tubes from each campus system to the intelligence
 * core. Reveal and flow are driven by narrative progress: the paths
 * literally do not exist while the campus is fragmented.
 * ================================================================== */

const pathVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const pathFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uReveal;   // 0..1 how much of this path exists yet
  uniform float uFlow;     // travelling packet brightness
  varying vec2 vUv;

  void main() {
    // uv.x runs along the tube: reveal draws the path from the core outward.
    float along = vUv.x;
    float exists = smoothstep(uReveal, uReveal - 0.35, along);
    if (exists <= 0.001) discard;

    // A travelling data packet, plus a faint constant conduit.
    float packet = smoothstep(0.72, 1.0, sin((along * 4.0 - uTime * 0.9) * 3.14159) * 0.5 + 0.5);
    float conduit = 0.22;

    float alpha = exists * (conduit + packet * uFlow * 0.85);
    gl_FragColor = vec4(uAccent * (0.55 + packet * uFlow), alpha);
    #include <colorspace_fragment>
  }
`;

export function DataPathways({
  accent,
  progressRef,
  motion,
}: {
  accent: string;
  progressRef: { value: number };
  motion: number;
}) {
  const geometries = useMemo(
    () =>
      BUILDINGS.map((b) => {
        const start = new THREE.Vector3(0, 1.1, 0);
        const end = new THREE.Vector3(b.position[0] * 0.86, 0.55, b.position[2] * 0.86);
        const mid = start
          .clone()
          .lerp(end, 0.5)
          .add(new THREE.Vector3(0, 0.9, 0));
        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        return new THREE.TubeGeometry(curve, 28, 0.028, 6, false);
      }),
    [],
  );

  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  const uniforms = useMemo(
    () =>
      BUILDINGS.map((_, i) => ({
        uAccent: { value: accentColor.clone() },
        uTime: { value: i * 1.3 },
        uReveal: { value: 0 },
        uFlow: { value: 0 },
      })),
    [accentColor],
  );

  const matsRef = useRef<Array<THREE.ShaderMaterial | null>>([]);

  useFrame((_, delta) => {
    const p = progressRef.value;
    const dt = Math.min(delta, 0.05);
    uniforms.forEach((u, i) => {
      const spec = BUILDINGS[i]!;
      // Systems join in sequence across SCENE_02 (connect) → SCENE_03.
      const target = THREE.MathUtils.clamp((p - 0.12 - spec.joinOrder * 0.1) / 0.24, 0, 1);
      u.uReveal.value = THREE.MathUtils.damp(u.uReveal.value, target, 6, dt);
      u.uFlow.value = THREE.MathUtils.damp(
        u.uFlow.value,
        THREE.MathUtils.smoothstep(p, 0.3, 0.6),
        4,
        dt,
      );
      u.uTime.value += dt * motion;
      u.uAccent.value.copy(accentColor);
    });
  });

  return (
    <group>
      {geometries.map((geo, i) => (
        <mesh key={BUILDINGS[i]!.id} geometry={geo} frustumCulled={false}>
          <shaderMaterial
            ref={(m) => {
              matsRef.current[i] = m as THREE.ShaderMaterial | null;
            }}
            vertexShader={pathVertex}
            fragmentShader={pathFragment}
            uniforms={uniforms[i]!}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
