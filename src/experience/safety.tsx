import { Component, useEffect, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import type { QualityTier } from "./store";

/* ------------------------------------------------------------------ *
 * WEBGL SAFETY + ADAPTIVE PERFORMANCE
 *
 * Shared by the landing experience and the in-app spatial layer.
 * The rule: the interface must NEVER go blank because of the GPU.
 * Every failure path degrades to the CSS fallback and the DOM keeps
 * working exactly as before.
 * ------------------------------------------------------------------ */

/**
 * Catches lazy-chunk failures, shader compilation errors and any render
 * error thrown inside the Canvas subtree, then swaps in the CSS fallback.
 */
export class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    // Intentionally quiet in production paths: the visual layer is optional.
    if (import.meta.env.DEV) console.warn("[spatial] scene disabled:", error);
    this.props.onError?.();
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Handles WebGL context loss. Chromium/Safari drop the context on GPU
 * pressure, tab suspension or driver resets; without preventDefault the
 * canvas stays permanently black.
 */
export function ContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost as EventListener, false);
    return () => canvas.removeEventListener("webglcontextlost", handleLost as EventListener);
  }, [gl, onLost]);

  return null;
}

const MIN_DPR: Record<QualityTier, number> = { high: 1, medium: 0.9, low: 0.8, mobile: 0.75 };

/**
 * Keeps the scene at 60 FPS by trading resolution, and stops rendering
 * entirely while the tab is hidden (battery + no wasted frames).
 * Resolution only ever steps down, so it can never oscillate.
 */
export function AdaptivePerformance({ tier, maxDpr }: { tier: QualityTier; maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const dprRef = useRef(maxDpr);

  // Pause the render loop while the document is hidden.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setFrameloop("never");
      } else {
        setFrameloop("always");
        invalidate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [setFrameloop, invalidate]);

  // Rolling FPS sampling outside of useFrame: no per-frame React work.
  useEffect(() => {
    const floor = MIN_DPR[tier];
    let frames = 0;
    let slowSamples = 0;
    let raf = 0;
    let last = performance.now();
    let stopped = false;

    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        const fps = (frames * 1000) / (now - last);
        frames = 0;
        last = now;
        if (fps < 45) {
          slowSamples += 1;
          if (slowSamples >= 2 && dprRef.current > floor) {
            dprRef.current = Math.max(floor, dprRef.current - 0.25);
            setDpr(dprRef.current);
            slowSamples = 0;
          }
        } else {
          slowSamples = 0;
        }
      }
      if (!stopped) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [tier, setDpr]);

  return null;
}
