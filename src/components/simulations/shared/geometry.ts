import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  Vector3,
} from "three";

// Vertex kembar di kutub sphere bisa menghasilkan normal nol setelah digeser,
// yang tampil sebagai bercak gelap. Titik seperti itu diarahkan keluar dari
// pusat geometri sebagai gantinya.
function repairNormals(geometry: BufferGeometry) {
  geometry.computeVertexNormals();

  const position = geometry.attributes.position as BufferAttribute;
  const normal = geometry.attributes.normal as BufferAttribute;
  const vector = new Vector3();

  for (let index = 0; index < normal.count; index += 1) {
    vector.fromBufferAttribute(normal, index);
    if (Number.isFinite(vector.lengthSq()) && vector.lengthSq() > 1e-6) continue;

    vector.fromBufferAttribute(position, index);
    if (vector.lengthSq() < 1e-6) vector.set(0, 1, 0);
    vector.normalize();
    normal.setXYZ(index, vector.x, vector.y, vector.z);
  }

  normal.needsUpdate = true;
}

export function warpGeometry(geometry: BufferGeometry, mutate: (vertex: Vector3) => void) {
  const position = geometry.attributes.position as BufferAttribute;
  const vertex = new Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    mutate(vertex);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  repairNormals(geometry);
  return geometry;
}

function hash(x: number, y: number, z: number, seed: number) {
  const value = Math.sin((x * 127.1) + (y * 311.7) + (z * 74.7) + (seed * 13.13)) * 43758.5453;
  return value - Math.floor(value);
}

// Menggeser tiap vertex dengan noise yang ditentukan posisinya, sehingga vertex
// kembar di jahitan geometri ikut bergeser sama dan permukaan tidak retak.
export function crumpleGeometry(geometry: BufferGeometry, amount: number, seed = 1) {
  return warpGeometry(geometry, (vertex) => {
    const { x, y, z } = vertex;
    vertex.x += (hash(x, y, z, seed) - 0.5) * amount;
    vertex.y += (hash(y, z, x, seed + 3.7) - 0.5) * amount;
    vertex.z += (hash(z, x, y, seed + 8.1) - 0.5) * amount;
  });
}

function roundedRectShape(width: number, height: number, radius: number) {
  const shape = new Shape();
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const corner = Math.min(radius, halfWidth, halfHeight);

  shape.moveTo(-halfWidth + corner, -halfHeight);
  shape.lineTo(halfWidth - corner, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + corner);
  shape.lineTo(halfWidth, halfHeight - corner);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - corner, halfHeight);
  shape.lineTo(-halfWidth + corner, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - corner);
  shape.lineTo(-halfWidth, -halfHeight + corner);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + corner, -halfHeight);

  return shape;
}

export function roundedPlateGeometry(width: number, height: number, depth: number, radius = 0.04) {
  const bevel = Math.min(depth * 0.34, 0.016);
  const geometry = new ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth: Math.max(depth - (bevel * 2), 0.002),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });

  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

// Profil ditulis sebagai [radius, y] lalu dihaluskan lewat spline sebelum
// diputar, supaya siluetnya melengkung dan tidak bersudut seperti primitif.
export function smoothLatheGeometry(
  profile: readonly (readonly [number, number])[],
  segments = 30,
  samples = 44,
) {
  const spline = new CatmullRomCurve3(profile.map(([radius, y]) => new Vector3(radius, y, 0)));

  // Spline Catmull-Rom melewati titik kontrolnya di tikungan, sehingga badan
  // bisa menggelembung melebihi profil yang ditulis dan menembus label yang
  // ditempel di atasnya. Hasil sampling dikurung pada rentang profil aslinya.
  const radii = profile.map(([radius]) => radius);
  const heights = profile.map(([, y]) => y);
  const maxRadius = Math.max(...radii);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);

  const points = spline.getPoints(samples).map((point) => new Vector2(
    Math.min(Math.max(point.x, 0.0006), maxRadius),
    Math.min(Math.max(point.y, minHeight), maxHeight),
  ));

  const geometry = new LatheGeometry(points, segments);
  geometry.computeVertexNormals();
  return geometry;
}

type RibbonOptions = {
  curve: CatmullRomCurve3;
  width: (progress: number) => number;
  arcSpan?: number;
  offset?: number;
  curl?: 1 | -1;
  lengthSegments?: number;
  arcSegments?: number;
};

