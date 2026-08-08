import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

/* ==================================================================
 * GROUND PLANE — matte architectural surface
 * A dark/light matte plate with a very faint survey grid that fades
 * out with distance so the campus never reads as an infinite plane.
 *
 * uniforms: uColor (matte base), uAccent (grid tint), uProgress
 *           (grid confidence grows as systems connect), uFogColor.
 * ================================================================== */

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vLocal;

  void main() {
    vUv = uv;
    vLocal = position;
    vec4 view = viewMatrix * modelMatrix * vec4(position, 1.0);
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform vec3 uFogColor;
  uniform float uProgress;
  uniform float uTime;

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vLocal;

  void main() {
    // --- faint survey grid, antialiased with fwidth
    vec2 grid = abs(fract(vLocal.xy * 0.5) - 0.5) / fwidth(vLocal.xy * 0.5);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    // --- radial falloff so the plate dissolves outward
    float radial = 1.0 - smoothstep(6.0, 26.0, length(vLocal.xy));

    // Grid becomes slightly more confident once the campus is connected.
    float confidence = 0.05 + smoothstep(0.05, 0.6, uProgress) * 0.11;

    // --- slow intelligence pulse travelling out from the core
    float pulse = smoothstep(0.35, 1.0, uProgress) *
      smoothstep(0.9, 1.0, sin(length(vLocal.xy) * 0.55 - uTime * 0.5) * 0.5 + 0.5) * 0.06;

    vec3 color = uColor;
    color += uAccent * (line * confidence * radial + pulse * radial);

    float fog = smoothstep(10.0, 34.0, vDepth);
    color = mix(color, uFogColor, clamp(fog, 0.0, 1.0) * 0.95);

    gl_FragColor = vec4(color, radial * 0.92 + 0.08);
    #include <colorspace_fragment>
  }
`;

export const GroundMaterialImpl = shaderMaterial(
  {
    uColor: new THREE.Color("#0d1013"),
    uAccent: new THREE.Color("#25a2e8"),
    uFogColor: new THREE.Color("#0b0e11"),
    uProgress: 0,
    uTime: 0,
  },
  vertex,
  fragment,
);

extend({ GroundMaterial: GroundMaterialImpl });

export type GroundMaterialType = THREE.ShaderMaterial & {
  uProgress: number;
  uTime: number;
  uColor: THREE.Color;
  uAccent: THREE.Color;
  uFogColor: THREE.Color;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    groundMaterial: {
      ref?: React.Ref<GroundMaterialType>;
      key?: string | number;
      attach?: string;
      transparent?: boolean;
      uColor?: THREE.Color | string;
      uAccent?: THREE.Color | string;
      uFogColor?: THREE.Color | string;
      uProgress?: number;
      uTime?: number;
    };
  }
}
