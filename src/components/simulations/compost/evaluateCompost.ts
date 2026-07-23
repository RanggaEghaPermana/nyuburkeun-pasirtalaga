export type CompostCondition =
  | "empty"
  | "needs-greens"
  | "needs-browns"
  | "too-wet"
  | "too-dry"
  | "needs-air"
  | "balanced";

export type CompostTone = "neutral" | "attention" | "success";

export type CompostMaterial =
  | "vegetable-scraps"
  | "fruit-peels"
  | "dry-leaves"
  | "torn-cardboard";

export type CompostBatch = {
  id: number;
  material: CompostMaterial;
  category: "green" | "brown";
};

export type CompostLastAction =
  | CompostMaterial
  | "water"
  | "mix"
  | "reset";

export type CompostMixReport = {
  sequence: number;
  layersMixed: number;
  moistureBefore: number;
  moistureAfter: number;
  aerationBefore: number;
  aerationAfter: number;
};

export type CompostState = {
  greens: number;
  browns: number;
  moisture: number;
  aeration: number;
  mixed: boolean;
  mixCount: number;
  batches: CompostBatch[];
  mixedThrough: number;
  waterCount: number;
  actionId: number;
  lastAction: CompostLastAction | null;
  lastMixReport: CompostMixReport | null;
};

export type CompostEvaluation = {
  condition: CompostCondition;
  title: string;
  message: string;
  nextAction: string;
  tone: CompostTone;
  isBalanced: boolean;
  balanceLabel: string;
  moistureLabel: string;
  aerationLabel: string;
  structureLabel: string;
  readinessScore: number;
  ratioScore: number;
  moistureScore: number;
  aerationScore: number;
};

const DRY_LIMIT = 35;
const WET_LIMIT = 70;
const MINIMUM_BROWN_TO_GREEN_RATIO = 1.5;
const MAXIMUM_BROWN_TO_GREEN_RATIO = 4;

