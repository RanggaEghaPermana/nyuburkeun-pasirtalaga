import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { DoubleSide, SRGBColorSpace, TextureLoader } from "three";
import { assets } from "../../../lib/assets";
import { FitCamera } from "../shared/FitCamera";
import { GardenBackdrop } from "../shared/GardenBackdrop";
import { GardenPerimeter } from "../shared/GardenPerimeter";
import { GlassMaterial } from "../shared/GlassMaterial";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { StageDressing } from "../shared/StageDressing";
import { roundedPlateGeometry, smoothLatheGeometry, surfaceBandGeometry, warpGeometry } from "../shared/geometry";
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

const BOTTLE_PROFILE = [
  [0.001, -0.6],
  [0.2, -0.61],
  [0.29, -0.55],
  [0.3, 0.02],
  [0.27, 0.2],
  [0.16, 0.36],
  [0.145, 0.5],
  [0.001, 0.51],
] as const;

const JAR_PROFILE = [
  [0.001, -0.52],
  [0.24, -0.53],
  [0.35, -0.46],
  [0.375, 0.08],
  [0.34, 0.28],
  [0.27, 0.38],
  [0.275, 0.45],
  [0.001, 0.46],
] as const;

const BOTTLE_BODY = smoothLatheGeometry(BOTTLE_PROFILE);
const JAR_BODY = smoothLatheGeometry(JAR_PROFILE);

// Rentang sudut dipilih agar panjang busurnya sebanding dengan tinggi label,
// sehingga gambar labelnya tidak tertarik atau gepeng.
const BOTTLE_LABEL = surfaceBandGeometry(BOTTLE_PROFILE, {
  fromY: -0.42,
  toY: 0.2,
  offset: 0.005,
  thetaStart: -0.69,
  thetaLength: 1.38,
});

const JAR_LABEL = surfaceBandGeometry(JAR_PROFILE, {
  fromY: -0.36,
  toY: 0.26,
  offset: 0.005,
  thetaStart: -0.56,
  thetaLength: 1.12,
});

const INFO_TAG = roundedPlateGeometry(0.3, 0.22, 0.014, 0.02);

// Label memakai desain resmi yang sudah dipakai di galeri branding, bukan kotak
// putih kosong: pouch membawa label kompos, botol dan toples membawa label eco
// enzyme.
const LABEL_ART: Record<Container, string> = {
  pouch: assets.business.labelCompost,
  bottle: assets.business.labelEcoEnzyme,
  jar: assets.business.labelEcoEnzyme,
};

// Isi kemasan dibuat opaque karena three hanya menyalin objek opaque ke buffer
// transmisi; isi transparan tidak akan terlihat di balik kaca.
const FILL_COLOR: Record<Container, string> = {
  pouch: "#4a3b28",
  bottle: "#a8631f",
  jar: "#9c5f22",
};

// Piringan rak berpuncak di y = -0.61. Botol memang berakhir tepat di sana,
// sedangkan toples dan pouch berakhir lebih tinggi, jadi keduanya diturunkan
// supaya menempel pada piringan dan tidak terlihat melayang.
const CONTAINER_DROP: Record<Container, number> = {
  pouch: -0.29,
  bottle: 0,
  jar: -0.08,
};

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
  const invalidate = useThree((threeState) => threeState.invalidate);

  // Tekstur dimuat imperatif lalu meminta satu gambar ulang setelah selesai,
  // karena kanvas berjalan dengan frameloop "demand".
  const labelTexture = useMemo(() => {
    const texture = new TextureLoader().load(LABEL_ART[state.container], () => invalidate());
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [invalidate, state.container]);

  return (
    <>
      <color attach="background" args={["#dcebd5"]} />
      <fog attach="fog" args={["#dcebd5", 8, 16]} />

      <hemisphereLight intensity={1.3} color="#fff7dc" groundColor="#4c6353" />
      <directionalLight position={[3.8, 6.8, 5]} intensity={2.1} color="#fff2cf" />
      <directionalLight position={[-4.2, 3, -3]} intensity={0.7} color="#b6dcc6" />

      <FitCamera centerY={0.02} radius={1.18} />
      <OrbitCameraControls target={[0, 0.02, 0]} minDistance={2.8} maxDistance={13} />
      <group position={[0, 0.33, 0]} scale={0.8}>
        <GardenBackdrop includeFrontTufts={false} />
        <GardenPerimeter />
      </group>
      <StageDressing groundY={-0.88} scale={4} />

      {/* Tambalan tanah di bawah rak supaya raknya terbaca berdiri di atas
          tanah kebun, bukan melayang di depan kabut. */}
      <mesh position={[0, -0.878, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 40]} />
        <meshStandardMaterial color="#70563b" roughness={1} />
      </mesh>
      <mesh position={[0, -0.874, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.1, 2.3, 40]} />
        <meshStandardMaterial color="#5d4630" roughness={1} />
      </mesh>

      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[1.45, 1.6, 0.18, 40]} />
        <meshStandardMaterial color="#cdb78c" roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <cylinderGeometry args={[0.85, 0.9, 0.1, 34]} />
        <meshStandardMaterial color={ready ? "#8fbf6d" : "#8b9c8f"} roughness={0.88} />
      </mesh>

      <group position={[0, CONTAINER_DROP[state.container], 0]}>
        <ContainerMesh container={state.container} />

        {/* Isi kemasan supaya produknya tidak terlihat kosong. */}
        {state.container === "bottle" ? (
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.284, 0.275, 0.72, 26]} />
            <meshStandardMaterial color={FILL_COLOR.bottle} metalness={0.1} roughness={0.28} />
          </mesh>
        ) : null}

        {state.container === "jar" ? (
          <>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.356, 0.34, 0.72, 28]} />
              <meshStandardMaterial color={FILL_COLOR.jar} metalness={0.08} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.354, 28]} />
              <meshStandardMaterial color="#b57a33" metalness={0.24} roughness={0.12} />
            </mesh>
          </>
        ) : null}

        {/* Label mengikuti profil wadahnya sendiri, bukan silinder lurus yang
            ditempel di atasnya, sehingga tepinya menyatu dengan lengkungan badan. */}
        {state.hasLabel ? (
          state.container === "pouch" ? (
            <mesh position={[0, 0.12, -0.35]}>
              <cylinderGeometry args={[0.55, 0.55, 0.56, 26, 1, true, -0.36, 0.72]} />
              <meshStandardMaterial
                map={labelTexture}
                roughness={0.88}
                side={DoubleSide}
                toneMapped={false}
              />
            </mesh>
          ) : (
            <mesh geometry={state.container === "bottle" ? BOTTLE_LABEL : JAR_LABEL}>
              <meshStandardMaterial
                map={labelTexture}
                roughness={0.86}
                side={DoubleSide}
                toneMapped={false}
              />
            </mesh>
          )
        ) : null}
      </group>

      {state.hasInfo ? (
        <mesh geometry={INFO_TAG} position={[0.56, -0.5, 0.28]} rotation={[-0.32, 0.5, 0.08]}>
          <meshStandardMaterial color="#f4f1e6" roughness={0.95} side={DoubleSide} />
        </mesh>
      ) : null}
    </>
  );
}
