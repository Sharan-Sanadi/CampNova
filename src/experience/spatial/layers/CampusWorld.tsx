import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ScenePalette } from "../../palette";
import type { ToneSet } from "../tones";
import { CAMPUS_BLOCKS, type CampusBlock } from "../layout";
import { pointer, useSpatial, type CampusMode } from "../state";

/* ------------------------------------------------------------------ *
 * CAMPUS DIGITAL TWIN
 * Stylised procedural architecture: one volume per campus system,
 * plus a spatial utilisation column and a ghosted forecast volume.
 * ------------------------------------------------------------------ */

function toneFor(block: CampusBlock, mode: CampusMode, tones: ToneSet, palette: ScenePalette) {
  if (mode === "energy") return block.energy > 0.7 ? tones.conflict : tones.optimized;
  if (mode === "alerts") return block.health === "conflict" ? tones.alert : palette.accent;
  if (mode === "resources") return block.utilization > 0.8 ? tones.conflict : tones.demand;
  if (block.health === "conflict") return tones.conflict;
  if (block.health === "optimized") return tones.optimized;
  return palette.accent;
}

function Block({
  block,
  palette,
  tones,
  motion,
}: {
  block: CampusBlock;
  palette: ScenePalette;
  tones: ToneSet;
  motion: number;
}) {
  const group = useRef<THREE.Group>(null);
  const column = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const ghost = useRef<THREE.Mesh>(null);

  const mode = useSpatial((s) => s.campusMode);
  const predict = useSpatial((s) => s.predictionMode);
  const hovered = useSpatial((s) => s.hoveredObject);
  const selectedBuilding = useSpatial((s) => s.selectedBuilding);
  const selectedResource = useSpatial((s) => s.selectedResource);

  const accent = useMemo(
    () => new THREE.Color(toneFor(block, mode, tones, palette)),
    [block, mode, tones, palette],
  );
  const focused =
    hovered === block.id || selectedBuilding === block.id || selectedResource === block.id;

  const t = useRef(block.order * 4);
  /* One shared material for every storey band of this block. */
  const bandMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.buildingTop),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    [palette.buildingTop],
  );
  useEffect(() => () => bandMaterial.dispose(), [bandMaterial]);

  /* Architectural light bands: one thin illuminated storey per ~0.8 units.
     Heights are derived once — no geometry is created per frame. */
  const bandHeights = useMemo(() => {
    const height = block.size[1];
    const floors = Math.max(2, Math.min(4, Math.round(height / 0.8)));
    return Array.from(
      { length: floors },
      (_, i) => -height / 2 + (height * (i + 0.65)) / (floors + 0.3),
    );
  }, [block.size]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    t.current += dt * motion;

    if (group.current) {
      // Idle breathing — subconscious, never distracting.
      const breathe = Math.sin(t.current * 0.7 + block.order * 5) * 0.03 * motion;
      const lift = focused ? 0.38 : 0;
      group.current.position.y = THREE.MathUtils.damp(
        group.current.position.y,
        breathe + lift,
        4,
        dt,
      );
      group.current.scale.setScalar(
        THREE.MathUtils.damp(group.current.scale.x, focused ? 1.04 : 1, 5, dt),
      );
    }

    if (column.current) {
      const target = 0.25 + block.utilization * 2.4;
      column.current.scale.y = THREE.MathUtils.damp(column.current.scale.y, target, 3.5, dt);
      column.current.position.y = column.current.scale.y / 2;
    }

    if (glow.current) {
      const pulse = 0.1 + block.utilization * 0.16 + (focused ? 0.3 : 0);
      glow.current.opacity = THREE.MathUtils.damp(glow.current.opacity, pulse, 5, dt);
      glow.current.color.lerp(accent, 0.08);
    }

    // Occupancy reads as building activity: lit storeys, gently flickering.
    const flicker = 0.04 * Math.sin(t.current * 1.6 + block.order * 2.1);
    const bandTarget = 0.16 + block.utilization * 0.34 + (focused ? 0.22 : 0) + flicker;
    bandMaterial.opacity = THREE.MathUtils.damp(bandMaterial.opacity, bandTarget, 4, dt);

    if (ghost.current) {
      const m = ghost.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.damp(m.opacity, predict ? 0.14 : 0, 4, dt);
      const h = 1 + (predict ? 0.32 + block.utilization * 0.5 : 0);
      ghost.current.scale.y = THREE.MathUtils.damp(ghost.current.scale.y, h, 3, dt);
      ghost.current.position.y = (block.size[1] * (ghost.current.scale.y - 1)) / 2;
    }
  });

  return (
    <group position={block.position}>
      <group ref={group}>
        {/* Architectural volume */}
        <mesh>
          <boxGeometry args={block.size} />
          <meshStandardMaterial color={palette.building} roughness={0.72} metalness={0.12} />
        </mesh>
        {/* Glazed crown */}
        <mesh position={[0, block.size[1] / 2 + 0.05, 0]}>
          <boxGeometry args={[block.size[0] * 0.84, 0.1, block.size[2] * 0.84]} />
          <meshStandardMaterial color={palette.buildingTop} roughness={0.3} metalness={0.45} />
        </mesh>
        {/* Storey light bands — shared material, minimal draw cost */}
        {bandHeights.map((y) => (
          <mesh key={y} position={[0, y, 0]} material={bandMaterial}>
            <boxGeometry args={[block.size[0] * 1.004, 0.045, block.size[2] * 1.004]} />
          </mesh>
        ))}
        {/* State signal — thin emissive band, not neon */}
        <mesh position={[0, -block.size[1] / 2 + 0.06, 0]}>
          <boxGeometry args={[block.size[0] * 1.02, 0.06, block.size[2] * 1.02]} />
          <meshBasicMaterial ref={glow} color={accent} transparent opacity={0.1} />
        </mesh>
        {/* Utilisation as physical volume */}
        <mesh
          ref={column}
          position={[block.size[0] / 2 + 0.28, 0, block.size[2] / 2 + 0.28]}
          scale={[1, 0.25, 1]}
        >
          <boxGeometry args={[0.14, 1, 0.14]} />
          <meshBasicMaterial color={accent} transparent opacity={0.5} />
        </mesh>
        {/* Forecast ghost */}
        <mesh ref={ghost}>
          <boxGeometry args={block.size} />
          <meshBasicMaterial color={accent} transparent opacity={0} depthWrite={false} wireframe />
        </mesh>
      </group>
    </group>
  );
}

export function CampusWorld({
  palette,
  tones,
  motion,
  parallax,
}: {
  palette: ScenePalette;
  tones: ToneSet;
  motion: number;
  parallax: boolean;
}) {
  const root = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!root.current) return;
    const ry = parallax ? pointer.x * 0.09 : 0;
    const rx = parallax ? -pointer.y * 0.04 : 0;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, ry, 2.2, dt);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, rx, 2.2, dt);
  });

  return (
    <group ref={root}>
      {/* Ground plate + faint survey grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={palette.ground} roughness={0.95} metalness={0} />
      </mesh>
      <gridHelper
        args={[64, 64, palette.accent, palette.accent]}
        position={[0, 0.01, 0]}
        // Grid is atmosphere, not chrome: keep it barely perceptible.
        material-transparent
        material-opacity={0.045}
      />
      {CAMPUS_BLOCKS.map((b) => (
        <Block key={b.id} block={b} palette={palette} tones={tones} motion={motion} />
      ))}
    </group>
  );
}
