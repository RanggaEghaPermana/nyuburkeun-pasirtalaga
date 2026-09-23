import {
  canvasTexture,
  createCanvas,
  DISPLAY_FONT,
  fitText,
  once,
  rng,
  TEXT_FONT,
} from "../shared/textures";

// Taplak batik motif kawung: empat kelopak lonjong mengelilingi titik tengah,
// dengan warna hijau tua dan krem yang sama dengan identitas situs. Petaknya
// bisa diulang tanpa sambungan.
export function batikKawungTexture() {
  return once("batik-kawung", () => {
    const size = 512;
    const element = createCanvas(size);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element);
    const random = rng(51);
    const cells = 4;
    const cell = size / cells;

    context.fillStyle = "#f1e7cc";
    context.fillRect(0, 0, size, size);

    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const cx = (column * cell) + (cell / 2);
        const cy = (row * cell) + (cell / 2);
        for (let petal = 0; petal < 4; petal += 1) {
          const angle = (Math.PI / 4) + (petal * (Math.PI / 2));
          const px = cx + (Math.cos(angle) * cell * 0.27);
          const py = cy + (Math.sin(angle) * cell * 0.27);
          context.save();
          context.translate(px, py);
          context.rotate(angle);
          context.fillStyle = "#0e5a41";
          context.beginPath();
          context.ellipse(0, 0, cell * 0.26, cell * 0.15, 0, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#6f3f1f";
          context.beginPath();
          context.ellipse(0, 0, cell * 0.17, cell * 0.075, 0, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#f1e7cc";
          context.beginPath();
          context.arc(cell * 0.12, 0, cell * 0.025, 0, Math.PI * 2);
          context.fill();
          context.restore();
        }
        context.fillStyle = "#c69a3c";
        context.beginPath();
        context.arc(cx, cy, cell * 0.05, 0, Math.PI * 2);
        context.fill();
      }
    }

    // Retak lilin tipis khas batik tulis.
    context.strokeStyle = "rgba(14, 90, 65, 0.18)";
    context.lineWidth = 1;
    for (let index = 0; index < 90; index += 1) {
      let x = random() * size;
      let y = random() * size;
      context.beginPath();
      context.moveTo(x, y);
      for (let step = 0; step < 6; step += 1) {
        x += (random() - 0.5) * 30;
        y += (random() - 0.5) * 30;
        context.lineTo(x, y);
      }
      context.stroke();
    }

    const texture = canvasTexture(element);
    return texture;
  });
}

// Papan kapur harga. Dilukis ulang tiap kali harga berubah, jadi tidak disimpan
// dalam cache global.
export function chalkboardCanvas(price: string, label: string) {
  const element = createCanvas(512, 400);
  const context = element.getContext("2d");
  if (!context) return element;
  const random = rng(price.length * 17);
  const gradient = context.createLinearGradient(0, 0, 512, 400);
  gradient.addColorStop(0, "#23332c");
  gradient.addColorStop(1, "#1b2923");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 400);
  for (let index = 0; index < 220; index += 1) {
    context.fillStyle = `rgba(255,255,255,${0.02 + (random() * 0.04)})`;
    context.beginPath();
    context.ellipse(random() * 512, random() * 400, 10 + (random() * 40), 3 + (random() * 8), random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#f4f1e4";
  context.textAlign = "center";
  context.textBaseline = "middle";
  fitText(context, label, 440, 600, 34, 20, TEXT_FONT);
  context.fillText(label, 256, 78);
  context.strokeStyle = "rgba(215, 240, 138, 0.8)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(110, 118);
  context.quadraticCurveTo(256, 108, 402, 118);
  context.stroke();
  context.fillStyle = "#d7f08a";
  fitText(context, price, 450, 800, 118, 60, DISPLAY_FONT);
  context.fillText(price, 256, 224);
  context.fillStyle = "rgba(244, 241, 228, 0.85)";
  context.font = `600 28px ${TEXT_FONT}`;
  context.fillText("produk lokal Pasirtalaga", 256, 330);
  return element;
}

export function infoTagTexture(title: string, lines: readonly string[]) {
  return once(`info-tag-${title}`, () => {
    const element = createCanvas(320, 420);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    context.fillStyle = "#fbf6e9";
    context.fillRect(0, 0, 320, 420);
    context.fillStyle = "#0b5b41";
    context.fillRect(0, 0, 320, 70);
    context.fillStyle = "#fbf6e9";
    context.beginPath();
    context.arc(160, 34, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#0b4d38";
    context.font = `800 30px ${DISPLAY_FONT}`;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(title, 22, 90);
    context.font = `600 20px ${TEXT_FONT}`;
    lines.forEach((line, index) => {
      const y = 146 + (index * 62);
      context.fillStyle = "#0e5a41";
      context.fillText(line.split(":")[0].toUpperCase(), 22, y);
      context.fillStyle = "#3c4642";
      context.font = `500 19px ${TEXT_FONT}`;
      context.fillText(line.split(":")[1]?.trim() ?? "", 22, y + 26);
      context.font = `600 20px ${TEXT_FONT}`;
    });
    return canvasTexture(element, { repeat: false });
  });
}

export function canopyStripeTexture() {
  return once("canopy-stripes", () => {
    const element = createCanvas(256, 64);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element);
    for (let index = 0; index < 8; index += 1) {
      context.fillStyle = index % 2 === 0 ? "#0e6a4b" : "#f3eedb";
      context.fillRect(index * 32, 0, 32, 64);
    }
    return canvasTexture(element);
  });
}
