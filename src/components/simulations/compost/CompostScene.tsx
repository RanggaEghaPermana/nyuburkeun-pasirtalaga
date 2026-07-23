import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, type Group, type Mesh, Vector3 } from "three";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { CompostGarden } from "./CompostGarden";
import { CompostMaterialMesh } from "./CompostMaterialMesh";
import type { CompostMaterial, CompostState } from "./evaluateCompost";

type CompostSceneProps = {
  state: CompostState;
  reduceMotion: boolean;
  waterActive: boolean;
  onMixComplete: () => void;
};

type PieceLayout = {
  id: string;
  material: CompostMaterial;
  position: [number, number, number];
  rotation: [number, number, number];
  variant: number;
};

type AnimatedCompostPieceProps = PieceLayout & {
  mixCount: number;
  moisture: number;
  reduceMotion: boolean;
};

const BIN_GREEN = "#087653";
const BIN_GREEN_DARK = "#054a38";
const BIN_INSIDE = "#153d30";
const WATER = "#55bed9";
const MAX_CONTENT_HEIGHT = 1.72;
const PIECES_PER_BATCH = 3;
export const COMPOST_MIX_DURATION_MS = 3700;
export const COMPOST_WATER_DURATION_MS = 1550;
const MIX_DURATION = COMPOST_MIX_DURATION_MS / 1000;
const MIX_ENTRY_END = 0.18;
const MIX_STIR_END = 0.78;

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function buildPieceLayouts(
  batches: CompostState["batches"],
  mixedThrough: number,
  mixCount: number,
): PieceLayout[] {
  const totalBatches = batches.length;
  const mixedCount = Math.min(mixedThrough, totalBatches);
  const looseCount = totalBatches - mixedCount;
  const mixedHeight = mixedCount === 0
    ? 0
    : Math.min(MAX_CONTENT_HEIGHT, 0.25 + mixedCount * 0.072);
  const looseSpace = Math.max(0.16, MAX_CONTENT_HEIGHT - mixedHeight);
  const layerStep = Math.min(0.16, looseSpace / Math.max(1, looseCount));

  return batches.flatMap((batch, batchIndex) => (
    Array.from({ length: PIECES_PER_BATCH }, (_, variant) => {
      if (batchIndex < mixedCount) {
        const seed = batch.id * 41 + variant * 17 + mixCount * 109;
        const angle = pseudoRandom(seed + 1) * Math.PI * 2;
        const radius = 0.18 + Math.sqrt(pseudoRandom(seed + 2)) * 0.71;
        const mixedPieceIndex = batchIndex * PIECES_PER_BATCH + variant;
        const settledLayer = Math.floor(mixedPieceIndex / 8);
        return {
          id: `${batch.id}-${variant}`,
          material: batch.material,
          position: [
            Math.cos(angle) * radius,
            -0.99 + settledLayer * 0.12 + (pseudoRandom(seed + 3) - 0.5) * 0.035,
            Math.sin(angle) * radius,
          ] as [number, number, number],
          rotation: [
            -0.35 + pseudoRandom(seed + 4) * 0.8,
            angle + pseudoRandom(seed + 5),
            -0.48 + pseudoRandom(seed + 6) * 0.96,
          ] as [number, number, number],
          variant,
        };
      }

      const looseIndex = batchIndex - mixedCount;
      const phase = batch.id * 1.73 + variant * 2.15;
      return {
        id: `${batch.id}-${variant}`,
        material: batch.material,
        position: [
          (variant === 0 ? -0.38 : 0.38) + Math.sin(phase) * 0.13,
          -1.03 + mixedHeight + layerStep * (looseIndex + 0.5) + (variant === 0 ? -0.014 : 0.014),
          0.05 + Math.cos(phase) * 0.28,
        ] as [number, number, number],
        rotation: [0.08 + variant * 0.18, phase * 0.35, variant === 0 ? -0.12 : 0.17] as [number, number, number],
        variant,
      };
    })
  ));
}

