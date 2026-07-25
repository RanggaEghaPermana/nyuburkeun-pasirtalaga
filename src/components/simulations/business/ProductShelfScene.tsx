import { DoubleSide } from "three";
import { GlassMaterial } from "../shared/GlassMaterial";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { StageDressing } from "../shared/StageDressing";
import { roundedPlateGeometry, smoothLatheGeometry, warpGeometry } from "../shared/geometry";
import type { Container, ProductState } from "./evaluateProduct";

// Pouch berdiri: menggembung di tengah, menyempit ke atas, dan punya dasar
// melebar seperti gusset. Tanpa itu bentuknya terbaca sebagai kartu pipih.
const POUCH_BODY = warpGeometry(roundedPlateGeometry(0.58, 0.84, 0.44, 0.1), (vertex) => {
  const height = Math.min(Math.max((vertex.y + 0.42) / 0.84, 0), 1);
  const puff = Math.sin(height * Math.PI) ** 0.7;
  const gusset = Math.max(0, 1 - (height * 5.2));

  vertex.x *= 0.82 + (puff * 0.22) - (height * 0.1);
  vertex.z *= 0.34 + (puff * 0.88) + (gusset * 0.3);
  vertex.y -= gusset * 0.02;
});

const POUCH_SEAL = roundedPlateGeometry(0.5, 0.09, 0.06, 0.02);
const POUCH_SEAM = roundedPlateGeometry(0.05, 0.8, 0.07, 0.02);

const BOTTLE_BODY = smoothLatheGeometry([
  [0.001, -0.6],
  [0.2, -0.61],
  [0.29, -0.55],
  [0.3, 0.02],
  [0.27, 0.2],
  [0.16, 0.36],
  [0.145, 0.5],
  [0.001, 0.51],
]);

const JAR_BODY = smoothLatheGeometry([
  [0.001, -0.52],
  [0.24, -0.53],
  [0.35, -0.46],
  [0.375, 0.08],
  [0.34, 0.28],
  [0.27, 0.38],
  [0.275, 0.45],
  [0.001, 0.46],
]);

const INFO_TAG = roundedPlateGeometry(0.3, 0.22, 0.014, 0.02);

const BODY_RADIUS: Record<Container, number> = { pouch: 0, bottle: 0.3, jar: 0.375 };

type ProductShelfSceneProps = {
  state: ProductState;
  ready: boolean;
};

function ContainerMesh({ container }: { container: Container }) {
  if (container === "pouch") {
    return (
      <>
        <mesh geometry={POUCH_BODY} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#c39a63" roughness={0.94} side={DoubleSide} />
        </mesh>
        {[-0.28, 0.28].map((x) => (
          <mesh geometry={POUCH_SEAM} key={x} position={[x, 0.1, 0]}>
            <meshStandardMaterial color="#a8814f" roughness={0.96} />
          </mesh>
        ))}
        <mesh geometry={POUCH_SEAL} position={[0, 0.55, 0]}>
          <meshStandardMaterial color="#9d7a4a" roughness={0.96} />
        </mesh>
      </>
    );
  }

  if (container === "bottle") {
    return (
      <>
        <mesh geometry={BOTTLE_BODY}>
          <GlassMaterial color="#e0b463" ior={1.4} thickness={0.3} />
        </mesh>
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.12, 22]} />
          <meshStandardMaterial color="#3f6f52" roughness={0.5} />
        </mesh>
      </>
    );
  }

  return (
    <>
      <mesh geometry={JAR_BODY}>
        <GlassMaterial color="#e4f1ec" thickness={0.26} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.12, 26]} />
        <meshStandardMaterial color="#c9963f" metalness={0.46} roughness={0.36} />
      </mesh>
    </>
  );
}

export function ProductShelfScene({ state, ready }: ProductShelfSceneProps) {
  const radius = BODY_RADIUS[state.container];

  return (
    <>
      <hemisphereLight intensity={1.3} color="#fff7dc" groundColor="#4c6353" />
      <directionalLight position={[3.8, 6.8, 5]} intensity={2.1} color="#fff2cf" />
      <directionalLight position={[-4.2, 3, -3]} intensity={0.7} color="#b6dcc6" />

      <OrbitCameraControls target={[0, 0.08, 0]} minDistance={2.6} maxDistance={7} />
      <StageDressing groundY={-0.69} scale={4} />

      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[1.45, 1.6, 0.18, 40]} />
        <meshStandardMaterial color="#cdb78c" roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <cylinderGeometry args={[0.85, 0.9, 0.1, 34]} />
        <meshStandardMaterial color={ready ? "#8fbf6d" : "#8b9c8f"} roughness={0.88} />
      </mesh>

      <ContainerMesh container={state.container} />

      {state.hasLabel ? (
        state.container === "pouch" ? (
          <mesh position={[0, 0.14, 0.17]}>
            <planeGeometry args={[0.42, 0.4]} />
            <meshStandardMaterial color="#fdf8ec" roughness={0.9} />
          </mesh>
        ) : (
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[radius + 0.008, radius + 0.004, 0.34, 28, 1, true, -0.85, 1.7]} />
            <meshStandardMaterial color="#fdf8ec" roughness={0.9} side={DoubleSide} />
          </mesh>
        )
      ) : null}

      {state.hasLabel ? (
        <mesh position={[0, 0.1, state.container === "pouch" ? 0.176 : radius + 0.014]}>
          <planeGeometry args={[0.2, 0.05]} />
          <meshStandardMaterial color="#2f7d43" roughness={0.82} />
        </mesh>
      ) : null}

      {state.hasInfo ? (
        <mesh geometry={INFO_TAG} position={[0.56, -0.5, 0.28]} rotation={[-0.32, 0.5, 0.08]}>
          <meshStandardMaterial color="#f4f1e6" roughness={0.95} side={DoubleSide} />
        </mesh>
      ) : null}
    </>
  );
}
