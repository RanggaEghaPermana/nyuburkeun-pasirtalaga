import { BufferAttribute, BufferGeometry } from "three";
import { noiseTile, sampleTile } from "./textures";

export type CutawaySlabOptions = {
  y0: number;
  y1: number;
  bump: number;
  seed: number;
  phiStart: number;
  phiLength: number;
  // Jari-jari dinding dalam wadah pada ketinggian y.
  radiusAt: (y: number) => number;
  rings?: number;
  segments?: number;
};

// Isi wadah yang dipotong: permukaan atas bergumpal mengikuti noise dan sedikit
// menggunung di tengah, lalu dua bidang potong yang memperlihatkan penampang
// isi di celah wadah. Grup 0 = permukaan atas, grup 1 = bidang potong.
export function cutawaySlabGeometry({
  y0,
  y1,
  bump,
  seed,
  phiStart,
  phiLength,
  radiusAt,
  rings = 9,
  segments = 44,
}: CutawaySlabOptions) {
  const tile = noiseTile(201);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const phiFrom = phiStart + 0.004;
  const phiTo = phiStart + phiLength - 0.004;
  const topRadius = radiusAt(y1) - 0.012;

  const heightAt = (r: number, phi: number) => {
    const x = Math.sin(phi) * r;
    const z = Math.cos(phi) * r;
    const noise = sampleTile(tile, (x * 0.18) + (seed * 0.137), (z * 0.18) + (seed * 0.071));
    const edge = Math.min(r / topRadius, 1);
    const mound = (1 - (edge * edge)) * bump * 0.6;
    return y1 + ((noise - 0.5) * bump * 2.2 * (1 - ((edge ** 4) * 0.6))) + mound;
  };

  for (let k = 0; k <= rings; k += 1) {
    const r = (topRadius * k) / rings;
    for (let j = 0; j <= segments; j += 1) {
      const phi = phiFrom + (((phiTo - phiFrom) * j) / segments);
      const x = Math.sin(phi) * r;
      const z = Math.cos(phi) * r;
      positions.push(x, heightAt(r, phi), z);
      uvs.push((x * 0.42) + (seed * 0.31), (z * 0.42) + (seed * 0.17));
    }
  }
  for (let k = 0; k < rings; k += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = (k * (segments + 1)) + j;
      const b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const topCount = indices.length;

  const heights = 3;
  for (const phi of [phiFrom, phiTo]) {
    const base = positions.length / 3;
    for (let k = 0; k <= rings; k += 1) {
      const rTop = (topRadius * k) / rings;
      const top = heightAt(rTop, phi);
      for (let h = 0; h <= heights; h += 1) {
        const y = y0 + (((top - y0) * h) / heights);
        const r = rTop * ((radiusAt(y) - 0.012) / topRadius);
        positions.push(Math.sin(phi) * r, y, Math.cos(phi) * r);
        uvs.push((r * 0.5) + (seed * 0.23), y * 0.5);
      }
    }
    for (let k = 0; k < rings; k += 1) {
      for (let h = 0; h < heights; h += 1) {
        const a = base + (k * (heights + 1)) + h;
        const b = a + heights + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, topCount, 0);
  geometry.addGroup(topCount, indices.length - topCount, 1);
  geometry.computeVertexNormals();
  return geometry;
}
