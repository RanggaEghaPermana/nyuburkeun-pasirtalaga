import {
  CatmullRomCurve3,
  DoubleSide,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { WasteShape } from "./wasteItems";
import { GlassMaterial } from "../shared/GlassMaterial";
import {
  crumpleGeometry,
  dryLeafGeometry,
  leafMidribCurve,
  leafVeinCurves,
  petioleCurve,
  planarUV,
  roundedPlateGeometry,
  smoothLatheGeometry,
  sweptRibbonGeometry,
  warpGeometry,
  type LeafShape,
} from "../shared/geometry";
import { bananaPeelMaps, dryLeafMaps, kraftMaps } from "../shared/organicTextures";
import { fabricMaps, withRepeat } from "../shared/textures";
import {
  batteryWrapTexture,
  diaperPrintTexture,
  jarLabelTexture,
  newsprintTexture,
  tissueMaps,
  totePrintTexture,
} from "./wasteTextures";

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

const JAR_LID = warpGeometry(smoothLatheGeometry([
  [0.001, 0.5],
  [0.19, 0.495],
  [0.27, 0.475],
  [0.28, 0.42],
  [0.275, 0.37],
  [0.001, 0.37],
], 64), (vertex) => {
  const radius = Math.hypot(vertex.x, vertex.z);
  if (radius < 0.27 || vertex.y > 0.47) return;
  const ridge = Math.cos(Math.atan2(vertex.x, vertex.z) * 40) > 0 ? 0.006 : 0;
  vertex.x *= (radius + ridge) / radius;
  vertex.z *= (radius + ridge) / radius;
});

const BULB_THREAD = warpGeometry(smoothLatheGeometry([
  [0.001, -0.25],
  [0.158, -0.26],
  [0.158, -0.53],
  [0.12, -0.58],
  [0.001, -0.59],
], 40, 60), (vertex) => {
  if (vertex.y > -0.27 || vertex.y < -0.52) return;
  const radius = Math.hypot(vertex.x, vertex.z);
  if (radius < 0.1) return;
  const angle = Math.atan2(vertex.x, vertex.z);
  const thread = Math.sin((vertex.y * 70) + angle) * 0.012;
  vertex.x *= (radius + thread) / radius;
  vertex.z *= (radius + thread) / radius;
});

const BULB_GLASS = smoothLatheGeometry([
  [0.001, 0.52],
  [0.2, 0.47],
  [0.31, 0.3],
  [0.33, 0.13],
  [0.27, -0.05],
  [0.17, -0.17],
  [0.155, -0.26],
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


// Lengkungan kertas dibatasi kecil karena tulisan ditempel pada offset tetap di
// atasnya; warp yang besar akan mendorong kertas melewati tulisannya sendiri.
const NEWSPAPER_WARP = 0.008;

const NEWSPAPER_SHEETS = [0, 1, 2].map((index) => planarUV(warpGeometry(
  roundedPlateGeometry(0.72 - (index * 0.02), 0.48 - (index * 0.016), 0.02, 0.018),
  (vertex) => {
    const across = vertex.y / 0.24;
    vertex.z += (across * across * NEWSPAPER_WARP) + (Math.sin(across * 2.2 + index) * 0.004);
  },
)));

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

const CANVAS = () => withRepeat(fabricMaps("canvas"), 2.2, 2.2);
const KRAFT_BOX = () => kraftMaps(true);

export function WasteObject({ shape }: WasteObjectProps) {
  if (shape === "peel") {
    const maps = bananaPeelMaps();
    return (
      <group dispose={null} position={[0, -0.3, 0]} rotation={[0.03, 0.32, 0.02]} scale={1.16}>
        <mesh castShadow position={[0, 0.1, 0]} scale={[1, 0.62, 1]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial {...maps} />
        </mesh>
        <mesh castShadow position={[0.02, 0.2, 0.01]} rotation={[0.2, 0, -0.34]}>
          <cylinderGeometry args={[0.026, 0.05, 0.17, 10]} />
          <meshStandardMaterial color="#5a3f1c" roughness={0.94} />
        </mesh>
        {PEEL_SURFACES.map((surfaces, index) => (
          <group key={index}>
            <mesh castShadow geometry={surfaces.outer}>
              <meshStandardMaterial {...maps} side={DoubleSide} />
            </mesh>
            <mesh geometry={surfaces.inner}>
              <meshStandardMaterial color="#f3e7c3" roughness={0.9} side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (shape === "leaf") {
    return (
      <group rotation={[0.16, 0.28, -0.14]}>
        <mesh castShadow geometry={LEAF_BLADE}>
          <meshStandardMaterial {...dryLeafMaps("brown")} side={DoubleSide} />
        </mesh>
        <mesh geometry={LEAF_MIDRIB}>
          <meshStandardMaterial color="#7a5028" roughness={0.95} />
        </mesh>
        {LEAF_VEINS.map((geometry, index) => (
          <mesh geometry={geometry} key={index}>
            <meshStandardMaterial color="#8d5f2c" roughness={0.96} />
          </mesh>
        ))}
        <mesh geometry={LEAF_PETIOLE}>
          <meshStandardMaterial color="#5f3f1c" roughness={0.95} />
        </mesh>
      </group>
    );
  }

  if (shape === "jar") {
    return (
      <group rotation={[0.05, 0.3, -0.06]}>
        <mesh castShadow geometry={JAR_BODY}>
          <GlassMaterial color="#e8f3ef" thickness={0.12} />
        </mesh>
        <mesh castShadow geometry={JAR_LID}>
          <meshStandardMaterial color="#d6a743" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.281, 0.281, 0.055, 30, 1, true]} />
          <meshStandardMaterial color="#b98a33" metalness={0.7} roughness={0.34} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.358, 0.353, 0.26, 30, 1, true, -1.1, 2.2]} />
          <meshStandardMaterial map={jarLabelTexture()} roughness={0.8} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (shape === "tote") {
    return (
      <group rotation={[0.09, -0.24, -0.05]}>
        <mesh castShadow geometry={TOTE_BODY} position={[0, -0.06, 0]}>
          <meshStandardMaterial {...CANVAS()} color="#f1e3c4" side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0.04]} scale={[0.66, 0.045, 0.2]}>
          <sphereGeometry args={[0.5, 20, 10]} />
          <meshStandardMaterial {...CANVAS()} color="#d9c49d" />
        </mesh>
        {TOTE_HANDLES.map((geometry, index) => (
          <mesh castShadow geometry={geometry} key={index} position={[0, -0.06, 0]}>
            <meshStandardMaterial {...CANVAS()} color="#c9a877" />
          </mesh>
        ))}
        <mesh position={[0, -0.09, 0.132]} rotation={[0.06, 0, 0]}>
          <planeGeometry args={[0.34, 0.34]} />
          <meshStandardMaterial depthWrite={false} map={totePrintTexture()} polygonOffset polygonOffsetFactor={-2} roughness={0.9} transparent />
        </mesh>
      </group>
    );
  }

  if (shape === "cardboard") {
    const kraft = KRAFT_BOX();
    return (
      <group rotation={[0.14, 0.34, -0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.46, 0.36]} />
          <meshStandardMaterial {...kraft} />
        </mesh>
        <mesh castShadow position={[0, 0.3, -0.15]} rotation={[-1.1, 0, 0]}>
          <boxGeometry args={[0.78, 0.3, 0.02]} />
          <meshStandardMaterial {...kraft} color="#f2e4d0" />
        </mesh>
        <mesh castShadow position={[0, 0.28, 0.16]} rotation={[1.24, 0, 0]}>
          <boxGeometry args={[0.78, 0.3, 0.02]} />
          <meshStandardMaterial {...kraft} color="#e0cdb2" />
        </mesh>
        <mesh position={[0, 0.231, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.76, 0.34]} />
          <meshStandardMaterial color="#6f4b28" roughness={1} />
        </mesh>
        <mesh position={[0, -0.02, 0.181]}>
          <planeGeometry args={[0.1, 0.44]} />
          <meshPhysicalMaterial clearcoat={0.8} color="#d8b77e" opacity={0.85} roughness={0.3} transparent />
        </mesh>
      </group>
    );
  }

  if (shape === "newspaper") {
    return (
      <group rotation={[-0.62, -0.2, 0.08]}>
        {NEWSPAPER_SHEETS.map((geometry, index) => (
          <mesh
            castShadow
            geometry={geometry}
            key={index}
            position={[index * 0.006, index * -0.008, index * -0.021]}
            rotation={[0, 0, index * 0.026]}
          >
            {index === 0 ? (
              <meshStandardMaterial map={newsprintTexture()} roughness={0.95} side={DoubleSide} />
            ) : (
              <meshStandardMaterial color="#ddd7c7" roughness={0.97} side={DoubleSide} />
            )}
          </mesh>
        ))}
        <mesh geometry={NEWSPAPER_FOLD} position={[0.004, 0.12, 0.026]} rotation={[0.16, 0, 0.01]}>
          <meshStandardMaterial color="#e9e4d6" roughness={0.96} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (shape === "tissue") {
    const maps = tissueMaps();
    return (
      <group rotation={[0.16, -0.24, -0.18]}>
        {TISSUE_WADS.map((wad, index) => (
          <mesh castShadow geometry={wad.geometry} key={index} position={wad.position} scale={wad.scale}>
            <meshStandardMaterial {...maps} color={wad.color} flatShading />
          </mesh>
        ))}
        {TISSUE_FOLDS.map((fold, index) => (
          <mesh
            castShadow
            geometry={TISSUE_FOLD_PLATE}
            key={index}
            position={fold.position}
            rotation={fold.rotation}
          >
            <meshStandardMaterial {...maps} side={DoubleSide} />
          </mesh>
        ))}
      </group>
    );
  }

  if (shape === "diaper") {
    const print = diaperPrintTexture();
    return (
      <group rotation={[0.1, 0.3, Math.PI / 2]}>
        <mesh castShadow geometry={DIAPER_ROLL}>
          <meshStandardMaterial color="#ffffff" map={print} roughness={0.92} />
        </mesh>
        <mesh geometry={DIAPER_WRAP}>
          <meshStandardMaterial color="#ebe8df" roughness={0.95} />
        </mesh>
        {[-0.16, 0.16].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.332, 0.021, 8, 30]} />
            <meshPhysicalMaterial clearcoat={0.6} color="#84c0d8" roughness={0.5} />
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
        <mesh castShadow geometry={BATTERY_BODY}>
          <meshStandardMaterial color="#9aa0a4" metalness={0.85} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.113, 0.113, 0.09, 20]} />
          <meshStandardMaterial color="#d2d6d8" metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[0, -0.53, 0]}>
          <cylinderGeometry args={[0.247, 0.247, 0.035, 24]} />
          <meshStandardMaterial color="#c1c6c9" metalness={0.9} roughness={0.22} />
        </mesh>
        <mesh position={[0, -0.07, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.288, 0.288, 0.9, 32, 1, true]} />
          <meshPhysicalMaterial clearcoat={0.8} clearcoatRoughness={0.2} map={batteryWrapTexture()} roughness={0.4} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0.06, 0.34, -0.08]}>
      <mesh castShadow geometry={BULB_GLASS}>
        <GlassMaterial color="#fbf6ea" thickness={0.08} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <torusGeometry args={[0.055, 0.008, 6, 18]} />
        <meshStandardMaterial color="#8a6a33" metalness={0.6} roughness={0.4} />
      </mesh>
      {[-0.03, 0.03].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.26, 6]} />
          <meshStandardMaterial color="#8d8a80" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      <mesh castShadow geometry={BULB_THREAD}>
        <meshStandardMaterial color="#c9c6bd" metalness={0.9} roughness={0.26} />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.05, 16]} />
        <meshStandardMaterial color="#2c2b28" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.64, 0]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color="#b9b5ab" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}
