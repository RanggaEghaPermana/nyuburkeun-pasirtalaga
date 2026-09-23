export type WasteCategory =
  | "hazardous"
  | "organic"
  | "reusable"
  | "recyclable"
  | "residue";

export type BinDefinition = {
  category: WasteCategory;
  label: string;
  shortLabel: string;
  color: string;
  contrastText: string;
  examples: readonly string[];
  // Ke mana isi tong ini pergi setelah dipilah.
  destination: string;
};

export const WASTE_BIN_MOUTH_POSITION = [0, 1.92, 0.02] as const;

const hazardousBin: BinDefinition = {
  category: "hazardous",
  label: "Sampah Berbahaya (B3)",
  shortLabel: "B3 Berbahaya",
  color: "#d94b3d",
  contrastText: "#ffffff",
  examples: ["baterai", "lampu", "aerosol"],
  destination: "Disimpan terpisah, lalu diserahkan ke tempat pengumpulan sampah B3.",
};

const organicBin: BinDefinition = {
  category: "organic",
  label: "Mudah Terurai",
  shortLabel: "Organik",
  color: "#238b57",
  contrastText: "#ffffff",
  examples: ["sisa makanan", "daun", "kulit buah"],
  destination: "Diolah menjadi kompos, lalu kembali menyuburkan tanah.",
};

const reusableBin: BinDefinition = {
  category: "reusable",
  label: "Dapat Digunakan Ulang",
  shortLabel: "Guna Ulang",
  color: "#f2b731",
  contrastText: "#17362a",
  examples: ["botol utuh", "wadah", "pakaian"],
  destination: "Dicuci lalu dipakai lagi, atau diberikan kepada yang membutuhkan.",
};

const recyclableBin: BinDefinition = {
  category: "recyclable",
  label: "Dapat Didaur Ulang",
  shortLabel: "Daur Ulang",
  color: "#287fa8",
  contrastText: "#ffffff",
  examples: ["kertas", "kaleng", "plastik bersih"],
  destination: "Dikumpulkan ke bank sampah, lalu diolah menjadi barang baru.",
};

const residueBin: BinDefinition = {
  category: "residue",
  label: "Sampah Lainnya",
  shortLabel: "Lainnya",
  color: "#59615e",
  contrastText: "#ffffff",
  examples: ["tisu kotor", "popok", "puntung rokok"],
  destination: "Diangkut ke tempat pemrosesan akhir karena tidak bisa diolah lagi.",
};

/** Ordered for the familiar green-yellow-blue-red-grey Indonesian sorting station. */
export const binDefinitions = [
  organicBin,
  reusableBin,
  recyclableBin,
  hazardousBin,
  residueBin,
] as const satisfies readonly BinDefinition[];

export const binDefinitionsByCategory: Readonly<Record<WasteCategory, BinDefinition>> = {
  hazardous: hazardousBin,
  organic: organicBin,
  reusable: reusableBin,
  recyclable: recyclableBin,
  residue: residueBin,
};
