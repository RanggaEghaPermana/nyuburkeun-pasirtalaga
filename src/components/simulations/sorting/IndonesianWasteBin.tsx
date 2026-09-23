import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  type Group,
  type Mesh,
} from "three";
import { roundedPlateGeometry } from "../shared/geometry";
import { once, plasticMaps, withRepeat } from "../shared/textures";
import { binLabelTexture, lidEmblemTexture } from "./binLabel";
import type { BinDefinition } from "./sortingBins";
import { WasteObject } from "./WasteObject";
import type { WasteShape } from "./wasteItems";

// Tong beroda 120 liter yang lazim di sekolah dan balai desa: badan plastik
// cetak yang melebar ke atas, bibir tepi tebal, tutup berengsel di belakang,
// dua roda karet, dan pegangan dorong. Satuan lokal: dasar di y = 0, mulut
// sasaran lempar di sekitar y = 1,92 (WASTE_BIN_MOUTH_POSITION).

const BODY_BOTTOM = 0.16;
const BODY_TOP = 1.66;
const RIM_TOP = 1.735;

function halfWidth(y: number) {
  return 0.6 + (((y - BODY_BOTTOM) / (BODY_TOP - BODY_BOTTOM)) * 0.1);
}

function halfDepth(y: number) {
  return 0.46 + (((y - BODY_BOTTOM) / (BODY_TOP - BODY_BOTTOM)) * 0.085);
}

function cornerRadius(y: number) {
  return 0.13 + (((y - BODY_BOTTOM) / (BODY_TOP - BODY_BOTTOM)) * 0.03);
}

const CORNER_STEPS = 8;

function ringPoints(y: number, inset: number) {
  const hw = Math.max(halfWidth(Math.min(y, BODY_TOP)) + inset, 0.05);
  const hd = Math.max(halfDepth(Math.min(y, BODY_TOP)) + inset, 0.05);
  const r = Math.max(cornerRadius(Math.min(y, BODY_TOP)) + inset, 0.01);
  const corners: [number, number, number][] = [
    [hw - r, hd - r, 0],
    [-(hw - r), hd - r, Math.PI / 2],
    [-(hw - r), -(hd - r), Math.PI],
    [hw - r, -(hd - r), Math.PI * 1.5],
  ];
  const points: [number, number][] = [];
  for (const [cx, cz, start] of corners) {
    for (let step = 0; step <= CORNER_STEPS; step += 1) {
      const angle = start + ((step / CORNER_STEPS) * (Math.PI / 2));
      points.push([cx + (Math.cos(angle) * r), cz + (Math.sin(angle) * r)]);
    }
  }
  return points;
}

// Profil dari luar bawah, naik, melewati bibir, lalu turun di sisi dalam.
const PROFILE: [number, number][] = [
  [BODY_BOTTOM, -0.05],
  [BODY_BOTTOM + 0.03, -0.012],
  [BODY_BOTTOM + 0.08, 0],
  [BODY_TOP - 0.1, 0],
  [BODY_TOP - 0.04, 0.012],
  [BODY_TOP, 0.04],
  [BODY_TOP + 0.045, 0.05],
  [RIM_TOP, 0.03],
  [RIM_TOP, -0.02],
  [RIM_TOP - 0.03, -0.05],
  [BODY_TOP - 0.1, -0.05],
  [BODY_BOTTOM + 0.12, -0.05],
  [BODY_BOTTOM + 0.07, -0.09],
];

