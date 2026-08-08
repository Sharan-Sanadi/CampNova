import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

/* ==================================================================
 * CAMPUS ARCHITECTURAL MATERIAL
 * ------------------------------------------------------------------
 * A restrained architectural material for the campus blocks and the
 * intelligence core. Not a neon shader: emission is clamped, the
 * "glow" comes from a fresnel rim and a thin scanning band.
 *
 * uniforms
 *   uTime       — seconds, drives the slow surface + scan motion
 *   uProgress   — 0..1 narrative progress (fragmented → autonomous)
 *   uColor      — base architectural body color (design token)
 *   uAccent     — CampusOS intelligence accent (brand primary)
 *   uNoise      — amount of procedural surface variation
 *   uIntensity  — controlled emission amount (core > buildings)
 *   uHover      — 0..1 hover response for this block
 *   uFogColor   — background color the block dissolves into
 *   uFogNear/Far— depth range of the atmospheric falloff
 * ================================================================== */

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uNoise;

  varying vec3 vNormalW;      // world-space normal, for fresnel + key light
  varying vec3 vViewDir;      // surface → camera, for fresnel
  varying vec3 vLocal;        // local position, for the architectural gradient
  varying float vDepth;       // view depth, for fog

  void main() {
    vLocal = position;

    // Very subtle vertex breathing so the architecture feels alive but never
    // wobbly. Amplitude scales down as the campus locks into place.
    float settle = 1.0 - smoothstep(0.25, 0.6, uProgress);
    float breathe = sin(uTime * 0.6 + position.y * 1.7) * 0.012 * uNoise * settle;

    vec3 displaced = position + normal * breathe;

    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vec4 view = viewMatrix * world;

    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    vDepth = -view.z;

    gl_Position = projectionMatrix * view;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uNoise;
  uniform float uIntensity;
  uniform float uHover;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vLocal;
  varying float vDepth;

  // Cheap 3D value noise — used only for micro surface variation so the
  // matte façades do not read as flat plastic.
  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }
  float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash(i);
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 normal = normalize(vNormalW);

    // ---- architectural lighting: one soft key, one rim, ambient fill ----
    vec3 keyDir = normalize(vec3(0.55, 0.9, 0.35));
    vec3 rimDir = normalize(vec3(-0.7, 0.25, -0.5));
    float key = max(dot(normal, keyDir), 0.0);
    float rim = max(dot(normal, rimDir), 0.0);
    float ambient = 0.34 + 0.12 * normal.y;

    // ---- vertical architectural gradient (base darker, crown lighter) ----
    float gradient = smoothstep(-1.6, 2.4, vLocal.y);

    // ---- procedural surface variation ----
    float grain = valueNoise(vLocal * 3.2) * uNoise * 0.09;

    vec3 base = uColor * (ambient + key * 0.62 + rim * 0.18);
    base += gradient * 0.10;
    base += grain;

    // ---- fresnel edge lighting: the signature intelligence rim ----
    float fresnel = pow(1.0 - clamp(dot(normal, normalize(vViewDir)), 0.0, 1.0), 3.0);

    // Rim energy grows as systems connect, so "intelligence" is a lighting
    // event rather than a color change.
    float connected = smoothstep(0.08, 0.55, uProgress);
    float rimEnergy = fresnel * (0.18 + connected * 0.5 + uHover * 0.55);

    // ---- thin scanning band: data being read off the building ----
    float scan = smoothstep(0.985, 1.0, sin(vLocal.y * 2.2 - uTime * 0.55) * 0.5 + 0.5);
    float emission = uIntensity * (0.35 + connected * 0.65) + scan * 0.20 * connected;

    vec3 color = base + uAccent * (rimEnergy + emission * 0.9);

    // ---- atmospheric depth: dissolve into the background palette ----
    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    color = mix(color, uFogColor, fog * 0.92);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const CampusMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uColor: new THREE.Color("#171c21"),
    uAccent: new THREE.Color("#25a2e8"),
    uNoise: 1,
    uIntensity: 0,
    uHover: 0,
    uFogColor: new THREE.Color("#0b0e11"),
    uFogNear: 12,
    uFogFar: 46,
  },
  vertex,
  fragment,
);

extend({ CampusMaterial: CampusMaterialImpl });

export type CampusMaterialType = THREE.ShaderMaterial & {
  uTime: number;
  uProgress: number;
  uIntensity: number;
  uHover: number;
  uNoise: number;
  uColor: THREE.Color;
  uAccent: THREE.Color;
  uFogColor: THREE.Color;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    campusMaterial: {
      ref?: React.Ref<CampusMaterialType>;
      key?: string | number;
      attach?: string;
      transparent?: boolean;
      uTime?: number;
      uProgress?: number;
      uColor?: THREE.Color | string;
      uAccent?: THREE.Color | string;
      uNoise?: number;
      uIntensity?: number;
      uHover?: number;
      uFogColor?: THREE.Color | string;
      uFogNear?: number;
      uFogFar?: number;
    };
  }
}
