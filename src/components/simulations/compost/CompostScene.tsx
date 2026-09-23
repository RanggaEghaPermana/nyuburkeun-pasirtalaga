import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Sprite,
} from "three";
import { cutawaySlabGeometry } from "../shared/cutaway";
import { FallingPiece } from "../shared/FallingPiece";
import { trowelGeometry, wateringCanGeometry } from "../shared/gardenTools";
import { BlobShadow, DappledShade, GardenLighting, GardenWorld } from "../shared/GardenWorld";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { dryLeafGeometry, sampleProfile, warpGeometry } from "../shared/geometry";
import { easeInOut, easeOut, segment, useDamped, usePlayhead } from "../shared/motion";
import { dryLeafMaps, kraftMaps } from "../shared/organicTextures";
import { SUN_DIRECTION } from "../shared/sky";
import {
  blobShadowTexture,
  fabricMaps,
  noiseTile,
  once,
  pavingMaps,
  PAVING_ASPECT,
  plasticMaps,
  sampleTile,
  soilMaps,
  withRepeat,
} from "../shared/textures";
import { CompostMaterialMesh } from "./CompostMaterialMesh";
import {
  COMPOST_MATURE_WEEKS,
  type CompostCondition,
  type CompostMaterial,
  type CompostState,
} from "./evaluateCompost";

type CompostSceneProps = {
  state: CompostState;
  condition: CompostCondition;
  reduceMotion: boolean;
  waterActive: boolean;
  mixing: boolean;
  onMixComplete: () => void;
};

export const COMPOST_MIX_DURATION_MS = 3700;
export const COMPOST_WATER_DURATION_MS = 1550;

// Skala: 5,5 satuan adegan per meter. Ember kompos 40 liter setinggi ±50 cm.
const UPM = 5.5;
const GROUND_Y = -1.5;
const PAD_TOP = -1.44;

// Ember dipotong seperempat ke arah kamera supaya lapisan di dalamnya
// terlihat, seperti gambar potongan di buku pelajaran, tetapi dengan dinding
// plastik yang tetap tampak tebalnya.
const GAP_CENTER = 0.5;
const GAP_WIDTH = 1.5;
const PHI_START = GAP_CENTER + (GAP_WIDTH / 2);
const PHI_LENGTH = (Math.PI * 2) - GAP_WIDTH;
const PHI_END = PHI_START + PHI_LENGTH;

const BUCKET_PROFILE = [
  [0.001, -1.43],
  [1.1, -1.43],
  [1.16, -1.4],
  [1.18, -1.34],
  [1.2, -1.1],
  [1.3, 0.2],
  [1.38, 1.1],
  [1.395, 1.16],
  [1.44, 1.19],
  [1.47, 1.24],
  [1.455, 1.29],
  [1.41, 1.3],
  [1.385, 1.27],
  [1.34, 1.18],
  [1.25, 0.2],
  [1.15, -1.1],
  [1.12, -1.33],
  [1.08, -1.37],
  [0.001, -1.37],
] as const;

const INNER_BOTTOM = -1.37;
const MAX_TOP = 0.95;
const BUCKET_GREEN = "#0d8a5f";
const LID_GREEN = "#35b07e";

function outerRadius(y: number) {
  if (y < -1.1) return 1.2;
  if (y < 0.2) return 1.2 + ((y + 1.1) * (0.1 / 1.3));
  return 1.3 + ((y - 0.2) * (0.08 / 0.9));
}

function innerRadius(y: number) {
  return outerRadius(y) - 0.055;
}

// ---------------------------------------------------------------------------
// Ember
// ---------------------------------------------------------------------------

function bucketGeometry() {
  return once("compost-bucket", () => {
    const points = sampleProfile(BUCKET_PROFILE, 170);
    const body = new LatheGeometry(points, 80, PHI_START, PHI_LENGTH);
    body.computeVertexNormals();
    const cut = new ShapeGeometry(new Shape(points.map((point) => new Vector2(point.x, point.y))), 1);
    const cutStart = cut.clone().rotateY(PHI_START - (Math.PI / 2));
    const cutEnd = cut.clone().rotateY(PHI_END - (Math.PI / 2));
    return { body, cutStart, cutEnd };
  });
}

function ringGeometry(y: number, full = false) {
  return once(`compost-ring-${y}-${full}`, () => {
    const radius = outerRadius(y) + 0.012;
    const points = Array.from({ length: 11 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2;
      return new Vector2(radius + (Math.cos(angle) * 0.024), y + (Math.sin(angle) * 0.024));
    });
    return full ? new LatheGeometry(points, 80) : new LatheGeometry(points, 80, PHI_START, PHI_LENGTH);
  });
}