function AnimatedCompostPiece({
  id,
  material,
  mixCount,
  moisture,
  position,
  reduceMotion,
  rotation,
  variant,
}: AnimatedCompostPieceProps) {
  const groupRef = useRef<Group>(null);
  const mixStartedAtRef = useRef(-1);
  const previousMixRef = useRef(mixCount);
  const invalidate = useThree((threeState) => threeState.invalidate);
  const target = useMemo(() => new Vector3(...position), [position]);
  const [initialPosition] = useState<[number, number, number]>(() => [
    position[0] + (variant === 0 ? -0.12 : 0.12),
    reduceMotion ? position[1] : position[1] + 1.75 + (Number(id.split("-")[0]) % 3) * 0.12,
    position[2],
  ]);
  const [initialRotation] = useState<[number, number, number]>(() => [
    rotation[0] + (reduceMotion ? 0 : 1.35),
    rotation[1] + (reduceMotion ? 0 : 0.8),
    rotation[2],
  ]);

  useEffect(() => {
    const group = groupRef.current;
    if (group && reduceMotion) {
      mixStartedAtRef.current = -1;
      group.position.copy(target);
      group.rotation.set(...rotation);
    }
    invalidate();
  }, [invalidate, reduceMotion, rotation, target]);

  useEffect(() => {
    if (mixCount > previousMixRef.current && !reduceMotion) {
      mixStartedAtRef.current = performance.now();
      invalidate();
    }
    previousMixRef.current = mixCount;
  }, [invalidate, mixCount, reduceMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || reduceMotion) return;
    const frameDelta = Math.min(delta, 0.05);

    if (mixStartedAtRef.current >= 0) {
      const mixElapsed = (performance.now() - mixStartedAtRef.current) / 1000;
      if (mixElapsed < MIX_DURATION * MIX_ENTRY_END) {
        invalidate();
        return;
      }
      if (mixElapsed >= MIX_DURATION) {
        mixStartedAtRef.current = -1;
        group.position.copy(target);
        group.rotation.set(...rotation);
        return;
      }
    }

    const positionStep = 1 - Math.exp(-frameDelta * 7.2);
    group.position.lerp(target, positionStep);

    const rotationStep = 1 - Math.exp(-frameDelta * 6.2);
    const xDifference = Math.atan2(Math.sin(rotation[0] - group.rotation.x), Math.cos(rotation[0] - group.rotation.x));
    const yDifference = Math.atan2(Math.sin(rotation[1] - group.rotation.y), Math.cos(rotation[1] - group.rotation.y));
    const zDifference = Math.atan2(Math.sin(rotation[2] - group.rotation.z), Math.cos(rotation[2] - group.rotation.z));
    group.rotation.x += xDifference * rotationStep;
    group.rotation.y += yDifference * rotationStep;
    group.rotation.z += zDifference * rotationStep;

    if (group.position.distanceToSquared(target) > 0.000012 || Math.abs(xDifference) + Math.abs(yDifference) + Math.abs(zDifference) > 0.004) {
      invalidate();
    }
  });

  return (
    <group ref={groupRef} position={initialPosition} rotation={initialRotation} scale={1.28}>
      <CompostMaterialMesh material={material} moisture={moisture} variant={variant} />
    </group>
  );
}

