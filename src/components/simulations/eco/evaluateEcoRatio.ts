export type EcoAction = "sugar" | "scraps" | "water" | "seal" | "wait";

export type EcoState = {
  sugar: number;
  scraps: number;
  water: number;
  sealed: boolean;
  days: number;
  actionId: number;
  lastAction: EcoAction | null;
};

export const ECO_CAPACITY = 20;
export const ECO_TARGET = { sugar: 1, scraps: 3, water: 10 };
export const ECO_FERMENT_DAYS = 90;
export const ECO_DAY_STEP = 15;
export const ECO_MIN_HEADSPACE = 20;

export const ECO_LIMITS = { sugar: 4, scraps: 9, water: 14 };

export function createInitialEcoState(): EcoState {
  return {
    sugar: 0,
    scraps: 0,
    water: 0,
    sealed: false,
    days: 0,
    actionId: 0,
    lastAction: null,
  };
}

export type EcoEvaluation = {
  tone: "neutral" | "success" | "attention";
  title: string;
  message: string;
  nextAction: string;
  filled: number;
  headspace: number;
  headspaceLabel: string;
  ratioScore: number;
  ratioLabel: string;
  fermentProgress: number;
  fermentLabel: string;
  readinessScore: number;
  isBalanced: boolean;
  canSeal: boolean;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

// Skor takaran dihitung per sumbu terhadap 1 : 3 : 10 lalu dirata-ratakan,
// sehingga satu bahan yang jauh melenceng tidak tertutupi bahan lain yang tepat.
function ratioScoreOf({ sugar, scraps, water }: EcoState) {
  if (sugar === 0) return 0;

  const scrapScore = 1 - Math.min(Math.abs((scraps / sugar) - ECO_TARGET.scraps) / ECO_TARGET.scraps, 1);
  const waterScore = 1 - Math.min(Math.abs((water / sugar) - ECO_TARGET.water) / ECO_TARGET.water, 1);

  return Math.round(((scrapScore * 0.5) + (waterScore * 0.5)) * 100);
}

function ratioHint({ sugar, scraps, water }: EcoState) {
  if (sugar === 0) return "Mulai dari 1 bagian gula sebagai patokan.";

  const scrapRatio = scraps / sugar;
  const waterRatio = water / sugar;

  if (scrapRatio < ECO_TARGET.scraps - 0.4) return "Tambah sisa buah atau sayur.";
  if (scrapRatio > ECO_TARGET.scraps + 0.4) return "Sisa buah dan sayurnya berlebih. Tambah gula atau ulangi takarannya.";
  if (waterRatio < ECO_TARGET.water - 1) return "Tambah air.";
  if (waterRatio > ECO_TARGET.water + 1) return "Airnya berlebih. Tambah gula atau ulangi takarannya.";

  return "Takarannya sudah pas.";
}

export function evaluateEcoRatio(state: EcoState): EcoEvaluation {
  const filled = state.sugar + state.scraps + state.water;
  const headspace = Math.round((1 - (filled / ECO_CAPACITY)) * 100);
  const ratioScore = ratioScoreOf(state);
  const fermentProgress = Math.round((Math.min(state.days, ECO_FERMENT_DAYS) / ECO_FERMENT_DAYS) * 100);
  const roomEnough = headspace >= ECO_MIN_HEADSPACE;
  const isBalanced = ratioScore >= 85 && roomEnough && filled > 0;
  const canSeal = isBalanced && !state.sealed;

  const readinessScore = clamp(Math.round(
    (ratioScore * 0.45) + ((roomEnough ? 100 : headspace * 4) * 0.25) + (fermentProgress * 0.3),
  ));

  const headspaceLabel = filled === 0
    ? "Wadah kosong"
    : roomEnough
      ? "Ruang gas cukup"
      : "Terlalu penuh";

  const ratioLabel = filled === 0
    ? "Belum ada bahan"
    : ratioScore >= 85
      ? "Sesuai 1 : 3 : 10"
      : ratioScore >= 55
        ? "Mendekati takaran"
        : "Masih jauh dari takaran";

  const fermentLabel = !state.sealed
    ? "Belum ditutup"
    : state.days >= ECO_FERMENT_DAYS
      ? "Fermentasi 90 hari selesai"
      : `Hari ke-${state.days} dari ${ECO_FERMENT_DAYS}`;

  const base = {
    filled,
    headspace,
    headspaceLabel,
    ratioScore,
    ratioLabel,
    fermentProgress,
    fermentLabel,
    readinessScore,
    isBalanced,
    canSeal,
  };

  if (filled === 0) {
    return {
      ...base,
      tone: "neutral",
      title: "Wadahnya masih kosong",
      message: "Eco enzyme memakai perbandingan 1 bagian gula, 3 bagian sisa buah dan sayur, lalu 10 bagian air.",
      nextAction: "Masukkan 1 bagian gula lebih dulu sebagai patokan.",
    };
  }

  if (!roomEnough) {
    return {
      ...base,
      tone: "attention",
      title: "Wadahnya terlalu penuh",
      message: "Fermentasi menghasilkan gas. Kalau wadah terisi penuh, tekanannya menumpuk dan wadah bisa mengembung atau bocor.",
      nextAction: `Sisakan minimal ${ECO_MIN_HEADSPACE}% ruang kosong di atas. Kurangi bahan dengan tombol − sampai ruang gasnya cukup.`,
    };
  }

  if (!state.sealed) {
    if (ratioScore < 85) {
      return {
        ...base,
        tone: "attention",
        title: "Takarannya belum seimbang",
        message: `Sekarang perbandinganmu ${state.sugar} : ${state.scraps} : ${state.water}, sedangkan targetnya 1 : 3 : 10.`,
        nextAction: ratioHint(state),
      };
    }

    return {
      ...base,
      tone: "success",
      title: "Takarannya sudah tepat",
      message: "Perbandingan bahannya sesuai dan masih ada ruang untuk gas fermentasi.",
      nextAction: "Tutup wadahnya, lalu simpan di tempat teduh selama 90 hari.",
    };
  }

  if (state.days < ECO_FERMENT_DAYS) {
    return {
      ...base,
      tone: "neutral",
      title: "Fermentasi sedang berjalan",
      message: "Warna cairan berubah perlahan dan gas terbentuk paling banyak pada minggu-minggu awal.",
      nextAction: `Lanjutkan waktu sampai hari ke-${ECO_FERMENT_DAYS}. Jangan dipanen lebih awal.`,
    };
  }

  return {
    ...base,
    tone: "success",
    title: "Eco enzyme siap disaring",
    message: "Fermentasi 90 hari sudah lengkap. Cairan yang siap berwarna cokelat dan berbau asam manis, bukan busuk.",
    nextAction: "Minta orang dewasa menyaringnya. Ingat, hasilnya bukan disinfektan dan tidak boleh diminum.",
  };
}
