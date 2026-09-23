import { useMemo } from "react";
import { BackSide, Color, CylinderGeometry, DoubleSide, SphereGeometry, TubeGeometry } from "three";
import { dryLeafGeometry, leafMidribCurve, roundedPlateGeometry, warpGeometry, type LeafShape } from "../shared/geometry";
import { bananaPeelMaps, carrotMaps, dryLeafMaps, kraftMaps, orangePeelMaps } from "../shared/organicTextures";
import { leafyScrapMaps } from "../eco/ecoTextures";
import { once } from "../shared/textures";
import type { CompostMaterial } from "./evaluateCompost";

type CompostMaterialMeshProps = {
  material: CompostMaterial;
  moisture: number;
  variant: number;
  // 0 = segar, 1 = hampir hancur. Dipakai selama pengomposan berjalan.
  decay?: number;
};

const WET = new Color("#4a4234");
const ROT = new Color("#34261a");

// Bahan yang basah tampak lebih gelap dan mengilap, bahan yang mulai terurai
// menggelap ke cokelat tanah.
function useSurfaceTone(moisture: number, decay: number) {
  return useMemo(() => {
    const wetness = Math.max(0, Math.min(1, (moisture - 40) / 45));
    const color = new Color("#ffffff").lerp(WET, wetness * 0.35).lerp(ROT, decay * 0.75);
    return { color: color.getStyle(), roughness: 0.82 - (wetness * 0.4) };
  }, [decay, moisture]);
}

const CARROT_SLICE = () => once("compost-carrot", () => new CylinderGeometry(0.12, 0.11, 0.06, 20));

const CABBAGE_LEAF: LeafShape = { length: 0.46, width: 0.34, fold: 0.5, curl: 0.55, wave: 0.03 };
const CABBAGE = () => once("compost-cabbage", () => dryLeafGeometry(CABBAGE_LEAF, 20, 12));
const CABBAGE_RIB = () => once("compost-cabbage-rib", () => new TubeGeometry(leafMidribCurve(CABBAGE_LEAF), 20, 0.018, 6, false));

const TOMATO = () => once("compost-tomato", () => {
  const geometry = new SphereGeometry(0.12, 16, 12, 0, Math.PI * 0.9);
  geometry.scale(1, 0.85, 1);
  return geometry;
});

const BANANA = () => once("compost-banana", () => {
  const geometry = new CylinderGeometry(0.16, 0.16, 0.42, 14, 6, true, 0, 1.3);
  return warpGeometry(geometry, (vertex) => {
    const t = (vertex.y + 0.21) / 0.42;
    const taper = 0.55 + (Math.sin(t * Math.PI) * 0.45);
    vertex.x *= taper;
    vertex.z *= taper;
    vertex.z += Math.sin(t * Math.PI) * 0.06;
  });
});

const ORANGE = () => once("compost-orange", () => {
  const geometry = new SphereGeometry(0.16, 16, 10, 0, 1.6, 0.6, 1.1);
  geometry.center();
  return geometry;
});

const DRY_LEAF: LeafShape = { length: 0.56, width: 0.3, fold: 0.34, curl: 0.42, wave: 0.02 };
const DRY_LEAF_BLADE = () => once("compost-dry-leaf", () => dryLeafGeometry(DRY_LEAF, 24, 10));
const DRY_LEAF_RIB = () => once("compost-dry-leaf-rib", () => new TubeGeometry(leafMidribCurve(DRY_LEAF), 24, 0.008, 5, false));

// Sobekan kardus dengan tepi bergerigi.
const CARDBOARD = (variant: number) => once(`compost-cardboard-${variant % 2}`, () => warpGeometry(
  roundedPlateGeometry(0.46, 0.3, 0.045, 0.01),
  (vertex) => {
    const edgeX = Math.abs(vertex.x) / 0.23;
    const edgeY = Math.abs(vertex.y) / 0.15;
    const ragged = Math.sin((vertex.y * 71) + (variant * 3)) * 0.018 + Math.sin(vertex.x * 53) * 0.012;
    if (edgeX > 0.9) vertex.x += ragged * Math.sign(vertex.x);
    if (edgeY > 0.85) vertex.y += ragged * Math.sign(vertex.y);
    vertex.z += Math.sin(vertex.x * 6) * 0.015;
  },
));