function MixingContents({ children, mixCount, reduceMotion }: { children: ReactNode; mixCount: number; reduceMotion: boolean }) {
  const groupRef = useRef<Group>(null);
  const startedAtRef = useRef(-1);
  const previousMixRef = useRef(0);
  const invalidate = useThree((threeState) => threeState.invalidate);

  useEffect(() => {
    if (mixCount > previousMixRef.current) {
      startedAtRef.current = reduceMotion ? -1 : performance.now();
      invalidate();
    }
    previousMixRef.current = mixCount;
  }, [invalidate, mixCount, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) return;
    startedAtRef.current = -1;
    if (groupRef.current) {
      groupRef.current.rotation.set(0, 0, 0);
      groupRef.current.position.set(0, 0, 0);
    }
    invalidate();
  }, [invalidate, reduceMotion]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group || startedAtRef.current < 0 || reduceMotion) return;

    const progress = Math.min(1, (performance.now() - startedAtRef.current) / COMPOST_MIX_DURATION_MS);

    if (progress < MIX_ENTRY_END) {
      group.rotation.y = 0;
      group.position.y = 0;
    } else if (progress < MIX_STIR_END) {
      const stirring = (progress - MIX_ENTRY_END) / (MIX_STIR_END - MIX_ENTRY_END);
      group.rotation.y = stirring * Math.PI * 6;
      group.position.y = Math.sin(stirring * Math.PI) * 0.1 + Math.sin(stirring * Math.PI * 6) * 0.035;
    } else {
      const settling = (progress - MIX_STIR_END) / (1 - MIX_STIR_END);
      group.rotation.y = 0;
      group.position.y = Math.sin(settling * Math.PI) * 0.028 * (1 - settling);
    }

    if (progress < 1) {
      invalidate();
    } else {
      group.rotation.y = 0;
      group.position.y = 0;
      startedAtRef.current = -1;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function MixingAirBubbles({ mixCount, reduceMotion }: { mixCount: number; reduceMotion: boolean }) {
  const bubbleRefs = useRef<Array<Mesh | null>>([]);
  const startedAtRef = useRef(-1);
  const previousMixRef = useRef(0);
  const invalidate = useThree((threeState) => threeState.invalidate);

  useEffect(() => {
    if (mixCount > previousMixRef.current && !reduceMotion) {
      startedAtRef.current = performance.now();
      bubbleRefs.current.forEach((bubble) => {
        if (bubble) bubble.visible = true;
      });
      invalidate();
    }
    previousMixRef.current = mixCount;
  }, [invalidate, mixCount, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) return;
    startedAtRef.current = -1;
    bubbleRefs.current.forEach((bubble) => {
      if (bubble) bubble.visible = false;
    });
    invalidate();
  }, [invalidate, reduceMotion]);

  useFrame(() => {
    if (startedAtRef.current < 0 || reduceMotion) return;
    const progress = Math.min(1, (performance.now() - startedAtRef.current) / COMPOST_MIX_DURATION_MS);

    bubbleRefs.current.forEach((bubble, index) => {
      if (!bubble) return;
      const delay = index * 0.045;
      const localProgress = Math.max(0, Math.min(1, (progress - delay) / Math.max(0.2, 1 - delay)));
      const seed = index * 37 + mixCount * 19;
      const angle = pseudoRandom(seed + 1) * Math.PI * 2;
      const radius = 0.18 + pseudoRandom(seed + 2) * 0.65;
      const pulse = Math.sin(localProgress * Math.PI);

      bubble.visible = localProgress > 0 && localProgress < 1;
      bubble.position.set(
        Math.cos(angle) * radius + Math.sin(localProgress * Math.PI * 4 + index) * 0.045,
        -0.88 + localProgress * 1.75,
        Math.sin(angle) * radius + 0.65,
      );
      bubble.scale.setScalar((0.45 + (index % 3) * 0.12) * Math.max(0.08, pulse));
    });

    if (progress < 1) {
      invalidate();
    } else {
      startedAtRef.current = -1;
      bubbleRefs.current.forEach((bubble) => {
        if (bubble) bubble.visible = false;
      });
    }
  });

  return (
    <group>
      {Array.from({ length: 11 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => { bubbleRefs.current[index] = mesh; }}
          visible={false}
        >
          <sphereGeometry args={[0.1, 9, 7]} />
          <meshPhysicalMaterial
            color={index % 2 === 0 ? "#dff7bc" : "#bde8d4"}
            depthWrite={false}
            opacity={0.52}
            roughness={0.18}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}

function MixingTool({
  mixCount,
  reduceMotion,
  onComplete,
}: {
  mixCount: number;
  reduceMotion: boolean;
  onComplete: () => void;
}) {
  const toolRef = useRef<Group>(null);
  const startedAtRef = useRef(-1);
  const previousMixRef = useRef(0);
  const invalidate = useThree((threeState) => threeState.invalidate);

  useEffect(() => {
    const tool = toolRef.current;
    const hasNewMix = mixCount > previousMixRef.current;
    previousMixRef.current = mixCount;

    if (reduceMotion) {
      const wasMixing = startedAtRef.current >= 0;
      startedAtRef.current = -1;
      if (tool) {
        tool.visible = false;
        tool.position.set(0, 0, 0);
        tool.rotation.set(0, 0, 0);
      }
      if (wasMixing) onComplete();
      invalidate();
      return;
    }

    if (hasNewMix && tool) {
      startedAtRef.current = performance.now();
      tool.visible = true;
      invalidate();
    }
  }, [invalidate, mixCount, onComplete, reduceMotion]);

  useFrame(() => {
    const tool = toolRef.current;
    if (!tool || startedAtRef.current < 0 || reduceMotion) return;

    const progress = Math.min(1, (performance.now() - startedAtRef.current) / COMPOST_MIX_DURATION_MS);

    if (progress < MIX_ENTRY_END) {
      const entering = progress / MIX_ENTRY_END;
      const easedEntering = 1 - (1 - entering) ** 3;
      tool.position.set(0.48, 2.45 * (1 - easedEntering) + 0.08, 0.5);
      tool.rotation.y = Math.PI / 2;
      tool.rotation.z = -0.12 - easedEntering * 0.08;
    } else if (progress < MIX_STIR_END) {
      const stirring = (progress - MIX_ENTRY_END) / (MIX_STIR_END - MIX_ENTRY_END);
      const angle = stirring * Math.PI * 6;
      tool.position.set(
        Math.cos(angle) * 0.44,
        0.06 + Math.sin(angle * 2) * 0.06,
        0.5 + Math.sin(angle) * 0.14,
      );
      tool.rotation.y = -angle + Math.PI / 2;
      tool.rotation.z = -0.2 + Math.sin(angle) * 0.09;
    } else {
      const leaving = (progress - MIX_STIR_END) / (1 - MIX_STIR_END);
      const easedLeaving = leaving ** 2;
      tool.position.set(0.48, 0.08 + easedLeaving * 2.55, 0.5);
      tool.rotation.y = Math.PI / 2;
      tool.rotation.z = -0.2 + leaving * 0.08;
    }

    if (progress < 1) {
      invalidate();
    } else {
      tool.visible = false;
      startedAtRef.current = -1;
      invalidate();
      onComplete();
    }
  });

  return (
    <group ref={toolRef} visible={false}>
      <mesh position={[0, 0.53, 0]} rotation={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.052, 0.062, 2.75, 9]} />
        <meshStandardMaterial color="#d9ef72" roughness={0.66} />
      </mesh>
      <mesh position={[0, -0.82, 0]}>
        <boxGeometry args={[0.42, 0.34, 0.08]} />
        <meshStandardMaterial color="#dce9e4" metalness={0.5} roughness={0.34} />
      </mesh>
      {[-0.14, 0, 0.14].map((x) => (
        <mesh key={x} position={[x, -1.12, 0]}>
          <cylinderGeometry args={[0.018, 0.025, 0.45, 6]} />
          <meshStandardMaterial color="#c8d9d3" metalness={0.52} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0, 1.96, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.052, 7, 14]} />
        <meshStandardMaterial color="#efffa7" roughness={0.58} />
      </mesh>
    </group>
  );
}

function WaterAbsorption({
  active,
  reduceMotion,
  targetY,
  waterCount,
}: {
  active: boolean;
  reduceMotion: boolean;
  targetY: number;
  waterCount: number;
}) {
  const canRef = useRef<Group>(null);
  const dropletRefs = useRef<Array<Mesh | null>>([]);
  const progressRef = useRef(active && !reduceMotion ? 0 : -1);
  const invalidate = useThree((threeState) => threeState.invalidate);

  useEffect(() => {
    if (active && !reduceMotion) {
      progressRef.current = 0;
      invalidate();
    }
  }, [active, invalidate, reduceMotion, waterCount]);

  useFrame((_, delta) => {
    if (!active || progressRef.current < 0 || reduceMotion) return;

    progressRef.current += Math.min(delta, 0.05);
    const elapsed = progressRef.current;
    if (canRef.current) {
      canRef.current.rotation.z = 0.18 + Math.min(1, elapsed / 0.28) * 0.42;
      canRef.current.position.y = 1.62 + Math.sin(Math.min(1, elapsed / 1.05) * Math.PI) * 0.06;
    }

    dropletRefs.current.forEach((droplet, index) => {
      if (!droplet) return;
      const localProgress = Math.max(0, Math.min(1, (elapsed - index * 0.09) / 0.9));
      const absorption = localProgress > 0.72 ? 1 - (localProgress - 0.72) / 0.28 : 1;
      droplet.visible = localProgress > 0 && localProgress < 1;
      droplet.position.set(
        0.52 - localProgress * 0.36 + (index - 3) * 0.028,
        1.42 - localProgress * (1.42 - targetY + 0.12),
        1.2 + Math.sin(index * 1.7) * 0.04,
      );
      droplet.scale.set(0.72 * absorption, 1.35 * absorption, 0.72 * absorption);
    });

    if (elapsed < 1.55) {
      invalidate();
    } else {
      progressRef.current = -1;
    }
  });

  return (
    <group visible={active && !reduceMotion}>
      <group ref={canRef} position={[1.05, 1.62, 1.3]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.31, 0.27, 0.48, 14]} />
          <meshStandardMaterial color="#5bc5c4" metalness={0.16} roughness={0.48} />
        </mesh>
        <mesh position={[-0.47, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.065, 0.14, 0.7, 10]} />
          <meshStandardMaterial color="#50aaa8" metalness={0.18} roughness={0.5} />
        </mesh>
        <mesh position={[-0.84, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.095, 0.1, 10]} />
          <meshStandardMaterial color="#398d8b" metalness={0.18} roughness={0.52} />
        </mesh>
        <mesh position={[0.16, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.04, 7, 16, Math.PI * 1.25]} />
          <meshStandardMaterial color="#327d78" roughness={0.58} />
        </mesh>
      </group>
      <mesh position={[0.32, (1.42 + targetY) / 2, 1.19]}>
        <cylinderGeometry args={[0.024, 0.038, Math.max(0.18, 1.42 - targetY), 7]} />
        <meshPhysicalMaterial color={WATER} opacity={0.5} roughness={0.14} transparent transmission={0.12} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => { dropletRefs.current[index] = mesh; }}
          scale={[0.7, 1.3, 0.7]}
        >
          <sphereGeometry args={[0.062, 8, 6]} />
          <meshPhysicalMaterial color={WATER} opacity={0.82} roughness={0.16} transparent transmission={0.08} />
        </mesh>
      ))}
    </group>
  );
}

