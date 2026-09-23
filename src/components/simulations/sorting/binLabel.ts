import { Color } from "three";
import {
  canvasTexture,
  createCanvas,
  DISPLAY_FONT,
  fitText,
  once,
  roundedRect,
  TEXT_FONT,
} from "../shared/textures";
import type { BinDefinition, WasteCategory } from "./sortingBins";

function drawArrowHead(context: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - (Math.cos(angle - (Math.PI / 5)) * size), y - (Math.sin(angle - (Math.PI / 5)) * size));
  context.lineTo(x - (Math.cos(angle + (Math.PI / 5)) * size), y - (Math.sin(angle + (Math.PI / 5)) * size));
  context.closePath();
  context.fill();
}

export function drawPictogram(
  context: CanvasRenderingContext2D,
  category: WasteCategory,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = size * 0.095;

  if (category === "hazardous") {
    context.beginPath();
    context.moveTo(x, y - (size * 0.48));
    context.lineTo(x + (size * 0.48), y + (size * 0.42));
    context.lineTo(x - (size * 0.48), y + (size * 0.42));
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(x, y - (size * 0.18));
    context.lineTo(x, y + (size * 0.13));
    context.stroke();
    context.beginPath();
    context.arc(x, y + (size * 0.28), size * 0.055, 0, Math.PI * 2);
    context.fill();
  } else if (category === "organic") {
    context.beginPath();
    context.ellipse(x, y, size * 0.34, size * 0.49, Math.PI / 4, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(x - (size * 0.27), y + (size * 0.3));
    context.lineTo(x + (size * 0.28), y - (size * 0.28));
    context.stroke();
    context.beginPath();
    context.moveTo(x - (size * 0.03), y + (size * 0.04));
    context.lineTo(x - (size * 0.28), y - (size * 0.02));
    context.moveTo(x + (size * 0.09), y - (size * 0.08));
    context.lineTo(x + (size * 0.06), y - (size * 0.31));
    context.stroke();
  } else if (category === "reusable") {
    roundedRect(context, x - (size * 0.2), y - (size * 0.3), size * 0.4, size * 0.62, size * 0.08);
    context.stroke();
    context.beginPath();
    context.arc(x, y, size * 0.48, -Math.PI * 0.65, Math.PI * 0.55);
    context.stroke();
    drawArrowHead(context, x - (size * 0.08), y + (size * 0.47), Math.PI * 0.54, size * 0.2);
  } else if (category === "recyclable") {
    const radius = size * 0.38;
    for (let index = 0; index < 3; index += 1) {
      const start = (-Math.PI / 2) + (index * ((Math.PI * 2) / 3));
      const end = start + (Math.PI * 0.48);
      context.beginPath();
      context.arc(x, y, radius, start, end);
      context.stroke();
      drawArrowHead(context, x + (Math.cos(end) * radius), y + (Math.sin(end) * radius), end + (Math.PI / 2), size * 0.17);
    }
  } else {
    context.beginPath();
    context.moveTo(x - (size * 0.3), y - (size * 0.24));
    context.quadraticCurveTo(x, y - (size * 0.43), x + (size * 0.3), y - (size * 0.24));
    context.lineTo(x + (size * 0.24), y + (size * 0.4));
    context.quadraticCurveTo(x, y + (size * 0.5), x - (size * 0.24), y + (size * 0.4));
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(x - (size * 0.13), y - (size * 0.34));
    context.lineTo(x + (size * 0.13), y - (size * 0.34));
    context.stroke();
  }

  context.restore();
}

// Stiker depan tong: piktogram, nama kategori, dan tiga contoh isi. Contoh
// inilah yang membuat anak bisa mencocokkan sampah di tangannya dengan tong.
export function binLabelTexture(definition: BinDefinition) {
  return once(`bin-label-${definition.category}`, () => {
    const width = 768;
    const height = 448;
    const density = 2;
    const element = createCanvas(width * density, height * density);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    context.scale(density, density);

    roundedRect(context, 8, 8, width - 16, height - 16, 34);
    context.fillStyle = "#fffef9";
    context.fill();
    context.lineWidth = 12;
    context.strokeStyle = definition.color;
    context.stroke();

    const ink = new Color(definition.color).offsetHSL(0, 0.02, -0.2).getStyle();
    roundedRect(context, 28, 28, 170, height - 56, 26);
    context.fillStyle = new Color(definition.color).offsetHSL(0, -0.02, 0.38).getStyle();
    context.fill();
    drawPictogram(context, definition.category, 113, height / 2, 112, ink);

    context.fillStyle = ink;
    context.textBaseline = "middle";
    const lines = definition.shortLabel.toUpperCase().split(" ");
    if (lines.length === 1) {
      fitText(context, lines[0], 520, 850, 116, 58);
      context.fillText(lines[0], 222, 150);
    } else {
      lines.slice(0, 2).forEach((line, index) => {
        fitText(context, line, 520, 850, 96, 50);
        context.fillText(line, 222, 104 + (index * 96));
      });
    }

    context.fillStyle = new Color(definition.color).offsetHSL(0, 0, 0.3).getStyle();
    roundedRect(context, 222, 282, 512, 2, 1);
    context.fill();
    context.fillStyle = "#4a524e";
    context.font = `650 30px ${TEXT_FONT}`;
    context.fillText("Contoh:", 222, 318);
    const examples = definition.examples.join(" · ");
    fitText(context, examples, 512, 700, 34, 22, TEXT_FONT);
    context.fillStyle = "#2c3431";
    context.fillText(examples, 222, 364);

    const texture = canvasTexture(element, { repeat: false });
    return texture;
  });
}

// Lambang kategori yang dicetak timbul di atas tutup.
export function lidEmblemTexture(category: WasteCategory) {
  return once(`bin-emblem-${category}`, () => {
    const size = 256;
    const element = createCanvas(size);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });
    context.clearRect(0, 0, size, size);
    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.lineWidth = 10;
    context.beginPath();
    context.arc(size / 2, size / 2, 110, 0, Math.PI * 2);
    context.stroke();
    drawPictogram(context, category, size / 2, size / 2, 150, "rgba(255,255,255,0.95)");
    return canvasTexture(element, { repeat: false });
  });
}

