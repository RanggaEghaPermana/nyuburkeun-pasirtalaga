import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, type Group } from "three";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { smoothLatheGeometry } from "../shared/geometry";
import { ECO_CAPACITY, type EcoState } from "./evaluateEcoRatio";

const JAR_GLASS = smoothLatheGeometry([
  [0.001, -0.92],
  [0.5, -0.94],
  [0.74, -0.86],
  [0.79, -0.66],
  [0.8, 0.6],
  [0.74, 0.84],
  [0.63, 0.94],
  [0.65, 1.02],
  [0.58, 1.02],
  [0.585, 0.94],
  [0.68, 0.84],
  [0.735, 0.6],
  [0.73, -0.64],
  [0.68, -0.82],
  [0.001, -0.86],
]);

const JAR_LID = smoothLatheGeometry([
  [0.001, 1.14],
  [0.42, 1.13],
  [0.63, 1.1],
  [0.66, 1.03],
  [0.655, 0.96],
  [0.001, 0.96],
]);

const INTERIOR_BOTTOM = -0.84;
const INTERIOR_TOP = 0.9;
const PART_HEIGHT = (INTERIOR_TOP - INTERIOR_BOTTOM) / ECO_CAPACITY;

const FRESH_LIQUID = new Color("#e4e0a2");
const RIPE_LIQUID = new Color("#9c6526");

const SCRAP_SPOTS = Array.from({ length: 9 }, (_, index) => {
  const angle = index * 2.39;
  const radius = 0.16 + ((index % 3) * 0.17);
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    tilt: (index % 4) * 0.4,
    scale: 0.72 + ((index % 3) * 0.12),
    warm: index % 2 === 0,
  };
});

const BUBBLES = Array.from({ length: 11 }, (_, index) => ({
  x: Math.cos(index * 1.9) * (0.12 + ((index % 4) * 0.13)),
  z: Math.sin(index * 1.9) * (0.12 + ((index % 4) * 0.13)),
  size: 0.022 + ((index % 3) * 0.011),
  speed: 0.28 + ((index % 5) * 0.07),
  offset: index / 11,
}));

type EcoRatioSceneProps = {
  state: EcoState;
  reduceMotion: boolean;
  fermenting: boolean;
};

function Bubbles({ bottom, height, active }: { bottom: number; height: number; active: boolean }) {
  const groupRef = useRef<Group>(null);
  const invalidate = useThree((threeState) => threeState.invalidate);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !active || height <= 0.05) return;

    elapsed.current += delta;

    group.children.forEach((child, index) => {
      const bubble = BUBBLES[index];
      if (!bubble) return;

      const travel = ((elapsed.current * bubble.speed) + bubble.offset) % 1;
      child.position.set(bubble.x, bottom + (travel * height), bubble.z);
      child.scale.setScalar(0.6 + (travel * 0.7));
    });

    invalidate();
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {BUBBLES.map((bubble, index) => (
        <mesh key={index} position={[bubble.x, bottom, bubble.z]}>
          <sphereGeometry args={[bubble.size, 8, 6]} />
          <meshStandardMaterial color="#fdfbe9" transparent opacity={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function EcoRatioScene({ state, reduceMotion, fermenting }: EcoRatioSceneProps) {
  const filled = state.sugar + state.scraps + state.water;
  const liquidHeight = Math.max(filled * PART_HEIGHT, 0.001);
  const sugarHeight = Math.min(state.sugar, 4) * PART_HEIGHT * 0.42;
  const surfaceY = INTERIOR_BOTTOM + liquidHeight;
  const ripeness = Math.min(state.days / 90, 1);

  const liquidColor = useMemo(
    () => new Color().lerpColors(FRESH_LIQUID, RIPE_LIQUID, ripeness).getStyle(),
    [ripeness],
  );

  const visibleScraps = SCRAP_SPOTS.slice(0, Math.min(state.scraps, SCRAP_SPOTS.length));

  return (
    <>
      <hemisphereLight intensity={1.34} color="#fff7dc" groundColor="#4b6152" />
      <directionalLight position={[4.2, 7.4, 5.5]} intensity={2.15} color="#fff2cf" />
      <directionalLight position={[-4.6, 3.2, -3.4]} intensity={0.68} color="#b6dcc6" />

      <OrbitCameraControls target={[0, 0.1, 0]} minDistance={3.4} maxDistance={8.5} />

      <mesh position={[0, -1.36, 0]} receiveShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.22, 40]} />
        <meshStandardMaterial color="#cdb78c" roughness={0.94} />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[1.02, 1.02, 0.4, 34]} />
        <meshStandardMaterial color="#7f9c72" roughness={0.9} />
      </mesh>

      {filled > 0 ? (
        <mesh position={[0, INTERIOR_BOTTOM + (liquidHeight / 2), 0]}>
          <cylinderGeometry args={[0.715, 0.7, liquidHeight, 32]} />
          <meshStandardMaterial
            color={liquidColor}
            roughness={0.24}
            transparent
            opacity={0.86}
          />
        </mesh>
      ) : null}

      {state.sugar > 0 ? (
        <mesh position={[0, INTERIOR_BOTTOM + (sugarHeight / 2) + 0.005, 0]}>
          <cylinderGeometry args={[0.68, 0.68, Math.max(sugarHeight, 0.02), 30]} />
          <meshStandardMaterial color="#f2ddab" roughness={0.86} />
        </mesh>
      ) : null}

      {visibleScraps.map((spot, index) => (
        <mesh
          key={index}
          position={[spot.x, surfaceY - 0.035, spot.z]}
          rotation={[spot.tilt, index * 0.7, spot.tilt * 0.6]}
          scale={spot.scale}
        >
          <dodecahedronGeometry args={[0.085, 0]} />
          <meshStandardMaterial
            color={spot.warm ? "#e5b13c" : "#8fb04a"}
            flatShading
            roughness={0.82}
          />
        </mesh>
      ))}

      <Bubbles
        active={fermenting && !reduceMotion}
        bottom={INTERIOR_BOTTOM + 0.05}
        height={Math.max(liquidHeight - 0.1, 0)}
      />

      <mesh geometry={JAR_GLASS}>
        <meshPhysicalMaterial
          color="#d6ebe6"
          transmission={0.52}
          thickness={0.24}
          transparent
          opacity={0.44}
          roughness={0.1}
          side={DoubleSide}
        />
      </mesh>

      {state.sealed ? (
        <mesh geometry={JAR_LID}>
          <meshStandardMaterial color="#c9963f" metalness={0.48} roughness={0.36} />
        </mesh>
      ) : null}

      <mesh position={[0, INTERIOR_TOP + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.66, 0.72, 32]} />
        <meshStandardMaterial color="#8ec6a6" transparent opacity={0.5} side={DoubleSide} />
      </mesh>
    </>
  );
}
