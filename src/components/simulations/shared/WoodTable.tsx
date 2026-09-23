import { useMemo } from "react";
import { woodMaps, withRepeat } from "./textures";

type WoodTableProps = {
  // Tinggi permukaan atas meja dan tanah, dalam satuan adegan.
  top: number;
  ground: number;
  width: number;
  depth: number;
  planks?: number;
  kind?: "table" | "weathered";
  // Ketebalan papan dalam satuan adegan.
  thickness?: number;
};

// Meja kebun dari papan kayu: permukaan dari beberapa bilah dengan celah
// tipis, rangka bawah, dan empat kaki. Semua ukuran dalam satuan adegan
// supaya bisa dipakai pada skala laboratorium mana pun.
export function WoodTable({ top, ground, width, depth, planks = 5, kind = "weathered", thickness = 0.22 }: WoodTableProps) {
  const maps = useMemo(() => woodMaps(kind), [kind]);
  const plankMaps = useMemo(() => withRepeat(maps, 1.4, 0.35), [maps]);
  const legMaps = useMemo(() => withRepeat(maps, 0.3, 1.2), [maps]);
  const gap = depth * 0.012;
  const plankDepth = (depth - (gap * (planks - 1))) / planks;
  const legSize = Math.min(width, depth) * 0.075;
  const legHeight = top - thickness - ground;
  const inset = legSize * 1.6;

  const plankZ = Array.from({ length: planks }, (_, index) => (-depth / 2) + (plankDepth / 2) + (index * (plankDepth + gap)));
  const legs: [number, number][] = [
    [(-width / 2) + inset, (-depth / 2) + inset],
    [(width / 2) - inset, (-depth / 2) + inset],
    [(-width / 2) + inset, (depth / 2) - inset],
    [(width / 2) - inset, (depth / 2) - inset],
  ];

  return (
    <group>
      {plankZ.map((z, index) => (
        <mesh castShadow key={z} position={[0, top - (thickness / 2), z]} receiveShadow rotation={[0, 0, (index % 2 === 0 ? 1 : -1) * 0.002]}>
          <boxGeometry args={[width * (index % 2 === 0 ? 1 : 0.994), thickness, plankDepth]} />
          <meshStandardMaterial {...plankMaps} color={index % 3 === 1 ? "#f2e6d4" : "#ffffff"} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh castShadow key={`apron-${side}`} position={[0, top - thickness - (legSize * 0.9), side * ((depth / 2) - inset)]} receiveShadow>
          <boxGeometry args={[width - (inset * 1.4), legSize * 1.6, legSize * 0.6]} />
          <meshStandardMaterial {...plankMaps} color="#e6d6c0" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh castShadow key={`apron-x-${side}`} position={[side * ((width / 2) - inset), top - thickness - (legSize * 0.9), 0]} receiveShadow>
          <boxGeometry args={[legSize * 0.6, legSize * 1.6, depth - (inset * 1.4)]} />
          <meshStandardMaterial {...plankMaps} color="#e6d6c0" />
        </mesh>
      ))}
      {legs.map(([x, z]) => (
        <mesh castShadow key={`${x}-${z}`} position={[x, ground + (legHeight / 2), z]} receiveShadow>
          <boxGeometry args={[legSize, legHeight, legSize]} />
          <meshStandardMaterial {...legMaps} color="#ead9c2" />
        </mesh>
      ))}
      <mesh castShadow position={[0, ground + (legHeight * 0.22), (depth / 2) - inset]} receiveShadow>
        <boxGeometry args={[width - (inset * 2), legSize * 0.7, legSize * 0.5]} />
        <meshStandardMaterial {...plankMaps} color="#e0cfb6" />
      </mesh>
    </group>
  );
}
