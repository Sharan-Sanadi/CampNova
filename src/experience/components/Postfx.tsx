import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import type { QualityTier } from "../store";

/**
 * Restrained postprocessing.
 *
 * Bloom: threshold 0.8, low intensity.
 * Chromatic aberration: ~0 at rest, brief lift during scene transitions only.
 * Noise + vignette: very low. DOF: high tier only, light.
 */
export function Postfx({
  tier,
  energyRef,
}: {
  tier: QualityTier;
  /** 0..1 transition energy, spiked by the scroll narrative. */
  energyRef: { value: number };
}) {
  // The effect keeps this exact Vector2 as its uniform value, so mutating it
  // in place animates the aberration without re-creating the effect.
  const offset = useRef(new THREE.Vector2(0.00016, 0.0001));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // Decay the transition energy, then map it to a barely-there RGB split.
    energyRef.value = THREE.MathUtils.damp(energyRef.value, 0, 2.4, dt);
    const amount = 0.00016 + energyRef.value * 0.0016;
    offset.current.set(amount, amount * 0.6);
  });

  if (tier === "mobile" || tier === "low") {
    return (
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom intensity={0.28} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette offset={0.32} darkness={0.42} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    );
  }

  if (tier === "high") {
    return (
      <EffectComposer enableNormalPass={false} multisampling={2}>
        <Bloom intensity={0.34} luminanceThreshold={0.8} luminanceSmoothing={0.28} mipmapBlur />
        <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={1.6} />
        <ChromaticAberration
          offset={offset.current}
          radialModulation={false}
          modulationOffset={0}
        />
        <Noise opacity={0.022} blendFunction={BlendFunction.OVERLAY} />
        <Vignette offset={0.3} darkness={0.4} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom intensity={0.32} luminanceThreshold={0.8} luminanceSmoothing={0.28} mipmapBlur />
      <ChromaticAberration offset={offset.current} radialModulation={false} modulationOffset={0} />
      <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      <Vignette offset={0.3} darkness={0.4} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  );
}
