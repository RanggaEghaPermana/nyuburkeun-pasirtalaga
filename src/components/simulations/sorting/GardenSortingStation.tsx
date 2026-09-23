import { useMemo } from "react";
import { DoubleSide, LatheGeometry } from "three";
import { BlobShadow } from "../shared/GardenWorld";
import { sampleProfile } from "../shared/geometry";
import {
  fabricMaps,
  once,
  pavingMaps,
  PAVING_ASPECT,
  stoneMaps,
  withRepeat,
  woodMaps,
} from "../shared/textures";
import { stationSignTexture } from "./binLabel";
import { binDefinitions } from "./sortingBins";
import { WasteObject } from "./WasteObject";
import type { WasteShape } from "./wasteItems";

type GardenSortingStationProps = {
  compact: boolean;
  basketPosition: [number, number, number];
  // Sampah yang belum dipilah, ditumpuk di dalam keranjang sampah campur.
  remaining: readonly WasteShape[];
};

export const STATION_FLOOR_Y = -1.16;

function PavedPad() {
  const maps = useMemo(() => withRepeat(pavingMaps(), 6.5, 6.5 * PAVING_ASPECT), []);
  const curb = useMemo(() => withRepeat(stoneMaps(), 12, 1), []);
  return (
    <group>
      <mesh position={[0, STATION_FLOOR_Y - 0.06, -0.1]} receiveShadow>
        <cylinderGeometry args={[5.2, 5.2, 0.12, 72]} />
        <meshStandardMaterial {...maps} />
      </mesh>
      <mesh castShadow position={[0, STATION_FLOOR_Y - 0.05, -0.1]} receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.26, 0.1, 10, 96]} />
        <meshStandardMaterial {...curb} color="#d8d3c4" />
      </mesh>
    </group>
  );
}

function basketGeometry() {
  return once("sorting-basket", () => new LatheGeometry(sampleProfile([
    [0.001, 0],
    [0.5, 0.002],
    [0.62, 0.08],
    [0.74, 0.46],
    [0.8, 0.52],
    [0.76, 0.52],
    [0.7, 0.46],
    [0.58, 0.1],
    [0.001, 0.08],
  ], 60), 40));
}

const PILE: [number, number, number, number][] = [
  [-0.26, 0.42, 0.08, 0.4],
  [0.24, 0.44, -0.12, 1.3],
  [0.02, 0.5, 0.26, 2.1],
  [-0.1, 0.52, -0.3, 2.9],
  [0.3, 0.52, 0.2, 3.8],
  [-0.34, 0.5, -0.1, 4.6],
  [0.08, 0.58, -0.04, 5.4],
  [-0.2, 0.6, 0.2, 0.9],
  [0.2, 0.6, 0.02, 1.9],
];

// Keranjang anyaman berisi sampah campur di atas bangku kayu. Benda yang
// sedang dipilih melayang di atasnya, dan tumpukannya makin sedikit setiap
// kali sampah masuk ke tong yang benar.
function MixedWasteBasket({ position, remaining }: { position: [number, number, number]; remaining: readonly WasteShape[] }) {
  const weave = useMemo(() => withRepeat(fabricMaps("burlap"), 4, 1.2), []);
  const wood = useMemo(() => withRepeat(woodMaps("weathered"), 1, 0.4), []);
  const [x, , z] = position;
  const stoolTop = STATION_FLOOR_Y + 0.46;

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, stoolTop - 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.86, 0.86, 0.08, 36]} />
        <meshStandardMaterial {...wood} color="#e9d8bc" />
      </mesh>
      {[0, 1, 2, 3].map((index) => {
        const angle = (index / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh castShadow key={index} position={[Math.cos(angle) * 0.6, STATION_FLOOR_Y + 0.2, Math.sin(angle) * 0.6]} rotation={[Math.sin(angle) * 0.08, 0, -Math.cos(angle) * 0.08]}>
            <cylinderGeometry args={[0.05, 0.06, 0.42, 10]} />
            <meshStandardMaterial {...wood} color="#d9c4a2" />
          </mesh>
        );
      })}
      <group position={[0, stoolTop, 0]} scale={0.92}>
        <mesh castShadow geometry={basketGeometry()} receiveShadow>
          <meshStandardMaterial {...weave} color="#e2c68f" side={DoubleSide} />
        </mesh>
        <mesh castShadow position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.78, 0.035, 8, 40]} />
          <meshStandardMaterial {...weave} color="#caa66b" />
        </mesh>
        {remaining.slice(0, PILE.length).map((shape, index) => {
          const [px, py, pz, turn] = PILE[index];
          return (
            <group key={`${shape}-${index}`} position={[px, py - 0.12, pz]} rotation={[0.5, turn, 0.3]} scale={0.34}>
              <WasteObject shape={shape} />
            </group>
          );
        })}
      </group>
      <BlobShadow opacity={0.4} position={[0, STATION_FLOOR_Y + 0.003, 0]} size={2.2} />
    </group>
  );
}

