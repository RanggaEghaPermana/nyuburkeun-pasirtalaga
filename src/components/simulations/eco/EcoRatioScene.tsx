import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BackSide,
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TubeGeometry,
  Vector3,
} from "three";
import { assets } from "../../../lib/assets";
import { FallingPiece } from "../shared/FallingPiece";
import { FitCamera } from "../shared/FitCamera";
import { BlobShadow, DappledShade, GardenLighting, GardenWorld } from "../shared/GardenWorld";
import { SUN_DIRECTION } from "../shared/sky";
import { GlassMaterial } from "../shared/GlassMaterial";
import { OrbitCameraControls } from "../shared/OrbitCameraControls";
import { WoodTable } from "../shared/WoodTable";
import { dryLeafGeometry, smoothLatheGeometry, taperedTubeGeometry, warpGeometry } from "../shared/geometry";
import { easeInOut, easeOut, segment, useDamped, usePlayhead } from "../shared/motion";
import { orangePeelMaps } from "../shared/organicTextures";
import { once, withRepeat, woodMaps } from "../shared/textures";
import {
  dateTapeTexture,
  graduationTexture,
  leafyScrapMaps,
  palmSugarMaps,
  pineappleSkinMaps,
} from "./ecoTextures";
import { ECO_CAPACITY, ECO_FERMENT_DAYS, ECO_LIMITS, ECO_MIN_HEADSPACE, type EcoState } from "./evaluateEcoRatio";

// Skala: 7 satuan adegan per meter. Wadah plastik 5 liter setinggi kira-kira
// 30 cm, berdiri di atas meja kebun setinggi 76 cm.
const UPM = 7;
const TABLE_TOP = -0.95;
const GROUND_Y = TABLE_TOP - (0.76 * UPM);

const INTERIOR_BOTTOM = -0.885;
const INTERIOR_TOP = 0.62;
const PART = (INTERIOR_TOP - INTERIOR_BOTTOM) / ECO_CAPACITY;
const LIQUID_RADIUS = 0.755;
const BAND_FROM = -0.68;
const BAND_TO = 0.64;

// Kanopi peneduh digeser searah matahari supaya bayangan berbintiknya jatuh di
// bagian belakang meja, dan wadahnya berada di tepi keteduhan.
const SHADE_HEIGHT = 6.5;
const SHADE_DROP = SHADE_HEIGHT - TABLE_TOP;
const SHADE_POSITION: [number, number, number] = [
  -2.3 + ((SUN_DIRECTION.x / SUN_DIRECTION.y) * SHADE_DROP),
  SHADE_HEIGHT,
  -1.9 + ((SUN_DIRECTION.z / SUN_DIRECTION.y) * SHADE_DROP),
];
const WHITE = new Color("#ffffff");

const JAR_PROFILE = [
  [0.001, -0.945],
  [0.62, -0.95],
  [0.75, -0.925],
  [0.793, -0.87],
  [0.8, -0.72],
  [0.8, 0.66],
  [0.782, 0.76],
  [0.71, 0.845],
  [0.625, 0.895],
  [0.615, 0.93],
  [0.615, 1.0],
  [0.59, 1.0],
  [0.59, 0.93],
  [0.6, 0.885],
  [0.69, 0.83],
  [0.76, 0.75],
  [0.775, 0.66],
  [0.775, -0.72],
  [0.765, -0.85],
  [0.72, -0.885],
  [0.001, -0.89],
] as const;

const WATER_COLOR = new Color("#d3e4d4");
const SWEET_COLOR = new Color("#c08f45");
const RIPE_COLOR = new Color("#6c3f19");

// ---------------------------------------------------------------------------
// Geometri
// ---------------------------------------------------------------------------

function jarGeometry() {
  return once("eco-jar", () => smoothLatheGeometry(JAR_PROFILE, 56, 150));
}

function plasticShell() {
  return once("eco-plastic-shell", () => new MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    color: "#eef7f3",
    depthWrite: false,
    envMapIntensity: 1.4,
    opacity: 0.16,
    roughness: 0.06,
    specularIntensity: 1,
    transparent: true,
  }));
}

function neckThreadGeometry() {
  return once("eco-neck-thread", () => {
    const points = Array.from({ length: 60 }, (_, index) => {
      const t = index / 59;
      const angle = t * Math.PI * 4.2;
      return new Vector3(Math.sin(angle) * 0.617, 0.905 + (t * 0.075), Math.cos(angle) * 0.617);
    });
    return new TubeGeometry(new CatmullRomCurve3(points), 120, 0.011, 6, false);
  });
}

