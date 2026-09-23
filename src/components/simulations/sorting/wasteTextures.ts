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
  smoothstep,
  TEXT_FONT,
} from "../shared/textures";

// Tekstur benda sampah pada permainan pilah: koran, label toples, pembungkus
// baterai, motif popok, tisu, dan sablon tas kain. Semuanya dilukis di kanvas.

function paperGrain(context: CanvasRenderingContext2D, width: number, height: number, seed: number, alpha = 0.06) {
  const random = rng(seed);
  for (let index = 0; index < width * height * 0.02; index += 1) {
    const tone = random() > 0.5 ? 255 : 0;
    context.fillStyle = `rgba(${tone}, ${tone}, ${tone}, ${alpha * random()})`;
    context.fillRect(random() * width, random() * height, 1 + random(), 1 + random());
  }
}

// Halaman depan koran desa. Judulnya sengaja soal memilah sampah.
export function newsprintTexture() {
  return once("newsprint", () => {
    const size = 512;
    const element = createCanvas(size, Math.round(size * 0.68));
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    const { width, height } = element;
    const random = rng(21);

    context.fillStyle = "#ebe6d8";
    context.fillRect(0, 0, width, height);
    paperGrain(context, width, height, 21, 0.08);

    context.fillStyle = "#1d2422";
    context.font = `800 40px ${DISPLAY_FONT}`;
    context.textBaseline = "top";
    context.fillText("KABAR PASIRTALAGA", 24, 16);
    context.fillRect(24, 64, width - 48, 3);
    context.font = `600 12px ${TEXT_FONT}`;
    context.fillStyle = "#444a47";
    context.fillText("EDISI MINGGU  ·  HARGA Rp2.000", 24, 72);
    context.fillRect(24, 90, width - 48, 1);

    context.fillStyle = "#1d2422";
    context.font = `800 26px ${DISPLAY_FONT}`;
    context.fillText("Warga Mulai Memilah", 24, 100);
    context.fillText("Sampah dari Rumah", 24, 130);

    // Foto berita: blok abu-abu dengan bentuk samar orang dan tong.
    const photoX = width * 0.58;
    context.fillStyle = "#8f9591";
    context.fillRect(photoX, 100, width - photoX - 24, 120);
    context.fillStyle = "#6b716d";
    context.fillRect(photoX + 20, 160, 40, 60);
    context.fillRect(photoX + 76, 150, 40, 70);
    context.fillStyle = "#a9aeaa";
    context.beginPath();
    context.arc(photoX + 150, 150, 18, 0, Math.PI * 2);
    context.fill();
    context.fillRect(photoX + 135, 170, 30, 50);

    const lines = (x: number, y: number, w: number, count: number) => {
      for (let index = 0; index < count; index += 1) {
        context.fillStyle = `rgba(40, 44, 42, ${0.55 + (random() * 0.25)})`;
        const lineWidth = index % 7 === 6 ? w * (0.4 + (random() * 0.3)) : w;
        context.fillRect(x, y + (index * 9), lineWidth, 4);
      }
    };
    lines(24, 170, width * 0.24, 17);
    lines(24 + (width * 0.27), 170, width * 0.24, 17);
    lines(photoX, 232, width - photoX - 24, 11);

    return canvasTexture(element, { repeat: false });
  });
}

