import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, DoubleSide, type Group } from "three";
import { GardenBackdrop } from "../shared/GardenBackdrop";
import { GlassMaterial } from "../shared/GlassMaterial";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { StageDressing } from "../shared/StageDressing";
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

const HARVEST_BOTTLE = smoothLatheGeometry([
  [0.001, -0.24],
  [0.13, -0.25],
  [0.19, -0.19],
  [0.195, 0.12],
  [0.17, 0.22],
  [0.1, 0.3],
  [0.098, 0.41],
  [0.001, 0.42],
]);

const INTERIOR_BOTTOM = -0.84;
const INTERIOR_TOP = 0.9;
const PART_HEIGHT = (INTERIOR_TOP - INTERIOR_BOTTOM) / ECO_CAPACITY;

// Warna dibuat cukup pekat agar cairannya tetap terbaca di balik kaca dan di
// atas latar krem, bukan menghilang seperti sebelumnya.
const FRESH_LIQUID = new Color("#b6cc63");
const RIPE_LIQUID = new Color("#8a5119");

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
          <meshStandardMaterial color="#fbf7d8" metalness={0.2} roughness={0.16} />
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

  // Permukaan dibuat sedikit lebih terang dan cincinnya lebih gelap agar batas
  // air tetap terbaca pada warna cairan apa pun.
  const surfaceColor = useMemo(
    () => new Color().lerpColors(FRESH_LIQUID, RIPE_LIQUID, ripeness).lerp(new Color("#ffffff"), 0.22).getStyle(),
    [ripeness],
  );

  const rimColor = useMemo(
    () => new Color().lerpColors(FRESH_LIQUID, RIPE_LIQUID, ripeness).lerp(new Color("#000000"), 0.3).getStyle(),
    [ripeness],
  );

  const visibleScraps = SCRAP_SPOTS.slice(0, Math.min(state.scraps, SCRAP_SPOTS.length));
  const harvested = state.sealed && state.days >= 90;

  return (
    <>
      <hemisphereLight intensity={1.34} color="#fff7dc" groundColor="#4b6152" />
      <directionalLight position={[4.2, 7.4, 5.5]} intensity={2.15} color="#fff2cf" />
      <directionalLight position={[-4.6, 3.2, -3.4]} intensity={0.68} color="#b6dcc6" />

      <OrbitCameraControls target={[0, 0.1, 0]} minDistance={4.6} maxDistance={10} />
      <GardenBackdrop />
      <StageDressing groundY={-1.44} scale={5.4} />

      <mesh position={[0, -1.36, 0]} receiveShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.22, 40]} />
        <meshStandardMaterial color="#cdb78c" roughness={0.94} />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[1.02, 1.02, 0.4, 34]} />
        <meshStandardMaterial color="#7f9c72" roughness={0.9} />
      </mesh>

      {filled > 0 ? (
        <>
          {/* Isi wadah dibuat opaque: three hanya menyalin objek opaque ke buffer
              transmisi, sehingga cairan transparan tidak akan terlihat sama
              sekali di balik kaca. */}
          <mesh position={[0, INTERIOR_BOTTOM + (liquidHeight / 2), 0]}>
            <cylinderGeometry args={[0.712, 0.698, liquidHeight, 32]} />
            <meshStandardMaterial color={liquidColor} metalness={0.08} roughness={0.22} />
          </mesh>
          <mesh position={[0, surfaceY - 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.708, 32]} />
            <meshStandardMaterial color={surfaceColor} metalness={0.28} roughness={0.05} />
          </mesh>
          <mesh position={[0, surfaceY + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.688, 0.714, 32]} />
            <meshStandardMaterial color={rimColor} roughness={0.3} />
          </mesh>
        </>
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
        <GlassMaterial color="#e6f2ed" thickness={0.22} />
      </mesh>

      {state.sealed ? (
        <mesh geometry={JAR_LID}>
          <meshStandardMaterial color="#c9963f" metalness={0.48} roughness={0.36} />
        </mesh>
      ) : null}

      {/* Hasil akhir dibuat kelihatan: setelah 90 hari, botol saringan muncul di
          samping wadah supaya anak melihat apa yang sebenarnya dipanen. */}
      {harvested ? (
        <group position={[1.28, -0.52, 0.16]} rotation={[0, -0.36, 0]}>
          <mesh geometry={HARVEST_BOTTLE}>
            <GlassMaterial color="#f0e6cf" thickness={0.2} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.185, 0.175, 0.4, 22]} />
            <meshStandardMaterial color={liquidColor} metalness={0.1} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.183, 22]} />
            <meshStandardMaterial color={surfaceColor} metalness={0.28} roughness={0.06} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.098, 0.098, 0.09, 18]} />
            <meshStandardMaterial color="#3f6f52" roughness={0.48} />
          </mesh>
          <mesh position={[0, -0.03, 0.192]}>
            <planeGeometry args={[0.2, 0.16]} />
            <meshStandardMaterial color="#fdf8ec" roughness={0.9} side={DoubleSide} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, INTERIOR_TOP + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.66, 0.72, 32]} />
          <meshStandardMaterial color="#8ec6a6" side={DoubleSide} />
        </mesh>
      )}
    </>
  );
}