function lidGeometry(cut: boolean) {
  return once(`compost-lid-${cut}`, () => {
    const points = sampleProfile([
      [0.001, 0.1],
      [0.9, 0.095],
      [1.3, 0.075],
      [1.46, 0.045],
      [1.51, 0.0],
      [1.51, -0.09],
      [1.48, -0.1],
      [1.45, -0.02],
      [1.3, 0.01],
      [0.001, 0.04],
    ], 60);
    return cut ? new LatheGeometry(points, 72, PHI_START, PHI_LENGTH) : new LatheGeometry(points, 72);
  });
}

function handleGeometry() {
  return once("compost-bail-handle", () => {
    const back = GAP_CENTER + Math.PI;
    const a = GAP_CENTER + (Math.PI / 2);
    const b = GAP_CENTER - (Math.PI / 2);
    const lugY = 1.08;
    const r = outerRadius(lugY) + 0.06;
    const start = new Vector3(Math.sin(a) * r, lugY, Math.cos(a) * r);
    const end = new Vector3(Math.sin(b) * r, lugY, Math.cos(b) * r);
    const middle = start.clone().add(end).multiplyScalar(0.5);
    const tilt = 1.25;
    const up = new Vector3(Math.sin(back) * Math.sin(tilt), Math.cos(tilt), Math.cos(back) * Math.sin(tilt));
    const half = start.clone().sub(middle);
    const points = Array.from({ length: 25 }, (_, index) => {
      const s = (index / 24) * Math.PI;
      return middle.clone().addScaledVector(half, Math.cos(s)).addScaledVector(up, r * Math.sin(s));
    });
    const grip = middle.clone().addScaledVector(up, r);
    return {
      wire: new TubeGeometry(new CatmullRomCurve3(points), 80, 0.022, 8, false),
      grip,
      gripRotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), end.clone().sub(start).normalize()),
      lugs: [start, end],
    };
  });
}

const AIR_HOLES = (() => {
  const holes: { position: [number, number, number]; rotation: number }[] = [];
  for (const y of [0.62, 0.9]) {
    for (let phi = PHI_START + 0.22; phi < PHI_END - 0.15; phi += 0.4) {
      const offset = y === 0.9 ? 0.2 : 0;
      const angle = phi + offset;
      if (angle > PHI_END - 0.12) continue;
      const r = outerRadius(y) + 0.004;
      holes.push({ position: [Math.sin(angle) * r, y, Math.cos(angle) * r], rotation: angle });
    }
  }
  return holes;
})();