function StationSign() {
  const wood = useMemo(() => withRepeat(woodMaps("table"), 1, 0.5), []);
  const texture = stationSignTexture(binDefinitions.map((definition) => definition.color));
  return (
    <group position={[0, 0, -4.35]}>
      {[-1.45, 1.45].map((x) => (
        <mesh castShadow key={x} position={[x, STATION_FLOOR_Y + 1.15, 0]} receiveShadow>
          <boxGeometry args={[0.14, 2.3, 0.14]} />
          <meshStandardMaterial {...wood} color="#d8c0a0" />
        </mesh>
      ))}
      <mesh castShadow position={[0, STATION_FLOOR_Y + 2.1, 0]} receiveShadow>
        <boxGeometry args={[3.2, 1.2, 0.1]} />
        <meshStandardMaterial {...wood} color="#c9ab86" />
      </mesh>
      <mesh position={[0, STATION_FLOOR_Y + 2.1, 0.052]}>
        <planeGeometry args={[3.02, 1.06]} />
        <meshStandardMaterial map={texture} roughness={0.6} />
      </mesh>
      {/* Atap kecil supaya papan terlindung hujan, seperti papan di balai desa. */}
      <mesh castShadow position={[0, STATION_FLOOR_Y + 2.82, 0.08]} receiveShadow rotation={[0.32, 0, 0]}>
        <boxGeometry args={[3.5, 0.06, 0.62]} />
        <meshStandardMaterial {...wood} color="#8a6a48" />
      </mesh>
    </group>
  );
}

// Panggung belakang di tata letak ponsel: dua tong berdiri lebih tinggi supaya
// tidak tertutup barisan depan.
function RearPlatform() {
  const wood = useMemo(() => withRepeat(woodMaps("weathered"), 1.2, 0.5), []);
  return (
    <group position={[0, STATION_FLOOR_Y + 0.2, -1.82]}>
      {[-0.55, -0.18, 0.18, 0.55].map((z) => (
        <mesh castShadow key={z} position={[0, 0.17, z]} receiveShadow>
          <boxGeometry args={[2.7, 0.07, 0.34]} />
          <meshStandardMaterial {...wood} />
        </mesh>
      ))}
      {[-1.15, 0, 1.15].map((x) => (
        <mesh castShadow key={x} position={[x, 0, 0]} receiveShadow>
          <boxGeometry args={[0.14, 0.3, 1.46]} />
          <meshStandardMaterial {...wood} color="#d8c9b0" />
        </mesh>
      ))}
    </group>
  );
}

export function GardenSortingStation({ compact, basketPosition, remaining }: GardenSortingStationProps) {
  return (
    <group name="garden-sorting-station">
      <PavedPad />
      {compact ? <RearPlatform /> : null}
      <StationSign />
      <MixedWasteBasket position={basketPosition} remaining={remaining} />
    </group>
  );
}
