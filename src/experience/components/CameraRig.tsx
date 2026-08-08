import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { sampleCamera, sceneKeyFor } from "../scenes";
import { useExperience } from "../store";

/**
 * Camera rig — scroll is the primary control.
 *
 * Scroll sets a *target* on the waypoint spline; the camera then critically
 * damps toward it, so it always arrives late and settles. Mouse parallax is a
 * tiny desktop-only additive offset (±0.15 x, ±0.08 y) and can never take over.
 */
export function CameraRig({
  progressRef,
  reducedMotion,
  parallax,
}: {
  progressRef: { value: number };
  reducedMotion: boolean;
  parallax: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const setActiveScene = useExperience((s) => s.setActiveScene);

  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3(0, 1.2, 0));
  const pointer = useRef({ x: 0, y: 0 });
  const lastScene = useRef("");

  useEffect(() => {
    if (!parallax) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const fov = sampleCamera(progressRef.value, targetPos.current, targetLook.current);

    if (parallax && !reducedMotion) {
      targetPos.current.x += pointer.current.x * 0.15;
      targetPos.current.y += -pointer.current.y * 0.08;
    }

    // Reduced motion: snap (no smoothing), otherwise damp.
    const lambda = reducedMotion ? 1e6 : 2.4;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.current.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.current.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.current.z, lambda, dt);

    currentLook.current.x = THREE.MathUtils.damp(
      currentLook.current.x,
      targetLook.current.x,
      lambda,
      dt,
    );
    currentLook.current.y = THREE.MathUtils.damp(
      currentLook.current.y,
      targetLook.current.y,
      lambda,
      dt,
    );
    currentLook.current.z = THREE.MathUtils.damp(
      currentLook.current.z,
      targetLook.current.z,
      lambda,
      dt,
    );
    camera.lookAt(currentLook.current);

    const nextFov = THREE.MathUtils.damp(camera.fov, fov, reducedMotion ? 1e6 : 2.2, dt);
    if (Math.abs(nextFov - camera.fov) > 0.001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }

    const key = sceneKeyFor(progressRef.value);
    if (key !== lastScene.current) {
      lastScene.current = key;
      setActiveScene(key);
    }
  });

  return null;
}
