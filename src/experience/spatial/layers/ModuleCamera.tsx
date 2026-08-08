import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { pointer, spatialEnergy, useSpatial, type SpatialModule } from "../state";
import { blockById } from "../layout";

/* ------------------------------------------------------------------ *
 * MODULE CAMERA
 * One camera, one world. Modules are camera destinations, so moving
 * between screens feels like travelling through a single campus.
 * ------------------------------------------------------------------ */

interface Shot {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const SHOTS: Record<SpatialModule, Shot> = {
  dashboard: { position: [0.5, 12.5, 19], target: [0, 1.2, 0], fov: 40 },
  copilot: { position: [0, 3.4, 8.6], target: [0, 1.8, 0], fov: 34 },
  resources: { position: [-11.5, 6.2, 13.5], target: [-0.5, 1.4, 0], fov: 38 },
  "resource-detail": { position: [-6.4, 3.1, 8.2], target: [-1.2, 1.5, 0.4], fov: 32 },
  bookings: { position: [8.5, 6.4, 12.4], target: [0.6, 0.9, 0], fov: 36 },
  "booking-detail": { position: [4.6, 3.4, 8.4], target: [0.4, 0.8, 0], fov: 32 },
  intelligence: { position: [0, 15.5, 22.5], target: [0, 0.8, 0], fov: 44 },
  analytics: { position: [0.5, 7.8, 15.5], target: [0, 1.4, 0], fov: 38 },
  activity: { position: [-6.5, 8.4, 16.5], target: [0, 1.2, 0], fov: 40 },
  notifications: { position: [7.2, 9.4, 17.5], target: [0, 1.2, 0], fov: 40 },
  generic: { position: [1.5, 11, 20], target: [0, 1.2, 0], fov: 42 },
};

export function ModuleCamera({
  reducedMotion,
  parallax,
}: {
  reducedMotion: boolean;
  parallax: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const activeModule = useSpatial((s) => s.activeModule);
  const selectedBuilding = useSpatial((s) => s.selectedBuilding);
  const selectedResource = useSpatial((s) => s.selectedResource);

  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const current = useRef(new THREE.Vector3().fromArray(SHOTS.generic.position));
  const currentLook = useRef(new THREE.Vector3().fromArray(SHOTS.generic.target));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const shot = SHOTS[activeModule] ?? SHOTS.generic;
    desired.fromArray(shot.position);
    look.fromArray(shot.target);

    // Selecting a resource travels the camera toward that building.
    const focus = blockById(selectedBuilding ?? selectedResource);
    if (focus) {
      const p = new THREE.Vector3(...focus.position);
      desired.lerp(p.clone().add(new THREE.Vector3(0, 3.2, 6.4)), 0.55);
      look.lerp(p.clone().setY(focus.size[1] * 0.6), 0.7);
    }

    if (parallax && !reducedMotion) {
      desired.x += pointer.x * 0.9;
      desired.y += -pointer.y * 0.55;
    }

    const lambda = reducedMotion ? 12 : 1.6;
    current.current.x = THREE.MathUtils.damp(current.current.x, desired.x, lambda, dt);
    current.current.y = THREE.MathUtils.damp(current.current.y, desired.y, lambda, dt);
    current.current.z = THREE.MathUtils.damp(current.current.z, desired.z, lambda, dt);
    currentLook.current.x = THREE.MathUtils.damp(currentLook.current.x, look.x, lambda, dt);
    currentLook.current.y = THREE.MathUtils.damp(currentLook.current.y, look.y, lambda, dt);
    currentLook.current.z = THREE.MathUtils.damp(currentLook.current.z, look.z, lambda, dt);

    camera.position.copy(current.current);
    camera.lookAt(currentLook.current);
    const fov = THREE.MathUtils.damp(camera.fov, shot.fov, lambda, dt);
    if (Math.abs(fov - camera.fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Decay the transition energy spike.
    spatialEnergy.value = THREE.MathUtils.damp(spatialEnergy.value, 0, 2.4, dt);
  });

  return null;
}