function bodyGeometry() {
  return once("wheelie-bin-body", () => {
    const rings = PROFILE.map(([y, inset]) => ringPoints(y, inset));
    const perRing = rings[0].length;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    rings.forEach((ring, ringIndex) => {
      const y = PROFILE[ringIndex][0];
      let perimeter = 0;
      ring.forEach(([x, z], index) => {
        if (index > 0) perimeter += Math.hypot(x - ring[index - 1][0], z - ring[index - 1][1]);
        positions.push(x, y, z);
        uvs.push(perimeter / 4.6, y / 1.8);
      });
    });

    for (let r = 0; r < rings.length - 1; r += 1) {
      for (let index = 0; index < perRing; index += 1) {
        const next = (index + 1) % perRing;
        const a = (r * perRing) + index;
        const b = (r * perRing) + next;
        const c = ((r + 1) * perRing) + index;
        const d = ((r + 1) * perRing) + next;
        indices.push(a, c, b, b, c, d);
      }
    }

    // Tutup dasar luar dan lantai dalam.
    const bottomCenter = positions.length / 3;
    positions.push(0, BODY_BOTTOM, 0);
    uvs.push(0.5, 0);
    for (let index = 0; index < perRing; index += 1) {
      indices.push(bottomCenter, index, (index + 1) % perRing);
    }
    const lastRing = (rings.length - 1) * perRing;
    const floorCenter = positions.length / 3;
    positions.push(0, PROFILE[PROFILE.length - 1][0], 0);
    uvs.push(0.5, 0.1);
    for (let index = 0; index < perRing; index += 1) {
      indices.push(floorCenter, lastRing + ((index + 1) % perRing), lastRing + index);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  });
}

const LID_WIDTH = (halfWidth(BODY_TOP) * 2) + 0.14;
const LID_DEPTH = (halfDepth(BODY_TOP) * 2) + 0.14;
const HINGE_Z = -halfDepth(BODY_TOP) - 0.06;
const HINGE_Y = RIM_TOP + 0.02;

function lidGeometry() {
  return once("wheelie-bin-lid", () => {
    const geometry = roundedPlateGeometry(LID_WIDTH, LID_DEPTH, 0.075, 0.16);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  });
}

function wheelGeometry() {
  return once("wheelie-bin-wheel", () => {
    const tire = new TorusGeometry(0.155, 0.062, 12, 28);
    tire.rotateY(Math.PI / 2);
    const hub = new CylinderGeometry(0.105, 0.105, 0.1, 20);
    hub.rotateZ(Math.PI / 2);
    return { tire, hub };
  });
}

const RUBBER = () => once("bin-rubber", () => new MeshStandardMaterial({ color: "#1f2321", roughness: 0.92 }));
const HUB = () => once("bin-hub", () => new MeshStandardMaterial({ color: "#6b726e", metalness: 0.3, roughness: 0.5 }));
const METAL = () => once("bin-metal", () => new MeshStandardMaterial({ color: "#8d9591", metalness: 0.75, roughness: 0.35 }));

const LID_OPEN = -1.2;
const SHAKE_DURATION = 0.58;

export type IndonesianWasteBinProps = {
  definition: BinDefinition;
  highlighted: boolean;
  wrong: boolean;
  open?: boolean;
  contents?: readonly WasteShape[];
  reducedMotion: boolean;
};

function damp(current: number, target: number, speed: number, delta: number) {
  return current + ((target - current) * (1 - Math.exp(-speed * delta)));
}

// Isi tong menumpuk sampai dekat bibir. Saat tutup terbuka tumpukannya
// terangkat sedikit sehingga terlihat dari kamera; saat tertutup ia turun
// supaya tidak menembus tutup.
const CONTENT_SPOTS: [number, number, number, number][] = [
  [-0.2, 1.56, 0.06, 0.3],
  [0.2, 1.6, -0.1, 1.4],
  [0.02, 1.68, 0.14, 2.2],
  [-0.1, 1.72, -0.14, 3.4],
];

export function IndonesianWasteBin({
  definition,
  highlighted,
  wrong,
  open = false,
  contents = [],
  reducedMotion,
}: IndonesianWasteBinProps) {
  const animatedRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const contentsRef = useRef<Group>(null);
  const wrongElapsed = useRef(SHAKE_DURATION);
  const glowLevel = useRef(0);
  const { invalidate } = useThree();

  const plastic = useMemo(() => withRepeat(plasticMaps(), 2, 1.4), []);
  const bodyMaterial = useMemo(() => new MeshPhysicalMaterial({
    ...plastic,
    clearcoat: 0.3,
    clearcoatRoughness: 0.45,
    color: definition.color,
    side: DoubleSide,
  }), [definition.color, plastic]);
  const lidMaterial = useMemo(() => new MeshPhysicalMaterial({
    ...plastic,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    color: new Color(definition.color).offsetHSL(0, 0.02, -0.08),
  }), [definition.color, plastic]);
  const glowMaterial = useMemo(() => new MeshBasicMaterial({
    color: definition.color,
    depthWrite: false,
    opacity: 0,
    toneMapped: false,
    transparent: true,
  }), [definition.color]);

  useEffect(() => () => {
    bodyMaterial.dispose();
    lidMaterial.dispose();
    glowMaterial.dispose();
  }, [bodyMaterial, glowMaterial, lidMaterial]);

  useEffect(() => {
    if (wrong) wrongElapsed.current = 0;
    invalidate();
  }, [highlighted, invalidate, open, reducedMotion, wrong]);

  useFrame((_, delta) => {
    const animated = animatedRef.current;
    const lid = lidRef.current;
    const body = bodyRef.current;
    const glow = glowRef.current;
    if (!animated || !lid || !body || !glow) return;
    const dt = Math.min(delta, 0.05);
    const targetLid = highlighted || open ? LID_OPEN : 0;
    const targetGlow = wrong ? 1 : highlighted ? 1 : 0;
    let busy = false;

    if (reducedMotion) {
      lid.rotation.x = targetLid;
      animated.position.x = 0;
      glowLevel.current = targetGlow;
    } else {
      lid.rotation.x = damp(lid.rotation.x, targetLid, 10, dt);
      glowLevel.current = damp(glowLevel.current, targetGlow, 12, dt);
      busy = Math.abs(lid.rotation.x - targetLid) > 0.001 || Math.abs(glowLevel.current - targetGlow) > 0.002;
      if (wrong && wrongElapsed.current < SHAKE_DURATION) {
        wrongElapsed.current = Math.min(SHAKE_DURATION, wrongElapsed.current + dt);
        const progress = wrongElapsed.current / SHAKE_DURATION;
        animated.position.x = Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.12;
        busy = true;
      } else {
        animated.position.x = damp(animated.position.x, 0, 16, dt);
        if (Math.abs(animated.position.x) > 0.001) busy = true;
      }
    }

    const material = body.material as MeshPhysicalMaterial;
    material.emissive.set(wrong ? "#b3261b" : definition.color);
    material.emissiveIntensity = glowLevel.current * (wrong ? 0.45 : 0.22);
    if (contentsRef.current) contentsRef.current.position.y = ((lid.rotation.x / LID_OPEN) - 1) * 0.42;
    const ring = glow.material as MeshBasicMaterial;
    ring.color.set(wrong ? "#d8453a" : definition.color);
    ring.opacity = glowLevel.current * 0.6;
    glow.visible = glowLevel.current > 0.01;
    if (busy) invalidate();
  });

  const labelY = 0.98;
  const labelSlope = Math.atan((halfDepth(BODY_TOP) - halfDepth(BODY_BOTTOM)) / (BODY_TOP - BODY_BOTTOM));
  const { tire, hub } = wheelGeometry();
  const wheelX = halfWidth(0.2) + 0.04;
  const wheelZ = -halfDepth(0.2) + 0.06;

  return (
    <group dispose={null} name={`waste-bin-${definition.category}`} userData={{ category: definition.category }}>
      <mesh position={[0, 0.02, 0]} ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.92, 1.12, 48]} />
        <primitive attach="material" object={glowMaterial} />
      </mesh>

      <group ref={animatedRef}>
        <mesh castShadow geometry={bodyGeometry()} material={bodyMaterial} ref={bodyRef} receiveShadow />

        {/* Pita penguat di bawah bibir dan kaki depan. */}
        {[-1, 1].map((side) => (
          <mesh castShadow key={side} material={bodyMaterial} position={[side * 0.36, 0.08, halfDepth(0.2) - 0.08]}>
            <boxGeometry args={[0.22, 0.16, 0.14]} />
          </mesh>
        ))}

        <mesh position={[0, labelY, halfDepth(labelY) + 0.005]} rotation={[labelSlope, 0, 0]}>
          <planeGeometry args={[1.02, 0.595]} />
          <meshStandardMaterial map={binLabelTexture(definition)} polygonOffset polygonOffsetFactor={-2} roughness={0.5} />
        </mesh>

        {/* Roda dan poros di belakang. */}
        <mesh material={METAL()} position={[0, 0.2, wheelZ]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, (wheelX * 2) + 0.1, 10]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * wheelX, 0.21, wheelZ]}>
            <mesh castShadow geometry={tire} material={RUBBER()} />
            <mesh geometry={hub} material={HUB()} />
          </group>
        ))}

        {/* Pegangan dorong yang sekaligus menjadi engsel tutup. */}
        <mesh castShadow material={RUBBER()} position={[0, HINGE_Y - 0.06, HINGE_Z - 0.06]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, LID_WIDTH * 0.72, 14]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh castShadow key={side} material={bodyMaterial} position={[side * LID_WIDTH * 0.34, HINGE_Y - 0.1, HINGE_Z - 0.01]}>
            <boxGeometry args={[0.08, 0.16, 0.12]} />
          </mesh>
        ))}

        <group position={[0, HINGE_Y, HINGE_Z]} ref={lidRef}>
          <mesh castShadow geometry={lidGeometry()} material={lidMaterial} position={[0, 0.02, (LID_DEPTH / 2) - 0.03]} receiveShadow />
          <mesh castShadow material={lidMaterial} position={[0, -0.04, LID_DEPTH - 0.05]}>
            <boxGeometry args={[LID_WIDTH * 0.62, 0.1, 0.05]} />
          </mesh>
          <mesh material={RUBBER()} position={[0, -0.02, LID_DEPTH - 0.01]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, LID_WIDTH * 0.4, 10]} />
          </mesh>
          <mesh position={[0, 0.062, (LID_DEPTH / 2) - 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.52, 0.52]} />
            <meshStandardMaterial depthWrite={false} map={lidEmblemTexture(definition.category)} opacity={0.4} polygonOffset polygonOffsetFactor={-2} transparent />
          </mesh>
        </group>

        <group position={[0, -0.42, 0]} ref={contentsRef}>
          {contents.slice(-CONTENT_SPOTS.length).map((shape, index) => {
            const [x, y, z, turn] = CONTENT_SPOTS[index];
            return (
              <group key={`${shape}-${index}`} position={[x, y, z]} rotation={[0.3, turn, 0.2]} scale={0.5}>
                <WasteObject shape={shape} />
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}
