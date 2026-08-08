import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { NETWORK_CENTER, NETWORK_NODES } from "../layout";
import { useSpatial } from "../state";

/* ------------------------------------------------------------------ *
 * INTELLIGENCE NETWORK + DATA FLOW
 * Every campus system links to the CampusOS core. Packets travel the
 * links so the product reads as "understanding data", not storing it.
 * ------------------------------------------------------------------ */

const PACKETS_PER_LINK = 3;

export function IntelligenceNetwork({
  accent,
  motion,
  tier,
}: {
  accent: string;
  motion: number;
  tier: "high" | "medium" | "low" | "mobile";
}) {
  const active = useSpatial((s) => s.intelligenceState);
  const mode = useSpatial((s) => s.campusMode);
  const hovered = useSpatial((s) => s.hoveredObject);

  const perLink = tier === "high" ? PACKETS_PER_LINK : tier === "medium" ? 2 : 1;

  const links = useMemo(
    () =>
      NETWORK_NODES.map((n) => {
        const mid = n.position
          .clone()
          .add(NETWORK_CENTER)
          .multiplyScalar(0.5)
          .add(new THREE.Vector3(0, 1.1, 0));
        const curve = new THREE.QuadraticBezierCurve3(
          n.position.clone(),
          mid,
          NETWORK_CENTER.clone(),
        );
        return { id: n.id, curve, points: curve.getPoints(28) };
      }),
    [],
  );

  const packets = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const time = useRef(0);
  const total = links.length * perLink;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speedBoost =
      active === "thinking" || active === "searching" ? 1.9 : active === "responding" ? 1.4 : 1;
    time.current += dt * motion * speedBoost;

    const mesh = packets.current;
    if (!mesh) return;
    let i = 0;
    for (const link of links) {
      for (let k = 0; k < perLink; k++) {
        const t = (time.current * 0.22 + k / perLink + link.id.length * 0.07) % 1;
        const p = link.curve.getPoint(t);
        dummy.position.copy(p);
        const focus = hovered === link.id ? 1.9 : 1;
        dummy.scale.setScalar(0.055 * focus);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const linkOpacity = mode === "movement" ? 0.3 : 0.16;

  return (
    <group>
      {links.map((link) => (
        <line key={link.id}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(link.points.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={accent}
            transparent
            opacity={hovered === link.id ? 0.5 : linkOpacity}
            depthWrite={false}
          />
        </line>
      ))}
      <instancedMesh ref={packets} args={[undefined, undefined, total]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={accent} transparent opacity={0.75} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
