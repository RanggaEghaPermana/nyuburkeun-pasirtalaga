import {
  buildSurface,
  hex,
  mix,
  noiseTile,
  once,
  rng,
  sampleTile,
  shade,
  smoothstep,
  wrapped,
} from "./textures";

// Tekstur bahan organik dan kertas yang dipakai lintas simulasi: kulit pisang,
// daun kering, kardus, dan sayuran. Semuanya tanpa berkas gambar.

// Kulit pisang yang sudah dibuang: kuning dengan bintik gula cokelat yang makin
// rapat ke arah ujung (v mendekati 1), dan ujung yang menghitam.
export function bananaPeelMaps() {
  return once("banana-peel", () => {
    const tile = noiseTile(151);
    const yellow = hex("#efc53b");
    const ripe = hex("#d9a92a");
    const brown = hex("#5b3a17");
    const random = rng(151);

    return buildSurface({
      width: 256,
      normalStrength: 2.4,
      roughness: true,
      pixel: (u, v) => {
        const ridge = Math.abs(Math.sin(u * Math.PI * 3));
        const blotch = sampleTile(tile, u * 3, v * 3);
        let color = mix(yellow, ripe, (blotch * 0.6) + ((1 - ridge) * 0.2));
        color = mix(color, brown, smoothstep(0.82, 1, v) * 0.85);
        color = mix(color, brown, smoothstep(0.7, 0.85, sampleTile(tile, (u * 6) + 0.3, v * 6)) * 0.55 * v);
        return { color, height: ridge * 0.4 + blotch * 0.2, roughness: 0.55 + (blotch * 0.15) };
      },
      paint: (context, width, height) => {
        for (let index = 0; index < 260; index += 1) {
          const x = random() * width;
          const y = random() * height;
          const density = y / height;
          if (random() > 0.25 + (density * 0.75)) continue;
          context.fillStyle = `rgba(${70 + (random() * 30)}, ${42 + (random() * 20)}, 16, ${0.45 + (random() * 0.4)})`;
          wrapped(width, height, x, y, 4, (px, py) => {
            context.beginPath();
            context.ellipse(px, py, 1 + (random() * 2.4), 1 + (random() * 1.6), random() * Math.PI, 0, Math.PI * 2);
            context.fill();
          });
        }
      },
    });
  });
}

// Daun kering: u sepanjang tulang daun, v melintang (0..1). Tulang tengah di
// v = 0.5, tulang cabang miring, tepi yang lebih gelap, dan bercak lapuk.
type LeafTone = "brown" | "tan" | "green" | "fresh" | "sick";

const LEAF_TONES: Record<LeafTone, { base: string; light: string; vein: string; edge: string; decay: number }> = {
  brown: { base: "#a1672f", light: "#c28444", vein: "#d6a766", edge: "#5e3a1a", decay: 0.6 },
  tan: { base: "#c49356", light: "#dcb277", vein: "#ecd3a0", edge: "#8a5a2b", decay: 0.6 },
  green: { base: "#6f9a3f", light: "#a7c46a", vein: "#d6e3a4", edge: "#4f6f2c", decay: 0.6 },
  // Daun tanaman yang sehat, dan daun yang menguning karena akarnya terganggu.
  fresh: { base: "#3f7f2c", light: "#6aa443", vein: "#a9d27d", edge: "#2f6322", decay: 0 },
  sick: { base: "#b3a53c", light: "#d2c25a", vein: "#e6dc9a", edge: "#7a4f1e", decay: 0.9 },
};

export function dryLeafMaps(tone: LeafTone = "brown") {
  return once(`dry-leaf-${tone}`, () => {
    const tile = noiseTile(161);
    const colors = LEAF_TONES[tone];
    const palette = { base: hex(colors.base), light: hex(colors.light), vein: hex(colors.vein), edge: hex(colors.edge) };

    return buildSurface({
      width: 256,
      normalStrength: 4,
      roughness: true,
      pixel: (u, v) => {
        const across = Math.abs(v - 0.5) * 2;
        const midrib = smoothstep(0.04, 0.0, Math.abs(v - 0.5));
        const branch = Math.abs(Math.sin(((u * 7) - (across * 1.6)) * Math.PI));
        const vein = smoothstep(0.93, 1, branch) * (1 - smoothstep(0.85, 1, across));
        const mottle = sampleTile(tile, u * 4, v * 4);
        const decay = smoothstep(0.66, 0.84, sampleTile(tile, (u * 3) + 0.4, (v * 3) + 0.1));
        let color = mix(palette.base, palette.light, mottle * 0.7);
        color = mix(color, palette.vein, Math.max(midrib, vein * 0.7));
        color = mix(color, palette.edge, smoothstep(0.7, 1, across) * 0.55);
        color = mix(color, shade(palette.edge, -0.3), decay * colors.decay);
        return {
          color,
          height: (midrib * 0.8) + (vein * 0.4) + (mottle * 0.2),
          roughness: 0.8 + (mottle * 0.15),
        };
      },
    });
  });
}

