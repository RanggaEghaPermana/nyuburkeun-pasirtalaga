import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  ClampToEdgeWrapping,
  Color,
  DirectionalLight,
  DoubleSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import {
  bushGeometry,
  flowerHeadGeometry,
  grassTuftGeometry,
  keepOutwardNormals,
  treeGeometry,
} from "./foliage";
import {
  bambooMaps,
  barkMaps,
  blobShadowTexture,
  grassMaps,
  leafClusterTexture,
  noiseTile,
  once,
  rng,
  sampleTile,
  stoneMaps,
  treelineTexture,
  withRepeat,
} from "./textures";
import { SKY, SUN_DIRECTION } from "./sky";


// ---------------------------------------------------------------------------
// Langit
// ---------------------------------------------------------------------------

const SKY_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  vec4 clip = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = vec4(clip.xy, clip.w * 0.99998, clip.w);
}
`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uCloud;
uniform vec3 uSun;
uniform vec3 uSunDirection;
varying vec3 vDirection;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec3 direction = normalize(vDirection);
  float h = direction.y;
  vec3 color = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.8, max(h, 0.0)), 0.75));
  float sun = max(dot(direction, uSunDirection), 0.0);
  color += uSun * (pow(sun, 600.0) * 1.4 + pow(sun, 14.0) * 0.16);

  if (h > 0.0) {
    vec2 uv = direction.xz / (h + 0.22);
    float field = fbm(uv * 1.35 + vec2(4.1, 2.3));
    float cloud = smoothstep(0.5, 0.78, field) * smoothstep(0.03, 0.32, h);
    vec3 shaded = mix(uCloud * 0.84, uCloud, smoothstep(0.52, 0.86, fbm(uv * 1.35 + vec2(4.3, 2.6))));
    color = mix(color, shaded, cloud * 0.8);
  }

  color = mix(color, uHorizon, smoothstep(0.015, -0.08, h));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function GardenSky() {
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: {
      uZenith: { value: new Color(SKY.zenith) },
      uHorizon: { value: new Color(SKY.horizon) },
      uCloud: { value: new Color(SKY.cloud) },
      uSun: { value: new Color(SKY.sun) },
      uSunDirection: { value: SUN_DIRECTION.clone() },
    },
    side: BackSide,
    depthWrite: false,
    fog: false,
  }), []);
  const geometry = useMemo(() => new SphereGeometry(10, 48, 24), []);

  useEffect(() => () => {
    material.dispose();
    geometry.dispose();
  }, [geometry, material]);

  return <mesh frustumCulled={false} geometry={geometry} material={material} renderOrder={-10} />;
}

// ---------------------------------------------------------------------------
// Cahaya
// ---------------------------------------------------------------------------

function gradientDome() {
  return once("gradient-dome", () => {
    const geometry = new SphereGeometry(30, 32, 16);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const zenith = new Color(SKY.zenith);
    const horizon = new Color(SKY.horizon);
    const ground = new Color(SKY.groundBounce);
    const color = new Color();
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index) / 30;
      if (y >= 0) color.copy(horizon).lerp(zenith, Math.pow(y, 0.6));
      else color.copy(horizon).lerp(ground, Math.min(1, -y * 3.2));
      colors[index * 3] = color.r;
      colors[(index * 3) + 1] = color.g;
      colors[(index * 3) + 2] = color.b;
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    return geometry;
  });
}

type GardenLightingProps = {
  // Setengah lebar area yang menerima bayangan tajam, dalam satuan adegan.
  shadowExtent: number;
  target?: [number, number, number];
  sunIntensity?: number;
  ambient?: number;
};

// Matahari sore yang hangat dari kanan depan, diterangi balik oleh langit dan
// pantulan rumput lewat peta lingkungan. Bayangannya lembut (PCF + radius)
// dan hanya dihitung di sekitar panggung supaya tetap tajam dan murah.
export function GardenLighting({ shadowExtent, target = [0, 0, 0], sunIntensity = 2.7, ambient = 1 }: GardenLightingProps) {
  const compact = useThree((state) => state.size.width > 0 && state.size.width < 640);
  const invalidate = useThree((state) => state.invalidate);
  const dome = gradientDome();
  const distance = (shadowExtent * 2.4) + 8;
  const sunPosition: [number, number, number] = [
    target[0] + (SUN_DIRECTION.x * distance),
    target[1] + (SUN_DIRECTION.y * distance),
    target[2] + (SUN_DIRECTION.z * distance),
  ];
  const mapSize = compact ? 1024 : 2048;
  const [targetX, targetY, targetZ] = target;
  const targetObject = useMemo(() => new Object3D(), []);

  const lightRef = useRef<DirectionalLight>(null);

  useEffect(() => {
    targetObject.position.set(targetX, targetY, targetZ);
    targetObject.updateMatrixWorld();
  }, [targetObject, targetX, targetY, targetZ]);

  // Kamera bayangan tidak diperbarui otomatis oleh R3F saat batasnya berubah.
  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const camera = light.shadow.camera;
    camera.left = -shadowExtent;
    camera.right = shadowExtent;
    camera.top = shadowExtent;
    camera.bottom = -shadowExtent;
    camera.near = 0.5;
    camera.far = distance * 2.2;
    camera.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
  }, [distance, shadowExtent]);

  // Kanvas bisa berukuran nol pada gambar pertama sehingga peta bayangan
  // dibuat kecil lebih dulu. Three tidak membuat ulang target render saat
  // mapSize berubah, dan ketidakcocokan itu membuat bayangan hilang.
  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(mapSize, mapSize);
    if (light.shadow.map && light.shadow.map.width !== mapSize) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
    invalidate();
  }, [invalidate, mapSize]);

  return (
    <>
      <primitive object={targetObject} />
      <Environment environmentIntensity={ambient} frames={1} resolution={128}>
        <mesh geometry={dome}>
          <meshBasicMaterial side={BackSide} toneMapped={false} vertexColors />
        </mesh>
        <Lightformer
          color={SKY.sun}
          form="circle"
          intensity={14}
          position={[SUN_DIRECTION.x * 24, SUN_DIRECTION.y * 24, SUN_DIRECTION.z * 24]}
          scale={3.2}
        />
        <Lightformer color="#ffffff" intensity={1.4} position={[-10, 6, 8]} scale={[10, 6, 1]} />
      </Environment>
      <directionalLight
        castShadow
        color="#fff0d2"
        intensity={sunIntensity}
        position={sunPosition}
        ref={lightRef}
        shadow-bias={-0.00035}
        shadow-normalBias={0.025}
        shadow-radius={compact ? 3 : 5}
        target={targetObject}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Bayangan kontak
// ---------------------------------------------------------------------------

// Bayangan lunak tepat di bawah benda. Peta bayangan matahari tidak memberi
// kegelapan halus di titik sentuh, padahal justru itu yang membuat benda
// terlihat menapak.
export function BlobShadow({
  position,
  size,
  opacity = 0.45,
  stretch = 1,
}: {
  position: [number, number, number];
  size: number;
  opacity?: number;
  stretch?: number;
}) {
  const texture = blobShadowTexture();
  return (
    <mesh position={position} renderOrder={1} rotation={[-Math.PI / 2, 0, 0]} scale={[size, size * stretch, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        alphaMap={texture}
        color="#1b2416"
        depthWrite={false}
        opacity={opacity}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Tanah dan rumput
// ---------------------------------------------------------------------------

const GROUND_RADIUS = 70;

function groundGeometry() {
  return once("garden-ground", () => {
    const geometry = new PlaneGeometry(GROUND_RADIUS * 2, GROUND_RADIUS * 2, 110, 110);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const colors = new Float32Array(position.count * 3);
    const tile = noiseTile(5);
    const lush = new Color("#e8f2d8");
    const dry = new Color("#f4ecd0");
    const color = new Color();
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const z = position.getZ(index);
      const patch = sampleTile(tile, (x / 40) + 0.5, (z / 40) + 0.5);
      const dryness = sampleTile(tile, (x / 23) + 0.13, (z / 23) + 0.71);
      color.copy(lush).lerp(dry, Math.max(0, (dryness - 0.55) * 2)).multiplyScalar(0.8 + (patch * 0.28));
      colors[index * 3] = color.r;
      colors[(index * 3) + 1] = color.g;
      colors[(index * 3) + 2] = color.b;
      // UV dalam meter supaya pengulangan tekstur diatur dari materialnya.
      uv.setXY(index, x / 1.6, z / 1.6);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    return geometry;
  });
}

function GardenGround() {
  const maps = useMemo(() => grassMaps(), []);
  const geometry = groundGeometry();
  return (
    <mesh geometry={geometry} position={[0, -0.002, 0]} receiveShadow>
      <meshStandardMaterial {...maps} normalScale={[0.6, 0.6]} roughness={1} vertexColors />
    </mesh>
  );
}

type GrassFieldProps = {
  inner: number;
  outer: number;
  density: number;
  keepOut?: (x: number, z: number) => boolean;
};

function GrassField({ inner, outer, density, keepOut }: GrassFieldProps) {
  const compact = useThree((state) => state.size.width < 640);
  const mesh = useMemo(() => {
    const random = rng(inner * 100 + outer);
    const area = Math.PI * ((outer * outer) - (inner * inner));
    const target = Math.min(Math.round(area * density * (compact ? 0.5 : 1)), compact ? 5000 : 9000);
    const material = keepOutwardNormals(new MeshStandardMaterial({ roughness: 0.92, side: DoubleSide, vertexColors: true }));
    const instances = new InstancedMesh(grassTuftGeometry(), material, target);
    const dummy = new Object3D();
    const tint = new Color();
    const tile = noiseTile(5);
    let count = 0;
    let guard = 0;

    while (count < target && guard < target * 4) {
      guard += 1;
      const angle = random() * Math.PI * 2;
      // Lebih rapat dekat panggung, makin jarang ke luar.
      const radius = inner + (Math.pow(random(), 1.35) * (outer - inner));
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (keepOut?.(x, z)) continue;
      const patch = sampleTile(tile, (x / 40) + 0.5, (z / 40) + 0.5);
      dummy.position.set(x, 0, z);
      dummy.rotation.set((random() - 0.5) * 0.2, random() * Math.PI * 2, (random() - 0.5) * 0.2);
      const scale = (0.75 + (random() * 0.45)) * (0.85 + (patch * 0.3));
      dummy.scale.set(scale * 1.2, scale * (0.8 + (random() * 0.35)), scale * 1.2);
      dummy.updateMatrix();
      instances.setMatrixAt(count, dummy.matrix);
      tint.setRGB(0.82 + (random() * 0.22), 0.9 + (random() * 0.14), 0.78 + (random() * 0.16));
      instances.setColorAt(count, tint);
      count += 1;
    }

    instances.count = count;
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    instances.receiveShadow = true;
    instances.computeBoundingSphere();
    return instances;
  }, [compact, density, inner, keepOut, outer]);

  useEffect(() => () => {
    (mesh.material as MeshStandardMaterial).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}

// ---------------------------------------------------------------------------
// Pagar bambu
// ---------------------------------------------------------------------------

function BambooFence({ z, halfLength, height = 0.9 }: { z: number; halfLength: number; height?: number }) {
  const maps = useMemo(() => bambooMaps(), []);
  const slatMaps = useMemo(() => withRepeat(maps, 1, 3), [maps]);
  const railMaps = useMemo(() => withRepeat(maps, 1, halfLength * 1.2), [halfLength, maps]);

  const slats = useMemo(() => {
    const random = rng(Math.round(z * 10));
    const material = new MeshStandardMaterial({ ...slatMaps, color: "#f4ecd8", roughness: 0.6 });
    const count = Math.floor((halfLength * 2) / 0.11);
    const mesh = new InstancedMesh(once("bamboo-slat", () => new BoxGeometry(1, 1, 1)), material, count);
    const dummy = new Object3D();
    for (let index = 0; index < count; index += 1) {
      const x = -halfLength + (index * 0.11) + 0.05;
      const slatHeight = height * (0.92 + (random() * 0.1));
      dummy.position.set(x, slatHeight / 2, z + ((index % 2) * 0.012));
      dummy.rotation.set(0, 0, (random() - 0.5) * 0.02);
      dummy.scale.set(0.072, slatHeight, 0.016);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }, [halfLength, height, slatMaps, z]);

  useEffect(() => () => {
    (slats.material as MeshStandardMaterial).dispose();
    slats.dispose();
  }, [slats]);

  const posts: number[] = [];
  for (let x = -halfLength; x <= halfLength + 0.01; x += 1.8) posts.push(x);

  return (
    <group>
      <primitive object={slats} />
      {posts.map((x) => (
        <mesh castShadow key={x} position={[x, (height + 0.15) / 2, z + 0.06]} receiveShadow>
          <cylinderGeometry args={[0.045, 0.05, height + 0.15, 12]} />
          <meshStandardMaterial {...slatMaps} color="#e2d3ad" roughness={0.55} />
        </mesh>
      ))}
      {[0.28, 0.82].map((y) => (
        <mesh castShadow key={y} position={[0, y * height, z + 0.07]} receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, halfLength * 2, 10]} />
          <meshStandardMaterial {...railMaps} color="#e8dab4" roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Semak, pohon, bunga
// ---------------------------------------------------------------------------

function foliageMaterial(kind: "canopy" | "hedge" | "sapling", tint: string) {
  return once(`foliage-material-${kind}-${tint}`, () => keepOutwardNormals(new MeshStandardMaterial({
    alphaTest: 0.5,
    color: tint,
    map: leafClusterTexture(kind),
    roughness: 0.82,
    side: DoubleSide,
    vertexColors: true,
  })));
}

function barkMaterial() {
  return once("bark-material", () => new MeshStandardMaterial({ ...barkMaps(), color: "#d9ccbd", roughness: 0.95 }));
}

export type Placement = {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  seed?: number;
};

export function Bush({ position, rotation = 0, scale = 1, seed = 1, width = 1.4, height = 0.9, tint = "#ffffff" }: Placement & { width?: number; height?: number; tint?: string }) {
  const geometry = bushGeometry(seed, width, height);
  const material = foliageMaterial("hedge", tint);
  return (
    <mesh
      castShadow
      geometry={geometry}
      material={material}
      position={position}
      receiveShadow
      rotation={[0, rotation, 0]}
      scale={scale}
    />
  );
}

export function ShadeTree({ position, rotation = 0, scale = 1, seed = 1, height = 6.2 }: Placement & { height?: number }) {
  const { wood, leaves } = treeGeometry(seed, height);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh castShadow geometry={wood} material={barkMaterial()} receiveShadow />
      <mesh castShadow geometry={leaves} material={foliageMaterial("canopy", "#ffffff")} receiveShadow />
    </group>
  );
}

function FlowerBed({ from, to, depth, count, seed }: { from: [number, number]; to: [number, number]; depth: number; count: number; seed: number }) {
  const meshes = useMemo(() => {
    const random = rng(seed);
    const palette = ["#f6d24a", "#f7f3e6", "#f2a33a", "#e76f7a", "#f4f0a8", "#d95f4c"].map((value) => new Color(value));
    const headMaterial = keepOutwardNormals(new MeshStandardMaterial({ roughness: 0.7, side: DoubleSide, vertexColors: true }));
    const stemMaterial = new MeshStandardMaterial({ color: "#4d7a34", roughness: 0.8 });
    const heads = new InstancedMesh(flowerHeadGeometry(), headMaterial, count);
    const stems = new InstancedMesh(once("flower-stem", () => {
      const geometry = new PlaneGeometry(0.012, 1);
      geometry.translate(0, 0.5, 0);
      return geometry;
    }), stemMaterial, count);
    const leafMaterial = keepOutwardNormals(new MeshStandardMaterial({
      alphaTest: 0.5,
      map: leafClusterTexture("sapling"),
      roughness: 0.8,
      side: DoubleSide,
    }));
    const leaves = new InstancedMesh(once("flower-leaves", () => {
      const geometry = new PlaneGeometry(0.34, 0.34);
      geometry.rotateX(-Math.PI / 2.4);
      geometry.translate(0, 0.08, 0);
      return geometry;
    }), leafMaterial, count);
    const dummy = new Object3D();
    const along = new Vector3(to[0] - from[0], 0, to[1] - from[1]);
    const side = new Vector3(-along.z, 0, along.x).normalize();

    for (let index = 0; index < count; index += 1) {
      const t = random();
      const offset = (random() - 0.5) * depth;
      const x = from[0] + (along.x * t) + (side.x * offset);
      const z = from[1] + (along.z * t) + (side.z * offset);
      const height = 0.22 + (random() * 0.28);
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.18);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(index, dummy.matrix);
      dummy.scale.set(0.8 + (random() * 0.6), 1, 0.8 + (random() * 0.6));
      dummy.rotation.set(0, random() * Math.PI * 2, 0);
      dummy.updateMatrix();
      leaves.setMatrixAt(index, dummy.matrix);
      dummy.position.set(x + (Math.sin(dummy.rotation.y) * 0.01), height, z);
      dummy.rotation.set((random() - 0.5) * 0.6, random() * Math.PI * 2, (random() - 0.5) * 0.6);
      const headScale = 0.9 + (random() * 0.7);
      dummy.scale.set(headScale, headScale, headScale);
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);
      heads.setColorAt(index, palette[Math.floor(random() * palette.length)]);
    }

    for (const mesh of [heads, stems, leaves]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh !== stems;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
    }
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    return [heads, stems, leaves];
  }, [count, depth, from, seed, to]);

  useEffect(() => () => {
    for (const mesh of meshes) {
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.dispose();
    }
  }, [meshes]);

  return (
    <>
      {meshes.map((mesh) => <primitive key={mesh.uuid} object={mesh} />)}
    </>
  );
}

function SteppingStones({ stones }: { stones: [number, number, number][] }) {
  const maps = useMemo(() => stoneMaps(), []);
  return (
    <>
      {stones.map(([x, z, size], index) => (
        <mesh castShadow key={`${x}-${z}`} position={[x, 0.015, z]} receiveShadow rotation={[0, index * 0.9, 0]} scale={[size, 0.05, size * 0.78]}>
          <sphereGeometry args={[1, 20, 8]} />
          <meshStandardMaterial {...maps} color="#e9e4d6" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

function Treeline({ radius }: { radius: number }) {
  const texture = useMemo(() => {
    const copy = treelineTexture().clone();
    copy.wrapT = ClampToEdgeWrapping;
    copy.repeat.set(4, 1);
    copy.needsUpdate = true;
    return copy;
  }, []);
  const height = radius * 0.16;
  return (
    <mesh position={[0, (height / 2) - (radius * 0.012), 0]} renderOrder={-5}>
      <cylinderGeometry args={[radius, radius, height, 64, 1, true]} />
      <meshBasicMaterial depthWrite={false} fog={false} map={texture} side={BackSide} transparent />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Rakitan kebun
// ---------------------------------------------------------------------------

export type GardenWorldProps = {
  // Berapa satuan adegan untuk satu meter. Semua isi kebun ditulis dalam meter
  // supaya pohon dan pagar punya ukuran nyata terhadap benda di panggung.
  unitsPerMeter: number;
  groundY: number;
  // Radius (meter) area panggung yang dibiarkan kosong untuk tiap simulasi.
  clearing: number;
  fog: [near: number, far: number];
  showFence?: boolean;
  grassDensity?: number;
};

export const GardenWorld = memo(function GardenWorld({
  unitsPerMeter,
  groundY,
  clearing,
  fog,
  showFence = true,
  grassDensity = 42,
}: GardenWorldProps) {
  const c = clearing;
  const fenceZ = -(c + 3);
  const fenceHalf = c + 6.5;

  const keepOut = useMemo(() => (x: number, z: number) => (
    Math.hypot(x, z) < c + 0.05 || (showFence && z < fenceZ + 0.1 && z > fenceZ - 1.8 && Math.abs(x) < fenceHalf)
  ), [c, fenceHalf, fenceZ, showFence]);

  const hedge = useMemo(() => {
    const random = rng(Math.round(c * 13));
    const items: (Placement & { width: number; height: number })[] = [];
    for (let x = -fenceHalf; x <= fenceHalf; x += 1.25) {
      items.push({
        position: [x + ((random() - 0.5) * 0.4), 0, fenceZ - 0.85 - (random() * 0.5)],
        rotation: (random() - 0.5) * 0.4,
        seed: Math.floor(random() * 6),
        width: 1.6,
        height: 1.25 + (random() * 0.45),
      });
    }
    return items;
  }, [c, fenceHalf, fenceZ]);

  const trees: (Placement & { height: number })[] = [
    { position: [-(c + 2.4), 0, -(c + 4.2)], seed: 3, height: 6.8, rotation: 0.4 },
    { position: [c + 3.3, 0, -(c + 5.1)], seed: 7, height: 7.6, rotation: 2.1 },
    { position: [-(c + 6.2), 0, -(c * 0.2)], seed: 11, height: 6.1, rotation: 1.3 },
    { position: [c + 6.6, 0, c * 0.4], seed: 5, height: 6.6, rotation: 4.2 },
    { position: [-(c + 3.5), 0, c + 7.5], seed: 13, height: 7.1, rotation: 0.9 },
    { position: [c + 4.5, 0, c + 8.2], seed: 17, height: 6.4, rotation: 5.1 },
  ];

  const sideBushes: (Placement & { width: number; height: number })[] = [
    { position: [-(c + 1.5), 0, -(c * 0.3)], seed: 2, width: 1.8, height: 1.0, rotation: 1.2 },
    { position: [c + 1.6, 0, c * 0.2], seed: 4, width: 1.6, height: 0.9, rotation: -1.1 },
    { position: [-(c + 1.9), 0, c + 1.4], seed: 1, width: 1.2, height: 0.7, rotation: 0.6 },
    { position: [c + 2.2, 0, c + 1.9], seed: 5, width: 1.3, height: 0.75, rotation: 2.4 },
  ];

  const flowers = useMemo(() => ({
    from: [-(c + 4.5), fenceZ + 0.5] as [number, number],
    to: [c + 4.5, fenceZ + 0.5] as [number, number],
  }), [c, fenceZ]);

  // Pepohonan jauh di belakang pagar mengisi cakrawala supaya tanah yang
  // memudar ke kabut tidak terbaca sebagai pita kosong.
  const farTrees = useMemo(() => {
    const random = rng(Math.round(c * 7) + 3);
    return Array.from({ length: 13 }, (_, index) => {
      const angle = -1.45 + ((index / 12) * 2.9) + ((random() - 0.5) * 0.12);
      const radius = c + 12 + (random() * 12);
      return {
        position: [Math.sin(angle) * radius, 0, -Math.cos(angle) * radius] as [number, number, number],
        seed: 20 + index,
        height: 7.5 + (random() * 3.5),
        rotation: random() * Math.PI * 2,
      };
    });
  }, [c]);

  const stones: [number, number, number][] = [
    [0.6, c + 0.8, 0.26],
    [0.25, c + 1.5, 0.24],
    [0.7, c + 2.25, 0.27],
    [0.3, c + 3.0, 0.23],
  ];

  return (
    <>
      <color args={[SKY.horizon]} attach="background" />
      <fog args={[SKY.horizon, fog[0], fog[1]]} attach="fog" />
      <GardenSky />
      <group position={[0, groundY, 0]} scale={unitsPerMeter}>
        <GardenGround />
        <GrassField density={grassDensity} inner={c} keepOut={keepOut} outer={c + 5.5} />
        {showFence ? <BambooFence halfLength={fenceHalf} z={fenceZ} /> : null}
        {showFence ? <FlowerBed count={70} depth={0.55} from={flowers.from} seed={9} to={flowers.to} /> : null}
        {hedge.map((item, index) => <Bush key={`hedge-${index}`} {...item} tint="#f2f7ea" />)}
        {sideBushes.map((item, index) => <Bush key={`side-${index}`} {...item} />)}
        {trees.map((tree, index) => <ShadeTree key={`tree-${index}`} {...tree} />)}
        {farTrees.map((tree, index) => <ShadeTree key={`far-${index}`} {...tree} />)}
        <SteppingStones stones={stones} />
        <Treeline radius={Math.max(c + 34, 40)} />
      </group>
    </>
  );
});

// Tajuk pohon yang tak terlihat di atas panggung. Ia hanya menjatuhkan
// bayangan berbintik, seperti meja yang diletakkan di bawah pohon rindang.
export function DappledShade({ position, size, seed = 3 }: { position: [number, number, number]; size: number; seed?: number }) {
  const geometry = bushGeometry(seed + 20, 2.6, 1.1);
  const material = useMemo(() => new MeshStandardMaterial({
    alphaTest: 0.5,
    colorWrite: false,
    depthWrite: false,
    map: leafClusterTexture("canopy"),
    side: DoubleSide,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh castShadow geometry={geometry} material={material} position={position} rotation={[0, seed, 0]} scale={[size, size * 0.35, size]} />
  );
}
