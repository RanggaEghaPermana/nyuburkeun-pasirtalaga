import { useCallback, useEffect, useRef, useState } from "react";
import { SimulationErrorBoundary } from "../shared/SimulationErrorBoundary";
import { useReducedMotion } from "../shared/useReducedMotion";
import { binDefinitions, binDefinitionsByCategory, type WasteCategory } from "./sortingBins";
import { wasteItems } from "./wasteItems";
import { WasteSortingScene } from "./WasteSortingScene";

type SortingPhase = "ready" | "dragging" | "returning" | "correct" | "finished";

type LastAttempt = {
  kind: "missed" | "incorrect" | "correct";
  category: WasteCategory | null;
};

const AUTO_ADVANCE_DELAY_MS = 1800;

export function WasteSortingLab() {
  const [index, setIndex] = useState(0);
  const [sortedCount, setSortedCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [phase, setPhase] = useState<SortingPhase>("ready");
  const [highlightedCategory, setHighlightedCategory] = useState<WasteCategory | null>(null);
  const [wrongCategory, setWrongCategory] = useState<WasteCategory | null>(null);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  const [successAnimationComplete, setSuccessAnimationComplete] = useState(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(false);
  const labTitleRef = useRef<HTMLHeadingElement>(null);
  const finishHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const accessibleControlsRef = useRef<HTMLDetailsElement>(null);
  const accessibleSummaryRef = useRef<HTMLElement>(null);
  const firstBinButtonRef = useRef<HTMLButtonElement>(null);
  const focusNextAfterKeyboardRef = useRef(false);
  const focusControlsAfterNextRef = useRef(false);
  const focusLabAfterResetRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const item = wasteItems[index];
  const enabled = phase === "ready" || phase === "dragging";

  const handleDragChange = useCallback((dragging: boolean) => {
    if (dragging) {
      setWrongCategory(null);
      setLastAttempt(null);
      setPhase("dragging");
      return;
    }

    setPhase((current) => (current === "dragging" ? "ready" : current));
  }, []);

  const handleHoverChange = useCallback((category: WasteCategory | null) => {
    setHighlightedCategory(category);
  }, []);

  const handleDrop = useCallback((category: WasteCategory | null) => {
    setHighlightedCategory(null);
    setSuccessAnimationComplete(false);
    setAttemptCount((current) => current + 1);

    if (!category) {
      setShouldAutoAdvance(false);
      setWrongCategory(null);
      setLastAttempt({ kind: "missed", category: null });
      setPhase("returning");
      return;
    }

    if (category === item.category) {
      setShouldAutoAdvance(!reducedMotion);
      setSortedCount((current) => current + 1);
      setWrongCategory(null);
      setLastAttempt({ kind: "correct", category });
      setPhase("correct");
      return;
    }

    setShouldAutoAdvance(false);
    setWrongCategory(category);
    setLastAttempt({ kind: "incorrect", category });
    setPhase("returning");
  }, [item.category, reducedMotion]);

  const handleReturnComplete = useCallback(() => {
    setWrongCategory(null);
    setPhase("ready");
  }, []);

  const handleAccessibleDrop = (category: WasteCategory) => {
    if (!enabled) return;
    setShouldAutoAdvance(false);
    setSuccessAnimationComplete(false);
    setAttemptCount((current) => current + 1);
    setHighlightedCategory(null);

    if (category === item.category) {
      focusNextAfterKeyboardRef.current = true;
      focusControlsAfterNextRef.current = true;
      setSortedCount((current) => current + 1);
      setWrongCategory(null);
      setLastAttempt({ kind: "correct", category });
      setPhase("correct");
      return;
    }

    setWrongCategory(category);
    setLastAttempt({ kind: "incorrect", category });
    setPhase("ready");
  };

  const nextItem = useCallback(() => {
    setShouldAutoAdvance(false);
    setSuccessAnimationComplete(false);
    if (index === wasteItems.length - 1) {
      setPhase("finished");
      return;
    }

    setIndex((current) => current + 1);
    setHighlightedCategory(null);
    setWrongCategory(null);
    setLastAttempt(null);
    setPhase("ready");
  }, [index]);

  const handleSuccessComplete = useCallback(() => {
    setSuccessAnimationComplete(true);
  }, []);

  const reset = () => {
    focusLabAfterResetRef.current = true;
    setShouldAutoAdvance(false);
    setSuccessAnimationComplete(false);
    setIndex(0);
    setSortedCount(0);
    setAttemptCount(0);
    setHighlightedCategory(null);
    setWrongCategory(null);
    setLastAttempt(null);
    setPhase("ready");
  };

  useEffect(() => {
    if (
      phase !== "correct"
      || !successAnimationComplete
      || !shouldAutoAdvance
    ) return;

    const timer = window.setTimeout(nextItem, AUTO_ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [nextItem, phase, shouldAutoAdvance, successAnimationComplete]);

  useEffect(() => {
    if (phase !== "correct" || !focusNextAfterKeyboardRef.current) return;
    focusNextAfterKeyboardRef.current = false;
    nextButtonRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready" || !focusControlsAfterNextRef.current) return;
    focusControlsAfterNextRef.current = false;
    if (accessibleControlsRef.current?.open) {
      firstBinButtonRef.current?.focus();
    } else {
      accessibleSummaryRef.current?.focus();
    }
  }, [index, phase]);

  useEffect(() => {
    if (phase === "finished") {
      finishHeadingRef.current?.focus();
      return;
    }

    if (phase === "ready" && focusLabAfterResetRef.current) {
      focusLabAfterResetRef.current = false;
      labTitleRef.current?.focus();
    }
  }, [phase]);

  const fallback = (
    <div className="simulation-visual-fallback">
      <span aria-hidden="true">♻</span>
      <p>Visual 3D tidak tersedia. Kontrol alternatif di bawah tetap dapat digunakan.</p>
    </div>
  );

  const hoveredLabel = highlightedCategory
    ? binDefinitionsByCategory[highlightedCategory].shortLabel
    : null;

  return (
    <section
      className={`simulation-shell sorting-lab${phase === "finished" ? " is-finished" : ""}`}
      aria-labelledby="sorting-lab-title"
    >
      <div className="simulation-shell__copy">
        <p className="section-kicker">Stasiun pilah Indonesia · seret objek 3D</p>
        <h2 ref={labTitleRef} id="sorting-lab-title" tabIndex={-1}>Yuk, Pilah Sampah!</h2>
        <p className="simulation-shell__lead">
          Seret sampah ke lubang tong yang cocok. Geser area kosong untuk melihat stasiun dari segala arah.
        </p>

        {phase === "finished" ? (
          <div className="simulation-finish" role="status">
            <span className="simulation-finish__score">{sortedCount}/{wasteItems.length}</span>
            <h3 ref={finishHeadingRef} tabIndex={-1}>Hebat, semua sampah sudah dipilah!</h3>
            <p>Kamu selesai dalam {attemptCount} percobaan. Main lagi agar makin hafal warna dan tulisan pada tong.</p>
            <button className="simulation-primary" type="button" onClick={reset}>Ulangi simulasi</button>
          </div>
        ) : (
          <>
            <div className="simulation-progress" aria-label={`Sampah ${index + 1} dari ${wasteItems.length}`}>
              <span>Sampah {index + 1}/{wasteItems.length}</span>
              <span>Terpilah {sortedCount}</span>
            </div>

            <div className="sorting-prompt">
              <span className="sorting-prompt__label">Sampah yang dipilih</span>
              <strong>{item.label}</strong>
            </div>

            <div
              className={`simulation-feedback${lastAttempt ? ` is-${lastAttempt.kind}` : ""}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {!lastAttempt && phase === "dragging" && hoveredLabel ? (
                <><strong>Tong {hoveredLabel} menyala.</strong><p>Lepaskan jika kamu yakin tong ini cocok.</p></>
              ) : null}
              {!lastAttempt && phase === "dragging" && !hoveredLabel ? (
                <><strong>Sampah sedang kamu pegang.</strong><p>Arahkan ke lubang tong sampai tutupnya terbuka.</p></>
              ) : null}
              {!lastAttempt && phase === "ready" ? (
                <p>Tahan dan seret sampahnya. Cocokkan warna, tulisan, dan contoh pada tong.</p>
              ) : null}
              {lastAttempt?.kind === "missed" ? (
                <><strong>Sedikit lagi!</strong><p>Coba lagi. Lepaskan saat lubang tong menyala.</p></>
              ) : null}
              {lastAttempt?.kind === "incorrect" && lastAttempt.category ? (
                <>
                  <strong>Ups, belum tepat. Itu tong {binDefinitionsByCategory[lastAttempt.category].shortLabel}.</strong>
                  <p>{item.explanation}</p>
                </>
              ) : null}
              {lastAttempt?.kind === "correct" ? (
                <>
                  <strong>Hebat! Sampah masuk ke tong {binDefinitionsByCategory[item.category].shortLabel}.</strong>
                  <p>{item.explanation}</p>
                  <button ref={nextButtonRef} className="simulation-next" type="button" onClick={nextItem}>
                    {index === wasteItems.length - 1 ? "Lihat hasil" : "Lanjut sekarang"} <span aria-hidden="true">→</span>
                  </button>
                  {successAnimationComplete && shouldAutoAdvance ? (
                    <span className="simulation-feedback__auto" aria-hidden="true">
                      {index === wasteItems.length - 1 ? "Hasil segera tampil" : "Sampah berikutnya sedang disiapkan"}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>

            <details ref={accessibleControlsRef} className="sorting-accessible-controls">
              <summary ref={accessibleSummaryRef}>Pilih tong dengan tombol</summary>
              <p>Kamu juga bisa memilih tong dengan tombol, keyboard, atau pembaca layar.</p>
              <div className="sorting-accessible-controls__buttons" role="group" aria-label={`Pindahkan ${item.label} ke tong`}>
                {binDefinitions.map((definition, definitionIndex) => (
                  <button
                    key={definition.category}
                    ref={definitionIndex === 0 ? firstBinButtonRef : undefined}
                    type="button"
                    disabled={!enabled}
                    onClick={() => handleAccessibleDrop(definition.category)}
                  >
                    {definition.shortLabel}
                  </button>
                ))}
              </div>
            </details>
          </>
        )}

        <p className="sorting-standard-note">
          Warna tong pada permainan ini mengikuti <a href="https://jdih.pu.go.id/detail-dokumen/PermenPUPR-nomor-03-tahun-2013-Penyelenggaraan-Prasarana-Dan-Sarana-Persampahan-Dalam-Penanganan-Sampah-Rumah-Tangga-Dan-Sampah-Sejenis-Sampah-Rumah-Tangga" target="_blank" rel="noreferrer">aturan nasional</a>. Warna yang dipakai di daerahmu mungkin berbeda.
        </p>
      </div>

      <div className="simulation-shell__visual">
        {phase === "finished" ? (
          <div className="sorting-complete-visual" aria-hidden="true">
            <span>✓</span>
            <strong>Semua sudah terpilah</strong>
            <p>Lima warna, lima tujuan, satu kebiasaan baik dari rumah.</p>
          </div>
        ) : (
          <>
            <div className={`simulation-canvas simulation-canvas--sorting${phase === "dragging" ? " is-dragging" : ""}`}>
              <div className="sorting-stage-instruction" aria-hidden="true">
                <span>
                  {phase === "correct"
                    ? "Berhasil dipilah · berikutnya disiapkan"
                    : phase === "dragging"
                      ? "Arahkan ke mulut tong"
                      : "Seret objek · putar area kosong"}
                </span>
                <strong>
                  {phase === "correct"
                    ? `Masuk tong ${binDefinitionsByCategory[item.category].shortLabel}`
                    : item.label}
                </strong>
              </div>
              <div className="sorting-stage-scroll-hint" aria-hidden="true">Geser halaman</div>
              {phase === "correct" ? (
                <button className="sorting-stage-next" type="button" onClick={nextItem}>
                  <span>Benar!</span>
                  {index === wasteItems.length - 1 ? "Lihat hasil" : "Sampah berikutnya"}
                  <b aria-hidden="true">→</b>
                </button>
              ) : null}
              <SimulationErrorBoundary fallback={fallback}>
                <WasteSortingScene
                  item={item}
                  enabled={enabled}
                  highlightedCategory={highlightedCategory}
                  wrongCategory={wrongCategory}
                  reducedMotion={reducedMotion}
                  onDragChange={handleDragChange}
                  onHoverChange={handleHoverChange}
                  onDrop={handleDrop}
                  onReturnComplete={handleReturnComplete}
                  onSuccessComplete={handleSuccessComplete}
                />
              </SimulationErrorBoundary>
            </div>

            <ul className="sorting-bin-key" aria-label="Lima kategori tong sampah">
              {binDefinitions.map((definition) => (
                <li className={`sorting-bin-key__${definition.category}`} key={definition.category}>
                  <span aria-hidden="true" />
                  {definition.shortLabel}
                </li>
              ))}
            </ul>
            <p className="simulation-caption">Cocokkan warna, tulisan, dan contoh pada setiap tong.</p>
          </>
        )}
      </div>
    </section>
  );
}
