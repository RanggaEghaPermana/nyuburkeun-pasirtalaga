import type { WasteCategory } from "./sortingBins";

export type WasteShape =
  | "peel"
  | "leaf"
  | "jar"
  | "tote"
  | "cardboard"
  | "newspaper"
  | "tissue"
  | "diaper"
  | "battery"
  | "bulb";

export type WasteItem = {
  id: string;
  label: string;
  category: WasteCategory;
  explanation: string;
  shape: WasteShape;
};

export const wasteItems: WasteItem[] = [
  {
    id: "banana-peel",
    label: "Kulit pisang",
    category: "organic",
    explanation: "Kulit pisang mudah terurai dan dapat dimasukkan ke kompos.",
    shape: "peel",
  },
  {
    id: "glass-jar",
    label: "Toples kaca utuh",
    category: "reusable",
    explanation: "Toples yang utuh dan bersih dapat dicuci lalu dipakai lagi.",
    shape: "jar",
  },
  {
    id: "clean-cardboard",
    label: "Kardus bersih",
    category: "recyclable",
    explanation: "Kardus yang bersih dan kering dapat dikumpulkan untuk didaur ulang.",
    shape: "cardboard",
  },
  {
    id: "dirty-tissue",
    label: "Tisu kotor",
    category: "residue",
    explanation: "Tisu kotor masuk tong sampah lainnya karena tidak dapat didaur ulang.",
    shape: "tissue",
  },
  {
    id: "used-battery",
    label: "Baterai bekas",
    category: "hazardous",
    explanation: "Baterai bekas termasuk sampah berbahaya. Jangan membongkarnya dan minta orang dewasa membawanya ke tempat pengumpulan khusus.",
    shape: "battery",
  },
  {
    id: "dry-leaf",
    label: "Daun kering",
    category: "organic",
    explanation: "Daun kering mudah terurai dan dapat menjadi bahan cokelat untuk kompos.",
    shape: "leaf",
  },
  {
    id: "cloth-tote",
    label: "Tas kain layak pakai",
    category: "reusable",
    explanation: "Tas kain yang masih bagus dapat dipakai lagi, diperbaiki, atau diberikan kepada orang lain.",
    shape: "tote",
  },
  {
    id: "old-newspaper",
    label: "Koran bekas kering",
    category: "recyclable",
    explanation: "Koran yang bersih dan kering dapat dikumpulkan untuk didaur ulang.",
    shape: "newspaper",
  },
  {
    id: "used-diaper",
    label: "Popok sekali pakai",
    category: "residue",
    explanation: "Popok bekas masuk tong sampah lainnya. Bungkus dengan rapat sebelum dibuang.",
    shape: "diaper",
  },
  {
    id: "used-bulb",
    label: "Lampu bekas",
    category: "hazardous",
    explanation: "Jangan memecahkan lampu bekas. Minta orang dewasa menyimpannya dengan aman dan membawanya ke tempat pengumpulan khusus.",
    shape: "bulb",
  },
];
