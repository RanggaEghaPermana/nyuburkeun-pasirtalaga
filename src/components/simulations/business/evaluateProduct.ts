export type Container = "pouch" | "bottle" | "jar";

export type ProductState = {
  container: Container;
  hasLabel: boolean;
  hasInfo: boolean;
  price: number;
  actionId: number;
};

export const PRICE_MIN = 5000;
export const PRICE_MAX = 30000;
export const PRICE_STEP = 1000;

export const CONTAINERS: Record<Container, {
  label: string;
  cost: number;
  sweetSpot: { min: number; max: number };
  note: string;
}> = {
  pouch: {
    label: "Pouch kompos 1 kg",
    cost: 3500,
    sweetSpot: { min: 8000, max: 15000 },
    note: "Murah dan ringan, cocok untuk pembeli yang baru mencoba.",
  },
  bottle: {
    label: "Botol eco enzyme 500 ml",
    cost: 5500,
    sweetSpot: { min: 11000, max: 19000 },
    note: "Praktis dituang dan mudah dikirim.",
  },
  jar: {
    label: "Toples eco enzyme 500 ml",
    cost: 8000,
    sweetSpot: { min: 15000, max: 24000 },
    note: "Terlihat paling rapi, tetapi biaya kemasannya paling tinggi.",
  },
};

export const LABEL_COST = 600;

export function createInitialProductState(): ProductState {
  return { container: "pouch", hasLabel: false, hasInfo: false, price: 9000, actionId: 0 };
}

export type ProductEvaluation = {
  tone: "neutral" | "success" | "attention";
  title: string;
  message: string;
  nextAction: string;
  cost: number;
  margin: number;
  marginShare: number;
  marginLabel: string;
  trustScore: number;
  trustLabel: string;
  appealScore: number;
  appealLabel: string;
  readinessScore: number;
  isReady: boolean;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function priceBandScore(price: number, { min, max }: { min: number; max: number }) {
  if (price >= min && price <= max) return 100;
  const distance = price < min ? min - price : price - max;
  return Math.round(clamp(100 - ((distance / 8000) * 100)));
}

export function evaluateProduct(state: ProductState): ProductEvaluation {
  const container = CONTAINERS[state.container];
  const cost = container.cost + (state.hasLabel ? LABEL_COST : 0);
  const margin = state.price - cost;
  const marginShare = state.price === 0 ? 0 : Math.round((margin / state.price) * 100);
  const trustScore = (state.hasLabel ? 40 : 0) + (state.hasInfo ? 60 : 0);
  const appealScore = priceBandScore(state.price, container.sweetSpot);
  const marginScore = clamp(Math.round((marginShare / 50) * 100));

  const readinessScore = clamp(Math.round(
    (appealScore * 0.35) + (trustScore * 0.35) + (marginScore * 0.3),
  ));

  const marginLabel = marginShare < 0
    ? "Rugi, harga di bawah biaya"
    : marginShare < 20
      ? "Untungnya terlalu tipis"
      : marginShare <= 60
        ? "Untungnya wajar"
        : "Untungnya sangat besar";

  const trustLabel = trustScore === 100
    ? "Pembeli mendapat informasi lengkap"
    : trustScore === 0
      ? "Belum ada label dan keterangan"
      : state.hasLabel
        ? "Sudah berlabel, keterangan belum ada"
        : "Ada keterangan, tetapi belum berlabel";

  const appealLabel = appealScore === 100
    ? "Harganya masuk jangkauan pembeli"
    : state.price > container.sweetSpot.max
      ? "Harganya di atas jangkauan pembeli"
      : "Harganya di bawah nilai produk";

  const isReady = trustScore === 100 && marginShare >= 20 && appealScore === 100;

  const base = {
    cost,
    margin,
    marginShare,
    marginLabel,
    trustScore,
    trustLabel,
    appealScore,
    appealLabel,
    readinessScore,
    isReady,
  };

  if (margin < 0) {
    return {
      ...base,
      tone: "attention",
      title: "Harganya belum menutup biaya",
      message: `Biaya kemasan ${container.label} sudah Rp${cost.toLocaleString("id-ID")}, sedangkan harga jualmu Rp${state.price.toLocaleString("id-ID")}.`,
      nextAction: "Naikkan harga di atas biaya, atau pilih kemasan yang lebih murah.",
    };
  }

  if (!state.hasLabel) {
    return {
      ...base,
      tone: "attention",
      title: "Kemasannya belum berlabel",
      message: "Label membuat produk mudah dikenali dan terlihat lebih rapi di rak penjual.",
      nextAction: "Tempelkan label berisi nama usaha pada kemasan.",
    };
  }

  if (!state.hasInfo) {
    return {
      ...base,
      tone: "attention",
      title: "Belum ada keterangan yang jujur",
      message: "Pembeli perlu tahu komposisi, manfaat, dan cara pakainya supaya merasa aman memakai produkmu.",
      nextAction: "Tambahkan keterangan komposisi, manfaat, dan cara penggunaan.",
    };
  }

  if (marginShare < 20) {
    return {
      ...base,
      tone: "attention",
      title: "Untungnya terlalu tipis",
      message: `Dari harga Rp${state.price.toLocaleString("id-ID")}, untungmu hanya Rp${margin.toLocaleString("id-ID")} atau ${marginShare}%.`,
      nextAction: "Naikkan harga sedikit, atau tekan biaya dengan kemasan yang lebih sederhana.",
    };
  }

  if (appealScore < 100) {
    return {
      ...base,
      tone: "attention",
      title: appealLabel,
      message: `Untuk ${container.label}, pembeli seperti pecinta tanaman dan toko pertanian biasanya nyaman di kisaran Rp${container.sweetSpot.min.toLocaleString("id-ID")} sampai Rp${container.sweetSpot.max.toLocaleString("id-ID")}.`,
      nextAction: state.price > container.sweetSpot.max
        ? "Turunkan harga ke dalam kisaran itu, atau pindah ke kemasan yang nilainya lebih tinggi."
        : "Naikkan harga ke dalam kisaran itu supaya nilainya tidak terlalu murah.",
    };
  }

  return {
    ...base,
    tone: "success",
    title: "Produkmu siap ditawarkan",
    message: `${container.label} sudah berlabel, keterangannya jujur, dan untungnya ${marginShare}% dari harga jual.`,
    nextAction: "Coba tawarkan pada bazar atau toko pertanian, lalu catat tanggapan pembeli.",
  };
}
