import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BOOKING_CELLS, BOOKING_HOURS, BOOKING_ROOMS } from "../layout";
import { useSpatial } from "../state";
import type { ToneSet } from "../tones";
import type { ScenePalette } from "../../palette";

/* ------------------------------------------------------------------ *
 * BOOKING LAYER
 * A spatial timeline: rooms on Z, hours on X. Booked blocks rise,
 * conflicts intersect and pulse an amber signal.
 * ------------------------------------------------------------------ */

const CELL = 0.9;

export function BookingLayer({
  palette,
  tones,
  motion,
}: {
  palette: ScenePalette;
  tones: ToneSet;
  motion: number;
}) {
  const conflictActive = useSpatial((s) => s.bookingConflict);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const t = useRef(0);

  const cells = BOOKING_CELLS;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt * motion;
    const m = mesh.current;
    if (!m) return;

    const offsetX = ((BOOKING_HOURS - 1) * CELL) / 2;
    const offsetZ = ((BOOKING_ROOMS - 1) * CELL) / 2;

    cells.forEach((cell, i) => {
      const booked = cell.state !== "free";
      const wave = Math.sin(t.current * 1.4 + i * 0.3) * 0.04;
      const conflict = cell.state === "conflict";
      const h = booked ? 0.55 + (conflict ? 0.4 : 0.18) + wave : 0.08;
      // Conflicts deliberately overlap their neighbour in X.
      const nudge = conflict ? (cell.hour === 4 ? 0.22 : -0.22) : 0;
      dummy.position.set(cell.hour * CELL - offsetX + nudge, h / 2, cell.room * CELL - offsetZ);
      dummy.scale.set(CELL * 0.82, h, CELL * 0.72);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);

      const pulse = conflict ? 0.6 + Math.sin(t.current * 4) * 0.4 : 0;
      color.set(conflict ? tones.conflict : booked ? palette.accent : palette.building);
      if (conflict && conflictActive) color.multiplyScalar(0.8 + pulse * 0.5);
      m.setColorAt(i, color);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[0, 0.02, 0]}>
      <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} metalness={0.15} />
      </instancedMesh>
      {/* Time axis rail */}
      <mesh
        position={[0, 0.005, ((BOOKING_ROOMS - 1) * CELL) / 2 + CELL]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[BOOKING_HOURS * CELL, 0.04]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}
