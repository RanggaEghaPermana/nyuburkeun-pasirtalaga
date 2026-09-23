import {
  CanvasTexture,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

// Seluruh tekstur laboratorium dilukis di kanvas saat pertama dibutuhkan, lalu
// disimpan. Tidak ada berkas gambar atau HDRI yang diunduh: materialnya tetap
// punya serat, pori, dan pantulan yang tidak rata, tetapi ukuran halaman tidak
// bertambah dan simulasi tetap bisa dibuka tanpa CDN pihak ketiga.
//
// Tekstur yang sama dipakai ulang lintas simulasi. Renderer baru cukup
// mengunggah ulang gambarnya, jadi tekstur di sini sengaja tidak dibuang saat
// kanvas dilepas.

export type RGB = readonly [number, number, number];

export type SurfaceMaps = {
  map: Texture;
  normalMap?: Texture;
  roughnessMap?: Texture;
};

const cache = new Map<string, unknown>();

export function once<T>(key: string, create: () => T): T {
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key) as T;
}

export function createCanvas(width: number, height = width) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return element;
}

export function canvasTexture(
  source: HTMLCanvasElement,
  { color = true, repeat = true }: { color?: boolean; repeat?: boolean } = {},
) {
  const texture = new CanvasTexture(source);
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

// Salinan berbagi gambar yang sama, sehingga tiap permukaan bisa punya
// pengulangan sendiri tanpa melukis ulang teksturnya.
export function withRepeat<T extends SurfaceMaps>(maps: T, x: number, y = x): T {
  const result = {} as Record<string, Texture>;
  for (const [key, texture] of Object.entries(maps)) {
    if (!texture) continue;
    const copy = (texture as Texture).clone();
    copy.repeat.set(x, y);
    copy.needsUpdate = true;
    result[key] = copy;
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

function hash(x: number, y: number, seed: number) {
  let h = ((x * 374761393) + (y * 668265263) + (seed * 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export function rng(seed: number) {
  let state = (seed * 2654435761) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function smooth(t: number) {
  return t * t * (3 - (2 * t));
}

function valueNoise(x: number, y: number, period: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const ax = ((x0 % period) + period) % period;
  const ay = ((y0 % period) + period) % period;
  const bx = (ax + 1) % period;
  const by = (ay + 1) % period;
  const top = hash(ax, ay, seed) + ((hash(bx, ay, seed) - hash(ax, ay, seed)) * fx);
  const bottom = hash(ax, by, seed) + ((hash(bx, by, seed) - hash(ax, by, seed)) * fx);
  return top + ((bottom - top) * fy);
}

const TILE = 256;

// Satu petak fBm yang bisa diulang tanpa sambungan. Tekstur lain mengambil
// sampel dari petak ini dengan skala bilangan bulat, sehingga hasilnya juga
// tetap bisa diulang tanpa garis pertemuan.
export function noiseTile(seed: number) {
  // Petak dipakai bersama: setiap tekstur mengambil sampel dengan skala dan
  // geseran berbeda, jadi enam petak sudah cukup bervariasi dan pembuatannya
  // tidak diulang untuk setiap bahan.
  const pooled = (seed % 6) + 1;
  return once(`noise-${pooled}`, () => {
    const data = new Float32Array(TILE * TILE);
    let min = Infinity;
    let max = -Infinity;

    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const u = x / TILE;
        const v = y / TILE;
        let sum = 0;
        let amplitude = 1;
        for (let octave = 0, frequency = 4; octave < 6; octave += 1, frequency *= 2) {
          sum += valueNoise(u * frequency, v * frequency, frequency, pooled + (octave * 31)) * amplitude;
          amplitude *= 0.5;
        }
        data[(y * TILE) + x] = sum;
        if (sum < min) min = sum;
        if (sum > max) max = sum;
      }
    }

    const range = Math.max(max - min, 1e-6);
    for (let index = 0; index < data.length; index += 1) data[index] = (data[index] - min) / range;
    return data;
  });
}

export function sampleTile(tile: Float32Array, u: number, v: number) {
  const x = u * TILE;
  const y = v * TILE;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const xa = x0 & 255;
  const xb = (x0 + 1) & 255;
  const ya = y0 & 255;
  const yb = (y0 + 1) & 255;
  const top = tile[(ya * TILE) + xa] + ((tile[(ya * TILE) + xb] - tile[(ya * TILE) + xa]) * fx);
  const bottom = tile[(yb * TILE) + xa] + ((tile[(yb * TILE) + xb] - tile[(yb * TILE) + xa]) * fx);
  return top + ((bottom - top) * fy);
}

// ---------------------------------------------------------------------------
// Warna
// ---------------------------------------------------------------------------

export function hex(value: string): RGB {
  const clean = value.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(Math.max(t, 0), 1);
  return [a[0] + ((b[0] - a[0]) * k), a[1] + ((b[1] - a[1]) * k), a[2] + ((b[2] - a[2]) * k)];
}

export function shade(color: RGB, amount: number): RGB {
  return amount >= 0 ? mix(color, [255, 255, 255], amount) : mix(color, [0, 0, 0], -amount);
}

export function rgba(color: RGB, alpha = 1) {
  return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${alpha})`;
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - (2 * t));
}

// ---------------------------------------------------------------------------
// Pembangun permukaan
// ---------------------------------------------------------------------------

type Pixel = {
  color: RGB;
  height: number;
  roughness?: number;
};

type SurfaceOptions = {
  width: number;
  height?: number;
  normalStrength?: number;
  roughness?: boolean;
  pixel: (u: number, v: number, x: number, y: number) => Pixel;
  paint?: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  paintHeight?: (context: CanvasRenderingContext2D, width: number, height: number) => void;
};

function normalCanvas(heights: Float32Array, width: number, height: number, strength: number) {
  const element = createCanvas(width, height);
  const context = element.getContext("2d");
  if (!context) return element;
  const image = context.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const up = ((y - 1 + height) % height) * width;
    const down = ((y + 1) % height) * width;
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const left = heights[row + ((x - 1 + width) % width)];
      const right = heights[row + ((x + 1) % width)];
      const nx = (left - right) * strength;
      const ny = (heights[down + x] - heights[up + x]) * strength;
      const length = Math.hypot(nx, ny, 1);
      const offset = (row + x) * 4;
      image.data[offset] = ((nx / length) * 0.5 + 0.5) * 255;
      image.data[offset + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      image.data[offset + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      image.data[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  return element;
}

export function buildSurface({
  width,
  height = width,
  normalStrength = 2,
  roughness = false,
  pixel,
  paint,
  paintHeight,
}: SurfaceOptions): SurfaceMaps {
  const colorElement = createCanvas(width, height);
  const colorContext = colorElement.getContext("2d");
  const heights = new Float32Array(width * height);
  const roughElement = roughness ? createCanvas(width, height) : null;

  if (!colorContext) return { map: canvasTexture(colorElement) };

  const colorImage = colorContext.createImageData(width, height);
  const roughContext = roughElement?.getContext("2d") ?? null;
  const roughImage = roughContext?.createImageData(width, height) ?? null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sample = pixel(x / width, y / height, x, y);
      const index = (y * width) + x;
      const offset = index * 4;
      colorImage.data[offset] = sample.color[0];
      colorImage.data[offset + 1] = sample.color[1];
      colorImage.data[offset + 2] = sample.color[2];
      colorImage.data[offset + 3] = 255;
      heights[index] = sample.height;
      if (roughImage) {
        const value = Math.min(Math.max(sample.roughness ?? 0.8, 0), 1) * 255;
        roughImage.data[offset] = value;
        roughImage.data[offset + 1] = value;
        roughImage.data[offset + 2] = value;
        roughImage.data[offset + 3] = 255;
      }
    }
  }

  colorContext.putImageData(colorImage, 0, 0);
  paint?.(colorContext, width, height);
  if (roughContext && roughImage) roughContext.putImageData(roughImage, 0, 0);

  if (paintHeight) {
    // Goresan yang juga harus timbul dilukis ke kanvas abu-abu terpisah lalu
    // ditambahkan ke peta ketinggian.
    const extra = createCanvas(width, height);
    const extraContext = extra.getContext("2d");
    if (extraContext) {
      extraContext.fillStyle = "#000";
      extraContext.fillRect(0, 0, width, height);
      paintHeight(extraContext, width, height);
      const data = extraContext.getImageData(0, 0, width, height).data;
      for (let index = 0; index < heights.length; index += 1) heights[index] += data[index * 4] / 255;
    }
  }

  const maps: SurfaceMaps = {
    map: canvasTexture(colorElement),
    normalMap: canvasTexture(normalCanvas(heights, width, height, normalStrength), { color: false }),
  };
  if (roughElement) maps.roughnessMap = canvasTexture(roughElement, { color: false });
  return maps;
}

// Menggambar bentuk yang melewati tepi kanvas sekali lagi di sisi seberang,
// supaya tekstur berulang tidak memperlihatkan potongan.
export function wrapped(
  width: number,
  height: number,
  x: number,
  y: number,
  margin: number,
  draw: (x: number, y: number) => void,
) {
  for (const dx of [-width, 0, width]) {
    for (const dy of [-height, 0, height]) {
      const px = x + dx;
      const py = y + dy;
      if (px < -margin || px > width + margin || py < -margin || py > height + margin) continue;
      draw(px, py);
    }
  }
}

// ---------------------------------------------------------------------------
// Tekstur kebun
// ---------------------------------------------------------------------------

export function grassMaps() {
  return once("grass", () => {
    const macro = noiseTile(11);
    const detail = noiseTile(12);
    const dark = hex("#4b7532");
    const light = hex("#7ea24f");
    const dry = hex("#a7a35f");
    const random = rng(4);

    return buildSurface({
      width: 256,
      normalStrength: 3,
      pixel: (u, v) => {
        const large = sampleTile(macro, u * 2, v * 2);
        const middle = sampleTile(detail, u * 8, v * 8);
        const fine = sampleTile(macro, (u * 32) + 0.37, (v * 32) + 0.11);
        let color = mix(dark, light, (large * 0.7) + (middle * 0.3));
        color = mix(color, dry, smoothstep(0.62, 0.86, sampleTile(detail, u * 3, v * 3)) * 0.45);
        color = shade(color, (fine - 0.5) * 0.28);
        return { color, height: (fine * 0.6) + (middle * 0.4) };
      },
      paint: (context, width, height) => {
        const palette = ["#3f682b", "#5a8a3a", "#88ad58", "#6f9844", "#9fb866", "#46712f"];
        context.lineCap = "round";
        for (let index = 0; index < 3200; index += 1) {
          const x = random() * width;
          const y = random() * height;
          const length = 2 + (random() * 4);
          const angle = -Math.PI / 2 + ((random() - 0.5) * 1.3);
          context.strokeStyle = palette[Math.floor(random() * palette.length)];
          context.globalAlpha = 0.35 + (random() * 0.45);
          context.lineWidth = 0.5 + (random() * 0.7);
          wrapped(width, height, x, y, 12, (px, py) => {
            context.beginPath();
            context.moveTo(px, py);
            context.lineTo(px + (Math.cos(angle) * length), py + (Math.sin(angle) * length));
            context.stroke();
          });
        }
        context.globalAlpha = 1;
      },
    });
  });
}

type SoilKind = "garden" | "compost" | "mature" | "sand" | "greens" | "browns" | "mixed";

const SOIL_PALETTES: Record<SoilKind, { dark: RGB; light: RGB; fleck: string[]; fibers: string[]; pebbles: number }> = {
  garden: { dark: hex("#3e2a1c"), light: hex("#7a5a3d"), fleck: ["#8d6c4c", "#2b1d13", "#9b8b72"], fibers: ["#a1845c"], pebbles: 90 },
  compost: { dark: hex("#261a12"), light: hex("#5a4230"), fleck: ["#6f5236", "#1a120c", "#7d6a3f"], fibers: ["#8a6a3e", "#6c7a3a"], pebbles: 20 },
  mature: { dark: hex("#1e1510"), light: hex("#4a3627"), fleck: ["#5d4431", "#120c08", "#3f3a24"], fibers: ["#5a4128"], pebbles: 10 },
  sand: { dark: hex("#b49c73"), light: hex("#dcc8a0"), fleck: ["#8f7b5c", "#efe2c4", "#a89478"], fibers: [], pebbles: 160 },
  greens: { dark: hex("#3a5a22"), light: hex("#7c9c3c"), fleck: ["#a6c85a", "#e8913a", "#e2c04a", "#6fa543", "#c4553c", "#d6e59a"], fibers: ["#b2d36a", "#f0a947"], pebbles: 0 },
  browns: { dark: hex("#5a3d24"), light: hex("#a47a4a"), fleck: ["#c09058", "#6e4a2a", "#d2ac72", "#8b6236"], fibers: ["#caa36a", "#7a552f"], pebbles: 0 },
  mixed: { dark: hex("#2e2117"), light: hex("#5e4630"), fleck: ["#7a8a3f", "#b0773d", "#a07a4c", "#1d140e"], fibers: ["#9a7a4a", "#6f8a3a"], pebbles: 12 },
};

// Tanah, kompos, pasir, dan lapisan bahan kompos memakai pembangun yang sama:
// dasar fBm yang bergumpal, pori gelap, serpihan terang, dan serat halus.
export function soilMaps(kind: SoilKind) {
  return once(`soil-${kind}`, () => {
    const palette = SOIL_PALETTES[kind];
    const macro = noiseTile(21);
    const detail = noiseTile(22);
    const random = rng(kind.length * 97);
    const grainy = kind === "sand";

    return buildSurface({
      width: 256,
      normalStrength: grainy ? 2.4 : 4.2,
      roughness: true,
      pixel: (u, v) => {
        const clump = sampleTile(macro, u * 4, v * 4);
        const crumb = sampleTile(detail, u * 16, v * 16);
        const grain = sampleTile(macro, (u * 64) + 0.21, (v * 64) + 0.63);
        let color = mix(palette.dark, palette.light, (clump * 0.55) + (crumb * 0.45));
        const pore = smoothstep(0.34, 0.16, crumb);
        color = shade(color, -pore * 0.45);
        color = shade(color, (grain - 0.5) * (grainy ? 0.34 : 0.2));
        const heightValue = grainy
          ? (grain * 0.7) + (crumb * 0.3)
          : (clump * 0.35) + (crumb * 0.5) + (grain * 0.15) - (pore * 0.3);
        return { color, height: heightValue, roughness: 0.82 + (crumb * 0.16) };
      },
      paint: (context, width, height) => {
        const flecks = grainy ? 1500 : kind === "greens" || kind === "browns" ? 420 : 700;
        for (let index = 0; index < flecks; index += 1) {
          const x = random() * width;
          const y = random() * height;
          const size = grainy ? 0.4 + (random() * 0.8) : 0.5 + (random() * (kind === "greens" || kind === "browns" ? 3 : 1.3));
          context.fillStyle = palette.fleck[Math.floor(random() * palette.fleck.length)];
          context.globalAlpha = 0.45 + (random() * 0.5);
          wrapped(width, height, x, y, 8, (px, py) => {
            context.beginPath();
            if (kind === "browns" || kind === "greens") {
              context.ellipse(px, py, size, size * (0.35 + (random() * 0.4)), random() * Math.PI, 0, Math.PI * 2);
            } else {
              context.arc(px, py, size, 0, Math.PI * 2);
            }
            context.fill();
          });
        }
        context.lineCap = "round";
        for (let index = 0; index < (palette.fibers.length ? 140 : 0); index += 1) {
          const x = random() * width;
          const y = random() * height;
          const length = 2 + (random() * 6);
          const angle = random() * Math.PI;
          context.strokeStyle = palette.fibers[Math.floor(random() * palette.fibers.length)];
          context.globalAlpha = 0.4 + (random() * 0.4);
          context.lineWidth = 0.6 + (random() * 0.9);
          wrapped(width, height, x, y, 14, (px, py) => {
            context.beginPath();
            context.moveTo(px, py);
            context.quadraticCurveTo(px + (Math.cos(angle + 0.4) * length * 0.5), py + (Math.sin(angle + 0.4) * length * 0.5), px + (Math.cos(angle) * length), py + (Math.sin(angle) * length));
            context.stroke();
          });
        }
        for (let index = 0; index < Math.round(palette.pebbles / 3); index += 1) {
          const x = random() * width;
          const y = random() * height;
          const size = 1 + (random() * (grainy ? 1.2 : 2));
          const tone = 120 + Math.floor(random() * 80);
          context.globalAlpha = 0.9;
          wrapped(width, height, x, y, 8, (px, py) => {
            const gradient = context.createRadialGradient(px - (size * 0.3), py - (size * 0.3), 0, px, py, size);
            gradient.addColorStop(0, `rgb(${tone + 40}, ${tone + 34}, ${tone + 22})`);
            gradient.addColorStop(1, `rgb(${tone - 40}, ${tone - 44}, ${tone - 50})`);
            context.fillStyle = gradient;
            context.beginPath();
            context.ellipse(px, py, size, size * 0.8, random(), 0, Math.PI * 2);
            context.fill();
          });
        }
        context.globalAlpha = 1;
      },
    });
  });
}

export function barkMaps() {
  return once("bark", () => {
    const tile = noiseTile(31);
    const second = noiseTile(32);
    const dark = hex("#3f332a");
    const light = hex("#7a6a58");
    const lichen = hex("#8e9a70");

    return buildSurface({
      width: 128,
      height: 256,
      normalStrength: 4,
      pixel: (u, v) => {
        const ridges = sampleTile(tile, u * 8, v * 1);
        const cracks = sampleTile(second, u * 24, v * 3);
        const blotch = sampleTile(second, u * 2, v * 2);
        const ridge = Math.pow(ridges, 1.4);
        let color = mix(dark, light, (ridge * 0.7) + (cracks * 0.3));
        color = shade(color, -smoothstep(0.35, 0.12, cracks) * 0.5);
        color = mix(color, lichen, smoothstep(0.72, 0.9, blotch) * 0.45);
        return { color, height: (ridge * 0.7) + (cracks * 0.3) - (smoothstep(0.35, 0.12, cracks) * 0.4) };
      },
    });
  });
}

type WoodKind = "table" | "weathered" | "crate" | "handle";

const WOOD_PALETTES: Record<WoodKind, { light: RGB; dark: RGB; rings: number }> = {
  table: { light: hex("#c99a66"), dark: hex("#94633b"), rings: 9 },
  weathered: { light: hex("#bba486"), dark: hex("#86705a"), rings: 8 },
  crate: { light: hex("#d9b988"), dark: hex("#b08a5c"), rings: 10 },
  handle: { light: hex("#b98553"), dark: hex("#7d4f2b"), rings: 22 },
};

// Serat kayu berjalan sepanjang sumbu u, jadi papan cukup dipetakan dengan u
// mengikuti panjangnya.
export function woodMaps(kind: WoodKind = "table") {
  return once(`wood-${kind}`, () => {
    const tile = noiseTile(41);
    const fibers = noiseTile(42);
    const palette = WOOD_PALETTES[kind];

    return buildSurface({
      width: 512,
      normalStrength: kind === "weathered" ? 5 : 2.5,
      roughness: true,
      pixel: (u, v) => {
        // Serat panjang searah u: frekuensi rendah pada u, tinggi pada v.
        const warp = (sampleTile(tile, u * 1, v * 2) * 1.1) + (sampleTile(fibers, u * 3, v * 6) * 0.22);
        const ring = ((v * palette.rings) + warp) % 1;
        const band = Math.pow(Math.abs(Math.sin(ring * Math.PI)), 5);
        const fiber = sampleTile(fibers, u * 2, v * 96);
        const streak = sampleTile(tile, u * 1, v * 24);
        let color = mix(palette.light, palette.dark, (band * 0.42) + (fiber * 0.28) + ((streak - 0.5) * 0.3));
        if (kind === "weathered") color = shade(color, (sampleTile(tile, u * 6, v * 6) - 0.5) * 0.18);
        const knot = smoothstep(0.9, 0.97, sampleTile(tile, (u * 2) + 0.5, (v * 3) + 0.2));
        color = mix(color, shade(palette.dark, -0.3), knot * 0.75);
        return {
          color,
          height: (fiber * 0.45) + (band * 0.35) - (knot * 0.25),
          roughness: kind === "handle" ? 0.45 + (fiber * 0.2) : 0.6 + (fiber * 0.22) + (kind === "weathered" ? 0.12 : 0),
        };
      },
    });
  });
}

export function bambooMaps() {
  return once("bamboo", () => {
    const tile = noiseTile(51);
    const base = hex("#c2ab62");
    const shadow = hex("#9a8243");
    const green = hex("#8a9a4a");

    return buildSurface({
      width: 64,
      height: 256,
      normalStrength: 3,
      roughness: true,
      pixel: (u, v) => {
        const fiber = sampleTile(tile, u * 32, v * 2);
        const patch = sampleTile(tile, (u * 2) + 0.3, v * 2);
        const node = Math.exp(-Math.pow((v - 0.5) * 34, 2));
        const nodeGroove = Math.exp(-Math.pow((v - 0.5) * 140, 2));
        let color = mix(base, shadow, fiber * 0.5);
        color = mix(color, green, smoothstep(0.55, 0.8, patch) * 0.4);
        color = shade(color, -nodeGroove * 0.45 + (node * 0.05));
        return { color, height: (fiber * 0.25) + (node * 0.9) - (nodeGroove * 0.5), roughness: 0.42 + (fiber * 0.2) };
      },
    });
  });
}

// Plastik cetak punya kulit jeruk halus dan goresan pemakaian. Peta warnanya
// hampir putih supaya warna asli tong tetap dipegang material, hanya diberi
// noda samar agar tidak terlihat seperti plastik baru di etalase.
export function plasticMaps() {
  return once("plastic", () => {
    const tile = noiseTile(61);
    const second = noiseTile(62);
    const random = rng(61);

    return buildSurface({
      width: 256,
      normalStrength: 0.45,
      roughness: true,
      pixel: (u, v) => {
        const peel = (sampleTile(tile, u * 10, v * 10) * 0.7) + (sampleTile(second, u * 20, v * 20) * 0.3);
        const smudge = sampleTile(second, u * 3, v * 3);
        const tone = 236 + ((smudge - 0.5) * 34);
        return {
          color: [tone, tone, tone - 2],
          height: peel,
          roughness: 0.42 + (smudge * 0.22) + (peel * 0.08),
        };
      },
      paint: (context, width, height) => {
        context.strokeStyle = "rgba(255,255,255,0.18)";
        context.lineWidth = 0.6;
        for (let index = 0; index < 60; index += 1) {
          const x = random() * width;
          const y = random() * height;
          const length = 6 + (random() * 26);
          const angle = random() * Math.PI;
          wrapped(width, height, x, y, 32, (px, py) => {
            context.beginPath();
            context.moveTo(px, py);
            context.lineTo(px + (Math.cos(angle) * length), py + (Math.sin(angle) * length));
            context.stroke();
          });
        }
      },
    });
  });
}

export function terracottaMaps() {
  return once("terracotta", () => {
    const tile = noiseTile(71);
    const second = noiseTile(72);
    const base = hex("#b8633b");
    const warm = hex("#cf7f52");
    const bloom = hex("#d9c7ac");

    return buildSurface({
      width: 256,
      normalStrength: 1.8,
      roughness: true,
      pixel: (u, v) => {
        const mottle = sampleTile(tile, u * 4, v * 4);
        const pore = sampleTile(second, u * 48, v * 48);
        let color = mix(base, warm, mottle);
        color = shade(color, -smoothstep(0.28, 0.1, pore) * 0.35);
        color = mix(color, bloom, smoothstep(0.74, 0.92, sampleTile(second, (u * 3) + 0.4, v * 2)) * 0.35);
        return { color, height: pore * 0.6 + mottle * 0.2, roughness: 0.86 + (pore * 0.1) };
      },
    });
  });
}

export function stoneMaps() {
  return once("stone", () => {
    const tile = noiseTile(81);
    const second = noiseTile(82);
    const dark = hex("#7c796f");
    const light = hex("#bdb8a9");

    return buildSurface({
      width: 256,
      normalStrength: 4,
      roughness: true,
      pixel: (u, v) => {
        const body = sampleTile(tile, u * 4, v * 4);
        const speck = sampleTile(second, u * 64, v * 64);
        let color = mix(dark, light, body);
        color = shade(color, (speck - 0.5) * 0.35);
        return { color, height: (body * 0.6) + (speck * 0.4), roughness: 0.78 + (speck * 0.18) };
      },
    });
  });
}

// Paving blok segi enam, pemandangan sehari-hari di halaman sekolah dan balai
// desa. Petak teksturnya mencakup 4 kolom × 2 baris pasang heksagon; karena
// rasio petaknya tidak persegi, pengulangan v perlu dikalikan PAVING_ASPECT.
export const PAVING_ASPECT = 4 / (2 * Math.sqrt(3));

export function pavingMaps() {
  return once("paving", () => {
    const tile = noiseTile(91);
    const second = noiseTile(92);
    const concrete = hex("#c2bba9");
    const concreteDark = hex("#a39c8a");
    const joint = hex("#6e6655");
    const moss = hex("#667a3c");
    const columns = 4;
    const rows = 2 * Math.sqrt(3);
    const sqrt3 = Math.sqrt(3);

    return buildSurface({
      width: 256,
      normalStrength: 5,
      roughness: true,
      pixel: (u, v) => {
        // Koordinat dalam satuan lebar heksagon, lalu cari pusat terdekat pada
        // kisi heksagon (baris ganjil digeser setengah).
        const px = u * columns;
        const py = v * rows;
        const rowHeight = sqrt3 / 2;
        const row = Math.round(py / rowHeight);
        let best = Infinity;
        let second2 = Infinity;
        let cellX = 0;
        let cellY = 0;
        for (let r = row - 1; r <= row + 1; r += 1) {
          const offset = (r & 1) === 0 ? 0 : 0.5;
          const col = Math.round(px - offset);
          for (let c = col - 1; c <= col + 1; c += 1) {
            const cx = c + offset;
            const cy = r * rowHeight;
            const distance = Math.hypot(px - cx, py - cy);
            if (distance < best) {
              second2 = best;
              best = distance;
              cellX = c;
              cellY = r;
            } else if (distance < second2) {
              second2 = distance;
            }
          }
        }
        const edge = (second2 - best);
        const inside = smoothstep(0.03, 0.09, edge);
        const bevel = smoothstep(0.03, 0.16, edge);
        const wrappedCellX = ((cellX % columns) + columns) % columns;
        const wrappedCellY = ((cellY % 4) + 4) % 4;
        const variation = hash(wrappedCellX, wrappedCellY, 9);
        const grit = sampleTile(second, u * 48, v * 48);
        const stain = sampleTile(tile, u * 3, v * 3);
        let color = mix(concreteDark, concrete, 0.5 + (variation * 0.35) + ((grit - 0.5) * 0.22));
        color = shade(color, -smoothstep(0.72, 0.95, stain) * 0.08);
        const jointColor = mix(joint, moss, smoothstep(0.5, 0.75, sampleTile(tile, u * 10, v * 10)) * 0.7);
        color = mix(jointColor, color, inside);
        return {
          color,
          height: (bevel * 0.8) + (grit * 0.12),
          roughness: 0.84 + (grit * 0.12) - (inside * 0.05),
        };
      },
    });
  });
}

export function fabricMaps(kind: "burlap" | "canvas" | "cotton") {
  return once(`fabric-${kind}`, () => {
    const tile = noiseTile(101);
    const base = kind === "burlap" ? hex("#b3925f") : kind === "canvas" ? hex("#e6d9bb") : hex("#f3ede0");
    const threads = kind === "burlap" ? 40 : kind === "canvas" ? 96 : 128;

    return buildSurface({
      width: 256,
      normalStrength: kind === "burlap" ? 5 : 2,
      roughness: true,
      pixel: (u, v) => {
        const tx = u * threads;
        const ty = v * threads;
        const over = (Math.floor(tx) + Math.floor(ty)) % 2 === 0;
        const across = Math.sin((tx % 1) * Math.PI);
        const along = Math.sin((ty % 1) * Math.PI);
        const weave = over ? along * 0.8 + across * 0.2 : across * 0.8 + along * 0.2;
        const slub = sampleTile(tile, u * 8, v * 32);
        let color = shade(base, ((weave - 0.6) * 0.28) + ((slub - 0.5) * 0.18));
        if (kind === "burlap") color = shade(color, -smoothstep(0.25, 0.05, weave) * 0.4);
        return { color, height: weave + (slub * 0.2), roughness: 0.9 };
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Tekstur beralfa
// ---------------------------------------------------------------------------

type LeafClusterKind = "canopy" | "hedge" | "sapling";

const LEAF_PALETTES: Record<LeafClusterKind, string[]> = {
  canopy: ["#2f5a27", "#3b6b2c", "#4a7c32", "#5c8c3a", "#6d9b43", "#35602a"],
  hedge: ["#264d24", "#2f5c2a", "#3d6d30", "#4b7c36", "#5a8a3d"],
  sapling: ["#3e7a30", "#4c8a36", "#5c9a3e", "#6aa646"],
};

// Satu kartu berisi puluhan daun kecil. Kartu-kartu ini disusun menjadi tajuk
// pohon dan semak, sehingga siluetnya tampak rimbun, bukan bola bersegi.
export function leafClusterTexture(kind: LeafClusterKind) {
  return once(`leaves-${kind}`, () => {
    const size = 512;
    const element = createCanvas(size);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    const random = rng(kind.length * 13 + 5);
    const palette = LEAF_PALETTES[kind];
    const count = kind === "hedge" ? 150 : 90;

    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * size * 0.38;
      const x = (size / 2) + (Math.cos(angle) * distance);
      const y = (size / 2) + (Math.sin(angle) * distance);
      const length = (kind === "hedge" ? 26 : 44) * (0.7 + (random() * 0.6));
      const width = length * (0.36 + (random() * 0.14));
      const rotation = angle + ((random() - 0.5) * 1.8);
      const edgeLight = distance / (size * 0.38);
      const baseColor = hex(palette[Math.floor(random() * palette.length)]);
      const color = shade(baseColor, (edgeLight - 0.55) * 0.35);

      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      const gradient = context.createLinearGradient(-length / 2, 0, length / 2, 0);
      gradient.addColorStop(0, rgba(shade(color, -0.18)));
      gradient.addColorStop(0.6, rgba(color));
      gradient.addColorStop(1, rgba(shade(color, 0.16)));
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(-length / 2, 0);
      context.quadraticCurveTo(0, -width, length / 2, 0);
      context.quadraticCurveTo(0, width, -length / 2, 0);
      context.fill();
      context.strokeStyle = rgba(shade(color, 0.22), 0.55);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-length / 2, 0);
      context.lineTo(length / 2.2, 0);
      context.stroke();
      context.restore();
    }

    const texture = canvasTexture(element, { repeat: false });
    return texture;
  });
}

// Siluet deretan pohon jauh untuk cakrawala. Dibuat pucat karena warnanya harus
// menyatu dengan kabut, bukan bersaing dengan panggung.
export function treelineTexture() {
  return once("treeline", () => {
    const width = 2048;
    const height = 256;
    const element = createCanvas(width, height);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element);
    const random = rng(7);

    const layers = [
      { color: "rgba(196, 211, 188, 0.9)", base: 170, amplitude: 60 },
      { color: "rgba(171, 192, 164, 0.95)", base: 205, amplitude: 50 },
    ];

    for (const layer of layers) {
      context.fillStyle = layer.color;
      context.beginPath();
      context.moveTo(0, height);
      for (let x = 0; x <= width; x += 6) {
        const crown = Math.sin(x * 0.011 + layer.base) * 0.5 + Math.sin(x * 0.037) * 0.3 + (random() * 0.25);
        const y = layer.base - (crown * layer.amplitude * 0.6) - (random() * 10);
        context.lineTo(x, y);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fill();

      for (let index = 0; index < 90; index += 1) {
        const x = random() * width;
        const radius = 18 + (random() * 38);
        const y = layer.base - (random() * layer.amplitude);
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    const texture = canvasTexture(element);
    texture.wrapT = texture.wrapS;
    return texture;
  });
}

export function blobShadowTexture() {
  return once("blob-shadow", () => {
    const size = 128;
    const element = createCanvas(size);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    // Dipakai sebagai alphaMap, yang membaca kanal hijau: tengah putih berarti
    // pekat, tepi hitam berarti bening.
    context.fillStyle = "#000";
    context.fillRect(0, 0, size, size);
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.4, "#9a9a9a");
    gradient.addColorStop(0.75, "#2a2a2a");
    gradient.addColorStop(1, "#000");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return canvasTexture(element, { repeat: false });
  });
}

// ---------------------------------------------------------------------------
// Tulisan pada kanvas
// ---------------------------------------------------------------------------

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

export const DISPLAY_FONT = "\"Space Grotesk Variable\", \"Space Grotesk\", Inter, Arial, sans-serif";
export const TEXT_FONT = "\"Inter Variable\", Inter, Arial, sans-serif";

export function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number, weight: number, start: number, min: number, family = DISPLAY_FONT) {
  let size = start;
  do {
    context.font = `${weight} ${size}px ${family}`;
    size -= 1;
  } while (context.measureText(value).width > maxWidth && size > min);
  return size + 1;
}