function VegetableScraps({ moisture, variant, decay }: Required<Omit<CompostMaterialMeshProps, "material">>) {
  const tone = useSurfaceTone(moisture, decay);
  if (variant % 2 === 0) {
    return (
      <group rotation={[0.35, 0.18, 0.22]}>
        <mesh castShadow geometry={CARROT_SLICE()}>
          <meshStandardMaterial {...carrotMaps()} color={tone.color} roughness={tone.roughness * 0.7} />
        </mesh>
        <group position={[0.18, 0.02, -0.04]} rotation={[0.2, 0.5, -0.2]}>
          <mesh castShadow geometry={CABBAGE()}>
            <meshStandardMaterial {...leafyScrapMaps()} color={tone.color} side={DoubleSide} />
          </mesh>
          <mesh geometry={CABBAGE_RIB()}>
            <meshStandardMaterial color="#e3edc2" roughness={0.6} />
          </mesh>
        </group>
      </group>
    );
  }

  return (
    <group rotation={[0.2, -0.28, -0.16]}>
      <mesh castShadow geometry={CABBAGE()}>
        <meshStandardMaterial {...leafyScrapMaps()} color={tone.color} side={DoubleSide} />
      </mesh>
      <mesh geometry={CABBAGE_RIB()}>
        <meshStandardMaterial color="#e3edc2" roughness={0.6} />
      </mesh>
      <mesh castShadow geometry={TOMATO()} position={[-0.2, 0.03, 0.08]} rotation={[0, 0.8, 0]}>
        <meshPhysicalMaterial clearcoat={0.5} color={new Color("#c9412f").multiply(new Color(tone.color)).getStyle()} roughness={0.35} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function FruitPeels({ moisture, variant, decay }: Required<Omit<CompostMaterialMeshProps, "material">>) {
  const tone = useSurfaceTone(moisture, decay);
  if (variant % 2 === 0) {
    return (
      <group rotation={[Math.PI / 2.4, variant * 0.4, 0.3]}>
        <mesh castShadow geometry={BANANA()}>
          <meshStandardMaterial {...bananaPeelMaps()} color={tone.color} />
        </mesh>
        <mesh geometry={BANANA()} scale={0.95}>
          <meshStandardMaterial color={new Color("#efe2bb").multiply(new Color(tone.color)).getStyle()} roughness={0.85} side={BackSide} />
        </mesh>
      </group>
    );
  }
  return (
    <group rotation={[0.4, variant * 0.7, -0.3]}>
      <mesh castShadow geometry={ORANGE()}>
        <meshStandardMaterial {...orangePeelMaps()} color={tone.color} />
      </mesh>
      <mesh geometry={ORANGE()} scale={0.95}>
        <meshStandardMaterial color={new Color("#f4e7c6").multiply(new Color(tone.color)).getStyle()} roughness={0.9} side={BackSide} />
      </mesh>
    </group>
  );
}

function DryLeaves({ moisture, variant, decay }: Required<Omit<CompostMaterialMeshProps, "material">>) {
  const tone = useSurfaceTone(moisture, decay);
  const maps = variant % 2 === 0 ? dryLeafMaps("brown") : dryLeafMaps("tan");
  return (
    <group rotation={[0.16, variant * 0.72, variant % 2 === 0 ? -0.3 : 0.26]}>
      <mesh castShadow geometry={DRY_LEAF_BLADE()}>
        <meshStandardMaterial {...maps} color={tone.color} side={DoubleSide} />
      </mesh>
      <mesh geometry={DRY_LEAF_RIB()}>
        <meshStandardMaterial color="#6a4524" roughness={0.9} />
      </mesh>
    </group>
  );
}

function TornCardboard({ moisture, variant, decay }: Required<Omit<CompostMaterialMeshProps, "material">>) {
  const tone = useSurfaceTone(moisture, decay);
  return (
    <mesh castShadow geometry={CARDBOARD(variant)} rotation={[-Math.PI / 2 + 0.16, variant * 0.58, variant % 2 === 0 ? 0.14 : -0.2]}>
      <meshStandardMaterial {...kraftMaps()} color={tone.color} />
    </mesh>
  );
}

export function CompostMaterialMesh({ material, moisture, variant, decay = 0 }: CompostMaterialMeshProps) {
  switch (material) {
    case "vegetable-scraps":
      return <VegetableScraps decay={decay} moisture={moisture} variant={variant} />;
    case "fruit-peels":
      return <FruitPeels decay={decay} moisture={moisture} variant={variant} />;
    case "dry-leaves":
      return <DryLeaves decay={decay} moisture={moisture} variant={variant} />;
    case "torn-cardboard":
      return <TornCardboard decay={decay} moisture={moisture} variant={variant} />;
  }
}
