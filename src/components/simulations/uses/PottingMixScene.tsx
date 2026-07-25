import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CatmullRomCurve3, Color, DoubleSide, TubeGeometry, Vector3, type Group } from "three";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { StageDressing } from "../shared/StageDressing";
import { dryLeafGeometry, smoothLatheGeometry, type LeafShape } from "../shared/geometry";
import { MIX_CAPACITY, type MixMaterial, type MixState, type Watering } from "./evaluatePottingMix";

const POT = smoothLatheGeometry([
  [0.001, -0.62],
  [0.34, -0.63],
  [0.46, -0.58],
  [0.52, -0.4],
  [0.64, 0.4],
  [0.68, 0.52],
  [0.7, 0.6],
  [0.64, 0.6],
  [0.62, 0.5],
  [0.58, 0.38],
  [0.46, -0.38],
  [0.4, -0.55],
  [0.001, -0.58],
]);

const INTERIOR_BOTTOM = -0.56;
const INTERIOR_TOP = 0.52;
const LAYER_HEIGHT = (INTERIOR_TOP - INTERIOR_BOTTOM) / MIX_CAPACITY;

const MATERIAL_COLOR: Record<MixMaterial, string> = {
  soil: "#6d4c30",
  compost: "#3b2a1b",
  sand: "#cdba95",
};

const MATERIAL_TONE: Record<MixMaterial, Color> = {
  soil: new Color(MATERIAL_COLOR.soil),
  compost: new Color(MATERIAL_COLOR.compost),
  sand: new Color(MATERIAL_COLOR.sand),
};

// Bahan yang ditumpuk sebagai lapisan membuat bahan di bawahnya tidak terlihat
// dari mulut pot, padahal materinya justru menyuruh mencampur. Isinya karena itu
// digambarkan sebagai satu campuran berwarna rata-rata, lalu butiran di
// permukaan menunjukkan porsi tiap bahan.
const SPECKLES = Array.from({ length: 18 }, (_, index) => {
  const angle = index * 2.39;
  const radius = 0.08 + (((index * 7) % 11) / 11) * 0.42;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    size: 0.03 + (((index * 5) % 7) / 7) * 0.026,
    tilt: (index % 5) * 0.6,
  };
});

const LEAF: LeafShape = { length: 0.62, width: 0.32, fold: 0.44, curl: 0.3, wave: 0.012 };
const LEAF_BLADE = dryLeafGeometry(LEAF, 24, 12);

const STEM = new TubeGeometry(
  new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.02, 0.2, 0.01),
    new Vector3(-0.01, 0.4, 0.02),
    new Vector3(0.02, 0.58, 0),
  ]),
  20,
  0.022,
  7,
  false,
);

const LEAF_PLACEMENTS = [
  { angle: 0.2, height: 0.1, pitch: -0.42, size: 1 },
  { angle: 2.1, height: 0.17, pitch: -0.36, size: 0.94 },
  { angle: 4.1, height: 0.26, pitch: -0.28, size: 0.9 },
  { angle: 1.1, height: 0.36, pitch: -0.2, size: 0.8 },
  { angle: 3.4, height: 0.45, pitch: -0.12, size: 0.72 },
  { angle: 5.4, height: 0.54, pitch: -0.04, size: 0.62 },
];

const DROPS = Array.from({ length: 9 }, (_, index) => ({
  x: Math.cos(index * 2.1) * 0.12,
  z: Math.sin(index * 2.1) * 0.12,
  offset: index / 9,
  speed: 1.5 + ((index % 3) * 0.35),
}));

// Tiap cara menyiram diberi warna tetesan, warna kaleng, dan jejak pada
// permukaan yang berbeda, supaya bedanya terlihat bukan hanya terbaca di angka.
const WATERING_LOOK: Record<Watering, {
  drop: string;
  can: string;
  sheen: string | null;
  sheenOpacity: number;
}> = {
  none: { drop: "#a6d8ea", can: "#8fb6c9", sheen: null, sheenOpacity: 0 },
  plain: { drop: "#8fd0ea", can: "#8fb6c9", sheen: "#3f2d1c", sheenOpacity: 0.42 },
  "eco-diluted": { drop: "#d8cf7e", can: "#b9a75c", sheen: "#6d5a24", sheenOpacity: 0.34 },
  "eco-strong": { drop: "#8a5a1e", can: "#7d5220", sheen: "#43290c", sheenOpacity: 0.68 },
};

