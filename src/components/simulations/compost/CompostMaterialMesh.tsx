import { useMemo } from "react";
import { Color } from "three";
import type { CompostMaterial } from "./evaluateCompost";

type CompostMaterialMeshProps = {
  material: CompostMaterial;
  moisture: number;
  variant: number;
};

function useMoistureColor(baseColor: string, moisture: number): string {
  return useMemo(() => {
    const wetness = Math.max(0, Math.min(0.34, (moisture - 38) / 155));
    return new Color(baseColor).lerp(new Color("#243c31"), wetness).getStyle();
  }, [baseColor, moisture]);
}

function VegetableScraps({ moisture, variant }: Omit<CompostMaterialMeshProps, "material">) {
  const carrot = useMoistureColor("#e9822f", moisture);
  const leaf = useMoistureColor(variant % 2 === 0 ? "#5f9845" : "#79a94d", moisture);

  if (variant % 2 === 0) {
    return (
      <group rotation={[0.35, 0.18, 0.22]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.12, 0.075, 10]} />
          <meshStandardMaterial color={carrot} roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.041, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.065, 0.012, 6, 12]} />
          <meshStandardMaterial color="#f5bb68" roughness={0.78} />
        </mesh>
        <mesh position={[0.16, 0.015, -0.02]} rotation={[0.2, 0.45, -0.25]} scale={[0.22, 0.035, 0.11]}>
          <sphereGeometry args={[1, 9, 6]} />
          <meshStandardMaterial color={leaf} roughness={0.9} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0.2, -0.28, -0.16]}>
      <mesh scale={[0.3, 0.045, 0.16]}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial color={leaf} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.047, 0]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.025, 0.018, 0.27]} />
        <meshStandardMaterial color="#d8d27b" roughness={0.82} />
      </mesh>
      <mesh position={[-0.23, 0.02, 0.07]} scale={[0.72, 0.55, 0.65]}>
        <dodecahedronGeometry args={[0.13, 0]} />
        <meshPhysicalMaterial color="#c84d3b" clearcoat={0.24} roughness={0.66} />
      </mesh>
    </group>
  );
}

function FruitPeels({ moisture, variant }: Omit<CompostMaterialMeshProps, "material">) {
  const peel = useMoistureColor(variant % 2 === 0 ? "#edc63c" : "#ee8734", moisture);

  return (
    <group rotation={[Math.PI / 2.15, variant * 0.42, variant % 2 === 0 ? 0.28 : -0.34]}>
      <mesh>
        <torusGeometry args={[0.18, 0.045, 7, 16, Math.PI * (variant % 2 === 0 ? 1.42 : 1.1)]} />
        <meshPhysicalMaterial color={peel} clearcoat={0.3} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0, -0.035]} scale={[0.9, 0.9, 0.62]}>
        <torusGeometry args={[0.18, 0.024, 6, 16, Math.PI * (variant % 2 === 0 ? 1.42 : 1.1)]} />
        <meshStandardMaterial color="#f6e2a1" roughness={0.8} />
      </mesh>
      <mesh position={[-0.14, -0.11, 0.01]} scale={[0.8, 0.62, 0.72]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshStandardMaterial color="#79542c" roughness={0.96} />
      </mesh>
    </group>
  );
}

function DryLeaves({ moisture, variant }: Omit<CompostMaterialMeshProps, "material">) {
  const leaf = useMoistureColor(variant % 2 === 0 ? "#a86e35" : "#c38b46", moisture);
  const vein = useMoistureColor("#684328", moisture);

  return (
    <group rotation={[0.16, variant * 0.72, variant % 2 === 0 ? -0.3 : 0.26]}>
      <mesh scale={[0.32, 0.04, 0.15]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={leaf} flatShading roughness={0.98} />
      </mesh>
      <mesh position={[0.02, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.018, 0.52, 6]} />
        <meshStandardMaterial color={vein} roughness={1} />
      </mesh>
      {[-0.12, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.048, x * 0.34]} rotation={[0, 0, x * 1.6]}>
          <boxGeometry args={[0.17, 0.009, 0.012]} />
          <meshStandardMaterial color={vein} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function TornCardboard({ moisture, variant }: Omit<CompostMaterialMeshProps, "material">) {
  const cardboard = useMoistureColor(variant % 2 === 0 ? "#b98552" : "#c5945e", moisture);
  const corrugation = useMoistureColor("#79512e", moisture);

  return (
    <group rotation={[0.16, variant * 0.58, variant % 2 === 0 ? 0.14 : -0.2]}>
      <mesh>
        <boxGeometry args={[0.44, 0.055, 0.3]} />
        <meshStandardMaterial color={cardboard} roughness={1} />
      </mesh>
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.033, 0]}>
          <boxGeometry args={[0.014, 0.012, 0.27]} />
          <meshStandardMaterial color={corrugation} roughness={1} />
        </mesh>
      ))}
      <mesh position={[variant % 2 === 0 ? 0.17 : -0.17, 0.058, 0]} rotation={[0, 0, variant % 2 === 0 ? -0.3 : 0.3]}>
        <boxGeometry args={[0.18, 0.04, 0.29]} />
        <meshStandardMaterial color="#d0a16c" roughness={0.98} />
      </mesh>
    </group>
  );
}

export function CompostMaterialMesh({ material, moisture, variant }: CompostMaterialMeshProps) {
  switch (material) {
    case "vegetable-scraps":
      return <VegetableScraps moisture={moisture} variant={variant} />;
    case "fruit-peels":
      return <FruitPeels moisture={moisture} variant={variant} />;
    case "dry-leaves":
      return <DryLeaves moisture={moisture} variant={variant} />;
    case "torn-cardboard":
      return <TornCardboard moisture={moisture} variant={variant} />;
  }
}