function Bucket({ lidOn, reduceMotion }: { lidOn: boolean; reduceMotion: boolean }) {
  const { body, cutStart, cutEnd } = bucketGeometry();
  const handle = handleGeometry();
  const plastic = useMemo(() => withRepeat(plasticMaps(), 4, 3), []);
  const bodyMaterial = useMemo(() => new MeshPhysicalMaterial({
    ...plastic,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    color: BUCKET_GREEN,
    side: DoubleSide,
  }), [plastic]);
  const lidMaterial = useMemo(() => new MeshPhysicalMaterial({
    ...plastic,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    color: LID_GREEN,
    side: DoubleSide,
  }), [plastic]);
  const lidRef = useRef<Group>(null);
  const onTop = useDamped(lidOn ? 1 : 0, 3.4, reduceMotion);

  useEffect(() => () => {
    bodyMaterial.dispose();
    lidMaterial.dispose();
  }, [bodyMaterial, lidMaterial]);

  // Tutup berpindah dari posisi bersandar di belakang ember ke atas ember.
  const back = GAP_CENTER + Math.PI + 0.35;
  const leanPosition = new Vector3(Math.sin(back) * 1.62, -0.06, Math.cos(back) * 1.62);
  const topPosition = new Vector3(0, 1.3, 0);

  useFrame(() => {
    const lid = lidRef.current;
    if (!lid) return;
    const t = onTop.current.value;
    const arc = Math.sin(t * Math.PI) * 1.1;
    lid.position.lerpVectors(leanPosition, topPosition, easeInOut(t));
    lid.position.y += arc;
    lid.rotation.set(0, back * (1 - t), 0);
    for (const child of lid.children) child.rotation.x = ((Math.PI / 2) - 0.2) * (1 - t);
    lid.children[0].visible = t < 0.5;
    lid.children[1].visible = t >= 0.5;
  });

  return (
    <group>
      <mesh castShadow geometry={body} material={bodyMaterial} receiveShadow />
      <mesh geometry={cutStart}>
        <meshStandardMaterial color="#5fbf93" roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh geometry={cutEnd}>
        <meshStandardMaterial color="#5fbf93" roughness={0.7} side={DoubleSide} />
      </mesh>
      {[0.8, 1.02, -1.18].map((y) => (
        <mesh castShadow geometry={ringGeometry(y)} key={y} material={bodyMaterial} />
      ))}
      {AIR_HOLES.map((hole) => (
        <group key={`${hole.position[0]}-${hole.position[1]}`} position={hole.position} rotation={[0, hole.rotation, 0]}>
          <mesh>
            <circleGeometry args={[0.042, 16]} />
            <meshStandardMaterial color="#0a3a28" roughness={1} />
          </mesh>
          <mesh position={[0, 0, -0.001]}>
            <ringGeometry args={[0.042, 0.056, 16]} />
            <meshStandardMaterial color="#1f9d6c" roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh castShadow geometry={handle.wire}>
        <meshStandardMaterial color="#b9c2c0" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh
        castShadow
        position={handle.grip.toArray()}
        quaternion={handle.gripRotation}
      >
        <cylinderGeometry args={[0.055, 0.055, 0.46, 16]} />
        <meshPhysicalMaterial clearcoat={0.4} color="#f3cf6d" roughness={0.45} />
      </mesh>
      {handle.lugs.map((lug) => (
        <mesh key={lug.x} position={lug.toArray()}>
          <boxGeometry args={[0.12, 0.16, 0.12]} />
          <meshStandardMaterial color={BUCKET_GREEN} roughness={0.5} />
        </mesh>
      ))}

      <group ref={lidRef}>
        <group>
          <mesh castShadow geometry={lidGeometry(false)} material={lidMaterial} />
          <LidHoles />
        </group>
        <group>
          <mesh castShadow geometry={lidGeometry(true)} material={lidMaterial} />
        </group>
      </group>
    </group>
  );
}

function LidHoles() {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.sin(angle) * 0.75, 0.083, Math.cos(angle) * 0.75]} rotation={[-Math.PI / 2 + 0.02, 0, 0]}>
            <circleGeometry args={[0.045, 14]} />
            <meshStandardMaterial color="#0a3a28" roughness={1} />
          </mesh>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Isi ember: lapisan bahan
// ---------------------------------------------------------------------------

type StratumKind = "green" | "brown" | "mixed" | "compost" | "mature";

type Stratum = {
  key: string;
  kind: StratumKind;
  y0: number;
  y1: number;
  bump: number;
  seed: number;
};

function stratumGeometry(y0: number, y1: number, bump: number, seed: number) {
  return cutawaySlabGeometry({ y0, y1, bump, seed, phiStart: PHI_START, phiLength: PHI_LENGTH, radiusAt: innerRadius });
}

const SOIL_KIND: Record<StratumKind, Parameters<typeof soilMaps>[0]> = {
  green: "greens",
  brown: "browns",
  mixed: "mixed",
  compost: "compost",
  mature: "mature",
};

// Material lapisan dibagi per jenis dan tingkat kebasahan, jadi dua puluh
// lapisan cukup memakai beberapa material saja.
function stratumMaterials(kind: StratumKind, moisture: number) {
  const wetness = Math.round(Math.max(0, Math.min(1, (moisture - 35) / 45)) * 4) / 4;
  const dryness = moisture < 35 ? 0.25 : 0;
  return once(`stratum-${kind}-${wetness}-${dryness}`, () => {
    const maps = soilMaps(SOIL_KIND[kind]);
    const tint = new Color("#ffffff").lerp(new Color("#6b6152"), wetness * 0.5).lerp(new Color("#f4ead8"), dryness);
    const top = new MeshStandardMaterial({ ...withRepeat(maps, 1, 1), color: tint, roughness: 1 - (wetness * 0.45) });
    const side = new MeshStandardMaterial({
      ...withRepeat(maps, 1.4, 1.4),
      color: tint.clone().multiplyScalar(0.86),
      roughness: 1 - (wetness * 0.35),
      side: DoubleSide,
    });
    return [top, side];
  });
}

function StratumMesh({ stratum, moisture }: { stratum: Stratum; moisture: number }) {
  const geometry = useMemo(
    () => stratumGeometry(stratum.y0, stratum.y1, stratum.bump, stratum.seed),
    [stratum.bump, stratum.seed, stratum.y0, stratum.y1],
  );
  const materials = stratumMaterials(stratum.kind, moisture);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh castShadow geometry={geometry} material={materials} receiveShadow />;
}

function stageKind(weeks: number): StratumKind {
  if (weeks >= COMPOST_MATURE_WEEKS) return "mature";
  if (weeks >= 4) return "compost";
  return "mixed";
}

function buildStrata(state: CompostState, mixedThrough: number, leachate: boolean) {
  const bottom = INNER_BOTTOM + (leachate ? 0.06 : 0);
  const shrink = 1 - (Math.min(state.weeks, COMPOST_MATURE_WEEKS) * 0.065);
  const mixedCount = Math.min(mixedThrough, state.batches.length);
  const looseCount = state.batches.length - mixedCount;
  const mixedHeight = mixedCount * 0.105 * shrink;
  const looseStep = looseCount > 0 ? Math.min(0.15, (MAX_TOP - (bottom + mixedHeight)) / looseCount) : 0;
  const strata: Stratum[] = [];

  if (mixedCount > 0) {
    strata.push({
      key: `mixed-${state.mixCount}-${state.weeks}`,
      kind: stageKind(state.weeks),
      y0: bottom,
      y1: bottom + mixedHeight,
      bump: state.weeks >= COMPOST_MATURE_WEEKS ? 0.035 : 0.05,
      seed: state.mixCount + (state.weeks * 7),
    });
  }

  let y = bottom + mixedHeight;
  const batchTops = new Map<number, number>();
  for (let index = mixedCount; index < state.batches.length; index += 1) {
    const batch = state.batches[index];
    batchTops.set(index, y + looseStep);
    strata.push({
      key: `batch-${batch.id}`,
      kind: batch.category,
      y0: Math.max(bottom, y - 0.04),
      y1: y + looseStep,
      bump: 0.07,
      seed: batch.id,
    });
    y += looseStep;
  }

  return { strata, top: y, mixedTop: bottom + mixedHeight, batchTops };
}

type PieceLayout = {
  id: string;
  material: CompostMaterial;
  position: [number, number, number];
  rotation: [number, number, number];
  variant: number;
  fresh: boolean;
  decay: number;
};

function pseudoRandom(seed: number) {
  const value = Math.sin((seed * 12.9898) + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

// Potongan di permukaan: lapisan yang belum diaduk menampilkan bahannya utuh
// di atas, sedangkan campuran yang sudah diaduk hanya menyisakan beberapa
// potongan yang terbenam dan makin hancur seiring minggu.
function buildPieces(state: CompostState, mixedThrough: number, mixedTop: number, looseTopFor: (index: number) => number) {
  const pieces: PieceLayout[] = [];
  const mixedCount = Math.min(mixedThrough, state.batches.length);
  const decay = Math.min(state.weeks / COMPOST_MATURE_WEEKS, 1);
  const lastId = state.batches[state.batches.length - 1]?.id ?? -1;
  const freshBatch = state.lastAction !== "mix" && state.lastAction !== "water" && state.lastAction !== "wait";

  const place = (seed: number, y: number, edgeMargin: number) => {
    const phi = PHI_START + 0.3 + (pseudoRandom(seed) * (PHI_LENGTH - 0.6));
    const r = 0.2 + (Math.sqrt(pseudoRandom(seed + 1)) * (innerRadius(y) - 0.2 - edgeMargin));
    return [Math.sin(phi) * r, y, Math.cos(phi) * r] as [number, number, number];
  };

  if (decay < 1) {
    const embedded = Math.min(mixedCount, 9);
    for (let index = 0; index < embedded; index += 1) {
      const batch = state.batches[Math.floor((index / embedded) * mixedCount)];
      const seed = (batch.id * 31) + (state.mixCount * 7) + index;
      pieces.push({
        id: `mixed-${batch.id}-${index}`,
        material: batch.material,
        position: place(seed, mixedTop - 0.02 - (decay * 0.03), 0.3),
        rotation: [pseudoRandom(seed + 2) * 0.8, pseudoRandom(seed + 3) * 6, pseudoRandom(seed + 4) * 0.6],
        variant: index,
        fresh: false,
        decay: 0.25 + (decay * 0.75),
      });
    }
  }

  const firstVisible = Math.max(mixedCount, state.batches.length - 3);
  for (let index = firstVisible; index < state.batches.length; index += 1) {
    const batch = state.batches[index];
    for (let variant = 0; variant < 3; variant += 1) {
      const seed = (batch.id * 41) + (variant * 17);
      pieces.push({
        id: `${batch.id}-${variant}`,
        material: batch.material,
        position: place(seed, looseTopFor(index) - 0.01, 0.32),
        rotation: [(pseudoRandom(seed + 4) - 0.5) * 0.5, pseudoRandom(seed + 5) * 6, (pseudoRandom(seed + 6) - 0.5) * 0.5],
        variant,
        fresh: freshBatch && batch.id === lastId,
        decay: 0,
      });
    }
  }

  return pieces;
}

function Leachate() {
  const geometry = useMemo(() => {
    const radius = innerRadius(INNER_BOTTOM) - 0.01;
    const shape = new CylinderGeometry(radius, radius, 0.07, 48, 1, false, PHI_START, PHI_LENGTH);
    shape.translate(0, INNER_BOTTOM + 0.035, 0);
    return shape;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial clearcoat={1} clearcoatRoughness={0.05} color="#3b2a14" roughness={0.1} side={DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Alat: sekop kecil dan gembor
// ---------------------------------------------------------------------------

const TROWEL_REST = new Vector3(-1.55, PAD_TOP + 0.05, 1.75);

function Trowel({ mixCount, reduceMotion, onComplete, topY }: { mixCount: number; reduceMotion: boolean; onComplete: () => void; topY: number }) {
  const geometry = trowelGeometry();
  const ref = useRef<Group>(null);
  const playhead = usePlayhead(mixCount > 0 ? mixCount : null, COMPOST_MIX_DURATION_MS, reduceMotion);
  const completedRef = useRef(mixCount);
  const blade = useMemo(() => ({ color: "#c3d2cc", metalness: 0.85, roughness: 0.32 }), []);

  useEffect(() => {
    if (reduceMotion && completedRef.current !== mixCount) {
      completedRef.current = mixCount;
      onComplete();
    }
  }, [mixCount, onComplete, reduceMotion]);

  useFrame(() => {
    const trowel = ref.current;
    if (!trowel) return;
    const t = playhead.current.value;
    const inside = easeInOut(segment(t, 0, 0.18)) * (1 - easeInOut(segment(t, 0.8, 1)));
    const stir = segment(t, 0.18, 0.8);
    const angle = stir * Math.PI * 6;
    // Lingkaran adukan digeser menjauhi celah supaya sekop tetap di dalam ember.
    const centerX = -Math.sin(GAP_CENTER) * 0.28;
    const centerZ = -Math.cos(GAP_CENTER) * 0.28;
    const x = centerX + (Math.cos(angle) * 0.42);
    const z = centerZ + (Math.sin(angle) * 0.42);
    const scoop = Math.sin(angle * 2) * 0.12;
    trowel.position.set(
      TROWEL_REST.x + ((x - TROWEL_REST.x) * inside),
      TROWEL_REST.y + (((topY - 0.28 + scoop) - TROWEL_REST.y) * inside) + (Math.sin(inside * Math.PI) * 2.4),
      TROWEL_REST.z + ((z - TROWEL_REST.z) * inside),
    );
    trowel.rotation.set(
      ((Math.PI / 2) - 0.05) * (1 - inside) + (inside * (0.35 + (Math.sin(angle) * 0.25))),
      (1 - inside) * 0.6 + (inside * (-angle + 0.4)),
      inside * Math.cos(angle) * 0.2,
    );

    if (t >= 1 && completedRef.current !== mixCount) {
      completedRef.current = mixCount;
      onComplete();
    }
  });

  return (
    <group position={TROWEL_REST.toArray()} ref={ref} rotation={[(Math.PI / 2) - 0.05, 0.6, 0]}>
      <mesh castShadow geometry={geometry.blade}>
        <meshStandardMaterial {...blade} side={DoubleSide} />
      </mesh>
      <mesh castShadow geometry={geometry.neck}>
        <meshStandardMaterial {...blade} />
      </mesh>
      <mesh castShadow geometry={geometry.grip}>
        <meshPhysicalMaterial clearcoat={0.5} color="#c9e86c" roughness={0.5} />
      </mesh>
    </group>
  );
}

const CAN_REST = new Vector3(2.2, PAD_TOP, 0.95);
const CAN_POUR = new Vector3(1.75, 1.75, -0.55);

const DROPS = Array.from({ length: 16 }, (_, index) => ({
  spread: new Vector2(Math.cos(index * 2.4) * (0.05 + ((index % 4) * 0.035)), Math.sin(index * 2.4) * (0.05 + ((index % 4) * 0.035))),
  offset: (index % 8) / 8,
}));

function WateringCan({ active, waterCount, reduceMotion, topY }: { active: boolean; waterCount: number; reduceMotion: boolean; topY: number }) {
  const geometry = wateringCanGeometry();
  const ref = useRef<Group>(null);
  const dropsRef = useRef<Group>(null);
  const playhead = usePlayhead(active ? waterCount : null, COMPOST_WATER_DURATION_MS, reduceMotion);
  const metal = useMemo(() => ({ color: "#b8c4c1", metalness: 0.78, roughness: 0.38 }), []);
  const rose = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const can = ref.current;
    const drops = dropsRef.current;
    if (!can || !drops) return;
    const t = playhead.current.value;
    const reach = easeInOut(segment(t, 0, 0.22)) * (1 - easeInOut(segment(t, 0.82, 1)));
    const tilt = easeOut(segment(t, 0.16, 0.3)) * (1 - easeInOut(segment(t, 0.74, 0.86)));
    can.position.lerpVectors(CAN_REST, CAN_POUR, reach);
    can.position.y += Math.sin(reach * Math.PI) * 0.4;
    can.rotation.set(0, (1 - reach) * -2.3 + (reach * -Math.PI + 0.3), -tilt * 0.62);
    can.updateMatrixWorld();
    rose.set(1.33, 1.05, 0).applyMatrix4(can.matrixWorld);
    const pouring = t > 0.28 && t < 0.8;
    drops.visible = pouring;
    if (pouring) {
      drops.children.forEach((child, index) => {
        const drop = DROPS[index];
        const fall = ((t * 7) + drop.offset) % 1;
        child.position.set(
          rose.x + (drop.spread.x * (1 + (fall * 3))),
          rose.y + ((topY - rose.y) * fall),
          rose.z + (drop.spread.y * (1 + (fall * 3))),
        );
      });
    }
  });

  return (
    <>
      <group position={CAN_REST.toArray()} ref={ref} rotation={[0, -2.3, 0]}>
        <mesh castShadow geometry={geometry.body} receiveShadow>
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh castShadow geometry={geometry.shoulder}>
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh castShadow geometry={geometry.spout}>
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh castShadow geometry={geometry.rose}>
          <meshStandardMaterial {...metal} color="#9aa7a4" />
        </mesh>
        <mesh castShadow geometry={geometry.handle}>
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh castShadow geometry={geometry.backHandle}>
          <meshStandardMaterial {...metal} />
        </mesh>
        <BlobShadow opacity={0.35} position={[0, 0.004, 0]} size={1.3} />
      </group>
      <group ref={dropsRef} visible={false}>
        {DROPS.map((drop) => (
          <mesh key={drop.offset + drop.spread.x} scale={[0.6, 1.6, 0.6]}>
            <sphereGeometry args={[0.028, 8, 6]} />
            <meshPhysicalMaterial clearcoat={1} color="#cfe8ee" roughness={0.05} />
          </mesh>
        ))}
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tanda kondisi: uap dan lalat
// ---------------------------------------------------------------------------

const STEAM = Array.from({ length: 7 }, (_, index) => ({
  angle: GAP_CENTER + ((index - 3) * 0.28),
  radius: 0.25 + ((index % 3) * 0.22),
  offset: index / 7,
  drift: (index % 2 === 0 ? 1 : -1) * 0.12,
}));

// Kompos yang sehat menghangat, dan pada pagi yang sejuk uap tipis naik dari
// tumpukannya. Ini tanda pengurai sedang bekerja.
function Steam({ active, topY }: { active: boolean; topY: number }) {
  const groupRef = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const elapsed = useRef(0);
  const texture = blobShadowTexture();

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !active) return;
    elapsed.current += Math.min(delta, 0.05);
    group.children.forEach((child, index) => {
      const puff = STEAM[index];
      const t = ((elapsed.current * 0.22) + puff.offset) % 1;
      const sprite = child as Sprite;
      sprite.position.set(
        (Math.sin(puff.angle) * puff.radius) + (Math.sin((t * 4) + index) * puff.drift),
        topY + 0.1 + (t * 1.9),
        (Math.cos(puff.angle) * puff.radius) + (Math.cos((t * 3) + index) * puff.drift),
      );
      sprite.scale.setScalar(0.35 + (t * 1.1));
      sprite.material.opacity = Math.sin(t * Math.PI) * 0.22;
    });
    invalidate();
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {STEAM.map((puff) => (
        <sprite key={puff.angle}>
          <spriteMaterial alphaMap={texture} color="#fbfbf6" depthWrite={false} opacity={0} transparent />
        </sprite>
      ))}
    </group>
  );
}

// Lalat buah datang ketika campuran terlalu basah atau terlalu banyak sisa
// dapur, sama seperti yang terjadi pada ember kompos sungguhan.
function Flies({ active, topY }: { active: boolean; topY: number }) {
  const groupRef = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !active) return;
    elapsed.current += Math.min(delta, 0.05);
    const time = elapsed.current;
    group.children.forEach((fly, index) => {
      const phase = index * 2.1;
      fly.position.set(
        Math.sin((time * (1.3 + (index * 0.2))) + phase) * (0.7 + (index * 0.15)) + (Math.sin(time * 7 + phase) * 0.05),
        topY + 0.5 + (Math.sin((time * 1.7) + phase) * 0.25),
        Math.cos((time * (1.1 + (index * 0.15))) + phase) * (0.6 + (index * 0.12)),
      );
      fly.rotation.y = time * 3 + phase;
      const wings = fly.children[1];
      wings.rotation.x = Math.sin(time * 60) * 0.5;
    });
    invalidate();
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((index) => (
        <group key={index} scale={1.1}>
          <mesh scale={[1, 0.8, 1.6]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color="#2a211a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.02, -0.005]}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshStandardMaterial color="#e9eef0" depthWrite={false} opacity={0.45} side={DoubleSide} transparent />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Perlengkapan di sekitar ember
// ---------------------------------------------------------------------------

function basketGeometry() {
  return once("compost-basket", () => {
    const points = sampleProfile([
      [0.001, 0],
      [0.55, 0.002],
      [0.68, 0.08],
      [0.8, 0.42],
      [0.84, 0.5],
      [0.8, 0.5],
      [0.76, 0.42],
      [0.64, 0.1],
      [0.001, 0.08],
    ], 60);
    return new LatheGeometry(points, 36);
  });
}

function GreensBasket() {
  const maps = useMemo(() => withRepeat(fabricMaps("burlap"), 3, 1), []);
  const scraps: { material: CompostMaterial; position: [number, number, number]; variant: number }[] = [
    { material: "vegetable-scraps", position: [-0.2, 0.42, 0.1], variant: 0 },
    { material: "fruit-peels", position: [0.22, 0.44, -0.08], variant: 0 },
    { material: "vegetable-scraps", position: [0.05, 0.48, 0.28], variant: 1 },
    { material: "fruit-peels", position: [-0.12, 0.46, -0.3], variant: 1 },
  ];
  return (
    <group position={[-2.35, PAD_TOP, 0.35]} rotation={[0, 0.4, 0]}>
      <mesh castShadow geometry={basketGeometry()} receiveShadow>
        <meshStandardMaterial {...maps} color="#e7c98f" side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.76, 30]} />
        <meshStandardMaterial {...soilMaps("greens")} roughness={0.9} />
      </mesh>
      {scraps.map((scrap) => (
        <group key={`${scrap.material}-${scrap.variant}`} position={scrap.position}>
          <CompostMaterialMesh material={scrap.material} moisture={45} variant={scrap.variant} />
        </group>
      ))}
      <BlobShadow opacity={0.35} position={[0, 0.004, 0]} size={2} />
    </group>
  );
}

const LEAF_PILE = Array.from({ length: 16 }, (_, index) => ({
  position: [
    Math.cos(index * 2.4) * (0.1 + ((index % 5) * 0.14)),
    0.02 + ((index % 4) * 0.03),
    Math.sin(index * 2.4) * (0.1 + ((index % 5) * 0.12)),
  ] as [number, number, number],
  rotation: [(index % 3) * 0.3, index * 1.3, (index % 2) * 0.2] as [number, number, number],
  tone: index % 3 === 0 ? "tan" as const : "brown" as const,
}));

function LeafPile() {
  const geometry = useMemo(() => once("compost-pile-leaf", () => dryLeafGeometry({ length: 0.5, width: 0.28, fold: 0.3, curl: 0.25, wave: 0.02 }, 18, 8)), []);
  return (
    <group position={[2.05, GROUND_Y + 0.03, -1.45]}>
      {LEAF_PILE.map((leaf, index) => (
        <mesh castShadow geometry={geometry} key={index} position={leaf.position} receiveShadow rotation={leaf.rotation}>
          <meshStandardMaterial {...dryLeafMaps(leaf.tone)} side={DoubleSide} />
        </mesh>
      ))}
      <mesh castShadow position={[0.75, 0.03, 0.55]} receiveShadow rotation={[-Math.PI / 2, 0, 0.5]}>
        <boxGeometry args={[1.1, 0.8, 0.04]} />
        <meshStandardMaterial {...kraftMaps(true)} />
      </mesh>
    </group>
  );
}

// Setelah matang, sebagian kompos diayak di atas nyiru bambu di depan ember,
// supaya hasil akhirnya terlihat: gelap, remah, dan tanpa potongan bahan.
function MatureCompostSieve({ visible, reduceMotion }: { visible: boolean; reduceMotion: boolean }) {
  const ref = useRef<Group>(null);
  const shown = useDamped(visible ? 1 : 0, 3, reduceMotion);
  const rimMaps = useMemo(() => withRepeat(fabricMaps("burlap"), 6, 1), []);
  const mound = useMemo(() => once("compost-mature-mound", () => {
    const geometry = new SphereGeometry(0.62, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const tile = noiseTile(211);
    return warpGeometry(geometry, (vertex) => {
      const n = sampleTile(tile, (vertex.x * 0.6) + 0.5, (vertex.z * 0.6) + 0.5);
      vertex.y = (vertex.y * 0.42) + ((n - 0.5) * 0.06 * (vertex.y > 0.01 ? 1 : 0));
    });
  }), []);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const t = shown.current.value;
    group.visible = t > 0.01;
    group.scale.setScalar(0.6 + (t * 0.4));
    group.position.y = PAD_TOP + ((1 - t) * 0.6);
  });

  return (
    <group position={[0.35, PAD_TOP, 2.45]} ref={ref} visible={false}>
      <mesh castShadow position={[0, 0.07, 0]} receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.07, 10, 48]} />
        <meshStandardMaterial {...rimMaps} color="#d9b877" />
      </mesh>
      <mesh position={[0, 0.03, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.78, 40]} />
        <meshStandardMaterial {...rimMaps} color="#b99a62" />
      </mesh>
      <mesh castShadow geometry={mound} position={[0, 0.04, 0]} receiveShadow>
        <meshStandardMaterial {...soilMaps("mature")} roughness={0.95} />
      </mesh>
      <BlobShadow opacity={0.4} position={[0, 0.004, 0]} size={2} />
    </group>
  );
}

function PavingPad() {
  const maps = useMemo(() => withRepeat(pavingMaps(), 1.4, 1.4 * PAVING_ASPECT), []);
  return (
    <mesh position={[0, GROUND_Y + 0.03, 0]} receiveShadow>
      <boxGeometry args={[5.4, 0.06, 5.4]} />
      <meshStandardMaterial {...maps} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Adegan
// ---------------------------------------------------------------------------

function CompostCameraRig() {
  const { camera, invalidate, size } = useThree();

  useLayoutEffect(() => {
    const narrow = size.width / Math.max(1, size.height) < 1.05;
    camera.position.set(narrow ? 3.7 : 4.3, narrow ? 3.2 : 3.1, narrow ? 8.6 : 7.6);
    camera.lookAt(0, -0.15, 0);
    invalidate();
  }, [camera, invalidate, size.height, size.width]);

  return null;
}

const SHADE_HEIGHT = 7.5;
const SHADE_POSITION: [number, number, number] = [
  -2.2 + ((SUN_DIRECTION.x / SUN_DIRECTION.y) * (SHADE_HEIGHT - GROUND_Y)),
  SHADE_HEIGHT,
  -2.6 + ((SUN_DIRECTION.z / SUN_DIRECTION.y) * (SHADE_HEIGHT - GROUND_Y)),
];

export function CompostScene({ state, condition, reduceMotion, waterActive, mixing, onMixComplete }: CompostSceneProps) {
  const invalidate = useThree((threeState) => threeState.invalidate);
  // Lapisan baru menyatu setelah sekop selesai mengaduk, bukan sejak tombol
  // ditekan, supaya prosesnya sempat terlihat.
  const displayedMixedThrough = mixing && state.lastMixReport ? state.lastMixReport.mixedBefore : state.mixedThrough;
  const leachate = state.moisture > 70 && state.batches.length > 0;
  const { strata, top, mixedTop, batchTops } = useMemo(
    () => buildStrata(state, displayedMixedThrough, leachate),
    [displayedMixedThrough, leachate, state],
  );
  const pieces = useMemo(
    () => buildPieces(state, displayedMixedThrough, mixedTop, (batchIndex) => batchTops.get(batchIndex) ?? top),
    [batchTops, displayedMixedThrough, mixedTop, state, top],
  );
  const topY = state.batches.length === 0 ? INNER_BOTTOM : top;
  const lidOn = state.weeks > 0 && state.weeks < COMPOST_MATURE_WEEKS && !mixing && !waterActive;
  const jostleRef = useRef<Group>(null);
  const jostle = usePlayhead(state.mixCount > 0 ? state.mixCount : null, COMPOST_MIX_DURATION_MS, reduceMotion);
  const steamActive = !reduceMotion && state.batches.length > 0 && (condition === "balanced" || condition === "composting");
  const fliesActive = !reduceMotion && state.batches.length > 0 && (condition === "too-wet" || (condition === "needs-browns" && state.greens >= 3));

  useEffect(() => {
    invalidate();
  }, [invalidate, state]);

  useFrame(() => {
    const group = jostleRef.current;
    if (!group) return;
    const t = segment(jostle.current.value, 0.18, 0.8);
    const shake = Math.sin(t * Math.PI);
    group.position.y = shake * (0.06 + (Math.sin(t * Math.PI * 12) * 0.03));
    group.rotation.y = shake * Math.sin(t * Math.PI * 6) * 0.08;
  });

  return (
    <>
      <GardenLighting shadowExtent={5.2} target={[0, -0.6, 0]} />
      <GardenWorld clearing={0.64} fog={[18, 95]} groundY={GROUND_Y} unitsPerMeter={UPM} />
      <DappledShade position={SHADE_POSITION} seed={5} size={3.4} />
      <CompostCameraRig />
      <OrbitCameraControls
        maxDistance={11.5}
        maxPolarAngle={1.42}
        minDistance={5.2}
        minPolarAngle={0.6}
        target={[0, -0.15, 0]}
      />

      <PavingPad />
      <GreensBasket />
      <LeafPile />

      <Bucket lidOn={lidOn} reduceMotion={reduceMotion} />
      <BlobShadow opacity={0.5} position={[0, PAD_TOP + 0.003, 0]} size={3.4} />

      {leachate ? <Leachate /> : null}
      {strata.map((stratum) => (
        <StratumMesh key={stratum.key} moisture={state.moisture} stratum={stratum} />
      ))}
      <group ref={jostleRef}>
        {pieces.map((piece) => (
          <FallingPiece
            fresh={piece.fresh}
            key={piece.id}
            position={piece.position}
            reduceMotion={reduceMotion}
            rotation={piece.rotation}
            spawnY={2.6}
          >
            <group scale={1.25 * (1 - (piece.decay * 0.45))}>
              <CompostMaterialMesh decay={piece.decay} material={piece.material} moisture={state.moisture} variant={piece.variant} />
            </group>
          </FallingPiece>
        ))}
      </group>

      <MatureCompostSieve reduceMotion={reduceMotion} visible={state.weeks >= COMPOST_MATURE_WEEKS} />
      <Steam active={steamActive} topY={topY} />
      <Flies active={fliesActive} topY={topY} />
      <Trowel mixCount={state.mixCount} onComplete={onMixComplete} reduceMotion={reduceMotion} topY={topY} />
      <WateringCan active={waterActive} reduceMotion={reduceMotion} topY={topY} waterCount={state.waterCount} />
    </>
  );
}