export function createInitialCompostState(): CompostState {
  return {
    greens: 0,
    browns: 0,
    moisture: 45,
    aeration: 0,
    mixed: false,
    mixCount: 0,
    batches: [],
    mixedThrough: 0,
    waterCount: 0,
    actionId: 0,
    lastAction: null,
    lastMixReport: null,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function describeMoisture(moisture: number): string {
  if (moisture < DRY_LIMIT) {
    return "Terlalu kering";
  }

  if (moisture > WET_LIMIT) {
    return "Terlalu basah";
  }

  return "Lembap seperti spons diperas";
}

function describeBalance(greens: number, browns: number): string {
  if (greens === 0 && browns === 0) {
    return "Belum ada bahan";
  }

  if (greens === 0) {
    return "Belum ada bahan hijau";
  }

  if (browns === 0) {
    return "Belum ada bahan cokelat";
  }

  const ratio = browns / greens;

  if (ratio < MINIMUM_BROWN_TO_GREEN_RATIO) {
    return "Bahan hijau terlalu banyak";
  }

  if (ratio > MAXIMUM_BROWN_TO_GREEN_RATIO) {
    return "Bahan cokelat terlalu banyak";
  }

  return "Bahan hijau dan cokelat cukup seimbang";
}

function calculateRatioScore(greens: number, browns: number): number {
  if (greens === 0 || browns === 0) return 0;

  const ratio = browns / greens;
  if (ratio < MINIMUM_BROWN_TO_GREEN_RATIO) {
    return clampScore((ratio / MINIMUM_BROWN_TO_GREEN_RATIO) * 100);
  }
  if (ratio > MAXIMUM_BROWN_TO_GREEN_RATIO) {
    return clampScore((MAXIMUM_BROWN_TO_GREEN_RATIO / ratio) * 100);
  }
  return 100;
}

function calculateMoistureScore(moisture: number): number {
  if (moisture >= DRY_LIMIT && moisture <= WET_LIMIT) return 100;
  const distance = moisture < DRY_LIMIT ? DRY_LIMIT - moisture : moisture - WET_LIMIT;
  return clampScore(100 - distance * 4);
}

function describeAeration(aeration: number): string {
  if (aeration < 35) return "Rendah · perlu diaduk";
  if (aeration < 65) return "Mulai terbuka";
  return "Baik · udara tersebar";
}

function describeStructure(state: CompostState): string {
  if (state.batches.length === 0) return "Belum ada campuran";

  const unmixedLayers = Math.max(0, state.batches.length - state.mixedThrough);
  if (state.mixed && unmixedLayers === 0) return "Tercampur merata";
  if (state.mixedThrough > 0) return `${unmixedLayers} lapisan baru belum diaduk`;
  return `${state.batches.length} lapisan belum diaduk`;
}

export function evaluateCompost(state: CompostState): CompostEvaluation {
  const moistureLabel = describeMoisture(state.moisture);
  const balanceLabel = describeBalance(state.greens, state.browns);
  const totalMaterials = state.greens + state.browns;
  const ratioScore = calculateRatioScore(state.greens, state.browns);
  const moistureScore = calculateMoistureScore(state.moisture);
  const aerationScore = clampScore(state.aeration);
  const readinessScore = totalMaterials === 0
    ? 0
    : clampScore(ratioScore * 0.4 + moistureScore * 0.3 + aerationScore * 0.3);
  const sharedMetrics = {
    balanceLabel,
    moistureLabel,
    aerationLabel: describeAeration(state.aeration),
    structureLabel: describeStructure(state),
    readinessScore,
    ratioScore,
    moistureScore,
    aerationScore,
  };

  if (totalMaterials === 0) {
    return {
      condition: "empty",
      title: "Komposter masih kosong",
      message: "Mulai dengan bahan hijau, lalu tutupi dengan bahan cokelat.",
      nextAction: "Tambahkan satu bagian bahan hijau.",
      tone: "neutral",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  if (state.greens === 0) {
    return {
      condition: "needs-greens",
      title: "Butuh bahan hijau",
      message: "Sekarang baru ada daun kering. Tambahkan sisa sayur atau kulit buah.",
      nextAction: "Tambahkan sisa sayur atau kulit buah.",
      tone: "attention",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  if (state.browns === 0 || state.browns / state.greens < MINIMUM_BROWN_TO_GREEN_RATIO) {
    return {
      condition: "needs-browns",
      title: "Bahan hijau terlalu banyak",
      message: "Terlalu banyak bahan hijau dapat membuat campuran becek dan berbau.",
      nextAction: "Tambahkan daun kering atau bahan cokelat lain.",
      tone: "attention",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  if (state.browns / state.greens > MAXIMUM_BROWN_TO_GREEN_RATIO) {
    return {
      condition: "needs-greens",
      title: "Bahan cokelat terlalu banyak",
      message: "Terlalu banyak daun kering membuat kompos lebih lama terurai.",
      nextAction: "Tambahkan sedikit bahan hijau, lalu periksa kembali kelembapannya.",
      tone: "attention",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  if (state.moisture > WET_LIMIT) {
    return {
      condition: "too-wet",
      title: "Campuran terlalu basah",
      message: "Terlalu banyak air membuat udara sulit masuk dan campuran bisa berbau.",
      nextAction: "Tambahkan bahan cokelat, kemudian aduk perlahan.",
      tone: "attention",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  if (state.moisture < DRY_LIMIT) {
    return {
      condition: "too-dry",
      title: "Campuran terlalu kering",
      message: "Makhluk kecil pengurai membutuhkan air agar bahan bisa terurai.",
      nextAction: "Tambahkan air sedikit demi sedikit, jangan sampai tergenang.",
      tone: "attention",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  if (!state.mixed || state.mixedThrough < state.batches.length || state.aeration < 65) {
    return {
      condition: "needs-air",
      title: "Campuran perlu udara",
      message: state.mixedThrough > 0
        ? "Ada lapisan baru di atas campuran lama. Udara belum tersebar merata ke seluruh bahan."
        : "Jumlah bahannya sudah pas, tetapi lapisannya belum tercampur dan rongga udaranya masih sedikit.",
      nextAction: "Aduk untuk meratakan bahan dan membuka ruang udara di antaranya.",
      tone: "neutral",
      isBalanced: false,
      ...sharedMetrics,
    };
  }

  return {
    condition: "balanced",
    title: "Campuranmu sudah pas!",
    message: "Jumlah bahan, air, dan udaranya sudah cocok untuk mulai membuat kompos.",
    nextAction: "Terus periksa bau, panas, dan kelembapannya.",
    tone: "success",
    isBalanced: true,
    ...sharedMetrics,
  };
}