function CompostCameraRig() {
  const { camera, invalidate, size } = useThree();

  useLayoutEffect(() => {
    const narrow = size.width / Math.max(1, size.height) < 1.05;
    camera.position.set(narrow ? 3.35 : 4.15, narrow ? 2.5 : 2.72, narrow ? 7.95 : 7.25);
    camera.lookAt(0, -0.08, 0);
    invalidate();
  }, [camera, invalidate, size.height, size.width]);

  return null;
}

export function CompostScene({ state, reduceMotion, waterActive, onMixComplete }: CompostSceneProps) {
  const invalidate = useThree((threeState) => threeState.invalidate);
  const pieces = useMemo(
    () => buildPieceLayouts(state.batches, state.mixedThrough, state.mixCount),
    [state.batches, state.mixedThrough, state.mixCount],
  );
  const mixedCount = Math.min(state.mixedThrough, state.batches.length);
  const mixedHeight = mixedCount === 0 ? 0 : Math.min(MAX_CONTENT_HEIGHT, 0.25 + mixedCount * 0.072);
  const looseCount = state.batches.length - mixedCount;
  const topY = state.batches.length === 0
    ? -1.04
    : Math.min(0.7, -1.02 + mixedHeight + Math.min(0.16, Math.max(0.16, MAX_CONTENT_HEIGHT - mixedHeight) / Math.max(1, looseCount)) * looseCount);
  const bedColor = state.moisture > 66 ? "#352f27" : state.moisture < 35 ? "#66503a" : "#4a3c2e";

  useEffect(() => {
    invalidate();
  }, [invalidate, state]);

  return (
    <>
      <CompostCameraRig />
      <OrbitCameraControls
        target={[0, -0.1, 0]}
        minDistance={5.4}
        maxDistance={9.6}
        minPolarAngle={0.68}
        maxPolarAngle={1.46}
      />
      <color attach="background" args={["#dcebd1"]} />
      <fog attach="fog" args={["#dcebd1", 8.5, 15]} />
      <hemisphereLight args={["#f5ffe7", "#66513b", 1.35]} />
      <directionalLight color="#fff1c9" intensity={2.15} position={[4, 7, 5]} />
      <directionalLight color="#b4d9cd" intensity={0.68} position={[-4, 2, -3]} />

      <CompostGarden />

      <group position={[0, -0.02, 0]}>
        <mesh position={[0, -1.35, 0]}>
          <cylinderGeometry args={[1.42, 1.47, 0.16, 36]} />
          <meshStandardMaterial color={BIN_GREEN_DARK} roughness={0.84} />
        </mesh>

        <mesh>
          <cylinderGeometry args={[1.32, 1.41, 2.58, 36, 1, true, Math.PI * 0.28, Math.PI * 1.44]} />
          <meshStandardMaterial color={BIN_GREEN} roughness={0.76} side={DoubleSide} />
        </mesh>
        <mesh scale={[0.96, 0.98, 0.96]}>
          <cylinderGeometry args={[1.31, 1.39, 2.52, 36, 1, true, Math.PI * 0.28, Math.PI * 1.44]} />
          <meshStandardMaterial color={BIN_INSIDE} roughness={0.92} side={DoubleSide} />
        </mesh>

        <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.34, 0.075, 9, 36]} />
          <meshStandardMaterial color={BIN_GREEN_DARK} roughness={0.78} />
        </mesh>

        {state.batches.length > 0 ? (
          <group>
            <mesh
              position={[0, -1.13 + Math.min(0.08, mixedCount * 0.008), 0]}
              scale={[1, 0.15 + Math.min(0.1, mixedCount * 0.012), 0.82]}
            >
              <dodecahedronGeometry args={[0.93, 1]} />
              <meshStandardMaterial color={bedColor} flatShading roughness={1} />
            </mesh>
            {[-0.62, -0.45, -0.25, -0.05, 0.18, 0.38, 0.58].map((x, index) => (
              <mesh key={x} position={[x, -1.01 + (index % 2) * 0.035, 0.22 + (index % 3) * 0.12]}>
                <dodecahedronGeometry args={[0.055 + index * 0.006, 0]} />
                <meshStandardMaterial
                  color={mixedCount > 0
                    ? index % 3 === 0 ? "#49663f" : index % 2 === 0 ? "#594535" : "#3f342a"
                    : index % 2 === 0 ? "#594535" : "#3f342a"}
                  roughness={1}
                />
              </mesh>
            ))}
          </group>
        ) : null}

        <MixingContents mixCount={state.mixCount} reduceMotion={reduceMotion}>
          {pieces.map((piece) => (
            <AnimatedCompostPiece
              key={piece.id}
              {...piece}
              mixCount={state.mixCount}
              moisture={state.moisture}
              reduceMotion={reduceMotion}
            />
          ))}
        </MixingContents>

        <MixingAirBubbles mixCount={state.mixCount} reduceMotion={reduceMotion} />

        <MixingTool mixCount={state.mixCount} reduceMotion={reduceMotion} onComplete={onMixComplete} />
        {state.batches.length > 0 ? (
          <WaterAbsorption
            active={waterActive}
            reduceMotion={reduceMotion}
            targetY={topY}
            waterCount={state.waterCount}
          />
        ) : null}

        <mesh position={[0, -0.02, 1.08]} renderOrder={3}>
          <planeGeometry args={[1.88, 2.28]} />
          <meshPhysicalMaterial
            color="#d8f1e7"
            depthWrite={false}
            opacity={0.12}
            roughness={0.16}
            transparent
            transmission={0.18}
          />
        </mesh>

        {[-0.97, 0.97].map((x) => (
          <mesh key={x} position={[x, -0.02, 1.09]}>
            <boxGeometry args={[0.06, 2.32, 0.055]} />
            <meshStandardMaterial color={BIN_GREEN_DARK} roughness={0.82} />
          </mesh>
        ))}
        {[-1.17, 1.13].map((y) => (
          <mesh key={y} position={[0, y, 1.09]}>
            <boxGeometry args={[1.98, 0.06, 0.055]} />
            <meshStandardMaterial color={BIN_GREEN_DARK} roughness={0.82} />
          </mesh>
        ))}

        <group position={[0, 1.28, -0.72]} rotation={[-0.58, 0, 0]}>
          <mesh position={[0, 0.07, 0.72]}>
            <cylinderGeometry args={[1.44, 1.37, 0.16, 36]} />
            <meshStandardMaterial color={BIN_GREEN} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.18, 0.72]}>
            <boxGeometry args={[0.55, 0.1, 0.17]} />
            <meshStandardMaterial color={BIN_GREEN_DARK} roughness={0.82} />
          </mesh>
        </group>
      </group>

      <mesh position={[0, -1.49, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.2, 0.62, 1]}>
        <circleGeometry args={[2.08, 36]} />
        <meshBasicMaterial color="#435748" opacity={0.2} transparent />
      </mesh>
    </>
  );
}
