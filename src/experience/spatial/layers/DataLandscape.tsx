import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TERRAIN_COLS, TERRAIN_ROWS, terrainHeight } from "../layout";
import type { ScenePalette } from "../../palette";

/* ------------------------------------------------------------------ *
 * DATA LANDSCAPE
 * Analytics as terrain: X = time, Z = resource, Y = utilisation.
 * Supplementary only — DOM charts remain the readable source.
 * ------------------------------------------------------------------ */

export function DataLandscape({ palette, motion }: { palette: ScenePalette; motion: number }) {
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(22, 12, TERRAIN_COLS, TERRAIN_ROWS);
    const pos = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const col = i % (TERRAIN_COLS + 1);
      const row = Math.floor(i / (TERRAIN_COLS + 1));
      pos.setZ(i, terrainHeight(col, row) * 2.1);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt * motion;
    if (group.current) {
      group.current.position.y = 0.6 + Math.sin(t.current * 0.5) * 0.05 * motion;
    }
  });

  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={palette.building}
          roughness={0.65}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Ridge lines keep exact reading to the DOM chart, depth to the 3D */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={palette.accent}
          wireframe
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
