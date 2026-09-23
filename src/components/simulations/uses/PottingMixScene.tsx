import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Color,
  DoubleSide,
  InstancedMesh,
  LatheGeometry,
  MeshStandardMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cutawaySlabGeometry } from "../shared/cutaway";
import { FitCamera } from "../shared/FitCamera";
import { trowelGeometry, wateringCanGeometry } from "../shared/gardenTools";
import { BlobShadow, DappledShade, GardenLighting, GardenWorld } from "../shared/GardenWorld";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { WoodTable } from "../shared/WoodTable";
import { dryLeafGeometry, sampleProfile, taperedTubeGeometry, warpGeometry } from "../shared/geometry";
import { easeInOut, easeOut, segment, useDamped, usePlayhead } from "../shared/motion";
import { dryLeafMaps } from "../shared/organicTextures";
import { SUN_DIRECTION } from "../shared/sky";
import {
  canvasTexture,
  createCanvas,
  DISPLAY_FONT,
  fabricMaps,
  noiseTile,
  once,
  rng,
  sampleTile,
  soilMaps,
  terracottaMaps,
  withRepeat,
} from "../shared/textures";
import {
  MIX_CAPACITY,
  type Drainage,
  type MixMaterial,
  type MixState,
  type Watering,
} from "./evaluatePottingMix";

// Skala: 6,2 satuan adegan per meter. Pot terakota ±20 cm di atas tatakan,
// di meja tanam kayu setinggi 76 cm.
const UPM = 6.2;
const TABLE_TOP = -0.74;
const GROUND_Y = TABLE_TOP - (0.76 * UPM);
const POT_BOTTOM = -0.665;

const GAP_CENTER = 0.48;
const GAP_WIDTH = 1.35;
const PHI_START = GAP_CENTER + (GAP_WIDTH / 2);
const PHI_LENGTH = (Math.PI * 2) - GAP_WIDTH;
const PHI_END = PHI_START + PHI_LENGTH;

const POT_PROFILE = [
  [0.07, -0.665],
  [0.42, -0.668],
  [0.47, -0.635],
  [0.5, -0.56],
  [0.62, 0.36],
  [0.64, 0.385],
  [0.7, 0.405],
  [0.72, 0.46],
  [0.715, 0.56],
  [0.67, 0.585],
  [0.635, 0.565],
  [0.615, 0.41],
  [0.565, 0.3],
  [0.45, -0.52],
  [0.405, -0.585],
  [0.07, -0.59],
  [0.07, -0.665],
] as const;

const MIX_BOTTOM = -0.585;
const MIX_TOP = 0.3;
const LAYER_HEIGHT = (MIX_TOP - MIX_BOTTOM) / MIX_CAPACITY;

function innerRadius(y: number) {
  return 0.45 + ((y + 0.52) * (0.115 / 0.82));
}

// ---------------------------------------------------------------------------
// Pot dan tatakan
// ---------------------------------------------------------------------------

function potGeometry() {
  return once("uses-pot", () => {
    const points = sampleProfile(POT_PROFILE, 160);
    const body = new LatheGeometry(points, 72, PHI_START, PHI_LENGTH);
    body.computeVertexNormals();
    const cut = new ShapeGeometry(new Shape(points.map((point) => new Vector2(point.x, point.y))), 1);
    return {
      body,
      cutStart: cut.clone().rotateY(PHI_START - (Math.PI / 2)),
      cutEnd: cut.clone().rotateY(PHI_END - (Math.PI / 2)),
    };
  });
}

function saucerGeometry() {
  return once("uses-saucer", () => new LatheGeometry(sampleProfile([
    [0.001, TABLE_TOP],
    [0.6, TABLE_TOP + 0.002],
    [0.66, TABLE_TOP + 0.03],
    [0.7, TABLE_TOP + 0.09],
    [0.67, TABLE_TOP + 0.095],
    [0.63, TABLE_TOP + 0.04],
    [0.58, TABLE_TOP + 0.018],
    [0.001, TABLE_TOP + 0.018],
  ], 60), 56));
}

