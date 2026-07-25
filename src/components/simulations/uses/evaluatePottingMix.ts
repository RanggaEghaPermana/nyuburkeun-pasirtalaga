export type MixMaterial = "soil" | "compost" | "sand";
export type Watering = "none" | "plain" | "eco-diluted" | "eco-strong";

export type MixState = {
  soil: number;
  compost: number;
  sand: number;
  layers: { id: number; material: MixMaterial }[];
  watering: Watering;
  actionId: number;
};

export const MIX_CAPACITY = 12;
export const MIX_MIN_FILL = 9;

export const MIX_TARGET = {
  compost: { min: 18, max: 34 },
  sand: { min: 5, max: 22 },
  soil: { min: 48, max: 74 },
};

export function createInitialMixState(): MixState {
  return { soil: 0, compost: 0, sand: 0, layers: [], watering: "none", actionId: 0 };
}

export type MixEvaluation = {
  tone: "neutral" | "success" | "attention";
  title: string;
  message: string;
  nextAction: string;
  total: number;
  compostShare: number;
  sandShare: number;
  soilShare: number;
  mixScore: number;
  mixLabel: string;
  drainageLabel: string;
  wateringLabel: string;
  plantHealth: number;
  isReady: boolean;
};

function share(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// Nilai satu bahan: penuh selama berada di rentang anjuran, lalu turun sebanding
// dengan seberapa jauh ia melewati batas.
function bandScore(value: number, { min, max }: { min: number; max: number }) {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 1 - (distance / 34));
}

const WATERING_LABEL: Record<Watering, string> = {
  none: "Belum disiram",
  plain: "Air biasa",
  "eco-diluted": "Eco enzyme yang sudah diencerkan",
  "eco-strong": "Eco enzyme pekat",
};

export function evaluatePottingMix(state: MixState): MixEvaluation {
  const total = state.soil + state.compost + state.sand;
  const compostShare = share(state.compost, total);
  const sandShare = share(state.sand, total);
  const soilShare = share(state.soil, total);

  const mixScore = Math.round((
    (bandScore(compostShare, MIX_TARGET.compost) * 0.45)
    + (bandScore(soilShare, MIX_TARGET.soil) * 0.35)
    + (bandScore(sandShare, MIX_TARGET.sand) * 0.2)
  ) * 100);

  const filledEnough = total >= MIX_MIN_FILL;
  const wateringPenalty = state.watering === "eco-strong" ? 45 : 0;
  const wateringBonus = state.watering === "plain" || state.watering === "eco-diluted" ? 8 : 0;
  const plantHealth = Math.max(0, Math.min(100, Math.round(
    (mixScore * (filledEnough ? 1 : 0.7)) - wateringPenalty + wateringBonus,
  )));

  const isReady = filledEnough
    && mixScore >= 82
    && state.watering !== "none"
    && state.watering !== "eco-strong";

  const mixLabel = total === 0
    ? "Pot masih kosong"
    : mixScore >= 82
      ? "Campuran seimbang"
      : mixScore >= 55
        ? "Mendekati seimbang"
        : "Belum seimbang";

  const drainageLabel = total === 0
    ? "Belum bisa dinilai"
    : sandShare < MIX_TARGET.sand.min
      ? "Air mudah menggenang"
      : sandShare > MIX_TARGET.sand.max
        ? "Terlalu berpasir, air cepat habis"
        : "Air mengalir dengan baik";

  const base = {
    total,
    compostShare,
    sandShare,
    soilShare,
    mixScore,
    mixLabel,
    drainageLabel,
    wateringLabel: WATERING_LABEL[state.watering],
    plantHealth,
    isReady,
  };

  if (total === 0) {
    return {
      ...base,
      tone: "neutral",
      title: "Potnya masih kosong",
      message: "Kompos matang dipakai sebagai campuran, bukan sebagai satu-satunya isi pot.",
      nextAction: "Mulai dengan tanah sebagai bagian terbanyak.",
    };
  }

  if (compostShare > 45) {
    return {
      ...base,
      tone: "attention",
      title: "Komposnya terlalu banyak",
      message: "Pot yang diisi kompos murni menahan terlalu banyak air dan membuat akar sulit bernapas.",
      nextAction: "Tambah tanah supaya kompos tinggal sekitar seperempat bagian.",
    };
  }

  if (state.compost === 0) {
    return {
      ...base,
      tone: "attention",
      title: "Belum ada komposnya",
      message: "Kompos matang membuat tanah lebih gembur dan mengembalikan nutrisi ke tanaman.",
      nextAction: "Tambahkan kompos matang sedikit, sekitar seperempat dari isi pot.",
    };
  }

  if (!filledEnough) {
    return {
      ...base,
      tone: "neutral",
      title: "Potnya belum cukup terisi",
      message: `Baru ${total} bagian dari ${MIX_CAPACITY}. Akar butuh media yang cukup untuk tumbuh.`,
      nextAction: `Tambah bahan sampai minimal ${MIX_MIN_FILL} bagian.`,
    };
  }

  if (mixScore < 82) {
    const hint = compostShare < MIX_TARGET.compost.min
      ? "Tambah kompos matang sedikit."
      : sandShare < MIX_TARGET.sand.min
        ? "Tambah sedikit pasir agar air tidak menggenang."
        : sandShare > MIX_TARGET.sand.max
          ? "Pasirnya berlebih. Tambah tanah."
          : "Tambah tanah supaya porsinya kembali seimbang.";

    return {
      ...base,
      tone: "attention",
      title: "Campurannya belum seimbang",
      message: `Sekarang tanah ${soilShare}%, kompos ${compostShare}%, pasir ${sandShare}%. Sasarannya kompos sekitar seperempat dan tanah paling banyak.`,
      nextAction: hint,
    };
  }

  if (state.watering === "eco-strong") {
    return {
      ...base,
      tone: "attention",
      title: "Eco enzyme pekat menyakiti tanaman",
      message: "Eco enzyme yang belum diencerkan terlalu asam untuk akar. Daun bisa menguning dan tanaman melemah.",
      nextAction: "Siram dengan air biasa, atau pakai eco enzyme yang sudah diencerkan dan coba pada satu tanaman dulu.",
    };
  }

  if (state.watering === "none") {
    return {
      ...base,
      tone: "neutral",
      title: "Campurannya sudah seimbang",
      message: "Porsi tanah, kompos, dan pasirnya sudah berada di rentang yang baik.",
      nextAction: "Siram supaya media tanamnya lembap dan siap dipakai.",
    };
  }

  return {
    ...base,
    tone: "success",
    title: "Media tanamnya siap dipakai",
    message: "Kompos bercampur rata dengan tanah, air mengalir dengan baik, dan penyiramannya aman untuk tanaman.",
    nextAction: "Tanam bibitmu, lalu tambahkan kompos lagi sedikit saja beberapa bulan kemudian.",
  };
}
