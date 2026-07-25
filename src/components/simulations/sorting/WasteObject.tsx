import {
  CatmullRomCurve3,
  DoubleSide,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { WasteShape } from "./wasteItems";
import {
  crumpleGeometry,
  dryLeafGeometry,
  leafMidribCurve,
  leafVeinCurves,
  petioleCurve,
  roundedPlateGeometry,
  smoothLatheGeometry,
  sweptRibbonGeometry,
  warpGeometry,
  type LeafShape,
} from "../shared/geometry";

type WasteObjectProps = {
  shape: WasteShape;
};

const PEEL_THICKNESS = 0.01;

// Kulit pisang yang dibuang itu tergeletak, bukan berdiri. Pelepah yang
// merunduk tegak terbaca sebagai kaki, dan pada bagian yang hampir vertikal
// kerangka sapuan ikut berbalik sehingga sisi pucat yang menghadap kamera.
// Pelepah karena itu dibuat memencar mendatar dengan ujung sedikit terangkat.
const PEEL_FLAPS = [
  { turn: 0.03, reach: 0.54, bend: 0.09, tip: 0.07 },
  { turn: 0.7, reach: 0.47, bend: -0.11, tip: 0.04 },
  { turn: 1.33, reach: 0.5, bend: 0.07, tip: 0.06 },
].map(({ turn, reach, bend, tip }) => {
  const angle = turn * Math.PI;
  const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
  const sideways = new Vector3(-direction.z, 0, direction.x);
  const at = (progress: number, height: number) => direction
    .clone()
    .multiplyScalar(reach * progress)
    .addScaledVector(sideways, Math.sin(progress * Math.PI) * bend)
    .setY(height);

  return new CatmullRomCurve3([
    at(0.05, 0.11),
    at(0.32, 0.03),
    at(0.6, -0.04),
    at(0.84, -0.07),
    at(1, -0.07 + tip),
  ]);
});

// Lebar meruncing sampai hampir nol supaya ujungnya lancip. Potongan lurus
// membuat ujung pelepah tampak terpotong tumpul seperti sepatu.
const PEEL_WIDTH = (progress: number) => (0.27 * (1 - (progress ** 2.2))) + 0.014;

const PEEL_SURFACES = PEEL_FLAPS.map((curve) => ({
  outer: sweptRibbonGeometry({
    curve,
    width: PEEL_WIDTH,
    arcSpan: Math.PI * 0.55,
    curl: -1,
    offset: PEEL_THICKNESS,
  }),
  inner: sweptRibbonGeometry({
    curve,
    width: PEEL_WIDTH,
    arcSpan: Math.PI * 0.55,
    curl: -1,
    offset: -PEEL_THICKNESS,
  }),
}));

const LEAF: LeafShape = { length: 0.98, width: 0.44, fold: 0.52, curl: 0.5, wave: 0.014 };
const LEAF_BLADE = dryLeafGeometry(LEAF);
const LEAF_MIDRIB = new TubeGeometry(leafMidribCurve(LEAF), 32, 0.0085, 7, false);
const LEAF_VEINS = leafVeinCurves(LEAF).map((curve) => new TubeGeometry(curve, 14, 0.0042, 6, false));
const LEAF_PETIOLE = new TubeGeometry(petioleCurve(LEAF), 16, 0.013, 8, false);

const JAR_BODY = smoothLatheGeometry([
  [0.001, -0.44],
  [0.22, -0.44],
  [0.32, -0.4],
  [0.345, -0.28],
  [0.35, 0.02],
  [0.335, 0.19],
  [0.27, 0.29],
  [0.245, 0.34],
  [0.255, 0.4],
  [0.225, 0.4],
  [0.215, 0.3],
  [0.28, 0.2],
  [0.3, 0.0],
  [0.295, -0.36],
  [0.001, -0.38],
]);

const JAR_LID = smoothLatheGeometry([
  [0.001, 0.5],
  [0.19, 0.495],
  [0.27, 0.475],
  [0.28, 0.42],
  [0.275, 0.37],
  [0.001, 0.37],
]);

const BULB_GLASS = smoothLatheGeometry([
  [0.001, 0.52],
  [0.2, 0.47],
  [0.31, 0.3],
  [0.33, 0.13],
  [0.27, -0.05],
  [0.17, -0.17],
  [0.155, -0.26],
]);

const BULB_BASE = smoothLatheGeometry([
  [0.001, -0.24],
  [0.155, -0.26],
  [0.165, -0.34],
  [0.152, -0.42],
  [0.16, -0.5],
  [0.14, -0.56],
  [0.09, -0.62],
  [0.001, -0.64],
]);

const BATTERY_BODY = smoothLatheGeometry([
  [0.001, -0.52],
  [0.24, -0.53],
  [0.275, -0.5],
  [0.28, 0.36],
  [0.275, 0.42],
  [0.19, 0.45],
  [0.115, 0.46],
  [0.11, 0.55],
  [0.001, 0.56],
]);

const TOTE_BODY = warpGeometry(roundedPlateGeometry(0.74, 0.64, 0.3, 0.11), (vertex) => {
  const height = Math.min(Math.max((vertex.y + 0.32) / 0.64, 0), 1);
  const puff = Math.sin(height * Math.PI);
  vertex.x *= 0.86 + (puff * 0.16);
  vertex.z *= 0.4 + (puff * 0.86);
  vertex.y -= (1 - puff) * 0.04 * (height > 0.5 ? 1 : -1);
  vertex.x += Math.sin(height * 6.4) * 0.016;
});

const TOTE_HANDLES = [-0.08, 0.08].map((z, index) => new TubeGeometry(
  new CatmullRomCurve3([
    new Vector3(-0.23, 0.24, z * 0.9),
    new Vector3(-0.2, 0.44 - (index * 0.02), z),
    new Vector3(0, 0.5 - (index * 0.03), z * 1.15),
    new Vector3(0.2, 0.44 - (index * 0.02), z),
    new Vector3(0.23, 0.24, z * 0.9),
  ]),
  28,
  0.021,
  8,
  false,
));

const CARDBOARD_BODY = roundedPlateGeometry(0.8, 0.46, 0.36, 0.026);
const CARDBOARD_FLAP = roundedPlateGeometry(0.78, 0.32, 0.026, 0.018);

// Lengkungan kertas dibatasi kecil karena tulisan ditempel pada offset tetap di
// atasnya; warp yang besar akan mendorong kertas melewati tulisannya sendiri.
const NEWSPAPER_WARP = 0.008;

const NEWSPAPER_SHEETS = [0, 1, 2].map((index) => warpGeometry(
  roundedPlateGeometry(0.72 - (index * 0.02), 0.48 - (index * 0.016), 0.02, 0.018),
  (vertex) => {
    const across = vertex.y / 0.24;
    vertex.z += (across * across * NEWSPAPER_WARP) + (Math.sin(across * 2.2 + index) * 0.004);
  },
));

const NEWSPAPER_FOLD = warpGeometry(roundedPlateGeometry(0.72, 0.24, 0.022, 0.018), (vertex) => {
  const along = vertex.x / 0.36;
  vertex.z += along * along * NEWSPAPER_WARP;
});

const TISSUE_WADS = [
  { position: [-0.15, 0.03, 0.02] as const, scale: [0.86, 0.94, 0.8] as const, seed: 2.3, color: "#f6f3ea" },
  { position: [0.16, 0.1, -0.04] as const, scale: [0.74, 0.78, 0.72] as const, seed: 5.1, color: "#e9e4d8" },
  { position: [0.01, -0.16, 0.1] as const, scale: [0.9, 0.62, 0.78] as const, seed: 8.6, color: "#f1ede2" },
].map((wad) => ({
  ...wad,
  geometry: crumpleGeometry(new SphereGeometry(0.3, 16, 12), 0.12, wad.seed),
}));

const TISSUE_FOLDS = [
  { position: [-0.24, 0.16, 0.14] as const, rotation: [0.5, 0.4, 0.9] as const },
  { position: [0.26, -0.1, 0.16] as const, rotation: [-0.3, -0.5, -0.7] as const },
];

const TISSUE_FOLD_PLATE = roundedPlateGeometry(0.26, 0.2, 0.012, 0.02);

// Popok bekas yang sudah digulung rapat: gulungan tong pendek dengan tepi
// lipatan yang membelit dan dua pita perekat melintang.
const DIAPER_ROLL = crumpleGeometry(smoothLatheGeometry([
  [0.001, -0.36],
  [0.18, -0.37],
  [0.29, -0.32],
  [0.325, -0.16],
  [0.335, 0.06],
  [0.315, 0.24],
  [0.21, 0.34],
  [0.001, 0.36],
]), 0.016, 6.2);

const DIAPER_WRAP = new TubeGeometry(
  new CatmullRomCurve3(Array.from({ length: 34 }, (_, index) => {
    const progress = index / 33;
    const angle = progress * Math.PI * 3.1;
    const radius = 0.318 + (Math.sin(progress * Math.PI) * 0.022);
    return new Vector3(
      Math.cos(angle) * radius,
      -0.3 + (progress * 0.6),
      Math.sin(angle) * radius,
    );
  })),
  70,
  0.019,
  8,
  false,
);

export function WasteObject({ shape }: WasteObjectProps) {
  if (shape === "peel") {
    return (
      <group dispose={null} position={[0, -0.3, 0]} rotation={[0.03, 0.32, 0.02]} scale={1.16}>
        <mesh position={[0, 0.1, 0]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#e9c53f" roughness={0.74} />
        </mesh>
        <mesh position={[0.02, 0.2, 0.01]} rotation={[0.2, 0, -0.34]}>
          <cylinderGeometry args={[0.026, 0.05, 0.17, 10]} />
          <meshStandardMaterial color="#6d5024" roughness={0.94} />
        </mesh>
        {PEEL_SURFACES.map((surfaces, index) => (
          <group key={index}>
            <mesh geometry={surfaces.outer}>
              <meshStandardMaterial
                color={index % 2 === 0 ? "#eec334" : "#f4ce47"}
                roughness={0.66}
                side={DoubleSide}
              />
            </mesh>
            <mesh geometry={surfaces.inner}>
              <meshStandardMaterial color="#f8eec6" roughness={0.88} side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (shape === "leaf") {
    return (
      <group rotation={[0.16, 0.28, -0.14]}>
        <mesh geometry={LEAF_BLADE}>
          <meshStandardMaterial color="#b0783a" roughness={0.92} side={DoubleSide} />
        </mesh>
        <mesh geometry={LEAF_MIDRIB}>
          <meshStandardMaterial color="#84592a" roughness={0.95} />
        </mesh>
        {LEAF_VEINS.map((geometry, index) => (
          <mesh geometry={geometry} key={index}>
            <meshStandardMaterial color="#96662f" roughness={0.96} />
          </mesh>
        ))}
        <mesh geometry={LEAF_PETIOLE}>
          <meshStandardMaterial color="#6f4a21" roughness={0.95} />
        </mesh>
      </group>
    );
  }

  if (shape === "jar") {
    return (
      <group rotation={[0.05, 0.3, -0.06]}>
        <mesh geometry={JAR_BODY}>
          <meshPhysicalMaterial
            color="#cfe7e2"
            transmission={0.42}
            thickness={0.3}
            transparent
            opacity={0.7}
            roughness={0.12}
            side={DoubleSide}
          />
        </mesh>
        <mesh geometry={JAR_LID}>
          <meshStandardMaterial color="#d8a949" metalness={0.5} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.281, 0.281, 0.055, 30, 1, true]} />
          <meshStandardMaterial color="#c1913a" metalness={0.55} roughness={0.42} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.359, 0.354, 0.28, 26, 1, true, -0.75, 1.5]} />
          <meshStandardMaterial color="#fdf8ec" roughness={0.9} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (shape === "tote") {
    return (
      <group rotation={[0.09, -0.24, -0.05]}>
        <mesh geometry={TOTE_BODY} position={[0, -0.06, 0]}>
          <meshStandardMaterial color="#d9bb87" roughness={0.96} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0.04]} scale={[0.66, 0.045, 0.2]}>
          <sphereGeometry args={[0.5, 20, 10]} />
          <meshStandardMaterial color="#c2a273" roughness={0.96} />
        </mesh>
        {TOTE_HANDLES.map((geometry, index) => (
          <mesh geometry={geometry} key={index} position={[0, -0.06, 0]}>
            <meshStandardMaterial color="#a9814c" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, 0.128]} rotation={[0.06, 0, 0]}>
          <circleGeometry args={[0.13, 24]} />
          <meshStandardMaterial color="#2f7d43" roughness={0.82} />
        </mesh>
      </group>
    );
  }

  if (shape === "cardboard") {
    return (
      <group rotation={[0.14, 0.34, -0.1]}>
        <mesh geometry={CARDBOARD_BODY}>
          <meshStandardMaterial color="#b9834c" roughness={0.94} />
        </mesh>
        <mesh geometry={CARDBOARD_FLAP} position={[0, 0.31, -0.14]} rotation={[-1.1, 0, 0]}>
          <meshStandardMaterial color="#c69158" roughness={0.94} />
        </mesh>
        <mesh geometry={CARDBOARD_FLAP} position={[0, 0.29, 0.15]} rotation={[1.24, 0, 0]}>
          <meshStandardMaterial color="#a9773f" roughness={0.94} />
        </mesh>
        <mesh position={[0, 0.16, 0]} scale={[0.97, 1, 0.9]}>
          <boxGeometry args={[0.78, 0.02, 0.36]} />
          <meshStandardMaterial color="#8d6134" roughness={0.98} />
        </mesh>
        <mesh position={[0, -0.04, 0.181]}>
          <planeGeometry args={[0.07, 0.44]} />
          <meshStandardMaterial color="#e3c58f" roughness={0.72} />
        </mesh>
        <mesh position={[0.24, 0.06, 0.182]} rotation={[0, 0, 0.12]}>
          <planeGeometry args={[0.2, 0.13]} />
          <meshStandardMaterial color="#8a5f33" roughness={0.96} />
        </mesh>
      </group>
    );
  }

  if (shape === "newspaper") {
    return (
      <group rotation={[-0.62, -0.2, 0.08]}>
        {NEWSPAPER_SHEETS.map((geometry, index) => (
          <mesh
            geometry={geometry}
            key={index}
            position={[index * 0.006, index * -0.008, index * -0.021]}
            rotation={[0, 0, index * 0.026]}
          >
            <meshStandardMaterial
              color={index === 0 ? "#efebdf" : "#e2ddcf"}
              roughness={0.97}
              side={DoubleSide}
            />
          </mesh>
        ))}
        <mesh geometry={NEWSPAPER_FOLD} position={[0.004, 0.12, 0.026]} rotation={[0.16, 0, 0.01]}>
          <meshStandardMaterial color="#f4f1e6" roughness={0.96} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.18, 0.056]}>
          <planeGeometry args={[0.48, 0.07]} />
          <meshStandardMaterial color="#33403c" roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.12, 0.054]}>
          <planeGeometry args={[0.42, 0.01]} />
          <meshStandardMaterial color="#7b8681" roughness={1} />
        </mesh>
        <mesh position={[-0.19, 0.06, 0.052]}>
          <planeGeometry args={[0.2, 0.05]} />
          <meshStandardMaterial color="#2f7362" roughness={0.94} />
        </mesh>
        {[-0.04, -0.09, -0.14, -0.19].map((y) => (
          <mesh key={y} position={[0.03, y, 0.03]}>
            <planeGeometry args={[0.46, 0.014]} />
            <meshStandardMaterial color="#5f6c67" roughness={1} />
          </mesh>
        ))}
        <mesh position={[-0.21, -0.13, 0.03]}>
          <planeGeometry args={[0.16, 0.14]} />
          <meshStandardMaterial color="#7d8983" roughness={0.98} />
        </mesh>
      </group>
    );
  }

  if (shape === "tissue") {
    return (
      <group rotation={[0.16, -0.24, -0.18]}>
        {TISSUE_WADS.map((wad, index) => (
          <mesh geometry={wad.geometry} key={index} position={wad.position} scale={wad.scale}>
            <meshStandardMaterial color={wad.color} flatShading roughness={0.97} />
          </mesh>
        ))}
        {TISSUE_FOLDS.map((fold, index) => (
          <mesh
            geometry={TISSUE_FOLD_PLATE}
            key={index}
            position={fold.position}
            rotation={fold.rotation}
          >
            <meshStandardMaterial color="#faf7ef" roughness={0.98} side={DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0.04, -0.02, 0.22]} scale={[0.4, 0.13, 0.05]}>
          <sphereGeometry args={[0.5, 12, 8]} />
          <meshStandardMaterial color="#b5a693" roughness={1} />
        </mesh>
      </group>
    );
  }

  if (shape === "diaper") {
    return (
      <group rotation={[0.1, 0.3, Math.PI / 2]}>
        <mesh geometry={DIAPER_ROLL}>
          <meshStandardMaterial color="#f5f2e9" roughness={0.94} />
        </mesh>
        <mesh geometry={DIAPER_WRAP}>
          <meshStandardMaterial color="#e7e3d8" roughness={0.95} />
        </mesh>
        {[-0.16, 0.16].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.332, 0.021, 8, 30]} />
            <meshStandardMaterial color="#84c0d8" roughness={0.84} />
          </mesh>
        ))}
        <mesh position={[0, 0.37, 0]} scale={[0.9, 0.5, 0.9]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color="#eceae1" roughness={0.95} />
        </mesh>
      </group>
    );
  }

  if (shape === "battery") {
    return (
      <group rotation={[0, 0.4, Math.PI / 2]}>
        <mesh geometry={BATTERY_BODY}>
          <meshStandardMaterial color="#3a3f45" metalness={0.4} roughness={0.44} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.113, 0.113, 0.09, 20]} />
          <meshStandardMaterial color="#c9cdd0" metalness={0.7} roughness={0.24} />
        </mesh>
        <mesh position={[0, -0.53, 0]}>
          <cylinderGeometry args={[0.247, 0.247, 0.035, 24]} />
          <meshStandardMaterial color="#b9bec1" metalness={0.66} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.288, 0.288, 0.86, 28, 1, true]} />
          <meshStandardMaterial color="#cf4b28" roughness={0.5} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.14, 28, 1, true]} />
          <meshStandardMaterial color="#efe7d4" roughness={0.58} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.292, 0.292, 0.1, 28, 1, true]} />
          <meshStandardMaterial color="#23262a" roughness={0.55} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0.06, 0.34, -0.08]}>
      <mesh geometry={BULB_GLASS}>
        <meshPhysicalMaterial
          color="#f6f0dd"
          transmission={0.5}
          thickness={0.2}
          transparent
          opacity={0.72}
          roughness={0.1}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <torusGeometry args={[0.055, 0.008, 6, 18]} />
        <meshStandardMaterial color="#a8853f" roughness={0.5} />
      </mesh>
      {[-0.03, 0.03].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.26, 6]} />
          <meshStandardMaterial color="#8d8a80" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      <mesh geometry={BULB_BASE}>
        <meshStandardMaterial color="#8e8a7f" metalness={0.68} roughness={0.34} />
      </mesh>
      {[-0.3, -0.38, -0.46].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.158, 0.018, 7, 24]} />
          <meshStandardMaterial color="#726e64" metalness={0.62} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -0.65, 0]}>
        <sphereGeometry args={[0.062, 14, 10]} />
        <meshStandardMaterial color="#3f3e3a" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