// Sisi tutup ulir diberi gerigi supaya mudah dipegang, persis tutup toples
// plastik di dapur.
function capSkirtGeometry() {
  return once("eco-cap-skirt", () => warpGeometry(
    smoothLatheGeometry([
      [0.61, 0.9],
      [0.655, 0.905],
      [0.662, 0.93],
      [0.662, 1.05],
      [0.652, 1.075],
      [0.63, 1.085],
      [0.6, 1.08],
      [0.6, 0.9],
    ], 72, 60),
    (vertex) => {
      const radius = Math.hypot(vertex.x, vertex.z);
      if (radius < 0.655 || vertex.y < 0.93 || vertex.y > 1.05) return;
      const angle = Math.atan2(vertex.x, vertex.z);
      const rib = Math.cos(angle * 36) > 0 ? 0.008 : 0;
      vertex.x *= (radius + rib) / radius;
      vertex.z *= (radius + rib) / radius;
    },
  ));
}

function capTopGeometry() {
  return once("eco-cap-top", () => {
    const geometry = new SphereGeometry(0.64, 48, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geometry.scale(1, 0.06, 1);
    return geometry;
  });
}

function liquidGeometry() {
  return once("eco-liquid", () => {
    const geometry = new CylinderGeometry(LIQUID_RADIUS, LIQUID_RADIUS - 0.012, 1, 48, 6, false);
    // Tutup atas dan bawah ikut dipakai: permukaan air adalah tutup atas ini.
    geometry.translate(0, 0.5, 0);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index += 1) {
      const t = position.getY(index);
      const shadeValue = 0.82 + (t * 0.18);
      colors[index * 3] = shadeValue;
      colors[(index * 3) + 1] = shadeValue;
      colors[(index * 3) + 2] = shadeValue;
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    return geometry;
  });
}

const PALM_SUGAR = () => once("palm-sugar-block", () => smoothLatheGeometry([
  [0.001, 0],
  [0.14, 0.002],
  [0.165, 0.03],
  [0.16, 0.12],
  [0.12, 0.175],
  [0.001, 0.19],
], 24, 30));

const ORANGE_PEEL = () => once("orange-peel-piece", () => {
  const geometry = new SphereGeometry(0.19, 16, 10, 0, 1.5, 0.55, 1.05);
  geometry.center();
  return geometry;
});

const PINEAPPLE_SKIN = () => once("pineapple-skin-piece", () => {
  const geometry = new CylinderGeometry(0.21, 0.21, 0.24, 12, 2, true, 0, 1.25);
  geometry.center();
  return geometry;
});

const LEAFY_SCRAP = () => once("leafy-scrap-piece", () => dryLeafGeometry({ length: 0.44, width: 0.3, fold: 0.34, curl: 0.45, wave: 0.02 }, 20, 10));

function pitcherGeometry() {
  return once("eco-pitcher", () => ({
    body: smoothLatheGeometry([
      [0.001, 0],
      [0.34, 0.002],
      [0.4, 0.04],
      [0.43, 0.3],
      [0.42, 0.8],
      [0.38, 1.05],
      [0.37, 1.14],
      [0.395, 1.2],
      [0.36, 1.2],
      [0.34, 1.12],
      [0.36, 1.02],
      [0.39, 0.8],
      [0.4, 0.3],
      [0.37, 0.07],
      [0.001, 0.07],
    ], 40, 90),
    water: new CylinderGeometry(0.385, 0.37, 1, 32),
    handle: taperedTubeGeometry(new CatmullRomCurve3([
      new Vector3(0.34, 1.02, 0),
      new Vector3(0.62, 0.98, 0),
      new Vector3(0.66, 0.62, 0),
      new Vector3(0.56, 0.3, 0),
      new Vector3(0.4, 0.22, 0),
    ]), () => 0.045, { tubularSegments: 30, radialSegments: 10 }),
    spout: (() => {
      const geometry = new CylinderGeometry(0.03, 0.13, 0.26, 16, 1, true);
      geometry.rotateZ(Math.PI / 2 - 0.5);
      geometry.translate(-0.45, 1.16, 0);
      return geometry;
    })(),
  }));
}

function spoonGeometry() {
  return once("eco-spoon", () => {
    const handle = taperedTubeGeometry(
      new CatmullRomCurve3([new Vector3(0, 0.16, 0), new Vector3(0, 0.9, 0), new Vector3(0, 1.8, 0)]),
      (t) => 0.035 + (t * 0.012),
      { tubularSegments: 12, radialSegments: 10, uvLength: 3 },
    );
    const bowl = new SphereGeometry(0.13, 20, 12);
    bowl.scale(1, 1.35, 0.45);
    bowl.translate(0, 0.08, 0);
    return { handle, bowl };
  });
}

function bottleGeometry() {
  return once("eco-bottle", () => smoothLatheGeometry([
    [0.001, 0],
    [0.2, 0.002],
    [0.25, 0.04],
    [0.26, 0.62],
    [0.2, 0.8],
    [0.1, 0.9],
    [0.095, 1.02],
    [0.07, 1.02],
    [0.075, 0.9],
    [0.18, 0.79],
    [0.235, 0.62],
    [0.235, 0.05],
    [0.001, 0.04],
  ], 40, 80));
}

// ---------------------------------------------------------------------------
// Bahan
// ---------------------------------------------------------------------------

type ScrapKind = "orange" | "pineapple" | "leafy";
const SCRAP_KINDS: ScrapKind[] = ["orange", "pineapple", "leafy"];

function ScrapMesh({ kind, darken }: { kind: ScrapKind; darken: number }) {
  const tint = useMemo(() => new Color("#ffffff").lerp(new Color("#6b4a26"), darken).getStyle(), [darken]);
  if (kind === "orange") {
    const maps = orangePeelMaps();
    return (
      <group>
        <mesh castShadow geometry={ORANGE_PEEL()}>
          <meshStandardMaterial {...maps} color={tint} />
        </mesh>
        <mesh geometry={ORANGE_PEEL()} scale={0.96}>
          <meshStandardMaterial color={new Color("#f3e6c4").lerp(new Color("#8a6a3a"), darken).getStyle()} roughness={0.9} side={BackSide} />
        </mesh>
      </group>
    );
  }
  if (kind === "pineapple") {
    const maps = pineappleSkinMaps();
    return (
      <group>
        <mesh castShadow geometry={PINEAPPLE_SKIN()}>
          <meshStandardMaterial {...maps} color={tint} />
        </mesh>
        <mesh geometry={PINEAPPLE_SKIN()} scale={0.95}>
          <meshStandardMaterial color={new Color("#e6c95c").lerp(new Color("#7d5a26"), darken).getStyle()} roughness={0.7} side={BackSide} />
        </mesh>
      </group>
    );
  }
  const maps = leafyScrapMaps();
  return (
    <mesh castShadow geometry={LEAFY_SCRAP()}>
      <meshStandardMaterial {...maps} color={tint} side={DoubleSide} />
    </mesh>
  );
}

type PieceTarget = {
  id: string;
  kind: ScrapKind | "sugar";
  position: [number, number, number];
  rotation: [number, number, number];
  fresh: boolean;
};

function layoutPieces(state: EcoState, surfaceY: number) {
  const pieces: PieceTarget[] = [];
  const freshSugar = state.lastAction === "sugar";
  const freshScraps = state.lastAction === "scraps";
  const sugarHeight = !state.stirred && state.sugar > 0 ? 0.16 : 0;

  if (!state.stirred) {
    for (let index = 0; index < state.sugar; index += 1) {
      const angle = (index * 2.2) + 0.4;
      const radius = index === 0 ? 0.08 : 0.3;
      pieces.push({
        id: `sugar-${index}`,
        kind: "sugar",
        position: [Math.cos(angle) * radius, INTERIOR_BOTTOM + 0.005, Math.sin(angle) * radius],
        rotation: [0, angle, index % 2 === 0 ? 0.05 : -0.08],
        fresh: freshSugar && index === state.sugar - 1,
      });
    }
  }

  const sink = Math.min(Math.max((state.days - 30) / 60, 0), 1);
  const floating = state.water > 0;
  const total = state.scraps * 2;
  for (let index = 0; index < total; index += 1) {
    const unit = Math.floor(index / 2);
    const angle = index * 2.399;
    const spread = 0.12 + (Math.sqrt((index + 0.5) / Math.max(total, 1)) * 0.5);
    const pileY = INTERIOR_BOTTOM + 0.07 + sugarHeight + (Math.floor(index / 6) * 0.07);
    const floatY = surfaceY - 0.035 - ((index % 3) * 0.012);
    const settledY = INTERIOR_BOTTOM + 0.06 + (Math.floor(index / 7) * 0.06);
    const y = floating ? floatY + ((settledY - floatY) * sink) : pileY;
    pieces.push({
      id: `scrap-${index}`,
      kind: SCRAP_KINDS[index % SCRAP_KINDS.length],
      position: [Math.cos(angle) * spread, y, Math.sin(angle) * spread],
      rotation: [
        floating ? -0.1 + ((index % 4) * 0.12) : 0.6 + ((index % 3) * 0.4),
        angle * 1.7,
        (index % 2 === 0 ? 1 : -1) * 0.2,
      ],
      fresh: freshScraps && unit === state.scraps - 1,
    });
  }

  return pieces;
}

// ---------------------------------------------------------------------------
// Isi wadah
// ---------------------------------------------------------------------------

// Cairan dibuat bening dengan transmisi dan atenuasi, bukan warna pekat: gula
// yang mengendap dan kulit buah yang tenggelam tetap terlihat di dalam air,
// dan makin matang warnanya makin pekat seperti teh. Dindingnya sendiri hanya
// lapisan tipis yang memantulkan cahaya, supaya transmisi cairan tidak
// tertutup transmisi kedua.
function Liquid({ state, reduceMotion }: { state: EcoState; reduceMotion: boolean }) {
  const filled = state.sugar + state.scraps + state.water;
  const targetHeight = state.water > 0 ? filled * PART : 0;
  const sweetTarget = state.water > 0 ? (state.stirred ? Math.min(1, (state.sugar * 10) / Math.max(state.water, 1)) : 0.12) : 0;
  const height = useDamped(targetHeight, 3.2, reduceMotion);
  const sweetness = useDamped(sweetTarget, 1.6, reduceMotion);
  const ripeness = useDamped(Math.min(state.days / ECO_FERMENT_DAYS, 1), 1.4, reduceMotion);
  const bodyRef = useRef<Mesh>(null);
  const material = useMemo(() => new MeshPhysicalMaterial({
    attenuationDistance: 6,
    ior: 1.34,
    roughness: 0.04,
    specularIntensity: 1,
    thickness: 1.4,
    transmission: 1,
    vertexColors: true,
  }), []);
  const tint = useMemo(() => new Color(), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;
    const h = height.current.value;
    body.visible = h > 0.004;
    body.scale.y = Math.max(h, 0.001);
    const sweet = sweetness.current.value;
    const ripe = ripeness.current.value;
    tint.copy(WATER_COLOR).lerp(SWEET_COLOR, Math.min(sweet * 0.9, 1)).lerp(RIPE_COLOR, ripe);
    const liquid = body.material as MeshPhysicalMaterial;
    liquid.attenuationColor.copy(tint);
    liquid.attenuationDistance = 7 - (Math.max(sweet * 0.55, ripe) * 6.2);
    liquid.color.copy(WHITE).lerp(tint, 0.18 + (ripe * 0.3));
  });

  return (
    <mesh geometry={liquidGeometry()} material={material} position={[0, INTERIOR_BOTTOM, 0]} ref={bodyRef} renderOrder={1} />
  );
}

