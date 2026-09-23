import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CylinderGeometry,
  DoubleSide,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type Texture,
} from "three";
import { assets } from "../../../lib/assets";
import { FitCamera } from "../shared/FitCamera";
import { BlobShadow, DappledShade, GardenLighting, GardenWorld } from "../shared/GardenWorld";
import { GlassMaterial } from "../shared/GlassMaterial";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { WoodTable } from "../shared/WoodTable";
import { roundedPlateGeometry, smoothLatheGeometry, surfaceBandGeometry, warpGeometry } from "../shared/geometry";
import { segment, usePlayhead } from "../shared/motion";
import { kraftMaps } from "../shared/organicTextures";
import { SUN_DIRECTION } from "../shared/sky";
import { canvasTexture, once, withRepeat, woodMaps } from "../shared/textures";
import { batikKawungTexture, chalkboardCanvas, infoTagTexture } from "./businessTextures";
import { CONTAINERS, MARKET_BUYERS, type Container, type ProductState } from "./evaluateProduct";

// Skala: 6,6 satuan adegan per meter. Produk ±18 cm di atas meja bazar.
const UPM = 6.6;
const TABLE_TOP = -0.61;
const GROUND_Y = TABLE_TOP - (0.76 * UPM);

// ---------------------------------------------------------------------------
// Kemasan
// ---------------------------------------------------------------------------

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

const POUCH_LABEL = () => once("pouch-label", () => new CylinderGeometry(0.55, 0.55, 0.56, 26, 1, true, -0.36, 0.72));

// Label memakai desain resmi yang sudah dipakai di galeri branding: pouch
// membawa label kompos, botol dan toples membawa label eco enzyme.
const LABEL_ART: Record<Container, string> = {
  pouch: assets.business.labelCompost,
  bottle: assets.business.labelEcoEnzyme,
  jar: assets.business.labelEcoEnzyme,
};

// Piringan rak berpuncak di dasar botol. Toples dan pouch berakhir lebih
// tinggi, jadi keduanya diturunkan supaya menapak di meja.
const CONTAINER_BASE: Record<Container, number> = {
  pouch: 0.32,
  bottle: 0.61,
  jar: 0.53,
};

const INFO_LINES: Record<Container, readonly string[]> = {
  pouch: [
    "Komposisi: kompos matang dari sisa dapur",
    "Manfaat: menggemburkan tanah",
    "Cara pakai: campur ¼ dengan tanah",
    "Simpan: tempat kering, tertutup",
  ],
  bottle: [
    "Komposisi: gula, kulit buah, air",
    "Manfaat: pembersih noda ringan",
    "Cara pakai: encerkan dulu",
    "Perhatian: tidak untuk diminum",
  ],
  jar: [
    "Komposisi: gula, kulit buah, air",
    "Manfaat: pembersih noda ringan",
    "Cara pakai: encerkan dulu",
    "Perhatian: tidak untuk diminum",
  ],
};

function Product({ container, hasLabel, label }: { container: Container; hasLabel: boolean; label: Texture }) {
  const kraft = useMemo(() => withRepeat(kraftMaps(), 1.6, 1.6), []);
  return (
    <group position={[0, CONTAINER_BASE[container], 0]}>
      {container === "pouch" ? (
        <>
          <mesh castShadow geometry={POUCH_BODY} position={[0, 0.1, 0]} receiveShadow>
            <meshPhysicalMaterial {...kraft} clearcoat={0.25} clearcoatRoughness={0.6} side={DoubleSide} />
          </mesh>
          <mesh castShadow geometry={POUCH_SEAL} position={[0, 0.55, 0]}>
            <meshStandardMaterial {...kraft} color="#e0cba8" />
          </mesh>
          {hasLabel ? (
            <mesh geometry={POUCH_LABEL()} position={[0, 0.12, -0.35]}>
              <meshStandardMaterial map={label} roughness={0.7} side={DoubleSide} />
            </mesh>
          ) : null}
        </>
      ) : null}

      {container === "bottle" ? (
        <>
          <mesh castShadow geometry={BOTTLE_BODY}>
            <GlassMaterial color="#d99a48" ior={1.5} thickness={0.3} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.284, 0.275, 0.72, 26]} />
            <meshPhysicalMaterial clearcoat={0.6} color="#8a4d17" roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0.56, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.12, 22]} />
            <meshPhysicalMaterial clearcoat={0.4} color="#1c7a57" roughness={0.45} />
          </mesh>
          {hasLabel ? (
            <mesh geometry={BOTTLE_LABEL}>
              <meshStandardMaterial map={label} roughness={0.7} side={DoubleSide} />
            </mesh>
          ) : null}
        </>
      ) : null}

      {container === "jar" ? (
        <>
          <mesh castShadow geometry={JAR_BODY}>
            <GlassMaterial color="#eef6f2" thickness={0.24} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.356, 0.34, 0.72, 28]} />
            <meshPhysicalMaterial clearcoat={0.6} color="#93561c" roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.12, 30]} />
            <meshStandardMaterial color="#c9963f" metalness={0.7} roughness={0.3} />
          </mesh>
          {hasLabel ? (
            <mesh geometry={JAR_LABEL}>
              <meshStandardMaterial map={label} roughness={0.7} side={DoubleSide} />
            </mesh>
          ) : null}
        </>
      ) : null}
    </group>
  );
}

