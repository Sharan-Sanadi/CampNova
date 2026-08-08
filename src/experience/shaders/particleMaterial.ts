import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

/* ==================================================================
 * DATA FIELD PARTICLES (fully GPU-displaced)
 * ------------------------------------------------------------------
 * Positions are uploaded once. All motion happens in the vertex
 * shader: slow ambient drift plus a gentle attraction toward the
 * intelligence core as narrative progress increases. Nothing is
 * updated per-particle on the CPU.
 *
 * uniforms
 *   uTime      — seconds
 *   uProgress  — 0..1 narrative progress; drives core attraction
 *   uColor     — particle tint (derived from the brand accent)
 *   uSize      — base point size in world units
 *   uMotion    — global motion scale (0 under prefers-reduced-motion)
 *   uFogColor / uFogNear / uFogFar — atmospheric falloff
 * ================================================================== */

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uSize;
  uniform float uMotion;

  attribute float aSeed;

  varying float vAlpha;
  varying float vDepth;

  void main() {
    vec3 p = position;

    // --- ambient drift: three decorrelated sines per axis, seeded per point
    float t = uTime * 0.12 * uMotion;
    p.x += sin(t + aSeed * 6.2831) * 0.55;
    p.y += sin(t * 1.34 + aSeed * 12.9) * 0.35;
    p.z += cos(t * 0.87 + aSeed * 9.7) * 0.55;

    // --- attraction toward the intelligence core (origin) as systems connect
    float pull = smoothstep(0.15, 0.85, uProgress) * 0.42;
    // Slight per-particle stagger so the field converges organically.
    pull *= 0.6 + 0.4 * aSeed;
    p = mix(p, p * 0.35 + vec3(0.0, 1.4, 0.0) * 0.15, pull);

    // --- rise: the data field lifts slightly as intelligence activates
    p.y += smoothstep(0.3, 1.0, uProgress) * (0.6 + aSeed * 0.8);

    vec4 view = viewMatrix * modelMatrix * vec4(p, 1.0);
    vDepth = -view.z;

    // Points near the camera and near the core read brightest.
    float radial = 1.0 - smoothstep(2.0, 16.0, length(p));
    vAlpha = (0.10 + radial * 0.42) * (0.45 + 0.55 * smoothstep(0.05, 0.5, uProgress));

    gl_Position = projectionMatrix * view;
    gl_PointSize = uSize * (26.0 / max(vDepth, 0.6));
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying float vAlpha;
  varying float vDepth;

  void main() {
    // Soft round sprite, no texture needed.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float mask = smoothstep(0.5, 0.06, d);
    if (mask <= 0.001) discard;

    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    vec3 color = mix(uColor, uFogColor, fog * 0.9);

    gl_FragColor = vec4(color, mask * vAlpha * (1.0 - fog * 0.85));
    #include <colorspace_fragment>
  }
`;

export const ParticleMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uSize: 1.6,
    uMotion: 1,
    uColor: new THREE.Color("#8fc6ea"),
    uFogColor: new THREE.Color("#0b0e11"),
    uFogNear: 12,
    uFogFar: 46,
  },
  vertex,
  fragment,
);

extend({ ParticleMaterial: ParticleMaterialImpl });

export type ParticleMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uProgress: number;
  uMotion: number;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    particleMaterial: {
      ref?: React.Ref<ParticleMaterialType>;
      key?: string | number;
      attach?: string;
      transparent?: boolean;
      depthWrite?: boolean;
      blending?: THREE.Blending;
      uTime?: number;
      uProgress?: number;
      uSize?: number;
      uMotion?: number;
      uColor?: THREE.Color | string;
      uFogColor?: THREE.Color | string;
      uFogNear?: number;
      uFogFar?: number;
    };
  }
}
