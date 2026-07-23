import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Vector3,
} from "three";
import type { WasteShape } from "./wasteItems";

type WasteObjectProps = {
  shape: WasteShape;
};

const PEEL_CURVES = [
  new CatmullRomCurve3([
    new Vector3(-0.02, 0.23, 0),
    new Vector3(-0.12, 0.07, 0.02),
    new Vector3(-0.35, -0.13, 0.08),
    new Vector3(-0.56, -0.43, 0.16),
  ]),
  new CatmullRomCurve3([
    new Vector3(0.03, 0.22, 0.02),
    new Vector3(0.15, 0.04, 0.08),
    new Vector3(0.38, -0.17, 0.15),
    new Vector3(0.55, -0.44, 0.17),
  ]),
  new CatmullRomCurve3([
    new Vector3(0, 0.21, 0.04),
    new Vector3(-0.02, 0.01, 0.18),
    new Vector3(0.02, -0.25, 0.34),
    new Vector3(-0.08, -0.5, 0.43),
  ]),
  new CatmullRomCurve3([
    new Vector3(0, 0.22, -0.03),
    new Vector3(0.04, 0.01, -0.17),
    new Vector3(0.13, -0.23, -0.32),
    new Vector3(0.05, -0.46, -0.43),
  ]),
] as const;