// Kardus kraft: serat halus, sedikit noda, dan garis gelombang samar dari
// lapisan bergelombang di dalamnya.
export function kraftMaps(printed = false) {
  return once(`kraft-${printed}`, () => {
    const tile = noiseTile(171);
    const base = hex("#b98a55");
    const light = hex("#cfa06a");
    const random = rng(171);

    return buildSurface({
      width: 256,
      normalStrength: 1.6,
      roughness: true,
      pixel: (u, v) => {
        const fiber = sampleTile(tile, u * 48, v * 6);
        const flute = Math.sin(v * Math.PI * 32) * 0.5 + 0.5;
        const stain = sampleTile(tile, u * 3, v * 3);
        let color = mix(base, light, (fiber * 0.5) + (stain * 0.3));
        color = shade(color, ((flute - 0.5) * 0.04) - (smoothstep(0.75, 0.95, stain) * 0.12));
        return { color, height: (flute * 0.25) + (fiber * 0.3), roughness: 0.88 };
      },
      paint: printed ? (context, width, height) => {
        // Cetakan panah "atas" dan simbol daur ulang, seperti kardus kiriman.
        context.strokeStyle = "rgba(60, 42, 26, 0.72)";
        context.fillStyle = "rgba(60, 42, 26, 0.72)";
        context.lineWidth = 3;
        for (const x of [width * 0.18, width * 0.3]) {
          context.beginPath();
          context.moveTo(x, height * 0.3);
          context.lineTo(x, height * 0.14);
          context.stroke();
          context.beginPath();
          context.moveTo(x - 9, height * 0.18);
          context.lineTo(x, height * 0.1);
          context.lineTo(x + 9, height * 0.18);
          context.fill();
        }
        const cx = width * 0.76;
        const cy = height * 0.24;
        for (let index = 0; index < 3; index += 1) {
          const start = (-Math.PI / 2) + (index * ((Math.PI * 2) / 3));
          context.beginPath();
          context.arc(cx, cy, 19, start + 0.25, start + 1.7);
          context.stroke();
        }
        context.strokeStyle = "rgba(196, 164, 118, 0.9)";
        context.lineWidth = 17;
        context.beginPath();
        context.moveTo(0, height * 0.52);
        context.lineTo(width, height * 0.52);
        context.stroke();
        for (let index = 0; index < 90; index += 1) {
          context.fillStyle = `rgba(90, 64, 40, ${0.05 + (random() * 0.08)})`;
          context.fillRect(random() * width, random() * height, 1 + (random() * 4), 1 + (random() * 2));
        }
      } : undefined,
    });
  });
}

export function carrotMaps() {
  return once("carrot", () => {
    const tile = noiseTile(181);
    const outer = hex("#e27526");
    const core = hex("#f3a24a");
    return buildSurface({
      width: 128,
      normalStrength: 2,
      roughness: true,
      pixel: (u, v) => {
        const radius = Math.hypot(u - 0.5, v - 0.5) * 2;
        const ring = smoothstep(0.42, 0.5, radius) * (1 - smoothstep(0.5, 0.58, radius));
        const grain = sampleTile(tile, u * 16, v * 16);
        let color = mix(core, outer, smoothstep(0.35, 0.55, radius));
        color = shade(color, (ring * 0.12) + ((grain - 0.5) * 0.1));
        return { color, height: ring + (grain * 0.3), roughness: 0.5 };
      },
    });
  });
}

export function orangePeelMaps() {
  return once("orange-peel", () => {
    const tile = noiseTile(111);
    const base = hex("#e98a24");
    const light = hex("#f5a93b");
    const random = rng(111);
    return buildSurface({
      width: 256,
      normalStrength: 5,
      roughness: true,
      pixel: (u, v) => {
        const dimple = sampleTile(tile, u * 32, v * 32);
        const blotch = sampleTile(tile, u * 3, v * 3);
        let color = mix(base, light, blotch);
        color = shade(color, (dimple - 0.5) * 0.18);
        return { color, height: 1 - smoothstep(0.2, 0.5, dimple), roughness: 0.45 + (dimple * 0.2) };
      },
      paint: (context, width, height) => {
        for (let index = 0; index < 500; index += 1) {
          const x = random() * width;
          const y = random() * height;
          context.fillStyle = "rgba(160, 80, 10, 0.25)";
          wrapped(width, height, x, y, 3, (px, py) => {
            context.beginPath();
            context.arc(px, py, 0.8 + (random() * 1.2), 0, Math.PI * 2);
            context.fill();
          });
        }
      },
    });
  });
}
