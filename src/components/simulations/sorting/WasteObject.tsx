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
  leafBladeGeometry,
  roundedPlateGeometry,
  smoothLatheGeometry,
  sweptRibbonGeometry,
  warpGeometry,
} from "./wasteGeometry";

type WasteObjectProps = {
  shape: WasteShape;
};

const PEEL_THICKNESS = 0.009;

// Empat pelepah yang memencar dari pangkal lalu merunduk, dengan ujung sedikit
// terangkat seperti kulit pisang yang baru dibuka.
const PEEL_STRIPS = [0, 0.5, 1, 1.5].map((turn, index) => {
  const angle = turn * Math.PI;
  const lean = index % 2 === 0 ? 1 : 0.88;
  const dirX = Math.cos(angle);
  const dirZ = Math.sin(angle);
  const at = (radius: number, y: number) => new Vector3(dirX * radius, y, dirZ * radius * lean);

  return new CatmullRomCurve3([
    at(0.03, 0.34),
    at(0.13, 0.22),
    at(0.31, 0.02),
    at(0.44, -0.24),
    at(0.47, -0.42),
  ]);
});

const PEEL_WIDTH = (progress: number) => 0.19 - (progress * 0.13);

const PEEL_SURFACES = PEEL_STRIPS.map((curve) => ({
  outer: sweptRibbonGeometry({ curve, width: PEEL_WIDTH, offset: PEEL_THICKNESS }),
  inner: sweptRibbonGeometry({ curve, width: PEEL_WIDTH, offset: -PEEL_THICKNESS }),
}));

const LEAF_BLADE = leafBladeGeometry(0.92, 0.44, 0.014);

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

const TOTE_BODY = warpGeometry(roundedPlateGeometry(0.74, 0.64, 0.3, 0.09), (vertex) => {
  const height = Math.min(Math.max((vertex.y + 0.32) / 0.64, 0), 1);
  const puff = Math.sin(height * Math.PI);
  vertex.x *= 0.9 + (puff * 0.12);
  vertex.z *= 0.52 + (puff * 0.72);
  vertex.x += Math.sin(height * 7.2) * 0.012;
});

const TOTE_HANDLES = [-0.085, 0.085].map((z) => new TubeGeometry(
  new CatmullRomCurve3([
    new Vector3(-0.24, 0.26, z * 0.9),
    new Vector3(-0.19, 0.46, z),
    new Vector3(0, 0.53, z * 1.1),
    new Vector3(0.19, 0.46, z),
    new Vector3(0.24, 0.26, z * 0.9),
  ]),
  26,
  0.026,
  8,
  false,
));

const CARDBOARD_BODY = roundedPlateGeometry(0.8, 0.46, 0.36, 0.026);
const CARDBOARD_FLAP = roundedPlateGeometry(0.78, 0.32, 0.026, 0.018);

const NEWSPAPER_SHEETS = [0, 1, 2].map((index) => warpGeometry(
  roundedPlateGeometry(0.72 - (index * 0.022), 0.5 - (index * 0.018), 0.022, 0.02),
  (vertex) => {
    const along = vertex.x / 0.36;
    vertex.z += (along * along * 0.05) + (Math.sin(along * 2.4 + index) * 0.014);
  },
));

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

// Popok terpakai digulung: bagian tengah menyempit dan permukaannya sedikit
// tidak rata karena isinya menggembung.
const DIAPER_BODY = crumpleGeometry(
  warpGeometry(new SphereGeometry(0.42, 24, 18), (vertex) => {
    const waist = 1 - (Math.cos(vertex.y * 5.6) * 0.16);
    vertex.x *= 1.42 * waist;
    vertex.y *= 0.82;
    vertex.z *= 0.92 * waist;
  }),
  0.022,
  4.4,
);

const DIAPER_TAB = roundedPlateGeometry(0.2, 0.24, 0.11, 0.05);

