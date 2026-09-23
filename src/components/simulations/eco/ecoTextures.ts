import {
  buildSurface,
  canvasTexture,
  createCanvas,
  DISPLAY_FONT,
  hex,
  mix,
  noiseTile,
  once,
  rng,
  sampleTile,
  shade,
  smoothstep,
  TEXT_FONT,
} from "../shared/textures";

// Skala takaran yang tercetak di sisi wadah: satu garis per bagian, angka
// tiap lima bagian, dan garis merah batas isi 80% supaya aturan "sisakan
// seperlima untuk gas" terlihat langsung pada wadahnya. Pita cetaknya hanya
// menutupi dinding yang lurus (`from`..`to`), jadi garis di bawahnya dilewati.
type GraduationOptions = {
  from: number;
  to: number;
  bottom: number;
  part: number;
  capacity: number;
  limit: number;
};

export function graduationTexture({ from, to, bottom, part, capacity, limit }: GraduationOptions) {
  return once(`eco-graduation-${from}-${to}-${bottom}-${part}-${capacity}-${limit}`, () => {
    const width = 256;
    const height = 1024;
    const element = createCanvas(width, height);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });

    const toPixel = (y: number) => (1 - ((y - from) / (to - from))) * height;
    const ink = "rgba(28, 64, 50, 0.9)";
    context.lineCap = "round";

    for (let index = 0; index <= capacity; index += 1) {
      const worldY = bottom + (index * part);
      if (worldY < from + 0.01 || worldY > to - 0.01) continue;
      const y = toPixel(worldY);
      const major = index % 5 === 0;
      context.strokeStyle = ink;
      context.lineWidth = major ? 8 : 5;
      context.beginPath();
      context.moveTo(34, y);
      context.lineTo(major ? 140 : 96, y);
      context.stroke();
      if (major) {
        context.fillStyle = ink;
        context.font = `700 54px ${DISPLAY_FONT}`;
        context.textBaseline = "middle";
        context.fillText(String(index), 152, y + 2);
      }
    }

    const limitY = toPixel(bottom + (limit * part));
    context.strokeStyle = "rgba(206, 62, 46, 0.95)";
    context.lineWidth = 10;
    context.setLineDash([24, 14]);
    context.beginPath();
    context.moveTo(6, limitY);
    context.lineTo(width - 6, limitY);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(206, 62, 46, 0.95)";
    context.font = `800 36px ${TEXT_FONT}`;
    context.textBaseline = "alphabetic";
    context.fillText("BATAS ISI", 16, limitY - 22);

    return canvasTexture(element, { repeat: false });
  });
}

// Selotip kertas yang ditempel setelah wadah ditutup, berisi tanggal mulai dan
// tanggal siap dibuka seperti yang dianjurkan panduan.
export function dateTapeTexture() {
  return once("eco-date-tape", () => {
    const width = 512;
    const height = 256;
    const element = createCanvas(width, height);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    const random = rng(3);

    context.fillStyle = "#efe2bd";
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 1400; index += 1) {
      context.fillStyle = `rgba(${150 + (random() * 60)}, ${130 + (random() * 50)}, ${90 + (random() * 40)}, 0.12)`;
      context.fillRect(random() * width, random() * height, 2, 1 + (random() * 3));
    }
    // Tepi sobek di kiri dan kanan.
    context.fillStyle = "rgba(0,0,0,0)";
    context.globalCompositeOperation = "destination-out";
    for (const x of [0, width]) {
      for (let y = 0; y < height; y += 10) {
        context.beginPath();
        context.arc(x, y + (random() * 6), 4 + (random() * 5), 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#24463a";
    context.font = `700 44px ${DISPLAY_FONT}`;
    context.fillText("ECO ENZYME", 36, 70);
    context.fillStyle = "#3a3a36";
    context.font = `600 34px ${TEXT_FONT}`;
    context.fillText("Mulai: hari ke-0", 36, 136);
    context.fillText("Buka: hari ke-90", 36, 190);
    context.strokeStyle = "rgba(36, 70, 58, 0.5)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(36, 88);
    context.lineTo(330, 88);
    context.stroke();

    return canvasTexture(element, { repeat: false });
  });
}

export function pineappleSkinMaps() {
  return once("pineapple-skin", () => {
    const tile = noiseTile(121);
    const ridge = hex("#8a6a28");
    const eye = hex("#5d4418");
    const flesh = hex("#d8b54a");
    const green = hex("#7f8a36");
    const cells = 6;
    return buildSurface({
      width: 256,
      normalStrength: 7,
      roughness: true,
      pixel: (u, v) => {
        // Kisi berlian: dua sumbu diagonal.
        const a = ((u + v) * cells) % 1;
        const b = ((u - v + 1) * cells) % 1;
        const edge = Math.min(a, 1 - a, b, 1 - b);
        const center = 1 - (Math.hypot(a - 0.5, b - 0.5) * 2);
        const noise = sampleTile(tile, u * 8, v * 8);
        let color = mix(ridge, flesh, smoothstep(0.02, 0.2, edge) * 0.6);
        color = mix(color, green, smoothstep(0.55, 0.85, noise) * 0.45);
        color = mix(color, eye, smoothstep(0.55, 0.85, center));
        return { color, height: smoothstep(0, 0.25, edge) - (smoothstep(0.6, 0.9, center) * 0.5), roughness: 0.75 };
      },
    });
  });
}

export function palmSugarMaps() {
  return once("palm-sugar", () => {
    const tile = noiseTile(131);
    const dark = hex("#5a2f12");
    const caramel = hex("#9b5a24");
    return buildSurface({
      width: 256,
      normalStrength: 3,
      roughness: true,
      pixel: (u, v) => {
        const crystals = sampleTile(tile, u * 48, v * 48);
        const swirl = sampleTile(tile, u * 4, v * 4);
        let color = mix(dark, caramel, swirl * 0.8);
        color = shade(color, (crystals - 0.5) * 0.3);
        return { color, height: crystals, roughness: 0.55 + (crystals * 0.3) };
      },
    });
  });
}

export function leafyScrapMaps() {
  return once("leafy-scrap", () => {
    const tile = noiseTile(141);
    const light = hex("#b8d27a");
    const dark = hex("#6f9c3e");
    return buildSurface({
      width: 256,
      normalStrength: 4,
      roughness: true,
      pixel: (u, v) => {
        const veins = Math.abs(Math.sin((u * 18) + (sampleTile(tile, u * 2, v * 2) * 4)));
        const mottle = sampleTile(tile, u * 6, v * 6);
        let color = mix(dark, light, mottle);
        color = mix(color, hex("#e4efc0"), smoothstep(0.93, 1, veins) * 0.6);
        return { color, height: (1 - veins) * 0.3 + mottle * 0.3, roughness: 0.55 };
      },
    });
  });
}