const HEALTHY_LEAF = new Color("#57893c");
const WEAK_LEAF = new Color("#b09a3f");

function layerRadius(index: number) {
  const progress = (index + 0.5) / MIX_CAPACITY;
  return 0.42 + (progress * 0.18);
}

function Droplets({ active, color }: { active: boolean; color: string }) {
  const groupRef = useRef<Group>(null);
  const invalidate = useThree((threeState) => threeState.invalidate);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !active) return;

    elapsed.current += delta;

    group.children.forEach((child, index) => {
      const drop = DROPS[index];
      if (!drop) return;
      const travel = ((elapsed.current * drop.speed) + drop.offset) % 1;
      child.position.set(drop.x, 1.15 - (travel * 0.62), drop.z);
    });

    invalidate();
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {DROPS.map((drop, index) => (
        <mesh key={index} position={[drop.x, 1.15, drop.z]}>
          <sphereGeometry args={[0.032, 8, 6]} />
          <meshStandardMaterial color={color} metalness={0.18} roughness={0.14} />
        </mesh>
      ))}
    </group>
  );
}

type PottingMixSceneProps = {
  state: MixState;
  plantHealth: number;
  pouring: boolean;
  reduceMotion: boolean;
};

export function PottingMixScene({ state, plantHealth, pouring, reduceMotion }: PottingMixSceneProps) {
  const total = state.layers.length;
  const fillTop = INTERIOR_BOTTOM + (total * LAYER_HEIGHT);
  const health = Math.max(0, Math.min(100, plantHealth)) / 100;

  const leafColor = useMemo(
    () => new Color().lerpColors(WEAK_LEAF, HEALTHY_LEAF, health).getStyle(),
    [health],
  );

  const mixColor = useMemo(() => {
    if (total === 0) return MATERIAL_COLOR.soil;

    const blended = new Color(0, 0, 0);
    for (const layer of state.layers) blended.add(MATERIAL_TONE[layer.material]);
    return blended.multiplyScalar(1 / total).getStyle();
  }, [state.layers, total]);

  // Butiran dibagi mengikuti porsi tiap bahan supaya kompos yang ditambahkan
  // benar-benar terlihat di permukaan campuran.
  const speckles = useMemo(() => {
    if (total === 0) return [];

    const order: MixMaterial[] = [];
    const counts: [MixMaterial, number][] = [
      ["soil", state.soil],
      ["compost", state.compost],
      ["sand", state.sand],
    ];

    for (const [material, count] of counts) {
      const share = Math.round((count / total) * SPECKLES.length);
      for (let index = 0; index < share; index += 1) order.push(material);
    }

    while (order.length < SPECKLES.length) order.push("soil");

    return SPECKLES.map((speckle, index) => ({ ...speckle, material: order[index] }));
  }, [state.compost, state.sand, state.soil, total]);

  const plantScale = 0.85 + (health * 0.5);
  const droop = (1 - health) * 0.8;
  const look = WATERING_LOOK[state.watering];
  const thriving = health >= 0.82 && total >= 9;

  return (
    <>
      <hemisphereLight intensity={1.36} color="#fff7dc" groundColor="#4a6350" />
      <directionalLight position={[4, 7.2, 5.2]} intensity={2.2} color="#fff2cf" />
      <directionalLight position={[-4.4, 3, -3.2]} intensity={0.7} color="#b2dbc4" />

      <OrbitCameraControls target={[0, 0.15, 0]} minDistance={3} maxDistance={8} />
      <StageDressing groundY={-0.7} scale={4.6} />

      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[1.7, 1.85, 0.2, 40]} />
        <meshStandardMaterial color="#cdb78c" roughness={0.94} />
      </mesh>

      {total > 0 ? (
        <>
          <mesh position={[0, INTERIOR_BOTTOM + ((fillTop - INTERIOR_BOTTOM) / 2), 0]}>
            <cylinderGeometry
              args={[layerRadius(total - 1), layerRadius(-1), fillTop - INTERIOR_BOTTOM, 30]}
            />
            <meshStandardMaterial color={mixColor} roughness={0.96} />
          </mesh>
          {speckles.map((speckle, index) => (
            <mesh
              key={index}
              position={[speckle.x, fillTop - 0.012, speckle.z]}
              rotation={[speckle.tilt, index * 0.8, speckle.tilt * 0.5]}
              scale={[1, 0.45, 1]}
            >
              <dodecahedronGeometry args={[speckle.size, 0]} />
              <meshStandardMaterial color={MATERIAL_COLOR[speckle.material]} flatShading roughness={0.96} />
            </mesh>
          ))}
        </>
      ) : null}

      {total > 0 ? (
        <group position={[0, fillTop, 0]} scale={plantScale}>
          <mesh geometry={STEM}>
            <meshStandardMaterial color="#4e7536" roughness={0.86} />
          </mesh>
          {/* Hasil akhir yang baik diberi tanda yang terlihat: kuncup bunga
              muncul saat campuran dan penyiramannya benar. */}
          {thriving ? (
            <>
              <mesh position={[0.02, 0.66, 0]}>
                <sphereGeometry args={[0.055, 12, 10]} />
                <meshStandardMaterial color="#f0c34a" roughness={0.6} />
              </mesh>
              {[0.7, 2.8, 4.9].map((angle) => (
                <mesh
                  key={angle}
                  position={[Math.cos(angle) * 0.075, 0.655, Math.sin(angle) * 0.075]}
                  scale={[1, 0.45, 1]}
                >
                  <sphereGeometry args={[0.05, 10, 8]} />
                  <meshStandardMaterial color="#f6e7a8" roughness={0.68} />
                </mesh>
              ))}
            </>
          ) : null}
          {LEAF_PLACEMENTS.map((placement, index) => (
            <group key={index} position={[0, placement.height, 0]} rotation={[0, placement.angle, 0]}>
              <mesh
                geometry={LEAF_BLADE}
                position={[0.26 * placement.size, 0, 0]}
                rotation={[0, 0, placement.pitch - droop]}
                scale={placement.size}
              >
                <meshStandardMaterial color={leafColor} roughness={0.88} side={DoubleSide} />
              </mesh>
            </group>
          ))}
        </group>
      ) : null}

      <mesh geometry={POT}>
        <meshStandardMaterial color="#b5714b" roughness={0.9} side={DoubleSide} />
      </mesh>

      {/* Jejak basah tetap tinggal setelah menyiram, jadi sebelum dan sesudahnya
          bisa dibedakan tanpa harus melihat animasinya. */}
      {total > 0 && look.sheen ? (
        <mesh position={[0, fillTop + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[layerRadius(total - 1) - 0.01, 30]} />
          <meshStandardMaterial
            color={look.sheen}
            metalness={0.16}
            opacity={look.sheenOpacity}
            roughness={0.24}
            transparent
          />
        </mesh>
      ) : null}

      {state.watering === "eco-strong" && total > 0 ? (
        <>
          {[0.2, 0.44].map((radius, index) => (
            <mesh
              key={radius}
              position={[index === 0 ? -0.12 : 0.16, fillTop + 0.008, index === 0 ? 0.1 : -0.14]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[radius * 0.4, 20]} />
              <meshStandardMaterial color="#2e1a06" roughness={0.4} />
            </mesh>
          ))}
        </>
      ) : null}

      {pouring && !reduceMotion ? (
        <>
          <mesh position={[-0.45, 1.28, 0.1]} rotation={[0, 0.4, 0.9]}>
            <cylinderGeometry args={[0.2, 0.24, 0.34, 20]} />
            <meshStandardMaterial color={look.can} metalness={0.35} roughness={0.5} />
          </mesh>
          <Droplets active color={look.drop} />
        </>
      ) : null}
    </>
  );
}