export function jarLabelTexture() {
  return once("jar-label", () => {
    const element = createCanvas(512, 200);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    const { width, height } = element;

    context.fillStyle = "#fbf4e2";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#c8452f";
    context.fillRect(0, 0, width, 22);
    context.fillRect(0, height - 22, width, 22);
    context.fillStyle = "#2f7a4a";
    for (let x = 0; x < width; x += 26) {
      context.beginPath();
      context.arc(x + 13, 11, 5, 0, Math.PI * 2);
      context.arc(x + 13, height - 11, 5, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#7a2c1d";
    context.font = `800 52px ${DISPLAY_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("SELAI NANAS", width / 2, height / 2 - 8);
    context.font = `600 20px ${TEXT_FONT}`;
    context.fillStyle = "#6b5a44";
    context.fillText("buatan rumah · 250 g", width / 2, height / 2 + 36);
    paperGrain(context, width, height, 31, 0.05);
    return canvasTexture(element, { repeat: false });
  });
}

// Pembungkus baterai: u melingkar, v sepanjang badan. Tanpa merek, hanya tanda
// kutub, tegangan, dan peringatan jangan dibuang sembarangan.
export function batteryWrapTexture() {
  return once("battery-wrap", () => {
    const element = createCanvas(512, 256);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    const { width, height } = element;

    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#1f2226");
    gradient.addColorStop(0.62, "#1f2226");
    gradient.addColorStop(0.62, "#d64a24");
    gradient.addColorStop(1, "#e2632c");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#e8e2d2";
    context.fillRect(0, height * 0.6, width, 6);

    context.save();
    context.translate(width * 0.3, height * 0.32);
    context.fillStyle = "#f2efe6";
    context.font = `800 64px ${DISPLAY_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("1.5V  AA", 0, 0);
    context.restore();
    context.fillStyle = "#f7d34a";
    context.font = `800 52px ${DISPLAY_FONT}`;
    context.fillText("+", width * 0.62, height * 0.36);
    context.fillStyle = "#fff3e8";
    context.font = `700 22px ${TEXT_FONT}`;
    context.fillText("JANGAN DIBUANG KE TEMPAT SAMPAH BIASA", 20, height * 0.82);
    return canvasTexture(element, { repeat: false });
  });
}

export function diaperPrintTexture() {
  return once("diaper-print", () => {
    const element = createCanvas(256, 256);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element);
    const random = rng(41);
    context.fillStyle = "#f7f5ef";
    context.fillRect(0, 0, 256, 256);
    const colors = ["#9fd3e6", "#f5c3cf", "#c9e3a5", "#f6dc8f"];
    for (let index = 0; index < 34; index += 1) {
      const x = random() * 256;
      const y = random() * 256;
      context.fillStyle = colors[index % colors.length];
      context.beginPath();
      if (index % 3 === 0) {
        context.arc(x, y, 7, 0, Math.PI * 2);
      } else {
        for (let point = 0; point < 5; point += 1) {
          const angle = (point / 5) * Math.PI * 2 - (Math.PI / 2);
          context.lineTo(x + (Math.cos(angle) * 8), y + (Math.sin(angle) * 8));
          const inner = angle + (Math.PI / 5);
          context.lineTo(x + (Math.cos(inner) * 3.5), y + (Math.sin(inner) * 3.5));
        }
      }
      context.fill();
    }
    paperGrain(context, 256, 256, 42, 0.05);
    return canvasTexture(element);
  });
}

export function tissueMaps() {
  return once("tissue", () => {
    const tile = noiseTile(221);
    const white = hex("#f6f3ec");
    const stain = hex("#b39a78");
    return buildSurface({
      width: 256,
      normalStrength: 1.4,
      roughness: true,
      pixel: (u, v) => {
        const emboss = (Math.sin(u * Math.PI * 48) * Math.sin(v * Math.PI * 48) * 0.5) + 0.5;
        const dirty = smoothstep(0.62, 0.8, sampleTile(tile, u * 2, v * 2));
        const fiber = sampleTile(tile, u * 32, v * 32);
        const color = mix(white, stain, dirty * 0.75);
        return { color: mix(color, hex("#e9e3d6"), fiber * 0.3), height: (emboss * 0.4) + (fiber * 0.3), roughness: 0.95 };
      },
    });
  });
}

// Sablon di tas kain: logo daun Nyuburkeun dan ajakan membawa tas sendiri.
export function totePrintTexture() {
  return once("tote-print", () => {
    const element = createCanvas(256, 256);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    context.clearRect(0, 0, 256, 256);
    context.fillStyle = "rgba(10, 101, 72, 0.92)";
    context.beginPath();
    context.arc(128, 104, 64, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e8f3c9";
    context.beginPath();
    context.moveTo(96, 136);
    context.quadraticCurveTo(92, 76, 160, 70);
    context.quadraticCurveTo(164, 132, 96, 136);
    context.fill();
    context.strokeStyle = "rgba(10, 101, 72, 0.92)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(100, 132);
    context.quadraticCurveTo(122, 108, 150, 82);
    context.stroke();
    context.fillStyle = "rgba(10, 101, 72, 0.92)";
    context.font = `800 26px ${DISPLAY_FONT}`;
    context.textAlign = "center";
    context.fillText("BAWA TAS", 128, 204);
    context.fillText("SENDIRI", 128, 232);
    return canvasTexture(element, { repeat: false });
  });
}
