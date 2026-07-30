import { useState } from "react";

type CalculatorMode = "compost" | "eco";

const formatNumber = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});

export function PracticalCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("compost");
  const [containerSize, setContainerSize] = useState(20);
  const [brownRatio, setBrownRatio] = useState(2.5);
  const [waterLiters, setWaterLiters] = useState(1);

  const usableVolume = Math.max(1, containerSize * 0.8);
  const greenVolume = usableVolume / (brownRatio + 1);
  const brownVolume = usableVolume - greenVolume;
  const sugarGrams = waterLiters * 100;
  const produceGrams = waterLiters * 300;
  const suggestedContainer = waterLiters * 1.5;

  return (
    <div className="practice-calculator">
      <div className="practice-mode-switch" role="group" aria-label="Pilih jenis kalkulator">
        <button
          type="button"
          className={mode === "compost" ? "is-active" : undefined}
          aria-pressed={mode === "compost"}
          onClick={() => setMode("compost")}
        >
          Kompos
        </button>
        <button
          type="button"
          className={mode === "eco" ? "is-active" : undefined}
          aria-pressed={mode === "eco"}
          onClick={() => setMode("eco")}
        >
          Eco enzyme
        </button>
      </div>

      {mode === "compost" ? (
        <div className="practice-tool-layout">
          <div className="practice-form-card">
            <p className="practice-card-kicker">Kapasitas wadah</p>
            <label htmlFor="compost-container">Ukuran ember kompos</label>
            <div className="practice-input-suffix">
              <input
                id="compost-container"
                type="number"
                min="5"
                max="200"
                step="1"
                value={containerSize}
                onChange={(event) => setContainerSize(Math.min(200, Math.max(5, Number(event.target.value) || 5)))}
              />
              <span>liter</span>
            </div>

            <label htmlFor="brown-ratio">Bahan cokelat untuk setiap 1 bagian hijau</label>
            <select
              id="brown-ratio"
              value={brownRatio}
              onChange={(event) => setBrownRatio(Number(event.target.value))}
            >
              <option value="2">2 bagian</option>
              <option value="2.5">2½ bagian</option>
              <option value="3">3 bagian</option>
            </select>
            <p className="practice-field-note">
              Perhitungan menyisakan sekitar 20% ruang agar campuran mudah diaduk.
            </p>
          </div>

          <div className="practice-result-card" aria-live="polite">
            <p className="practice-card-kicker">Takaran awal</p>
            <h3>Isi ember secara bertahap</h3>
            <div className="practice-metric-grid">
              <div>
                <span>Bahan hijau</span>
                <strong>{formatNumber.format(greenVolume)} L</strong>
              </div>
              <div>
                <span>Bahan cokelat</span>
                <strong>{formatNumber.format(brownVolume)} L</strong>
              </div>
              <div>
                <span>Ruang untuk mengaduk</span>
                <strong>{formatNumber.format(containerSize - usableVolume)} L</strong>
              </div>
            </div>
            <p>
              Pakai wadah ukur yang sama untuk kedua bahan. Tambahkan air sedikit demi sedikit hanya
              sampai campuran terasa seperti spons yang sudah diperas, bukan sampai tergenang.
            </p>
          </div>
        </div>
      ) : (
        <div className="practice-tool-layout">
          <div className="practice-form-card">
            <p className="practice-card-kicker">Resep 1 : 3 : 10</p>
            <label htmlFor="eco-water">Jumlah air yang ingin digunakan</label>
            <div className="practice-input-suffix">
              <input
                id="eco-water"
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                value={waterLiters}
                onChange={(event) => setWaterLiters(Math.min(20, Math.max(0.5, Number(event.target.value) || 0.5)))}
              />
              <span>liter</span>
            </div>
            <p className="practice-field-note">
              Kalkulator mempertahankan rasio 1 bagian gula, 3 bagian sisa buah/sayur, dan 10 bagian air.
            </p>
          </div>

          <div className="practice-result-card" aria-live="polite">
            <p className="practice-card-kicker">Bahan yang disiapkan</p>
            <h3>Takaran untuk {formatNumber.format(waterLiters)} liter air</h3>
            <div className="practice-metric-grid">
              <div>
                <span>Gula merah/aren</span>
                <strong>{formatNumber.format(sugarGrams)} g</strong>
              </div>
              <div>
                <span>Sisa buah/sayur</span>
                <strong>{formatNumber.format(produceGrams)} g</strong>
              </div>
              <div>
                <span>Saran wadah minimum</span>
                <strong>±{formatNumber.format(suggestedContainer)} L</strong>
              </div>
            </div>
            <p>
              Ukuran wadah adalah perkiraan. Gunakan wadah plastik yang lebih besar bila semua bahan
              belum terendam, dan selalu sisakan sekitar seperlima ruang untuk gas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
