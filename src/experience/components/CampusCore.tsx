import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BUILDINGS, type BuildingSpec } from "../scenes";
import { useExperience, type HoveredBuilding } from "../store";
import { CampusMaterialImpl, type CampusMaterialType } from "../shaders/campusMaterial";
import { GroundMaterialImpl, type GroundMaterialType } from "../shaders/groundMaterial";
import type { ScenePalette } from "../palette";

void CampusMaterialImpl;
void GroundMaterialImpl;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* ------------------------------------------------------------------ *
 * A single campus system block. Moves from its fragmented position to
 * its aligned position with damped (never linear) motion.
 * ------------------------------------------------------------------ */
function Building({
  spec,
  palette,
  progressRef,
  motion,
  registerMesh,
  hoveredId,
}: {
  spec: BuildingSpec;
  palette: ScenePalette;
  progressRef: { value: number };
  motion: number;
  registerMesh: (id: string, mesh: THREE.Mesh | null) => void;
  hoveredId: string | null;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<CampusMaterialType>(null);
  const from = useMemo(() => new THREE.Vector3().fromArray(spec.fragment), [spec]);
  const to = useMemo(() => new THREE.Vector3().fromArray(spec.position), [spec]);
  const desired = useRef(new THREE.Vector3().copy(from));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = progressRef.value;

    // Assembly window is staggered per system so the campus locks in sequence.
    const t = easeOutCubic(THREE.MathUtils.clamp((p - 0.06 - spec.joinOrder * 0.12) / 0.34, 0, 1));
    desired.current.lerpVectors(from, to, t);

    if (group.current) {
      const g = group.current;
      g.position.x = THREE.MathUtils.damp(g.position.x, desired.current.x, 3, dt);
      g.position.y = THREE.MathUtils.damp(g.position.y, desired.current.y, 3, dt);
      g.position.z = THREE.MathUtils.damp(g.position.z, desired.current.z, 3, dt);
      // Fragmented blocks are slightly askew; they square up as they connect.
      const yaw = (1 - t) * (spec.joinOrder - 0.5) * 0.55;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, yaw, 3, dt);
    }

    if (mat.current) {
      mat.current.uTime += dt * motion;
      mat.current.uProgress = THREE.MathUtils.damp(mat.current.uProgress, p, 5, dt);
      mat.current.uHover = THREE.MathUtils.damp(
        mat.current.uHover,
        hoveredId === spec.id ? 1 : 0,
        7,
        dt,
      );
    }
  });

  return (
    <group ref={group} position={spec.fragment}>
      <mesh ref={(m) => registerMesh(spec.id, m)} userData={{ buildingId: spec.id }}>
        <boxGeometry args={spec.size} />
        <campusMaterial
          ref={mat}
          uColor={palette.building}
          uAccent={palette.accent}
          uFogColor={palette.fog}
          uNoise={1}
          uIntensity={0.06}
        />
      </mesh>
      {/* Crown: a lighter semi-reflective cap reads as glazing */}
      <mesh position={[0, spec.size[1] / 2 + 0.06, 0]}>
        <boxGeometry args={[spec.size[0] * 0.82, 0.12, spec.size[2] * 0.82]} />
        <meshStandardMaterial color={palette.buildingTop} roughness={0.35} metalness={0.4} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The intelligence core — restrained emissive structure at the centre.
 * ------------------------------------------------------------------ */
function IntelligenceCore({
  palette,
  progressRef,
  motion,
}: {
  palette: ScenePalette;
  progressRef: { value: number };
  motion: number;
}) {
  const inner = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const mat = useRef<CampusMaterialType>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = progressRef.value;
    // Core activation is a SCENE_03 event.
    const active = THREE.MathUtils.smoothstep(p, 0.28, 0.55);

    if (mat.current) {
      mat.current.uTime += dt * motion;
      mat.current.uProgress = THREE.MathUtils.damp(mat.current.uProgress, p, 5, dt);
      mat.current.uIntensity = THREE.MathUtils.damp(
        mat.current.uIntensity,
        0.12 + active * 0.6,
        4,
        dt,
      );
    }
    if (inner.current) {
      const s = 0.55 + active * 0.55;
      inner.current.scale.setScalar(THREE.MathUtils.damp(inner.current.scale.x, s, 3, dt));
      inner.current.rotation.y += dt * 0.12 * motion;
    }
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.06 * motion;
      shell.current.rotation.x += dt * 0.02 * motion;
      const m = shell.current.material as THREE.MeshBasicMaterial;
      m.opacity = THREE.MathUtils.damp(m.opacity, 0.05 + active * 0.16, 4, dt);
    }
  });

  return (
    <group position={[0, 1.5, 0]}>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.1, 2]} />
        <campusMaterial
          ref={mat}
          uColor={palette.building}
          uAccent={palette.core}
          uFogColor={palette.fog}
          uNoise={0.6}
          uIntensity={0.2}
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial
          color={palette.accent}
          wireframe
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Hover pick — the canvas is pointer-events:none so DOM interaction is
 * never intercepted. We raycast from a window-level pointer instead.
 * ------------------------------------------------------------------ */