// Menyapu potongan busur sepanjang kurva. Berbeda dari pita datar, potongan
// busur membuat permukaannya cekung sehingga sisi dalam kulit ikut terlihat.
export function sweptRibbonGeometry({
  curve,
  width,
  arcSpan = Math.PI * 0.66,
  offset = 0,
  curl = 1,
  lengthSegments = 26,
  arcSegments = 8,
}: RibbonOptions) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const worldUp = new Vector3(0, 1, 0);
  const fallbackUp = new Vector3(0, 0, 1);
  const halfSpan = arcSpan / 2;

  for (let i = 0; i <= lengthSegments; i += 1) {
    const progress = i / lengthSegments;
    const center = curve.getPoint(progress);
    const tangent = curve.getTangent(progress).normalize();
    const reference = Math.abs(tangent.dot(worldUp)) > 0.92 ? fallbackUp : worldUp;
    const side = new Vector3().crossVectors(reference, tangent).normalize();
    const normal = new Vector3().crossVectors(tangent, side).normalize().multiplyScalar(curl);
    const radius = Math.max(width(progress), 0.002) / (2 * Math.sin(halfSpan));

    for (let j = 0; j <= arcSegments; j += 1) {
      const angle = -halfSpan + ((arcSpan * j) / arcSegments);
      const outward = new Vector3()
        .addScaledVector(normal, -Math.cos(angle))
        .addScaledVector(side, Math.sin(angle));
      const lift = radius * (1 - Math.cos(angle));
      const point = center
        .clone()
        .addScaledVector(normal, lift)
        .addScaledVector(side, radius * Math.sin(angle))
        .addScaledVector(outward, offset);

      positions.push(point.x, point.y, point.z);
      uvs.push(j / arcSegments, progress);
    }
  }

  const stride = arcSegments + 1;

  for (let i = 0; i < lengthSegments; i += 1) {
    for (let j = 0; j < arcSegments; j += 1) {
      const a = (i * stride) + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export type LeafShape = {
  length: number;
  width: number;
  fold: number;
  curl: number;
  wave: number;
};

// Daun dibangun sebagai permukaan parametrik: u membentang sepanjang tulang
// tengah, v melintang. Extrude tidak dipakai karena triangulasinya menumpuk di
// tengah dan permukaannya jadi melipat seperti kipas.
function leafPoint({ length, width, fold, curl, wave }: LeafShape, u: number, v: number) {
  const clamped = Math.min(Math.max(u, 0), 1);
  const envelope = Math.sin(Math.PI * clamped) ** 0.72;
  const halfWidth = (width / 2) * envelope;

  return new Vector3(
    length * (clamped - 0.5),
    (-Math.abs(v) * fold * halfWidth)
      + (curl * ((clamped - 0.42) ** 2) * length)
      + (Math.sin(clamped * 7.4) * wave),
    v * halfWidth,
  );
}

export function dryLeafGeometry(shape: LeafShape, lengthSegments = 36, widthSegments = 14) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegments; i += 1) {
    const u = i / lengthSegments;
    for (let j = 0; j <= widthSegments; j += 1) {
      const v = -1 + ((2 * j) / widthSegments);
      const point = leafPoint(shape, u, v);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, (v + 1) / 2);
    }
  }

  const stride = widthSegments + 1;
  for (let i = 0; i < lengthSegments; i += 1) {
    for (let j = 0; j < widthSegments; j += 1) {
      const a = (i * stride) + j;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  repairNormals(geometry);
  return geometry;
}

export function leafMidribCurve(shape: LeafShape) {
  return new CatmullRomCurve3(
    Array.from({ length: 11 }, (_, index) => leafPoint(shape, index / 10, 0).add(new Vector3(0, 0.006, 0))),
  );
}

// Tulang cabang dihitung dari fungsi permukaan yang sama supaya selalu menempel
// pada daun dan tidak menonjol keluar.
export function leafVeinCurves(shape: LeafShape) {
  const lift = new Vector3(0, 0.005, 0);

  return [0.3, 0.46, 0.62, 0.76].flatMap((start) => [-1, 1].map((side) => new CatmullRomCurve3([
    leafPoint(shape, start, 0).add(lift),
    leafPoint(shape, start + 0.05, side * 0.4).add(lift),
    leafPoint(shape, start + 0.11, side * 0.78).add(lift),
  ])));
}

export function petioleCurve({ length, width, curl }: LeafShape) {
  const base = -length / 2;

  return new CatmullRomCurve3([
    new Vector3(base + 0.01, curl * 0.03, 0),
    new Vector3(base - 0.08, -0.01, width * 0.04),
    new Vector3(base - 0.17, -0.05, width * 0.1),
  ]);
}
