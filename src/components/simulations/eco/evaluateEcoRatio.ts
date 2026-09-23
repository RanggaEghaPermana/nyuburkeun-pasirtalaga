export type EcoAction = "sugar" | "scraps" | "water" | "stir" | "seal" | "wait" | "release";

export type EcoState = {
  sugar: number;
  scraps: number;
  water: number;
  // Gula merah baru larut setelah diaduk. Menambah gula lagi membuat sebagian
  // gula kembali mengendap sampai diaduk ulang.
  stirred: boolean;
  sealed: boolean;
  days: number;
  // Tekanan gas di bawah tutup (0–100+). Di atas 100 wadah mengembung dan
  // waktu tidak boleh dilanjutkan sebelum tutupnya dibuka perlahan.
  pressure: number;
  releases: number;
  actionId: number;
  lastAction: EcoAction | null;
};

export const ECO_CAPACITY = 20;
export const ECO_TARGET = { sugar: 1, scraps: 3, water: 10 };
export const ECO_FERMENT_DAYS = 90;
export const ECO_DAY_STEP = 15;
export const ECO_MIN_HEADSPACE = 20;
export const ECO_BULGE_PRESSURE = 100;

export const ECO_LIMITS = { sugar: 4, scraps: 9, water: 14 };

// Gas paling banyak terbentuk pada minggu-minggu awal, lalu makin sedikit.
export function pressureGain(dayAfterWait: number) {
  if (dayAfterWait <= 30) return 60;
  if (dayAfterWait <= 45) return 32;
  if (dayAfterWait <= 60) return 22;
  return 12;
}

export function createInitialEcoState(): EcoState {
  return {
    sugar: 0,
    scraps: 0,
    water: 0,
    stirred: false,
    sealed: false,
    days: 0,
    pressure: 0,
    releases: 0,
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
  pressureLabel: string;
  readinessScore: number;
  isBalanced: boolean;
  canStir: boolean;
  canSeal: boolean;
  canWait: boolean;
  canRelease: boolean;
  bulging: boolean;
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
  const bulging = state.sealed && state.pressure >= ECO_BULGE_PRESSURE;
  const canStir = !state.sealed && state.sugar > 0 && state.water > 0 && !state.stirred;
  const canSeal = isBalanced && state.stirred && !state.sealed;
  const canWait = state.sealed && state.days < ECO_FERMENT_DAYS && !bulging;
  const canRelease = state.sealed && state.pressure > 0 && state.days < ECO_FERMENT_DAYS;

  const readinessScore = clamp(Math.round(
    (ratioScore * 0.4)
    + ((roomEnough ? 100 : headspace * 4) * 0.2)
    + ((state.stirred || state.sealed ? 100 : 0) * 0.1)
    + (fermentProgress * 0.3),
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

  const pressureLabel = !state.sealed
    ? "Tutup belum dipasang"
    : bulging
      ? "Wadah mengembung"
      : state.pressure >= 50
        ? "Tutup mulai menegang"
        : "Aman";

  const base = {
    filled,
    headspace,
    headspaceLabel,
    ratioScore,
    ratioLabel,
    fermentProgress,
    fermentLabel,
    pressureLabel,
    readinessScore,
    isBalanced,
    canStir,
    canSeal,
    canWait,
    canRelease,
    bulging,
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
      nextAction: `Sisakan minimal ${ECO_MIN_HEADSPACE}% ruang kosong di atas. Kurangi bahan dengan tombol − sampai garis batas isi terlihat.`,
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

    if (!state.stirred) {
      return {
        ...base,
        tone: "neutral",
        title: "Gulanya belum larut",
        message: "Takarannya sudah tepat, tetapi gula merah masih mengendap di dasar wadah. Gula harus larut supaya bisa diolah mikroba.",
        nextAction: "Aduk dengan alat yang bersih sampai gulanya larut.",
      };
    }

    return {
      ...base,
      tone: "success",
      title: "Siap ditutup rapat",
      message: "Takarannya sesuai, gula sudah larut, dan masih ada ruang untuk gas fermentasi.",
      nextAction: "Tutup rapat, lalu tulis tanggal mulai dan tanggal siap dibuka.",
    };
  }

  if (bulging) {
    return {
      ...base,
      tone: "attention",
      title: "Wadahnya mengembung!",
      message: "Gas dari fermentasi menumpuk dan menekan tutup. Kalau dibiarkan, tutup bisa terlepas atau wadahnya retak.",
      nextAction: "Minta orang dewasa membuka tutup perlahan, jauh dari wajah, lalu menutupnya rapat lagi.",
    };
  }

  if (state.days < ECO_FERMENT_DAYS) {
    return {
      ...base,
      tone: "neutral",
      title: "Fermentasi sedang berjalan",
      message: state.pressure >= 50
        ? "Tutupnya mulai menegang karena gas. Gas paling banyak terbentuk pada minggu-minggu awal."
        : "Warna cairan berubah perlahan. Periksa wadahnya secara rutin bersama orang dewasa.",
      nextAction: state.pressure >= 50
        ? "Buka tutupnya perlahan sebentar untuk melepas gas, atau lanjutkan waktu sambil terus memeriksa."
        : `Lanjutkan waktu sampai hari ke-${ECO_FERMENT_DAYS}. Jangan dipanen lebih awal.`,
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