function Pot() {
  const { body, cutStart, cutEnd } = potGeometry();
  const maps = useMemo(() => withRepeat(terracottaMaps(), 3, 1.5), []);
  return (
    <group>
      <mesh castShadow geometry={body} receiveShadow>
        <meshStandardMaterial {...maps} side={DoubleSide} />
      </mesh>
      {[cutStart, cutEnd].map((geometry, index) => (
        <mesh geometry={geometry} key={index}>
          <meshStandardMaterial color="#d58f66" roughness={0.95} side={DoubleSide} />
        </mesh>
      ))}
      <mesh castShadow geometry={saucerGeometry()} receiveShadow>
        <meshStandardMaterial {...maps} color="#e8c3aa" side={DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Isi pot
// ---------------------------------------------------------------------------

const MATERIAL_GRAIN: Record<MixMaterial, string> = {
  soil: "#6c4a2f",
  compost: "#241810",
  sand: "#dcc9a0",
};

function useMixMaterials(state: MixState, wetness: number) {
  const total = Math.max(state.layers.length, 1);
  // Dibulatkan supaya material tidak dibuat ulang untuk setiap perubahan kecil.
  const sandShare = Math.round((state.sand / total) * 10) / 10;
  const compostShare = Math.round((state.compost / total) * 10) / 10;
  const wet = Math.round(wetness * 4) / 4;
  return useMemo(() => {
    const maps = soilMaps("garden");
    const tint = new Color("#ffffff")
      .lerp(new Color("#f6e3b8"), Math.min(sandShare * 1.4, 0.9))
      .multiplyScalar(1 - (compostShare * 0.55))
      .lerp(new Color("#5a4c3c"), wet * 0.45);
    const top = new MeshStandardMaterial({ ...withRepeat(maps, 1.3, 1.3), color: tint, roughness: 1 - (wet * 0.4) });
    const side = new MeshStandardMaterial({
      ...withRepeat(maps, 1.6, 1.6),
      color: tint.clone().multiplyScalar(0.88),
      roughness: 1 - (wet * 0.3),
      side: DoubleSide,
    });
    return [top, side];
  }, [compostShare, sandShare, wet]);
}

function MixFill({ state, fillTop, wetness }: { state: MixState; fillTop: number; wetness: number }) {
  const geometry = useMemo(() => cutawaySlabGeometry({
    y0: MIX_BOTTOM,
    y1: fillTop,
    bump: 0.018,
    seed: 3,
    phiStart: PHI_START,
    phiLength: PHI_LENGTH,
    radiusAt: innerRadius,
    rings: 7,
    segments: 40,
  }), [fillTop]);
  const materials = useMixMaterials(state, wetness);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => {
    for (const material of materials) material.dispose();
  }, [materials]);

  return <mesh castShadow geometry={geometry} material={materials} receiveShadow />;
}

// Butiran di bidang potong menunjukkan porsi tiap bahan: pasir terang, kompos
// gelap berserat, tanah cokelat.
function MixGrains({ state, fillTop }: { state: MixState; fillTop: number }) {
  const mesh = useMemo(() => {
    const random = rng(state.layers.length * 31 + state.sand * 7 + state.compost * 13);
    const total = Math.max(state.layers.length, 1);
    const count = Math.min(90 + (state.layers.length * 22), 360);
    const geometry = once("uses-grain", () => new SphereGeometry(1, 6, 4));
    const material = new MeshStandardMaterial({ roughness: 0.9 });
    const instances = new InstancedMesh(geometry, material, count);
    const dummy = new Object3D();
    const color = new Color();
    const order: MixMaterial[] = [];
    (["sand", "compost", "soil"] as const).forEach((material) => {
      const share = state[material] / total;
      for (let index = 0; index < Math.round(share * count); index += 1) order.push(material);
    });
    while (order.length < count) order.push("soil");

    for (let index = 0; index < count; index += 1) {
      const material = order[index];
      const onTop = random() < 0.35;
      const y = onTop ? fillTop - 0.004 : MIX_BOTTOM + 0.02 + (random() * (fillTop - MIX_BOTTOM - 0.03));
      if (onTop) {
        const phi = PHI_START + (random() * PHI_LENGTH);
        const r = Math.sqrt(random()) * (innerRadius(y) - 0.03);
        dummy.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r);
      } else {
        const phi = random() < 0.5 ? PHI_START + 0.006 : PHI_END - 0.006;
        const r = random() * (innerRadius(y) - 0.02);
        const side = phi < PHI_START + 0.1 ? -1 : 1;
        dummy.position.set(Math.sin(phi) * r, y, Math.cos(phi) * r);
        // Sedikit keluar dari bidang potong ke arah celah supaya terlihat.
        dummy.position.x += Math.cos(phi) * 0.004 * side;
        dummy.position.z -= Math.sin(phi) * 0.004 * side;
      }
      const size = material === "sand" ? 0.006 + (random() * 0.006) : material === "compost" ? 0.01 + (random() * 0.012) : 0.008 + (random() * 0.01);
      dummy.scale.set(size * (material === "compost" ? 1.8 : 1), size, size);
      dummy.rotation.set(random() * 3, random() * 3, random() * 3);
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
      color.set(MATERIAL_GRAIN[material]).offsetHSL(0, 0, (random() - 0.5) * 0.08);
      instances.setColorAt(index, color);
    }
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    return instances;
  }, [fillTop, state]);

  useEffect(() => () => {
    (mesh.material as MeshStandardMaterial).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}

// ---------------------------------------------------------------------------
// Akar di bidang potong
// ---------------------------------------------------------------------------

type RootStyle = "healthy" | "rotting" | "burnt";

function rootsGeometry(fillTop: number, reach: number, style: RootStyle, seed: number) {
  const random = rng(seed);
  const tubes: BufferGeometry[] = [];
  const depth = (fillTop - MIX_BOTTOM - 0.05) * reach;
  for (const phi of [PHI_START + 0.012, PHI_END - 0.012]) {
    const direction = new Vector3(Math.sin(phi), 0, Math.cos(phi));
    const at = (r: number, y: number) => direction.clone().multiplyScalar(r).setY(y);
    const top = fillTop - 0.02;
    const tap = new CatmullRomCurve3([
      at(0.015, top),
      at(0.04 + (random() * 0.03), top - (depth * 0.35)),
      at(0.03 + (random() * 0.04), top - (depth * 0.7)),
      at(0.05 + (random() * 0.04), top - depth),
    ]);
    tubes.push(taperedTubeGeometry(tap, (t) => 0.012 * (1 - (t * 0.75)), { tubularSegments: 16, radialSegments: 5 }));
    const laterals = style === "healthy" ? 7 : 4;
    for (let index = 0; index < laterals; index += 1) {
      const t = 0.12 + ((index / laterals) * 0.75);
      const start = tap.getPointAt(t);
      const startR = start.clone().setY(0).length();
      const length = (0.12 + (random() * 0.25)) * reach * (style === "healthy" ? 1 : 0.55);
      const endR = Math.min(startR + length, innerRadius(start.y) - 0.04);
      const drop = length * (0.3 + (random() * 0.5));
      const curve = new CatmullRomCurve3([
        at(startR, start.y),
        at((startR + endR) / 2, start.y - (drop * 0.35) + ((random() - 0.5) * 0.02)),
        at(endR, Math.max(start.y - drop, MIX_BOTTOM + 0.03)),
      ]);
      tubes.push(taperedTubeGeometry(curve, (u) => 0.0065 * (1 - (u * 0.7)), { tubularSegments: 10, radialSegments: 4 }));
    }
  }
  return mergeGeometries(tubes) ?? tubes[0];
}

const ROOT_COLOR: Record<RootStyle, string> = {
  healthy: "#efe4c6",
  rotting: "#5b3f24",
  burnt: "#8a6a3a",
};

function Roots({ fillTop, reach, style }: { fillTop: number; reach: number; style: RootStyle }) {
  const rounded = Math.round(reach * 10) / 10;
  const geometry = useMemo(() => rootsGeometry(fillTop, Math.max(rounded, 0.1), style, 17), [fillTop, rounded, style]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={ROOT_COLOR[style]} roughness={0.7} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Tanaman
// ---------------------------------------------------------------------------

const PLANT_LEAF = { length: 0.3, width: 0.16, fold: 0.34, curl: 0.3, wave: 0.008 };

function leafGeometry() {
  return once("uses-leaf", () => {
    const geometry = dryLeafGeometry(PLANT_LEAF, 20, 10);
    // Pangkal daun di titik asal supaya mudah diputar di batang.
    geometry.translate(PLANT_LEAF.length / 2, 0, 0);
    return geometry;
  });
}

function petalGeometry() {
  return once("uses-petal", () => {
    const geometry = new SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geometry.scale(0.1, 0.014, 0.04);
    geometry.translate(0.095, 0, 0);
    return geometry;
  });
}

const LEAF_PAIRS = [0.16, 0.34, 0.52, 0.7, 0.86];

function Plant({ fillTop, stage, health, bloomed, budding, reduceMotion }: {
  fillTop: number;
  stage: number;
  health: number;
  bloomed: boolean;
  budding: boolean;
  reduceMotion: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const grow = useDamped(stage, 2.2, reduceMotion);
  const vigor = useDamped(health, 2.2, reduceMotion);
  const height = 0.28 + (stage * 0.8);
  const stem = useMemo(() => taperedTubeGeometry(new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.015, height * 0.35, 0.01),
    new Vector3(-0.01, height * 0.7, 0.02),
    new Vector3(0.012, height, 0),
  ]), (t) => 0.02 * (1 - (t * 0.45)), { tubularSegments: 18, radialSegments: 8 }), [height]);
  const pairs = Math.max(1, Math.round(1 + (stage * (LEAF_PAIRS.length - 1))));
  const sick = health < 0.55;
  const leafMaps = sick ? dryLeafMaps("sick") : dryLeafMaps("fresh");

  useEffect(() => () => stem.dispose(), [stem]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const scale = 0.7 + (grow.current.value * 0.3);
    group.scale.setScalar(scale);
    const droop = (1 - vigor.current.value) * 0.9;
    group.children.forEach((child) => {
      if (child.userData.leaf) child.rotation.z = -0.35 - droop - (child.userData.low ? 0.15 : 0);
    });
  });

  return (
    <group position={[0, fillTop - 0.01, 0]} ref={groupRef}>
      <mesh castShadow geometry={stem}>
        <meshStandardMaterial color={sick ? "#8c8a3a" : "#4f7d35"} roughness={0.7} />
      </mesh>
      {LEAF_PAIRS.slice(0, pairs).flatMap((t, pairIndex) => [0, Math.PI].map((side) => (
        <group key={`${pairIndex}-${side}`} position={[0, height * t, 0]} rotation={[0, (pairIndex * 1.57) + side, 0]}>
          <mesh
            castShadow
            geometry={leafGeometry()}
            rotation={[0.25, 0, -0.4]}
            scale={1.6 - (pairIndex * 0.14)}
            userData={{ leaf: true, low: pairIndex === 0 }}
          >
            <meshStandardMaterial {...leafMaps} side={DoubleSide} />
          </mesh>
        </group>
      )))}
      {budding ? (
        <group position={[0.012, height + 0.02, 0]}>
          <mesh castShadow scale={bloomed ? [1, 0.6, 1] : [0.7, 1, 0.7]}>
            <sphereGeometry args={[0.07, 16, 12]} />
            <meshStandardMaterial color={bloomed ? "#9b5a22" : "#6f9a3f"} roughness={0.8} />
          </mesh>
          {bloomed ? (
            <>
              {Array.from({ length: 14 }, (_, index) => (
                <mesh castShadow geometry={petalGeometry()} key={`outer-${index}`} rotation={[0, (index / 14) * Math.PI * 2, -0.12]}>
                  <meshStandardMaterial color="#f29a38" roughness={0.6} side={DoubleSide} />
                </mesh>
              ))}
              {Array.from({ length: 10 }, (_, index) => (
                <mesh geometry={petalGeometry()} key={`inner-${index}`} position={[0, 0.012, 0]} rotation={[0, ((index + 0.5) / 10) * Math.PI * 2, -0.3]} scale={0.72}>
                  <meshStandardMaterial color="#f7c24a" roughness={0.6} side={DoubleSide} />
                </mesh>
              ))}
            </>
          ) : null}
        </group>
      ) : null}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Air: genangan, tatakan, dan penyiraman
// ---------------------------------------------------------------------------

const WATER_TINT: Record<Watering, string> = {
  none: "#8fb3b5",
  plain: "#8fb3b5",
  "eco-diluted": "#d8c783",
  "eco-strong": "#7a4a18",
};

function WaterEffects({ state, drainage, fillTop, reduceMotion }: {
  state: MixState;
  drainage: Drainage;
  fillTop: number;
  reduceMotion: boolean;
}) {
  const watered = state.watering !== "none" && state.layers.length > 0;
  const puddle = useDamped(watered && drainage === "poor" ? 1 : 0, 1.2, reduceMotion);
  const saucer = useDamped(watered ? (drainage === "fast" ? 1 : drainage === "good" ? 0.6 : 0.1) : 0, 0.9, reduceMotion);
  const puddleRef = useRef<Mesh>(null);
  const saucerRef = useRef<Mesh>(null);
  const tint = WATER_TINT[state.watering];

  useFrame(() => {
    if (puddleRef.current) {
      puddleRef.current.visible = puddle.current.value > 0.02;
      puddleRef.current.scale.setScalar(Math.max(puddle.current.value, 0.01));
    }
    if (saucerRef.current) {
      saucerRef.current.visible = saucer.current.value > 0.02;
      saucerRef.current.position.y = TABLE_TOP + 0.02 + (saucer.current.value * 0.035);
    }
  });

  return (
    <>
      <mesh position={[0, fillTop + 0.012, 0]} ref={puddleRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <circleGeometry args={[innerRadius(fillTop) - 0.06, 40, PHI_START - (Math.PI / 2), PHI_LENGTH]} />
        <meshPhysicalMaterial clearcoat={1} clearcoatRoughness={0.03} color={tint} opacity={0.55} roughness={0.04} transparent />
      </mesh>
      <mesh ref={saucerRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.47, 0.64, 48]} />
        <meshPhysicalMaterial clearcoat={1} clearcoatRoughness={0.03} color={tint} opacity={0.85} roughness={0.05} transparent />
      </mesh>
    </>
  );
}

const CAN_REST = new Vector3(2.35, TABLE_TOP, 0.9);
const CAN_POUR = new Vector3(1.1, 0.7, -0.1);

const DROPS = Array.from({ length: 14 }, (_, index) => ({
  spread: new Vector2(Math.cos(index * 2.4) * (0.03 + ((index % 4) * 0.025)), Math.sin(index * 2.4) * (0.03 + ((index % 4) * 0.025))),
  offset: (index % 7) / 7,
}));

function WateringCan({ state, fillTop, drainage, reduceMotion }: { state: MixState; fillTop: number; drainage: Drainage; reduceMotion: boolean }) {
  const geometry = wateringCanGeometry();
  const ref = useRef<Group>(null);
  const dropsRef = useRef<Group>(null);
  const drainRef = useRef<Group>(null);
  const playhead = usePlayhead(state.lastAction === "water" ? state.waterings : null, 1900, reduceMotion);
  const metal = useMemo(() => ({ color: "#b8c4c1", metalness: 0.78, roughness: 0.38 }), []);
  const rose = useMemo(() => new Vector3(), []);
  const tint = WATER_TINT[state.watering];

  useFrame(() => {
    const can = ref.current;
    const drops = dropsRef.current;
    const drain = drainRef.current;
    if (!can || !drops || !drain) return;
    const t = playhead.current.value;
    const reach = easeInOut(segment(t, 0, 0.2)) * (1 - easeInOut(segment(t, 0.78, 1)));
    const tilt = easeOut(segment(t, 0.14, 0.28)) * (1 - easeInOut(segment(t, 0.66, 0.8)));
    can.position.lerpVectors(CAN_REST, CAN_POUR, reach);
    can.position.y += Math.sin(reach * Math.PI) * 0.35;
    can.rotation.set(0, (1 - reach) * -2.4 + (reach * (-Math.PI + 0.1)), -tilt * 0.62);
    can.updateMatrixWorld();
    rose.set(1.33, 1.05, 0).applyMatrix4(can.matrixWorld);
    const pouring = t > 0.26 && t < 0.74;
    drops.visible = pouring;
    if (pouring) {
      drops.children.forEach((child, index) => {
        const drop = DROPS[index];
        const fall = ((t * 8) + drop.offset) % 1;
        child.position.set(rose.x + (drop.spread.x * (1 + (fall * 2))), rose.y + ((fillTop - rose.y) * fall), rose.z + (drop.spread.y * (1 + (fall * 2))));
      });
    }
    // Air yang lolos lewat lubang di dasar pot ketika drainasenya baik.
    const draining = drainage !== "poor" && t > 0.45 && t < 1;
    drain.visible = draining;
    if (draining) {
      drain.children.forEach((child, index) => {
        const fall = ((t * (drainage === "fast" ? 6 : 3.5)) + (index / 4)) % 1;
        child.position.set((index - 1.5) * 0.02, POT_BOTTOM - 0.005 - (fall * 0.05), 0);
        child.scale.setScalar(1 - (fall * 0.5));
      });
    }
  });

  return (
    <>
      <group position={CAN_REST.toArray()} ref={ref} rotation={[0, -2.4, 0]} scale={0.62}>
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
        <BlobShadow opacity={0.35} position={[0, 0.004, 0]} size={1.2} />
      </group>
      <group ref={dropsRef} visible={false}>
        {DROPS.map((drop) => (
          <mesh key={drop.offset + drop.spread.x} scale={[0.6, 1.6, 0.6]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshPhysicalMaterial clearcoat={1} color={tint} roughness={0.05} />
          </mesh>
        ))}
      </group>
      <group ref={drainRef} visible={false}>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} scale={[0.6, 1.4, 0.6]}>
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshPhysicalMaterial clearcoat={1} color={tint} roughness={0.05} />
          </mesh>
        ))}
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Karung bahan dan sekop
// ---------------------------------------------------------------------------

const SACKS: { material: MixMaterial; label: string; color: string; position: [number, number, number]; turn: number }[] = [
  { material: "soil", label: "TANAH", color: "#7a4f2c", position: [-1.95, TABLE_TOP, -0.85], turn: 0.5 },
  { material: "compost", label: "KOMPOS", color: "#0b6b4c", position: [-0.2, TABLE_TOP, -1.55], turn: 0.1 },
  { material: "sand", label: "PASIR", color: "#b58a3c", position: [1.75, TABLE_TOP, -1.05], turn: -0.4 },
];

// Karung plastik anyaman yang lembek: badan menggembung tidak rata dan bibir
// atas digulung keluar supaya isinya terlihat.
function sackGeometry() {
  return once("uses-sack", () => {
    const geometry = new LatheGeometry(sampleProfile([
      [0.001, 0],
      [0.46, 0.004],
      [0.56, 0.08],
      [0.6, 0.42],
      [0.55, 0.78],
      [0.5, 0.88],
      [0.57, 0.92],
      [0.6, 0.98],
      [0.52, 1.0],
      [0.47, 0.93],
    ], 70), 40);
    const tile = noiseTile(231);
    return warpGeometry(geometry, (vertex) => {
      const radius = Math.hypot(vertex.x, vertex.z);
      if (radius < 0.01) return;
      const angle = Math.atan2(vertex.x, vertex.z);
      const bulge = 1 + ((sampleTile(tile, (angle / (Math.PI * 2)) + 0.5, vertex.y * 0.8) - 0.5) * 0.22);
      const slump = vertex.y < 0.5 ? 1 + (Math.sin((vertex.y / 0.5) * Math.PI) * 0.05) : 1;
      vertex.x *= bulge * slump;
      vertex.z *= bulge * slump * 0.92;
      vertex.y += (sampleTile(tile, (angle / (Math.PI * 2)) + 0.2, 0.3) - 0.5) * 0.05 * (vertex.y / 1);
    });
  });
}

function sackLabelTexture(text: string, color: string) {
  return once(`sack-label-${text}`, () => {
    const element = createCanvas(256, 160);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    context.fillStyle = "#f7efd9";
    context.fillRect(0, 0, 256, 160);
    context.strokeStyle = color;
    context.lineWidth = 10;
    context.strokeRect(8, 8, 240, 144);
    context.fillStyle = color;
    context.font = `800 54px ${DISPLAY_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 128, 70);
    context.font = `600 20px ${DISPLAY_FONT}`;
    context.fillText("Nyuburkeun", 128, 118);
    return canvasTexture(element, { repeat: false });
  });
}

const SACK_FILL: Record<MixMaterial, Parameters<typeof soilMaps>[0]> = {
  soil: "garden",
  compost: "mature",
  sand: "sand",
};

function Sacks() {
  const weave = useMemo(() => withRepeat(fabricMaps("canvas"), 4, 2.4), []);
  return (
    <>
      {SACKS.map((sack) => (
        <group key={sack.material} position={sack.position} rotation={[0, sack.turn, 0]}>
          <mesh castShadow geometry={sackGeometry()} receiveShadow>
            <meshStandardMaterial {...weave} color="#f3eee2" roughness={0.75} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.47, 32]} />
            <meshStandardMaterial {...withRepeat(soilMaps(SACK_FILL[sack.material]), 0.6, 0.6)} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.5, 0.556]} rotation={[-0.03, 0, 0]}>
            <planeGeometry args={[0.62, 0.39]} />
            <meshStandardMaterial map={sackLabelTexture(sack.label, sack.color)} polygonOffset polygonOffsetFactor={-2} roughness={0.85} />
          </mesh>
          <BlobShadow opacity={0.35} position={[0, 0.004, 0]} size={1.4} />
        </group>
      ))}
    </>
  );
}

const TROWEL_REST = new Vector3(0.95, TABLE_TOP + 0.03, 1.35);
const SCOOP_GRAINS = Array.from({ length: 12 }, (_, index) => ({
  x: Math.cos(index * 2.1) * 0.04,
  z: Math.sin(index * 2.1) * 0.04,
  offset: index / 12,
}));

// Pose sekop: tergeletak dengan cekungan ke atas, dibawa mendatar, lalu
// dimiringkan untuk menuang isinya ke pot.
const REST_POSE = new Vector2((-Math.PI / 2) + 0.05, 0.6);
const CARRY_POSE = new Vector2((-Math.PI / 2) + 0.3, 0);
const POUR_POSE = new Vector2(-0.35, 0);

function ScoopTrowel({ state, fillTop, reduceMotion }: { state: MixState; fillTop: number; reduceMotion: boolean }) {
  const geometry = trowelGeometry();
  const ref = useRef<Group>(null);
  const grainsRef = useRef<Group>(null);
  const playhead = usePlayhead(state.lastAction === "add" ? state.actionId : null, 1500, reduceMotion);
  const lastMaterial = state.layers[state.layers.length - 1]?.material ?? "soil";
  const sack = SACKS.find((entry) => entry.material === lastMaterial) ?? SACKS[0];
  const sackTop = useMemo(() => new Vector3(sack.position[0], TABLE_TOP + 1.1, sack.position[2]), [sack]);
  const above = useMemo(() => new Vector3(0.05, fillTop + 0.5, 0.2), [fillTop]);
  const tip = useMemo(() => new Vector3(), []);
  const pose = useMemo(() => new Vector2(), []);
  const blade = useMemo(() => ({ color: "#c3d2cc", metalness: 0.85, roughness: 0.32 }), []);

  useFrame(() => {
    const trowel = ref.current;
    const grains = grainsRef.current;
    if (!trowel || !grains) return;
    const t = playhead.current.value;
    const toSack = easeInOut(segment(t, 0, 0.25));
    const toPot = easeInOut(segment(t, 0.3, 0.55));
    const back = easeInOut(segment(t, 0.82, 1));
    const tilt = easeOut(segment(t, 0.55, 0.65)) * (1 - easeInOut(segment(t, 0.76, 0.84)));

    if (t < 0.3) {
      trowel.position.lerpVectors(TROWEL_REST, sackTop, toSack);
      pose.lerpVectors(REST_POSE, CARRY_POSE, toSack);
    } else if (t < 0.82) {
      trowel.position.lerpVectors(sackTop, above, toPot);
      trowel.position.y += Math.sin(toPot * Math.PI) * 0.3;
      pose.lerpVectors(CARRY_POSE, POUR_POSE, tilt);
    } else {
      trowel.position.lerpVectors(above, TROWEL_REST, back);
      pose.lerpVectors(CARRY_POSE, REST_POSE, back);
    }
    trowel.rotation.set(pose.x, pose.y, 0);
    trowel.updateMatrixWorld();
    tip.set(0, 0.3, 0.1).applyMatrix4(trowel.matrixWorld);

    const pouring = t > 0.6 && t < 0.8;
    grains.visible = pouring;
    if (pouring) {
      grains.children.forEach((child, index) => {
        const grain = SCOOP_GRAINS[index];
        const fall = ((t * 9) + grain.offset) % 1;
        child.position.set(tip.x + grain.x, tip.y + ((fillTop - tip.y) * fall), tip.z + grain.z);
      });
    }
  });

  return (
    <>
      <group position={TROWEL_REST.toArray()} ref={ref} rotation={[REST_POSE.x, REST_POSE.y, 0]} scale={0.62}>
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
      <group ref={grainsRef} visible={false}>
        {SCOOP_GRAINS.map((grain) => (
          <mesh key={grain.offset}>
            <sphereGeometry args={[0.016, 6, 4]} />
            <meshStandardMaterial color={MATERIAL_GRAIN[lastMaterial]} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Adegan
// ---------------------------------------------------------------------------

type PottingMixSceneProps = {
  state: MixState;
  plantHealth: number;
  growth: number;
  bloomed: boolean;
  drainage: Drainage;
  reduceMotion: boolean;
};

const SHADE_HEIGHT = 6.4;
const SHADE_POSITION: [number, number, number] = [
  -2.1 + ((SUN_DIRECTION.x / SUN_DIRECTION.y) * (SHADE_HEIGHT - TABLE_TOP)),
  SHADE_HEIGHT,
  -1.9 + ((SUN_DIRECTION.z / SUN_DIRECTION.y) * (SHADE_HEIGHT - TABLE_TOP)),
];

export function PottingMixScene({ state, plantHealth, growth, bloomed, drainage, reduceMotion }: PottingMixSceneProps) {
  const total = state.layers.length;
  const fillTop = MIX_BOTTOM + Math.max(total * LAYER_HEIGHT, 0.02);
  const health = Math.max(0, Math.min(100, plantHealth)) / 100;
  const stage = Math.min(Math.max(growth, 0), 100) / 100;
  const watered = state.watering !== "none";
  const wetness = watered ? (drainage === "poor" ? 1 : drainage === "fast" ? 0.35 : 0.65) : 0;
  const budding = stage >= 0.45 && health >= 0.7;
  const rootStyle: RootStyle = state.watering === "eco-strong" ? "burnt" : drainage === "poor" && watered ? "rotting" : "healthy";
  const rootReach = (0.3 + (stage * 0.7)) * (rootStyle === "healthy" ? 1 : 0.55);

  return (
    <>
      <GardenLighting shadowExtent={5.5} target={[0, TABLE_TOP, 0]} />
      <GardenWorld clearing={0.95} fog={[22, 120]} groundY={GROUND_Y} unitsPerMeter={UPM} />
      <DappledShade position={SHADE_POSITION} seed={7} size={3} />

      <FitCamera centerY={0.15} direction={[0.52, 0.5, 1]} radius={1.55} />
      <OrbitCameraControls maxDistance={15} maxPolarAngle={Math.PI * 0.5} minDistance={3.2} target={[0, 0.15, 0]} />

      <WoodTable depth={0.74 * UPM} ground={GROUND_Y} kind="table" top={TABLE_TOP} width={1.3 * UPM} />
      <Sacks />
      <ScoopTrowel fillTop={fillTop} reduceMotion={reduceMotion} state={state} />
      <WateringCan drainage={drainage} fillTop={fillTop} reduceMotion={reduceMotion} state={state} />

      <Pot />
      <BlobShadow opacity={0.45} position={[0, TABLE_TOP + 0.003, 0]} size={1.9} />
      {total > 0 ? (
        <>
          <MixFill fillTop={fillTop} state={state} wetness={wetness} />
          <MixGrains fillTop={fillTop} state={state} />
          <Roots fillTop={fillTop} reach={rootReach} style={rootStyle} />
          <Plant
            bloomed={bloomed}
            budding={budding}
            fillTop={fillTop}
            health={health}
            reduceMotion={reduceMotion}
            stage={stage}
          />
          {state.watering === "eco-strong" ? (
            <mesh position={[-0.1, fillTop + 0.006, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.16, 24]} />
              <meshStandardMaterial color="#2e1a06" opacity={0.7} roughness={0.4} transparent />
            </mesh>
          ) : null}
        </>
      ) : null}
      <WaterEffects drainage={drainage} fillTop={fillTop} reduceMotion={reduceMotion} state={state} />
    </>
  );
}
