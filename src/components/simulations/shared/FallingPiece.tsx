import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Vector3, type Group } from "three";

type FallingPieceProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  // Bahan yang baru ditambahkan muncul dari atas lalu jatuh dengan gravitasi.
  // Bahan lama cukup mengikuti posisinya bila keadaan berubah.
  fresh: boolean;
  spawnY: number;
  reduceMotion: boolean;
  children: ReactNode;
};

export function FallingPiece({ position, rotation, fresh, spawnY, reduceMotion, children }: FallingPieceProps) {
  const ref = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const velocity = useRef(0);
  const [spawn] = useState<[number, number, number]>(() => (
    fresh && !reduceMotion
      ? [position[0] * 0.45, spawnY + (Math.abs(position[2]) * 0.3), position[2] * 0.45]
      : position
  ));
  const [x, y, z] = position;
  const [rx, ry, rz] = rotation;
  const goal = useMemo(() => new Vector3(x, y, z), [x, y, z]);

  useEffect(() => {
    invalidate();
  }, [goal, invalidate]);

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const dt = Math.min(delta, 0.05);
    if (reduceMotion) {
      group.position.copy(goal);
      group.rotation.set(rx, ry, rz);
      return;
    }
    if (group.position.y > goal.y + 0.3 && velocity.current <= 0.01) {
      velocity.current -= 11 * dt;
      group.position.y = Math.max(goal.y, group.position.y + (velocity.current * dt));
      group.position.x += (goal.x - group.position.x) * (1 - Math.exp(-4 * dt));
      group.position.z += (goal.z - group.position.z) * (1 - Math.exp(-4 * dt));
      group.rotation.x += dt * 3;
      invalidate();
      return;
    }
    velocity.current = 0;
    const step = 1 - Math.exp(-5 * dt);
    group.position.lerp(goal, step);
    group.rotation.x += (rx - group.rotation.x) * step;
    group.rotation.y += (ry - group.rotation.y) * step;
    group.rotation.z += (rz - group.rotation.z) * step;
    if (group.position.distanceToSquared(goal) > 1e-6
      || Math.abs(rx - group.rotation.x) + Math.abs(ry - group.rotation.y) + Math.abs(rz - group.rotation.z) > 0.002) {
      invalidate();
    }
  });

  return (
    <group position={spawn} ref={ref} rotation={rotation}>
      {children}
    </group>
  );
}