const BUBBLES = Array.from({ length: 16 }, (_, index) => ({
  x: Math.cos(index * 2.1) * (0.1 + ((index % 5) * 0.12)),
  z: Math.sin(index * 2.1) * (0.1 + ((index % 5) * 0.12)),
  size: 0.018 + ((index % 3) * 0.01),
  speed: 0.22 + ((index % 5) * 0.06),
  offset: index / 16,
}));

function Bubbles({ height, active }: { height: number; active: boolean }) {
  const groupRef = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || !active || height <= 0.1) return;
    elapsed.current += Math.min(delta, 0.05);
    group.children.forEach((child, index) => {
      const bubble = BUBBLES[index];
      const travel = ((elapsed.current * bubble.speed) + bubble.offset) % 1;
      child.position.set(bubble.x + (Math.sin((travel * 9) + index) * 0.015), INTERIOR_BOTTOM + 0.05 + (travel * (height - 0.08)), bubble.z);
      child.scale.setScalar(0.5 + (travel * 0.8));
    });
    invalidate();
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {BUBBLES.map((bubble, index) => (
        <mesh key={index} position={[bubble.x, INTERIOR_BOTTOM, bubble.z]}>
          <sphereGeometry args={[bubble.size, 10, 8]} />
          <meshPhysicalMaterial clearcoat={1} color="#f6ecd2" roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Alat: teko, sendok, tutup
// ---------------------------------------------------------------------------

const PITCHER_REST = new Vector3(2.15, TABLE_TOP, -0.55);
const PITCHER_POUR = new Vector3(1.4, 1.34, 0.05);
const POUR_TILT = 1.15;

function Pitcher({ state, reduceMotion, surfaceY }: { state: EcoState; reduceMotion: boolean; surfaceY: number }) {
  const geometry = pitcherGeometry();
  const groupRef = useRef<Group>(null);
  const streamRef = useRef<Mesh>(null);
  const waterRef = useRef<Mesh>(null);
  const playhead = usePlayhead(state.lastAction === "water" ? state.actionId : null, 1900, reduceMotion);
  const level = useDamped(1 - (state.water / ECO_LIMITS.water), 3, reduceMotion);
  const bodyMaterial = useMemo(() => new MeshPhysicalMaterial({
    color: "#cfe9ef",
    roughness: 0.22,
    thickness: 0.12,
    transmission: 0.85,
    ior: 1.45,
  }), []);

  useEffect(() => () => bodyMaterial.dispose(), [bodyMaterial]);

  const stream = useMemo(() => {
    const top = new Vector3(0.06, 1.33, 0.05);
    const bottom = new Vector3(0.08, Math.max(surfaceY, INTERIOR_BOTTOM + 0.02), 0.03);
    return new TubeGeometry(new CatmullRomCurve3([top, top.clone().lerp(bottom, 0.4).add(new Vector3(-0.03, 0, 0)), bottom]), 20, 0.035, 8, false);
  }, [surfaceY]);

  useEffect(() => () => stream.dispose(), [stream]);

  useFrame(() => {
    const group = groupRef.current;
    const water = waterRef.current;
    if (!group || !streamRef.current || !water) return;
    const t = playhead.current.value;
    const lift = easeInOut(segment(t, 0, 0.3));
    const drop = easeInOut(segment(t, 0.74, 1));
    const reach = lift * (1 - drop);
    const tilt = easeOut(segment(t, 0.22, 0.38)) * (1 - easeInOut(segment(t, 0.7, 0.82)));
    group.position.lerpVectors(PITCHER_REST, PITCHER_POUR, reach);
    group.position.y += Math.sin(reach * Math.PI) * 0.25;
    group.rotation.z = tilt * POUR_TILT;
    streamRef.current.visible = t > 0.34 && t < 0.72;
    const fill = Math.max(level.current.value, 0.04);
    water.scale.y = fill * 0.95;
    water.position.y = 0.07 + ((fill * 0.95) / 2);
  });

  return (
    <>
      <group position={PITCHER_REST.toArray()} ref={groupRef}>
        <mesh castShadow geometry={geometry.body} material={bodyMaterial} />
        <mesh geometry={geometry.water} position={[0, 0.5, 0]} ref={waterRef}>
          <meshPhysicalMaterial clearcoat={0.6} color="#bfe0e6" roughness={0.1} />
        </mesh>
        <mesh castShadow geometry={geometry.handle} material={bodyMaterial} />
        <mesh castShadow geometry={geometry.spout} material={bodyMaterial} />
      </group>
      <mesh geometry={stream} ref={streamRef} visible={false}>
        <meshPhysicalMaterial clearcoat={1} color="#d9eef2" opacity={0.78} roughness={0.05} transparent />
      </mesh>
      <BlobShadow opacity={0.28} position={[PITCHER_REST.x, TABLE_TOP + 0.004, PITCHER_REST.z]} size={1.1} />
    </>
  );
}

const SPOON_REST = new Vector3(1.55, TABLE_TOP + 0.045, 1.3);

function StirringSpoon({ state, reduceMotion }: { state: EcoState; reduceMotion: boolean }) {
  const geometry = spoonGeometry();
  const maps = useMemo(() => withRepeat(woodMaps("handle"), 1, 2), []);
  const ref = useRef<Group>(null);
  const playhead = usePlayhead(state.lastAction === "stir" ? state.actionId : null, 2600, reduceMotion);

  useFrame(() => {
    const spoon = ref.current;
    if (!spoon) return;
    const t = playhead.current.value;
    const inside = easeInOut(segment(t, 0, 0.18)) * (1 - easeInOut(segment(t, 0.84, 1)));
    const stir = segment(t, 0.18, 0.84);
    const angle = stir * Math.PI * 6;
    const radius = 0.24 * Math.sin(Math.min(stir, 1) * Math.PI) + 0.02;
    const stirX = Math.cos(angle) * radius;
    const stirZ = Math.sin(angle) * radius;
    // Posisi diam: tergeletak miring di meja.
    spoon.position.set(
      SPOON_REST.x + ((stirX - SPOON_REST.x) * inside),
      SPOON_REST.y + (((INTERIOR_BOTTOM + 0.12) - SPOON_REST.y) * inside) + (Math.sin(inside * Math.PI) * 2.4),
      SPOON_REST.z + ((stirZ - SPOON_REST.z) * inside),
    );
    spoon.rotation.set(
      (Math.PI / 2) * (1 - inside) + (inside * 0.1 * Math.sin(angle)),
      0.9 * (1 - inside),
      inside * 0.1 * Math.cos(angle),
    );
  });

  return (
    <group position={SPOON_REST.toArray()} ref={ref} rotation={[Math.PI / 2, 0.9, 0]}>
      <mesh castShadow geometry={geometry.handle}>
        <meshStandardMaterial {...maps} />
      </mesh>
      <mesh castShadow geometry={geometry.bowl}>
        <meshStandardMaterial {...maps} />
      </mesh>
    </group>
  );
}

function Cap({ state, reduceMotion }: { state: EcoState; reduceMotion: boolean }) {
  const ref = useRef<Group>(null);
  const topRef = useRef<Mesh>(null);
  const sealPlayhead = usePlayhead(state.lastAction === "seal" ? state.actionId : null, 1500, reduceMotion);
  const releasePlayhead = usePlayhead(state.lastAction === "release" ? state.actionId : null, 1800, reduceMotion);
  const bulge = useDamped(Math.min(state.pressure, 130) / 100, 2.4, reduceMotion);
  const material = useMemo(() => new MeshPhysicalMaterial({
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    color: "#1c7a57",
    roughness: 0.42,
  }), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const cap = ref.current;
    const top = topRef.current;
    if (!cap || !top) return;
    const seal = easeOut(sealPlayhead.current.value);
    const release = releasePlayhead.current.value;
    const loosen = Math.sin(segment(release, 0.05, 0.9) * Math.PI);
    cap.position.y = ((1 - seal) * 0.9) + (loosen * 0.05);
    cap.rotation.y = ((1 - seal) * Math.PI * 3) - (loosen * Math.PI * 0.6);
    top.scale.y = 1 + (bulge.current.value * 5);
  });

  if (!state.sealed) return null;

  return (
    <group ref={ref}>
      <mesh castShadow geometry={capSkirtGeometry()} material={material} />
      <mesh castShadow geometry={capTopGeometry()} material={material} position={[0, 1.078, 0]} ref={topRef} />
    </group>
  );
}

const PUFFS = Array.from({ length: 10 }, (_, index) => ({
  angle: (index / 10) * Math.PI * 2,
  delay: (index % 4) * 0.06,
  rise: 0.5 + ((index % 3) * 0.25),
}));

function GasPuff({ state, reduceMotion }: { state: EcoState; reduceMotion: boolean }) {
  const groupRef = useRef<Group>(null);
  const playhead = usePlayhead(state.lastAction === "release" ? state.actionId : null, 1800, reduceMotion);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const t = playhead.current.value;
    group.visible = t > 0 && t < 1;
    group.children.forEach((child, index) => {
      const puff = PUFFS[index];
      const local = segment(t, 0.15 + puff.delay, 0.85 + puff.delay);
      const mesh = child as Mesh;
      mesh.position.set(Math.sin(puff.angle) * (0.66 + (local * 0.25)), 1.02 + (local * puff.rise), Math.cos(puff.angle) * (0.66 + (local * 0.25)));
      mesh.scale.setScalar(0.4 + (local * 1.6));
      (mesh.material as MeshStandardMaterial).opacity = Math.sin(local * Math.PI) * 0.35;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {PUFFS.map((puff) => (
        <mesh key={puff.angle}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshStandardMaterial color="#f7f4ea" depthWrite={false} opacity={0} roughness={1} transparent />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Perlengkapan meja
// ---------------------------------------------------------------------------

function SugarPlate({ remaining }: { remaining: number }) {
  const sugar = palmSugarMaps();
  const spots: [number, number, number][] = [[-0.16, 0, 0.05], [0.14, 0, -0.08], [0.02, 0, 0.2], [0.05, 0.16, 0.02]];
  return (
    <group position={[-1.95, TABLE_TOP, 0.95]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.34, 0.06, 40]} />
        <meshPhysicalMaterial clearcoat={0.8} color="#f4efe4" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.031, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.44, 40]} />
        <meshStandardMaterial color="#2f7a5a" roughness={0.4} />
      </mesh>
      {spots.slice(0, remaining).map((spot, index) => (
        <mesh castShadow geometry={PALM_SUGAR()} key={index} position={[spot[0], 0.032 + spot[1], spot[2]]} rotation={[index === 3 ? 0.4 : 0, index * 1.3, 0]}>
          <meshStandardMaterial {...sugar} />
        </mesh>
      ))}
      <BlobShadow opacity={0.3} position={[0, 0.002, 0]} size={1.05} />
    </group>
  );
}

function CuttingBoard({ remaining }: { remaining: number }) {
  const maps = useMemo(() => withRepeat(woodMaps("table"), 1, 0.6), []);
  const pieces = Array.from({ length: Math.min(remaining, 9) }, (_, index) => ({
    kind: SCRAP_KINDS[index % SCRAP_KINDS.length],
    x: -0.45 + ((index % 3) * 0.42) + ((index % 2) * 0.05),
    z: -0.2 + (Math.floor(index / 3) * 0.2),
  }));
  return (
    <group position={[-2.05, TABLE_TOP, -1.05]} rotation={[0, 0.35, 0]}>
      <mesh castShadow position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.09, 0.95]} />
        <meshStandardMaterial {...maps} color="#f0dcc0" />
      </mesh>
      {pieces.map((piece, index) => (
        <group key={index} position={[piece.x, 0.14, piece.z]} rotation={[0.3, index * 1.1, 0.1]} scale={0.8}>
          <ScrapMesh darken={0} kind={piece.kind} />
        </group>
      ))}
      <BlobShadow opacity={0.3} position={[0, 0.002, 0]} size={1.9} stretch={0.65} />
    </group>
  );
}

function HarvestBottle({ visible }: { visible: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const label = useMemo(() => {
    const texture = new TextureLoader().load(assets.business.labelEcoEnzyme, () => invalidate());
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [invalidate]);

  useEffect(() => () => label.dispose(), [label]);

  if (!visible) return null;

  return (
    <group position={[1.3, TABLE_TOP, 0.55]} rotation={[0, -0.5, 0]}>
      <mesh geometry={bottleGeometry()}>
        <GlassMaterial color="#f3ead6" thickness={0.14} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.6, 32]} />
        <meshPhysicalMaterial clearcoat={0.6} color="#7a4a1f" roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.262, 0.262, 0.34, 32, 1, true, -0.8, 1.6]} />
        <meshStandardMaterial map={label} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.06, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 20]} />
        <meshStandardMaterial color="#1c7a57" roughness={0.45} />
      </mesh>
      <BlobShadow opacity={0.35} position={[0, 0.004, 0]} size={0.8} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Adegan
// ---------------------------------------------------------------------------

type EcoRatioSceneProps = {
  state: EcoState;
  reduceMotion: boolean;
  fermenting: boolean;
};

export function EcoRatioScene({ state, reduceMotion, fermenting }: EcoRatioSceneProps) {
  const filled = state.sugar + state.scraps + state.water;
  const surfaceY = INTERIOR_BOTTOM + (state.water > 0 ? filled * PART : 0);
  const pieces = useMemo(() => layoutPieces(state, surfaceY), [state, surfaceY]);
  const ripeness = Math.min(state.days / ECO_FERMENT_DAYS, 1);
  const stir = usePlayhead(state.lastAction === "stir" ? state.actionId : null, 2600, reduceMotion);
  const swirlRef = useRef<Group>(null);
  const jarRef = useRef<Group>(null);
  const swell = useDamped(state.sealed ? Math.min(state.pressure, 130) / 100 : 0, 2.4, reduceMotion);
  const harvested = state.sealed && state.days >= ECO_FERMENT_DAYS;

  const gradTexture = graduationTexture({
    from: BAND_FROM,
    to: BAND_TO,
    bottom: INTERIOR_BOTTOM,
    part: PART,
    capacity: ECO_CAPACITY,
    limit: ECO_CAPACITY * (1 - (ECO_MIN_HEADSPACE / 100)),
  });

  useFrame(() => {
    if (swirlRef.current) {
      swirlRef.current.rotation.y = easeInOut(segment(stir.current.value, 0.18, 0.9)) * Math.PI * 4;
    }
    if (jarRef.current) {
      const s = 1 + (swell.current.value * 0.032);
      jarRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <>
      <GardenLighting shadowExtent={6.5} target={[0, TABLE_TOP, 0]} />
      <GardenWorld clearing={0.95} fog={[24, 125]} groundY={GROUND_Y} unitsPerMeter={UPM} />
      <DappledShade position={SHADE_POSITION} seed={2} size={3.2} />

      <FitCamera centerY={0.05} direction={[0.5, 0.56, 1]} radius={1.75} />
      <OrbitCameraControls
        maxDistance={17}
        maxPolarAngle={Math.PI * 0.5}
        minDistance={3.6}
        target={[0, 0.05, 0]}
      />

      <WoodTable depth={0.74 * UPM} ground={GROUND_Y} kind="table" top={TABLE_TOP} width={1.3 * UPM} />
      <SugarPlate remaining={Math.max(ECO_LIMITS.sugar - state.sugar, 0)} />
      <CuttingBoard remaining={Math.max(ECO_LIMITS.scraps - state.scraps, 0)} />
      <Pitcher reduceMotion={reduceMotion} state={state} surfaceY={surfaceY} />
      <StirringSpoon reduceMotion={reduceMotion} state={state} />
      <HarvestBottle visible={harvested} />

      <group ref={jarRef}>
        <Liquid reduceMotion={reduceMotion} state={state} />
        <group ref={swirlRef}>
          {pieces.map((piece) => (
            <FallingPiece
              fresh={piece.fresh}
              key={piece.id}
              position={piece.position}
              reduceMotion={reduceMotion}
              rotation={piece.rotation}
              spawnY={1.9}
            >
              <group scale={piece.kind === "sugar" ? 1 : 1.3}>
              {piece.kind === "sugar" ? (
                <mesh castShadow geometry={PALM_SUGAR()}>
                  <meshStandardMaterial {...palmSugarMaps()} />
                </mesh>
              ) : (
                <ScrapMesh darken={ripeness * 0.55} kind={piece.kind} />
              )}
              </group>
            </FallingPiece>
          ))}
        </group>
        <Bubbles active={fermenting && state.days > 0 && !reduceMotion} height={filled * PART} />

        {/* Kaca/plastik bening tidak menjatuhkan bayangan pekat; bayangannya
            datang dari cairan dan bahan di dalamnya. */}
        <mesh geometry={jarGeometry()} material={plasticShell()} renderOrder={3} />
        {[-0.64, -0.58].map((y) => (
          <mesh key={y} material={plasticShell()} position={[0, y, 0]} renderOrder={3} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.8, 0.008, 6, 64]} />
          </mesh>
        ))}
        {!state.sealed ? (
          <mesh geometry={neckThreadGeometry()} material={plasticShell()} renderOrder={3} />
        ) : null}

        {/* Skala takaran dicetak pada dinding yang menghadap kamera. */}
        <mesh position={[0, (BAND_FROM + BAND_TO) / 2, 0]} renderOrder={2}>
          <cylinderGeometry args={[0.803, 0.803, BAND_TO - BAND_FROM, 24, 1, true, 0.02, 0.42]} />
          <meshStandardMaterial depthWrite={false} map={gradTexture} roughness={0.45} transparent />
        </mesh>

        {state.sealed ? (
          <mesh position={[0, 0.16, 0]} renderOrder={2}>
            <cylinderGeometry args={[0.806, 0.806, 0.34, 24, 1, true, -0.9, 0.72]} />
            <meshStandardMaterial map={dateTapeTexture()} roughness={0.85} side={DoubleSide} transparent />
          </mesh>
        ) : null}

        <Cap reduceMotion={reduceMotion} state={state} />
        <GasPuff reduceMotion={reduceMotion} state={state} />
      </group>
      <BlobShadow opacity={0.42} position={[0, TABLE_TOP + 0.004, 0]} size={2.1} />
    </>
  );
}
