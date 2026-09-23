import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  Quaternion,
  Vector3,
  type Material,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { taperedTubeGeometry } from "./geometry";
import { once, rng } from "./textures";

// Dedaunan dan rumput digambar dua sisi, tetapi normalnya sengaja diarahkan
// keluar dari tajuk. Three membalik normal pada sisi belakang, sehingga
// separuh kartu daun jadi gelap dan tajuknya tampak belang. Pembalikan itu
// dimatikan khusus untuk material dedaunan.
export function keepOutwardNormals<T extends Material>(material: T) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("normal *= faceDirection;", "");
  };
  material.customProgramCacheKey = () => "outward-normals";
  return material;
}

type Cluster = { center: Vector3; radius: Vector3 };

type CardOptions = {
  cards: number;
  size: [number, number];
  random: () => number;
  center: Vector3;
  shadowBelow: number;
  shadowAbove: number;
};

function cardGeometry(clusters: Cluster[], { cards, size, random, center, shadowBelow, shadowAbove }: CardOptions) {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const corner = new Vector3();
  const offset = new Vector3();
  const rotation = new Quaternion();
  const euler = new Euler();
  const outward = new Vector3();
  const corners: [number, number, number, number][] = [
    [-0.5, -0.5, 0, 0],
    [0.5, -0.5, 1, 0],
    [0.5, 0.5, 1, 1],
    [-0.5, 0.5, 0, 1],
  ];

  let vertexIndex = 0;
  for (const cluster of clusters) {
    for (let card = 0; card < cards; card += 1) {
      // Titik acak di dalam elipsoid, condong ke kulit luar supaya siluetnya
      // bergerigi tetapi bagian dalamnya tetap terisi.
      let x: number;
      let y: number;
      let z: number;
      do {
        x = (random() * 2) - 1;
        y = (random() * 2) - 1;
        z = (random() * 2) - 1;
      } while ((x * x) + (y * y) + (z * z) > 1);
      const shell = 0.55 + (Math.sqrt((x * x) + (y * y) + (z * z)) * 0.45);
      offset.set(x * cluster.radius.x * shell, y * cluster.radius.y * shell, z * cluster.radius.z * shell).add(cluster.center);
      euler.set(random() * Math.PI, random() * Math.PI * 2, random() * Math.PI);
      rotation.setFromEuler(euler);
      const scale = size[0] + (random() * (size[1] - size[0]));

      for (const [cx, cy, u, v] of corners) {
        corner.set(cx * scale, cy * scale, 0).applyQuaternion(rotation).add(offset);
        positions.push(corner.x, corner.y, corner.z);
        outward.copy(corner).sub(center);
        outward.y += 0.35 * cluster.radius.y;
        outward.normalize();
        normals.push(outward.x, outward.y, outward.z);
        const height = Math.min(Math.max((corner.y - shadowBelow) / Math.max(shadowAbove - shadowBelow, 0.01), 0), 1);
        const rim = Math.min(corner.clone().sub(cluster.center).length() / Math.max(cluster.radius.x, cluster.radius.y), 1);
        const light = 0.42 + (height * 0.36) + (rim * 0.22);
        colors.push(light, light, light * 0.97);
        uvs.push(u, v);
      }
      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
      vertexIndex += 4;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export type TreeGeometry = {
  wood: BufferGeometry;
  leaves: BufferGeometry;
  height: number;
};

// Pohon peneduh dalam satuan meter: batang melengkung dengan akar melebar,
// empat sampai lima dahan, lalu gumpalan daun di ujung dahan.
export function treeGeometry(seed: number, height = 6.2): TreeGeometry {
  return once(`tree-${seed}-${height}`, () => {
    const random = rng(seed);
    const trunkTop = height * (0.55 + (random() * 0.08));
    const lean = new Vector3((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
    const trunkCurve = new CatmullRomCurve3([
      new Vector3(0, -0.05, 0),
      new Vector3(lean.x * 0.3, trunkTop * 0.35, lean.z * 0.3),
      new Vector3(lean.x * 0.7, trunkTop * 0.7, lean.z * 0.7),
      new Vector3(lean.x, trunkTop, lean.z),
    ]);
    const baseRadius = 0.16 + (height * 0.012);
    const wood: BufferGeometry[] = [
      taperedTubeGeometry(
        trunkCurve,
        (t) => (baseRadius * (1 - (t * 0.5))) * (1 + (0.55 * Math.exp(-t * 16))),
        { tubularSegments: 18, radialSegments: 12, uvLength: 5 },
      ),
    ];

    const clusters: Cluster[] = [];
    const branchCount = 4 + Math.floor(random() * 2);
    for (let index = 0; index < branchCount; index += 1) {
      const angle = ((index / branchCount) * Math.PI * 2) + (random() * 0.8);
      const start = trunkCurve.getPointAt(0.62 + (random() * 0.34));
      const reach = (height * 0.24) + (random() * height * 0.1);
      const rise = (height * 0.18) + (random() * height * 0.12);
      const end = start.clone().add(new Vector3(Math.cos(angle) * reach, rise, Math.sin(angle) * reach));
      const middle = start.clone().lerp(end, 0.5).add(new Vector3(0, rise * 0.25, 0));
      const curve = new CatmullRomCurve3([start, middle, end]);
      wood.push(taperedTubeGeometry(curve, (t) => (baseRadius * 0.5) * (1 - (t * 0.72)), {
        tubularSegments: 10,
        radialSegments: 8,
        uvLength: 3,
      }));
      const radius = (height * 0.2) + (random() * height * 0.06);
      clusters.push({ center: end.clone().add(new Vector3(0, radius * 0.2, 0)), radius: new Vector3(radius, radius * 0.78, radius) });
    }
    const crownRadius = height * 0.25;
    clusters.push({
      center: new Vector3(lean.x, trunkTop + (height * 0.28), lean.z),
      radius: new Vector3(crownRadius, crownRadius * 0.8, crownRadius),
    });

    const center = clusters.reduce((sum, cluster) => sum.add(cluster.center), new Vector3()).multiplyScalar(1 / clusters.length);
    const leaves = cardGeometry(clusters, {
      cards: 26,
      size: [height * 0.2, height * 0.3],
      random,
      center,
      shadowBelow: trunkTop - (height * 0.05),
      shadowAbove: height * 1.05,
    });

    return { wood: mergeGeometries(wood) ?? wood[0], leaves, height };
  });
}

// Semak dan pagar tanaman: beberapa gumpalan yang saling bertumpuk di atas
// tanah, dengan bagian bawah lebih gelap seperti terlindung bayangan sendiri.
export function bushGeometry(seed: number, width = 1.4, height = 0.9) {
  return once(`bush-${seed}-${width}-${height}`, () => {
    const random = rng(seed + 400);
    const clusters: Cluster[] = [];
    const lumps = 3 + Math.floor(width / 0.7);
    for (let index = 0; index < lumps; index += 1) {
      const x = ((index / Math.max(lumps - 1, 1)) - 0.5) * width * 0.8;
      const r = (height * 0.45) + (random() * height * 0.15);
      clusters.push({
        center: new Vector3(x + ((random() - 0.5) * 0.15), r * 0.85, (random() - 0.5) * 0.2),
        radius: new Vector3(r * 1.05, r, r * 0.95),
      });
    }
    return cardGeometry(clusters, {
      cards: 22,
      size: [height * 0.45, height * 0.7],
      random,
      center: new Vector3(0, height * 0.35, 0),
      shadowBelow: 0,
      shadowAbove: height * 1.1,
    });
  });
}

// Serumpun rumput: tujuh helai yang melengkung ke luar. Normalnya condong ke
// atas supaya rumput diterangi seperti tanah di bawahnya.
export function grassTuftGeometry() {
  return once("grass-tuft", () => {
    const random = rng(77);
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const base = new Color("#3f6428");
    const tip = new Color("#9dba60");
    const color = new Color();
    let vertex = 0;

    for (let blade = 0; blade < 6; blade += 1) {
      const angle = random() * Math.PI * 2;
      const lean = 0.2 + (random() * 0.5);
      const height = 0.04 + (random() * 0.06);
      const width = 0.006 + (random() * 0.005);
      const bx = Math.cos(angle) * random() * 0.035;
      const bz = Math.sin(angle) * random() * 0.035;
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const sideX = -dirZ;
      const sideZ = dirX;
      const segments = 4;

      for (let step = 0; step <= segments; step += 1) {
        const t = step / segments;
        const bend = lean * height * t * t;
        const x = bx + (dirX * bend);
        const y = height * t * (1 - (lean * 0.18 * t));
        const z = bz + (dirZ * bend);
        const w = width * Math.pow(1 - t, 0.75);
        color.copy(base).lerp(tip, Math.pow(t, 0.8));
        const nx = dirX * 0.35;
        const nz = dirZ * 0.35;
        const length = Math.hypot(nx, 1, nz);
        for (const side of [-1, 1]) {
          positions.push(x + (sideX * w * side), y, z + (sideZ * w * side));
          normals.push(nx / length, 1 / length, nz / length);
          colors.push(color.r, color.g, color.b);
        }
      }
      for (let step = 0; step < segments; step += 1) {
        const a = vertex + (step * 2);
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      vertex += (segments + 1) * 2;
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  });
}

// Kepala bunga kecil: enam kelopak yang sedikit cekung dan putik di tengah.
// Warnanya datang dari instanceColor, jadi kelopak dibuat putih.
export function flowerHeadGeometry() {
  return once("flower-head", () => {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertex = 0;
    const petals = 6;
    const center = new Color("#e8b43a");

    for (let petal = 0; petal < petals; petal += 1) {
      const angle = (petal / petals) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const ring = [
        [0, 0.004, 0],
        [0.018, 0.012, -0.014],
        [0.05, 0.02, 0],
        [0.018, 0.012, 0.014],
      ];
      for (const [r, y, side] of ring) {
        positions.push((cos * r) - (sin * side), y, (sin * r) + (cos * side));
        normals.push(cos * 0.2, 1, sin * 0.2);
        colors.push(1, 1, 1);
      }
      indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
      vertex += 4;
    }

    const segments = 8;
    positions.push(0, 0.024, 0);
    normals.push(0, 1, 0);
    colors.push(center.r, center.g, center.b);
    const hub = vertex;
    vertex += 1;
    for (let step = 0; step <= segments; step += 1) {
      const angle = (step / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * 0.014, 0.018, Math.sin(angle) * 0.014);
      normals.push(Math.cos(angle) * 0.4, 1, Math.sin(angle) * 0.4);
      colors.push(center.r * 0.8, center.g * 0.8, center.b * 0.8);
    }
    for (let step = 0; step < segments; step += 1) indices.push(hub, vertex + step + 1, vertex + step);

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
    geometry.setIndex(indices);
    return geometry;
  });
}