export function WasteObject({ shape }: WasteObjectProps) {
  if (shape === "peel") {
    return (
      <group dispose={null} rotation={[0.1, 0.3, -0.06]}>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.075, 14, 10]} />
          <meshStandardMaterial color="#e6c34a" roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.47, 0]} rotation={[0.12, 0, 0.16]}>
          <cylinderGeometry args={[0.032, 0.055, 0.16, 10]} />
          <meshStandardMaterial color="#6d5024" roughness={0.94} />
        </mesh>
        {PEEL_SURFACES.map((surfaces, index) => (
          <group key={index}>
            <mesh geometry={surfaces.outer}>
              <meshStandardMaterial
                color={index % 2 === 0 ? "#edc132" : "#f3cd45"}
                roughness={0.68}
                side={DoubleSide}
              />
            </mesh>
            <mesh geometry={surfaces.inner}>
              <meshStandardMaterial color="#f7ecc0" roughness={0.86} side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (shape === "leaf") {
    return (
      <group rotation={[0.34, 0.22, -0.38]}>
        <mesh geometry={LEAF_BLADE}>
          <meshStandardMaterial color="#b07c3c" roughness={0.9} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.014]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.016, 0.86, 8]} />
          <meshStandardMaterial color="#7a5326" roughness={0.95} />
        </mesh>
        {[-0.26, -0.08, 0.1, 0.26].map((offset, index) => (
          <mesh
            key={offset}
            position={[offset, 0, 0.02]}
            rotation={[0, 0, index % 2 === 0 ? 0.9 : -0.9]}
          >
            <cylinderGeometry args={[0.004, 0.008, 0.22, 6]} />
            <meshStandardMaterial color="#8a6030" roughness={0.96} />
          </mesh>
        ))}
        <mesh position={[-0.56, -0.03, 0.01]} rotation={[0, 0, 1.42]}>
          <cylinderGeometry args={[0.012, 0.019, 0.24, 8]} />
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
          <cylinderGeometry args={[0.357, 0.352, 0.28, 26, 1, true, -0.75, 1.5]} />
          <meshStandardMaterial color="#fdf8ec" roughness={0.9} side={DoubleSide} />
        </mesh>
      </group>
    );
  }

  if (shape === "tote") {
    return (
      <group rotation={[0.09, -0.24, -0.05]}>
        <mesh geometry={TOTE_BODY} position={[0, -0.06, 0]}>
          <meshStandardMaterial color="#d9bb87" roughness={0.95} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.24, 0]} scale={[0.7, 0.05, 0.24]}>
          <sphereGeometry args={[0.5, 18, 10]} />
          <meshStandardMaterial color="#c2a273" roughness={0.96} />
        </mesh>
        {TOTE_HANDLES.map((geometry, index) => (
          <mesh geometry={geometry} key={index} position={[0, -0.06, 0]}>
            <meshStandardMaterial color="#a9814c" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, -0.1, 0.14]} rotation={[0.06, 0, 0]}>
          <circleGeometry args={[0.14, 24]} />
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
      <group rotation={[0.18, -0.24, 0.12]}>
        {NEWSPAPER_SHEETS.map((geometry, index) => (
          <mesh
            geometry={geometry}
            key={index}
            position={[index * 0.008, index * 0.014, index * -0.02]}
            rotation={[0, 0, index * 0.03]}
          >
            <meshStandardMaterial
              color={index === 0 ? "#efebdf" : "#e2ddcf"}
              roughness={0.97}
              side={DoubleSide}
            />
          </mesh>
        ))}
        <mesh position={[-0.36, 0.01, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.5, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#e7e2d5" roughness={0.97} side={DoubleSide} />
        </mesh>
        <mesh position={[0.02, 0.17, 0.036]}>
          <planeGeometry args={[0.44, 0.07]} />
          <meshStandardMaterial color="#3c4a46" roughness={0.98} />
        </mesh>
        {[0.05, -0.03, -0.11, -0.19].map((y) => (
          <mesh key={y} position={[0.08, y, 0.036]}>
            <planeGeometry args={[0.36, 0.014]} />
            <meshStandardMaterial color="#6d7a75" roughness={1} />
          </mesh>
        ))}
        <mesh position={[-0.2, -0.09, 0.036]}>
          <planeGeometry args={[0.16, 0.2]} />
          <meshStandardMaterial color="#33796a" roughness={0.92} />
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
      <group rotation={[0.2, 0.24, -0.1]}>
        <mesh geometry={DIAPER_BODY}>
          <meshStandardMaterial color="#f5f2e9" roughness={0.93} />
        </mesh>
        {[-0.46, 0.46].map((x) => (
          <mesh
            geometry={DIAPER_TAB}
            key={x}
            position={[x, 0.08, 0]}
            rotation={[0, 0, x < 0 ? -0.34 : 0.34]}
          >
            <meshStandardMaterial color="#eaeff2" roughness={0.9} />
          </mesh>
        ))}
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.24, 0.016, 8, 22]} />
            <meshStandardMaterial color="#dfe6ea" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.42]}>
          <torusGeometry args={[0.26, 0.032, 9, 26]} />
          <meshStandardMaterial color="#7fbdd6" roughness={0.84} />
        </mesh>
      </group>
    );
  }

  if (shape === "battery") {
    return (
      <group rotation={[0, 0.4, Math.PI / 2]}>
        <mesh geometry={BATTERY_BODY}>
          <meshStandardMaterial color="#2f343a" metalness={0.34} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.113, 0.113, 0.09, 20]} />
          <meshStandardMaterial color="#c9cdd0" metalness={0.7} roughness={0.24} />
        </mesh>
        <mesh position={[0, -0.53, 0]}>
          <cylinderGeometry args={[0.245, 0.245, 0.035, 24]} />
          <meshStandardMaterial color="#b9bec1" metalness={0.66} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.283, 0.283, 0.3, 26, 1, true]} />
          <meshStandardMaterial color="#d9542f" roughness={0.52} side={DoubleSide} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.283, 0.283, 0.06, 26, 1, true]} />
          <meshStandardMaterial color="#e8e2d2" roughness={0.6} side={DoubleSide} />
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
        <meshStandardMaterial color="#b6b2a6" metalness={0.62} roughness={0.36} />
      </mesh>
      {[-0.3, -0.38, -0.46].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.152, 0.017, 7, 22]} />
          <meshStandardMaterial color="#a49f92" metalness={0.6} roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0, -0.65, 0]}>
        <sphereGeometry args={[0.06, 14, 10]} />
        <meshStandardMaterial color="#4b4a46" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}