function useLabelTexture(container: Container) {
  const invalidate = useThree((state) => state.invalidate);
  const texture = useMemo(() => {
    const loaded = new TextureLoader().load(LABEL_ART[container], () => invalidate());
    loaded.colorSpace = SRGBColorSpace;
    loaded.anisotropy = 8;
    return loaded;
  }, [container, invalidate]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// ---------------------------------------------------------------------------
// Lapak
// ---------------------------------------------------------------------------

const TABLE_WIDTH = 1.5 * UPM;
const TABLE_DEPTH = 0.8 * UPM;

function Tablecloth() {
  const batik = useMemo(() => {
    const texture = batikKawungTexture().clone();
    texture.repeat.set(8.5, 4.4);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const side = useMemo(() => {
    const texture = batikKawungTexture().clone();
    texture.repeat.set(8.5, 0.9);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const drop = 0.95;
  return (
    <group>
      <mesh position={[0, TABLE_TOP + 0.012, 0]} receiveShadow>
        <boxGeometry args={[TABLE_WIDTH + 0.16, 0.024, TABLE_DEPTH + 0.16]} />
        <meshStandardMaterial map={batik} roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0, TABLE_TOP - (drop / 2), (TABLE_DEPTH / 2) + 0.08]} receiveShadow>
        <planeGeometry args={[TABLE_WIDTH + 0.16, drop, 20, 4]} />
        <meshStandardMaterial map={side} roughness={0.92} side={DoubleSide} />
      </mesh>
      {[-1, 1].map((direction) => (
        <mesh castShadow key={direction} position={[direction * ((TABLE_WIDTH / 2) + 0.08), TABLE_TOP - (drop / 2), 0]} receiveShadow rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[TABLE_DEPTH + 0.16, drop]} />
          <meshStandardMaterial map={side} roughness={0.92} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function PriceBoard({ price, label }: { price: number; label: string }) {
  const texture = useMemo(
    () => canvasTexture(chalkboardCanvas(`Rp${price.toLocaleString("id-ID")}`, label), { repeat: false }),
    [label, price],
  );
  const wood = useMemo(() => withRepeat(woodMaps("table"), 0.4, 1), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[-1.55, TABLE_TOP, 0.55]} rotation={[0, 0.5, 0]}>
      <group position={[0, 0.62, 0]} rotation={[-0.22, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.02, 0.82, 0.05]} />
          <meshStandardMaterial {...wood} color="#c7a47a" />
        </mesh>
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[0.92, 0.72]} />
          <meshStandardMaterial map={texture} roughness={0.95} />
        </mesh>
      </group>
      <mesh castShadow position={[0, 0.34, -0.26]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.9, 0.72, 0.03]} />
        <meshStandardMaterial {...wood} color="#b8946a" />
      </mesh>
      <BlobShadow opacity={0.3} position={[0, 0.004, -0.1]} size={1.2} stretch={0.6} />
    </group>
  );
}

function InfoCard({ container }: { container: Container }) {
  const texture = infoTagTexture(container === "pouch" ? "KOMPOS" : "ECO ENZYME", INFO_LINES[container]);
  return (
    <group position={[1.1, TABLE_TOP, 0.62]} rotation={[0, -0.55, 0]}>
      <mesh castShadow position={[0, 0.38, 0]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.58, 0.76, 0.012]} />
        <meshStandardMaterial color="#f2ead6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.38, 0.008]} rotation={[-0.18, 0, 0]}>
        <planeGeometry args={[0.56, 0.735]} />
        <meshStandardMaterial map={texture} polygonOffset polygonOffsetFactor={-2} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.3, -0.13]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.01]} />
        <meshStandardMaterial color="#e5dcc4" roughness={0.9} />
      </mesh>
      <BlobShadow opacity={0.25} position={[0, 0.004, -0.06]} size={0.8} stretch={0.5} />
    </group>
  );
}

function Banner() {
  const invalidate = useThree((state) => state.invalidate);
  const logo = useMemo(() => {
    const texture = new TextureLoader().load(assets.business.businessLogo, () => invalidate());
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [invalidate]);
  useEffect(() => () => logo.dispose(), [logo]);
  const wood = useMemo(() => withRepeat(woodMaps("weathered"), 0.3, 2), []);
  // Spanduk berdiri di belakang meja, setinggi kira-kira 1,9 m.
  const height = 1.9 * UPM;
  return (
    <group position={[1.4, GROUND_Y, -(TABLE_DEPTH / 2) - 2.6]}>
      {[-2.3, 2.3].map((x) => (
        <mesh castShadow key={x} position={[x, height / 2, 0]} receiveShadow>
          <cylinderGeometry args={[0.06, 0.07, height, 12]} />
          <meshStandardMaterial {...wood} color="#cdb38f" />
        </mesh>
      ))}
      <mesh castShadow position={[0, height - 1.3, 0]} receiveShadow>
        <planeGeometry args={[4.5, 2.4]} />
        <meshStandardMaterial color="#0e5a41" roughness={0.85} side={DoubleSide} />
      </mesh>
      <mesh position={[0, height - 1.25, 0.01]}>
        <planeGeometry args={[1.6, 1.6]} />
        <meshStandardMaterial map={logo} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stok dan kaleng uang
// ---------------------------------------------------------------------------

const STOCK_SLOTS: [number, number, number][] = Array.from({ length: MARKET_BUYERS }, (_, index) => {
  const row = index < 5 ? 0 : 1;
  const column = index % 5;
  return [(column - 2) * 0.82, row * 0.28, -1.05 - (row * 0.72)];
});

function Riser() {
  const wood = useMemo(() => withRepeat(woodMaps("table"), 1.4, 0.4), []);
  return (
    <mesh castShadow position={[0, TABLE_TOP + 0.14, -1.77]} receiveShadow>
      <boxGeometry args={[4.4, 0.28, 0.7]} />
      <meshStandardMaterial {...wood} />
    </mesh>
  );
}

function Stock({ container, hasLabel, label, sold, marketDay, reduceMotion }: {
  container: Container;
  hasLabel: boolean;
  label: Texture;
  sold: number;
  marketDay: number;
  reduceMotion: boolean;
}) {
  const refs = useRef<(Group | null)[]>([]);
  const playhead = usePlayhead(marketDay > 0 ? marketDay : null, 2600, reduceMotion);

  useFrame(() => {
    const t = playhead.current.value;
    refs.current.forEach((unit, index) => {
      if (!unit) return;
      // Unit di barisan depan terjual lebih dulu, satu per satu.
      if (index >= sold) {
        unit.visible = true;
        unit.scale.setScalar(0.78);
        unit.position.y = TABLE_TOP + STOCK_SLOTS[index][1];
        return;
      }
      const start = (index / Math.max(sold, 1)) * 0.75;
      const leave = segment(t, start, start + 0.18);
      unit.visible = leave < 1;
      unit.scale.setScalar(0.78 * (1 - (leave * 0.6)));
      unit.position.y = TABLE_TOP + STOCK_SLOTS[index][1] + (Math.sin(leave * Math.PI * 0.5) * 0.6);
    });
  });

  return (
    <>
      {STOCK_SLOTS.map(([x, y, z], index) => (
        <group
          key={index}
          position={[x, TABLE_TOP + y, z]}
          ref={(group) => { refs.current[index] = group; }}
          rotation={[0, (index % 2 === 0 ? 0.08 : -0.06), 0]}
          scale={0.78}
        >
          <Product container={container} hasLabel={hasLabel} label={label} />
        </group>
      ))}
    </>
  );
}

const COIN = () => once("coin", () => new CylinderGeometry(0.075, 0.075, 0.018, 24));

function CashTin({ sold, marketDay, reduceMotion }: { sold: number; marketDay: number; reduceMotion: boolean }) {
  const refs = useRef<(Group | null)[]>([]);
  const playhead = usePlayhead(marketDay > 0 ? marketDay : null, 2600, reduceMotion);

  useFrame(() => {
    const t = playhead.current.value;
    refs.current.forEach((coin, index) => {
      if (!coin) return;
      if (index >= sold) {
        coin.visible = false;
        return;
      }
      const start = ((index / Math.max(sold, 1)) * 0.75) + 0.1;
      const drop = segment(t, start, start + 0.12);
      coin.visible = drop > 0;
      coin.position.y = 0.06 + (index * 0.02) + ((1 - drop) * 0.5);
    });
  });

  return (
    <group position={[2.05, TABLE_TOP, 0.35]} rotation={[0, -0.3, 0]}>
      <mesh castShadow position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.2, 0.6]} />
        <meshStandardMaterial color="#b7c1c0" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.201, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.84, 0.54]} />
        <meshStandardMaterial color="#3f4745" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.42, -0.3]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.9, 0.02, 0.6]} />
        <meshStandardMaterial color="#aab4b3" metalness={0.8} roughness={0.35} />
      </mesh>
      {Array.from({ length: MARKET_BUYERS }, (_, index) => (
        <group
          key={index}
          position={[((index % 3) - 1) * 0.22, 0.1, (Math.floor(index / 3) % 2 === 0 ? -0.08 : 0.1)]}
          ref={(group) => { refs.current[index] = group; }}
          visible={false}
        >
          <mesh castShadow geometry={COIN()}>
            <meshStandardMaterial color={index % 3 === 0 ? "#c9ccc9" : "#d8b55a"} metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <BlobShadow opacity={0.3} position={[0, 0.004, 0]} size={1.2} stretch={0.7} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Adegan
// ---------------------------------------------------------------------------

type ProductShelfSceneProps = {
  state: ProductState;
  sold: number;
  reduceMotion: boolean;
};

const SHADE_HEIGHT = 6.4;
const SHADE_POSITION: [number, number, number] = [
  -2.6 + ((SUN_DIRECTION.x / SUN_DIRECTION.y) * (SHADE_HEIGHT - TABLE_TOP)),
  SHADE_HEIGHT,
  -2.4 + ((SUN_DIRECTION.z / SUN_DIRECTION.y) * (SHADE_HEIGHT - TABLE_TOP)),
];

export function ProductShelfScene({ state, sold, reduceMotion }: ProductShelfSceneProps) {
  const label = useLabelTexture(state.container);
  const container = CONTAINERS[state.container];

  return (
    <>
      <GardenLighting shadowExtent={6.5} target={[0, TABLE_TOP, -0.6]} />
      <GardenWorld clearing={1.1} fog={[24, 130]} groundY={GROUND_Y} unitsPerMeter={UPM} />
      <DappledShade position={SHADE_POSITION} seed={11} size={3.2} />

      <FitCamera centerY={0.1} direction={[0.5, 0.42, 1]} radius={1.5} />
      <OrbitCameraControls maxDistance={16} maxPolarAngle={Math.PI * 0.5} minDistance={2.8} target={[0, 0.1, 0]} />

      <WoodTable depth={TABLE_DEPTH} ground={GROUND_Y} kind="table" top={TABLE_TOP - 0.025} width={TABLE_WIDTH} />
      <Tablecloth />
      <Banner />
      <Riser />
      <Stock
        container={state.container}
        hasLabel={state.hasLabel}
        label={label}
        marketDay={state.marketDay}
        reduceMotion={reduceMotion}
        sold={sold}
      />

      <group position={[0, TABLE_TOP, 0]}>
        <Product container={state.container} hasLabel={state.hasLabel} label={label} />
      </group>
      <BlobShadow opacity={0.45} position={[0, TABLE_TOP + 0.004, 0]} size={1.3} />

      <PriceBoard label={container.label} price={state.price} />
      {state.hasInfo ? <InfoCard container={state.container} /> : null}
      <CashTin marketDay={state.marketDay} reduceMotion={reduceMotion} sold={sold} />
    </>
  );
}