function HoverPicker({ meshes }: { meshes: React.MutableRefObject<Map<string, THREE.Mesh>> }) {
  const { camera, size } = useThree();
  const setHovered = useExperience((s) => s.setHovered);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2(2, 2));
  const screen = useRef({ x: 0, y: 0 });
  const current = useRef<string | null>(null);
  const accum = useRef(0);
  const projected = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ndc.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      screen.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_, delta) => {
    // Throttle picking to ~12Hz — it is a nicety, not a hot path.
    accum.current += delta;
    if (accum.current < 0.08) return;
    accum.current = 0;

    raycaster.setFromCamera(ndc.current, camera);
    const targets = Array.from(meshes.current.values());
    const hit = raycaster.intersectObjects(targets, false)[0];
    const id = (hit?.object.userData["buildingId"] as string | undefined) ?? null;

    if (id === current.current) return;
    current.current = id;

    if (!id) {
      setHovered(null);
      return;
    }
    const spec = BUILDINGS.find((b) => b.id === id)!;
    const mesh = meshes.current.get(id)!;
    projected.setFromMatrixPosition(mesh.matrixWorld).project(camera);
    const payload: HoveredBuilding = {
      id,
      label: spec.label,
      stat: spec.stat,
      note: spec.note,
      x: ((projected.x + 1) / 2) * size.width,
      y: ((1 - projected.y) / 2) * size.height,
    };
    setHovered(payload);
  });

  return null;
}

export function CampusCore({
  palette,
  progressRef,
  motion,
  enableHover,
}: {
  palette: ScenePalette;
  progressRef: { value: number };
  motion: number;
  enableHover: boolean;
}) {
  const meshes = useRef(new Map<string, THREE.Mesh>());
  const hovered = useExperience((s) => s.hovered);
  const ground = useRef<GroundMaterialType>(null);

  const registerMesh = (id: string, mesh: THREE.Mesh | null) => {
    if (mesh) meshes.current.set(id, mesh);
    else meshes.current.delete(id);
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (ground.current) {
      ground.current.uTime += dt * motion;
      ground.current.uProgress = THREE.MathUtils.damp(
        ground.current.uProgress,
        progressRef.value,
        5,
        dt,
      );
    }
  });

  return (
    <group>
      {/* Matte architectural ground plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[70, 70, 1, 1]} />
        <groundMaterial
          ref={ground}
          uColor={palette.ground}
          uAccent={palette.accent}
          uFogColor={palette.fog}
          transparent
        />
      </mesh>

      {BUILDINGS.map((spec) => (
        <Building
          key={spec.id}
          spec={spec}
          palette={palette}
          progressRef={progressRef}
          motion={motion}
          registerMesh={registerMesh}
          hoveredId={hovered?.id ?? null}
        />
      ))}

      <IntelligenceCore palette={palette} progressRef={progressRef} motion={motion} />

      {enableHover ? <HoverPicker meshes={meshes} /> : null}
    </group>
  );
}