// Papan nama stasiun pilah: logo daun, nama stasiun, dan lima lingkaran warna
// tong sebagai pengingat urutannya.
export function stationSignTexture(colors: readonly string[]) {
  return once("station-sign", () => {
    const width = 1200;
    const height = 420;
    const element = createCanvas(width, height);
    const context = element.getContext("2d");
    if (!context) return canvasTexture(element, { repeat: false });

    context.fillStyle = "#fbf7e8";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#0b5b41";
    context.fillRect(0, 0, width, 92);
    context.fillStyle = "#d7f08a";
    context.fillRect(0, 92, width, 10);

    context.fillStyle = "#f4f9e6";
    context.font = `700 44px ${DISPLAY_FONT}`;
    context.textBaseline = "middle";
    context.textAlign = "left";
    context.fillText("NYUBURKEUN PASIRTALAGA", 132, 48);
    context.fillStyle = "#d7f08a";
    context.beginPath();
    context.moveTo(58, 72);
    context.quadraticCurveTo(52, 22, 112, 18);
    context.quadraticCurveTo(116, 70, 58, 72);
    context.fill();

    context.fillStyle = "#0b4d38";
    context.font = `800 92px ${DISPLAY_FONT}`;
    context.textAlign = "center";
    context.fillText("STASIUN PILAH SAMPAH", width / 2, 196);
    context.fillStyle = "#4c6258";
    context.font = `600 34px ${TEXT_FONT}`;
    context.fillText("Pilah dari rumah, olah bersama", width / 2, 262);

    colors.forEach((color, index) => {
      const x = (width / 2) + ((index - 2) * 120);
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, 346, 34, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(0,0,0,0.12)";
      context.lineWidth = 4;
      context.stroke();
    });

    return canvasTexture(element, { repeat: false });
  });
}
