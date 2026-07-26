import { memo } from "react";

type Placement = {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
};

// Pepohonan, semak, dan pagar di tepi kebun, digambar dengan gaya yang sama
// seperti stasiun pilah sampah. Tanpa lapisan ini simulasi yang kameranya
// dekat (eco enzyme, media tanam, rak produk) hanya menampilkan tanah datar
// dan langit kosong, karena hiasan GardenBackdrop semuanya berada dekat subjek.
const TREES: Placement[] = [
  { position: [-4.7, -1.52, -4.3], scale: 0.95 },
  { position: [-2.9, -1.52, -5.3], scale: 0.8 },
  { position: [3.1, -1.52, -4.9], scale: 0.86 },
  { position: [4.9, -1.52, -2.3], scale: 0.74 },
  { position: [-5.6, -1.52, -1.1], scale: 0.7 },
];

const BUSHES: Placement[] = [
  { position: [-3.6, -1.44, -3.4], scale: 0.7 },
  { position: [-1.4, -1.44, -4.7], scale: 0.62 },
  { position: [1.8, -1.44, -3.9], scale: 0.66 },
  { position: [4.2, -1.44, -3.2], scale: 0.6 },
  { position: [-5.2, -1.44, 0.6], scale: 0.58 },
  { position: [4.6, -1.44, 0.2], scale: 0.52 },
];

const GRASS_TUFTS: Placement[] = [
  { position: [-3.1, -1.5, -2.5], rotation: 0.2 },
  { position: [2.7, -1.5, -2.3], rotation: -0.35 },
  { position: [4.6, -1.5, -1.2], rotation: 0.5 },
  { position: [-4.8, -1.5, -0.4], rotation: 0.15 },
  { position: [0.9, -1.5, -3.4], rotation: -0.2 },
];

// Pagar memanjang di belakang kiri, searah pandang kamera laboratorium yang
// memotong dari sisi kanan, supaya terlihat melintang di belakang subjek.
const FENCE_POST_XS = [-5.5, -4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5];
const FENCE_Z = -5.05;

const TREE_CANOPIES: { position: [number, number, number]; scale: number; color: string }[] = [
  { position: [0, 2.45, 0], scale: 1.18, color: "#3e793d" },
  { position: [-0.48, 2.22, 0.05], scale: 0.86, color: "#4b8a47" },
  { position: [0.5, 2.18, -0.02], scale: 0.9, color: "#568f4b" },
];

function PerimeterTree({ position, scale = 1 }: Placement) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.22, 0.3, 2.3, 12]} />
        <meshStandardMaterial color="#705038" roughness={1} />
      </mesh>
      {TREE_CANOPIES.map((canopy) => (
        <mesh key={canopy.position.join("-")} position={canopy.position} scale={canopy.scale}>
          <icosahedronGeometry args={[0.92, 2]} />
          <meshStandardMaterial color={canopy.color} roughness={0.96} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function PerimeterBush({ position, scale = 1 }: Placement) {
  return (
    <group position={position} scale={scale}>
      {[-0.42, 0, 0.42].map((offset, index) => (
        <mesh key={offset} position={[offset, 0.33 + (index % 2) * 0.12, index === 1 ? -0.12 : 0]}>
          <icosahedronGeometry args={[0.52, 1]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#397347" : "#4c8248"}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function PerimeterGrassTuft({ position, rotation = 0 }: Placement) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.12, 0, 0.12].map((x, index) => (
        <mesh key={x} position={[x, 0.18 + index * 0.03, 0]} rotation={[0, 0, x * -1.6]}>
          <coneGeometry args={[0.035, 0.48 + index * 0.07, 5]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#63954e" : "#78a85c"} roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

function PerimeterFence() {
  return (
    <group>
      {FENCE_POST_XS.map((x) => (
        <group key={x} position={[x, -0.92, FENCE_Z]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.075, 1.3, 10]} />
            <meshStandardMaterial color="#7a5e40" roughness={0.95} />
          </mesh>
          <mesh position={[0.5, 0.26, 0]}>
            <boxGeometry args={[1.14, 0.08, 0.07]} />
            <meshStandardMaterial color="#9b7952" roughness={0.94} />
          </mesh>
          <mesh position={[0.5, -0.2, 0]}>
            <boxGeometry args={[1.14, 0.08, 0.07]} />
            <meshStandardMaterial color="#9b7952" roughness={0.94} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Permukaan tanah komponen ini berpatokan pada bidang GardenBackdrop
// (y = -1.5), jadi keduanya bisa dibungkus grup transform yang sama.
export const GardenPerimeter = memo(function GardenPerimeter() {
  return (
    <group>
      <PerimeterFence />
      {TREES.map((tree) => (
        <PerimeterTree key={tree.position.join("-")} {...tree} />
      ))}
      {BUSHES.map((bush) => (
        <PerimeterBush key={bush.position.join("-")} {...bush} />
      ))}
      {GRASS_TUFTS.map((tuft) => (
        <PerimeterGrassTuft key={tuft.position.join("-")} {...tuft} />
      ))}
    </group>
  );
});