function createPeelRibbonGeometry(curve: CatmullRomCurve3) {
  const segments = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const center = curve.getPoint(progress);
    const tangent = curve.getTangent(progress);
    const side = new Vector3(-tangent.y, tangent.x, 0).normalize();
    const width = 0.13 * (1 - (progress * 0.34));
    positions.push(
      center.x + (side.x * width),
      center.y + (side.y * width),
      center.z + (side.z * width),
      center.x - (side.x * width),
      center.y - (side.y * width),
      center.z - (side.z * width),
    );
    uvs.push(0, progress, 1, progress);

    if (index < segments) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const PEEL_RIBBON_GEOMETRIES = PEEL_CURVES.map(createPeelRibbonGeometry);

export function WasteObject({ shape }: WasteObjectProps) {
  if (shape === "peel") {
    return (
      <group dispose={null} rotation={[0.08, 0.24, -0.08]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.095, 0.135, 0.5, 16]} />
          <meshStandardMaterial color="#f2ce4d" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.055, 0.08, 0.12, 12]} />
          <meshStandardMaterial color="#71552d" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.21, 0]} scale={[1, 0.66, 1]}>
          <sphereGeometry args={[0.17, 20, 14]} />
          <meshStandardMaterial color="#f5d867" roughness={0.72} />
        </mesh>
        {PEEL_RIBBON_GEOMETRIES.map((geometry, index) => (
          <mesh geometry={geometry} key={geometry.uuid}>
            <meshStandardMaterial
              color={index % 2 === 0 ? "#f0bc32" : "#f6cc43"}
              roughness={0.78}
              side={DoubleSide}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.2, 0.012]} scale={[0.56, 0.36, 0.56]}>
          <sphereGeometry args={[0.17, 16, 10]} />
          <meshStandardMaterial color="#fff0a6" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (shape === "leaf") {
    return (
      <group rotation={[0.32, 0.2, -0.42]}>
        <mesh scale={[0.66, 0.075, 0.34]}>
          <sphereGeometry args={[0.5, 24, 12]} />
          <meshStandardMaterial color="#78a44b" roughness={0.84} />
        </mesh>
        <mesh position={[0.05, 0.04, 0.03]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.026, 0.7, 9]} />
          <meshStandardMaterial color="#456b32" roughness={0.92} />
        </mesh>
        <mesh position={[0.48, -0.055, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.03, 0.42, 9]} />
          <meshStandardMaterial color="#456b32" roughness={0.92} />
        </mesh>
      </group>
    );
  }

  if (shape === "jar") {
    return (
      <group rotation={[0.04, 0.28, -0.08]}>
        <mesh>
          <cylinderGeometry args={[0.38, 0.34, 0.82, 24]} />
          <meshPhysicalMaterial color="#bfe1dd" transmission={0.18} transparent opacity={0.76} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.14, 24]} />
          <meshStandardMaterial color="#d7a84b" metalness={0.42} roughness={0.36} />
        </mesh>
        <mesh position={[0, -0.23, 0.395]}>
          <planeGeometry args={[0.48, 0.25]} />
          <meshStandardMaterial color="#fffaf0" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  if (shape === "tote") {
    return (
      <group rotation={[0.08, -0.18, -0.08]}>
        <mesh position={[0, -0.08, 0]} scale={[0.78, 0.62, 0.18]}>
          <boxGeometry />
          <meshStandardMaterial color="#d8b983" roughness={0.92} />
        </mesh>
        {[-0.1, 0.1].map((z) => (
          <mesh key={z} position={[0, 0.22, z]}>
            <torusGeometry args={[0.25, 0.035, 9, 20, Math.PI]} />
            <meshStandardMaterial color="#a9824e" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, -0.09, 0.095]}>
          <circleGeometry args={[0.16, 20]} />
          <meshStandardMaterial color="#2e7d32" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (shape === "cardboard") {
    return (
      <group rotation={[0.12, 0.32, -0.12]}>
        <mesh>
          <boxGeometry args={[0.88, 0.58, 0.3]} />
          <meshStandardMaterial color="#b9824b" roughness={0.93} />
        </mesh>
        <mesh position={[0, 0, 0.159]}>
          <boxGeometry args={[0.055, 0.585, 0.018]} />
          <meshStandardMaterial color="#7a542f" roughness={1} />
        </mesh>
        <mesh position={[0, 0.14, 0.16]}>
          <boxGeometry args={[0.89, 0.055, 0.018]} />
          <meshStandardMaterial color="#dfbb7c" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.303, 0]}>
          <boxGeometry args={[0.035, 0.018, 0.29]} />
          <meshStandardMaterial color="#76502d" roughness={0.98} />
        </mesh>
      </group>
    );
  }

  if (shape === "newspaper") {
    return (
      <group rotation={[0.16, -0.22, 0.1]}>
        <mesh scale={[0.78, 0.5, 0.09]}>
          <boxGeometry />
          <meshStandardMaterial color="#eeeade" roughness={0.96} />
        </mesh>
        {[0.2, 0.05, -0.1, -0.25].map((y) => (
          <mesh key={y} position={[0.08, y, 0.052]}>
            <boxGeometry args={[0.5, 0.018, 0.008]} />
            <meshStandardMaterial color="#63706c" roughness={1} />
          </mesh>
        ))}
        <mesh position={[-0.25, 0.05, 0.053]}>
          <boxGeometry args={[0.2, 0.28, 0.008]} />
          <meshStandardMaterial color="#2f7762" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.056]}>
          <boxGeometry args={[0.018, 0.5, 0.007]} />
          <meshStandardMaterial color="#b8b1a3" roughness={1} />
        </mesh>
      </group>
    );
  }

  if (shape === "tissue") {
    return (
      <group rotation={[0.15, -0.25, -0.2]}>
        {[
          { position: [-0.17, 0.02, 0] as const, scale: [0.72, 0.86, 0.5] as const, color: "#f4f1e8" },
          { position: [0.17, 0.08, 0.03] as const, scale: [0.67, 0.72, 0.48] as const, color: "#e8e3d8" },
          { position: [0, -0.17, 0.09] as const, scale: [0.82, 0.55, 0.52] as const, color: "#f0ece2" },
        ].map((piece, index) => (
          <mesh key={index} position={piece.position} scale={piece.scale}>
            <icosahedronGeometry args={[0.42, 1]} />
            <meshStandardMaterial color={piece.color} flatShading roughness={0.96} />
          </mesh>
        ))}
        <mesh position={[0.03, 0.03, 0.235]} scale={[0.46, 0.08, 0.035]}>
          <sphereGeometry args={[0.5, 12, 8]} />
          <meshStandardMaterial color="#b8aa99" roughness={1} />
        </mesh>
      </group>
    );
  }

  if (shape === "diaper") {
    return (
      <group rotation={[0.18, 0.2, -0.12]}>
        <mesh scale={[0.63, 0.38, 0.24]}>
          <sphereGeometry args={[0.68, 22, 14]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.9} />
        </mesh>
        {[-0.43, 0.43].map((x) => (
          <mesh key={x} position={[x, 0.08, 0]} rotation={[0, 0, x < 0 ? -0.22 : 0.22]}>
            <boxGeometry args={[0.24, 0.22, 0.12]} />
            <meshStandardMaterial color="#e8edf0" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.22, 0.17]}>
          <boxGeometry args={[0.66, 0.16, 0.035]} />
          <meshStandardMaterial color="#81bfd7" roughness={0.82} />
        </mesh>
        <mesh position={[0, -0.08, 0.175]} scale={[0.31, 0.18, 0.025]}>
          <sphereGeometry args={[0.5, 14, 10]} />
          <meshStandardMaterial color="#c6e2ec" roughness={0.86} />
        </mesh>
      </group>
    );
  }

  if (shape === "battery") {
    return (
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.29, 0.29, 1.05, 24]} />
          <meshStandardMaterial color="#30353a" metalness={0.35} roughness={0.46} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.08, 24]} />
          <meshStandardMaterial color="#dd5a47" metalness={0.28} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.08, 24]} />
          <meshStandardMaterial color="#c9cdd0" metalness={0.68} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  return (
    <group rotation={[0.08, 0.1, -0.1]}>
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.42, 24, 16]} />
        <meshPhysicalMaterial color="#f4ead3" transmission={0.15} transparent opacity={0.82} roughness={0.18} />
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.48, 18]} />
        <meshStandardMaterial color="#a7a9a5" metalness={0.62} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.56, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.12, 18]} />
        <meshStandardMaterial color="#656966" metalness={0.72} roughness={0.25} />
      </mesh>
    </group>
  );
}
