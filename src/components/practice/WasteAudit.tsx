import { useState, type CSSProperties } from "react";
import { usePersistentState } from "./usePersistentState";

const categories = [
  { id: "organic", label: "Organik", color: "#238b57" },
  { id: "plastic", label: "Plastik", color: "#287fa8" },
  { id: "paper", label: "Kertas", color: "#d39a1f" },
  { id: "residue", label: "Residu", color: "#59615e" },
  { id: "hazardous", label: "B3", color: "#d94b3d" },
] as const;

type CategoryId = typeof categories[number]["id"];
type DayRecord = Record<CategoryId, number>;
type AuditState = DayRecord[];

const emptyRecord = (): DayRecord => ({
  organic: 0,
  plastic: 0,
  paper: 0,
  residue: 0,
  hazardous: 0,
});

const initialAudit: AuditState = Array.from({ length: 7 }, emptyRecord);

const formatWeight = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const suggestions: Record<CategoryId, string> = {
  organic: "Rencanakan porsi makan, simpan bahan dengan baik, dan komposkan sisa yang memang tidak dapat dimakan.",
  plastic: "Bawa botol, wadah, dan tas guna ulang. Pilih produk isi ulang atau kemasan yang diterima pengelola setempat.",
  paper: "Gunakan kedua sisi kertas dan pisahkan kertas yang bersih serta kering untuk didaur ulang.",
  residue: "Periksa kembali barang sekali pakai yang paling sering muncul, lalu cari pengganti yang dapat dipakai berulang.",
  hazardous: "Simpan baterai, lampu, dan kemasan bahan kimia secara terpisah. Jangan membongkar atau membakarnya.",
};

export function WasteAudit() {
  const [records, setRecords] = usePersistentState<AuditState>("nyuburkeun-waste-audit", initialAudit);
  const [activeDay, setActiveDay] = useState(0);

  const totals = categories.map((category) => ({
    ...category,
    total: records.reduce((sum, record) => sum + record[category.id], 0),
  }));
  const grandTotal = totals.reduce((sum, category) => sum + category.total, 0);
  const maxTotal = Math.max(1, ...totals.map((category) => category.total));
  const largestCategory = totals.reduce((largest, category) => (
    category.total > largest.total ? category : largest
  ), totals[0]);
  const recordedDays = records.filter((record) => Object.values(record).some((value) => value > 0)).length;

  const updateRecord = (category: CategoryId, value: number) => {
    setRecords((current) => current.map((record, index) => (
      index === activeDay
        ? { ...record, [category]: Math.min(100, Math.max(0, value)) }
        : record
    )));
  };

  const resetAudit = () => {
    if (!window.confirm("Hapus seluruh catatan audit sampah 7 hari?")) return;
    setRecords(Array.from({ length: 7 }, emptyRecord));
    setActiveDay(0);
  };

  return (
    <div className="waste-audit">
      <div className="waste-audit__summary">
        <div>
          <span>Hari terisi</span>
          <strong>{recordedDays}/7</strong>
        </div>
        <div>
          <span>Total tercatat</span>
          <strong>{formatWeight.format(grandTotal)} kg</strong>
        </div>
        <div>
          <span>Terbanyak</span>
          <strong>{grandTotal > 0 ? largestCategory.label : "Belum ada"}</strong>
        </div>
      </div>

      <div className="waste-audit__days" role="group" aria-label="Pilih hari audit">
        {records.map((record, index) => {
          const filled = Object.values(record).some((value) => value > 0);
          return (
            <button
              type="button"
              aria-pressed={activeDay === index}
              className={`${activeDay === index ? "is-active" : ""}${filled ? " is-filled" : ""}`}
              key={`day-${index + 1}`}
              onClick={() => setActiveDay(index)}
            >
              <span>Hari</span>
              <strong>{index + 1}</strong>
            </button>
          );
        })}
      </div>

      <div className="waste-audit__workspace">
        <fieldset className="waste-audit__form">
          <legend>Berat sampah hari {activeDay + 1}</legend>
          <p>Gunakan timbangan rumah. Jika tidak ada sampah pada kategori tertentu, biarkan angkanya nol.</p>
          <div className="waste-audit__inputs">
            {categories.map((category) => (
              <label key={category.id}>
                <span><i style={{ background: category.color }} />{category.label}</span>
                <span className="practice-input-suffix">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    value={records[activeDay][category.id]}
                    onChange={(event) => updateRecord(category.id, Number(event.target.value) || 0)}
                  />
                  <span>kg</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="waste-audit__chart" aria-label="Ringkasan total sampah per kategori">
          <p className="practice-card-kicker">Hasil sementara</p>
          <h3>Komposisi sampahmu</h3>
          <div className="waste-audit__bars">
            {totals.map((category) => (
              <div key={category.id}>
                <div>
                  <span>{category.label}</span>
                  <strong>{formatWeight.format(category.total)} kg</strong>
                </div>
                <span className="waste-audit__bar">
                  <i
                    style={{
                      "--bar-width": `${(category.total / maxTotal) * 100}%`,
                      "--bar-color": category.color,
                    } as CSSProperties}
                  />
                </span>
              </div>
            ))}
          </div>
          <p className="waste-audit__advice">
            {grandTotal > 0
              ? <><strong>Langkah berikutnya:</strong> {suggestions[largestCategory.id]}</>
              : "Isi berat sampah setiap hari. Setelah tujuh hari, lihat kategori mana yang paling banyak."}
          </p>
        </div>
      </div>

      <div className="waste-audit__footer">
        <p>Data tersimpan hanya di browser perangkat ini.</p>
        <button type="button" onClick={resetAudit}>Hapus catatan audit</button>
      </div>
    </div>
  );
}
