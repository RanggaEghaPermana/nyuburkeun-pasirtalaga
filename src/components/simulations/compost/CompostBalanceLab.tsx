import { useCallback, useEffect, useId, useReducer, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { SimulationErrorBoundary } from "../shared/SimulationErrorBoundary";
import {
  COMPOST_MIX_DURATION_MS,
  COMPOST_WATER_DURATION_MS,
  CompostScene,
} from "./CompostScene";
import {
  createInitialCompostState,
  evaluateCompost,
  type CompostMaterial,
  type CompostState,
} from "./evaluateCompost";

type CompostAction =
  | { type: "add-material"; material: CompostMaterial }
  | { type: "add-water" }
  | { type: "mix" }
  | { type: "reset" };

const MATERIAL_CATEGORY: Record<CompostMaterial, "green" | "brown"> = {
  "vegetable-scraps": "green",
  "fruit-peels": "green",
  "dry-leaves": "brown",
  "torn-cardboard": "brown",
};

const CAMERA = {
  position: [3.9, 2.75, 7.45] as [number, number, number],
  fov: 40,
};

const DPR: [number, number] = [1, 1.5];

const GL_OPTIONS = {
  alpha: true,
  antialias: true,
  powerPreference: "low-power" as const,
};

function compostReducer(state: CompostState, action: CompostAction): CompostState {
  switch (action.type) {
    case "add-material": {
      const category = MATERIAL_CATEGORY[action.material];
      if ((category === "green" && state.greens >= 12) || (category === "brown" && state.browns >= 12)) {
        return state;
      }

      const moistureChange = action.material === "fruit-peels"
        ? 7
        : action.material === "vegetable-scraps"
          ? 6
          : action.material === "dry-leaves"
            ? -4
            : -3;

      return {
        ...state,
        greens: category === "green" ? state.greens + 1 : state.greens,
        browns: category === "brown" ? state.browns + 1 : state.browns,
        moisture: Math.max(10, Math.min(90, state.moisture + moistureChange)),
        aeration: state.batches.length === 0 ? 28 : Math.max(12, state.aeration - 7),
        mixed: false,
        batches: [
          ...state.batches,
          {
            id: state.actionId + 1,
            material: action.material,
            category,
          },
        ],
        actionId: state.actionId + 1,
        lastAction: action.material,
        lastMixReport: null,
      };
    }
    case "add-water":
      if (state.batches.length === 0 || state.moisture >= 90) return state;

      return {
        ...state,
        moisture: Math.min(90, state.moisture + 10),
        aeration: Math.max(8, state.aeration - 10),
        mixed: false,
        waterCount: state.waterCount + 1,
        actionId: state.actionId + 1,
        lastAction: "water",
        lastMixReport: null,
      };
    case "mix": {
      if (state.batches.length === 0) return state;

      const nextMoisture = Math.max(10, state.moisture - 2);
      const nextAeration = Math.min(100, Math.max(78, state.aeration + 46));
      const nextMixCount = state.mixCount + 1;

      return {
        ...state,
        moisture: nextMoisture,
        aeration: nextAeration,
        mixed: true,
        mixCount: nextMixCount,
        mixedThrough: state.batches.length,
        actionId: state.actionId + 1,
        lastAction: "mix",
        lastMixReport: {
          sequence: nextMixCount,
          layersMixed: state.batches.length,
          moistureBefore: state.moisture,
          moistureAfter: nextMoisture,
          aerationBefore: state.aeration,
          aerationAfter: nextAeration,
        },
      };
    }
    case "reset":
      return createInitialCompostState();
  }
}

function hasWebGLSupport(): boolean {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const supported = Boolean(context);

    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return supported;
  } catch {
    return false;
  }
}

function hasChanged(state: CompostState): boolean {
  return state.greens > 0
    || state.browns > 0
    || state.moisture !== 45
    || state.aeration > 0
    || state.mixed
    || state.mixCount > 0;
}

function buildFallbackLayers(state: CompostState) {
  return state.batches.slice(-10).map((batch) => ({
    id: batch.id,
    kind: batch.category,
  }));
}

export function CompostBalanceLab() {
  const [state, dispatch] = useReducer(compostReducer, undefined, createInitialCompostState);
  const [webGLAvailable] = useState(hasWebGLSupport);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMixing, setIsMixing] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const instructionId = `${instanceId}-instructions`;
  const evaluation = evaluateCompost(state);
  const mixReport = state.lastAction === "mix" ? state.lastMixReport : null;
  const unmixedLayers = Math.max(0, state.batches.length - state.mixedThrough);
  const controlsBusy = isMixing || isWatering;
  const visualStateLabel = isMixing
    ? "Sedang diaduk"
    : isWatering
      ? "Air sedang meresap"
    : state.batches.length === 0
      ? "Ember masih kosong"
      : unmixedLayers > 0
        ? `${unmixedLayers} lapisan baru`
        : state.mixCount > 0
          ? `Aduk ke-${state.mixCount} selesai · ${state.mixedThrough} lapisan rata`
          : `${state.batches.length} lapisan belum diaduk`;
  const displayedEvaluation = isMixing
    ? {
        tone: "neutral" as const,
        title: "Sedang mencampur…",
        message: "Pengaduk sedang mengangkat dan menyebarkan setiap potongan agar bahan hijau, bahan cokelat, air, dan udara tercampur.",
        nextAction: "Tunggu sampai alat terangkat dan campurannya mengendap.",
      }
    : isWatering
      ? {
          tone: "neutral" as const,
          title: "Air sedang meresap…",
          message: "Air turun di antara potongan bahan dan membuat permukaannya lebih lembap, bukan menggenang di atas.",
          nextAction: "Tunggu sampai tetes air hilang ke dalam campuran.",
        }
    : evaluation;
  const fallbackLayers = buildFallbackLayers(state);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!isWatering) return;

    const timer = window.setTimeout(() => setIsWatering(false), COMPOST_WATER_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isWatering]);

  useEffect(() => {
    if (!isMixing) return;

    const safetyTimer = window.setTimeout(
      () => setIsMixing(false),
      COMPOST_MIX_DURATION_MS + 450,
    );
    return () => window.clearTimeout(safetyTimer);
  }, [isMixing]);

  const startMixing = () => {
    if (state.batches.length === 0 || controlsBusy) return;
    dispatch({ type: "mix" });
    if (!reduceMotion && webGLAvailable) setIsMixing(true);
  };

  const finishMixing = useCallback(() => {
    setIsMixing(false);
  }, []);

  const startWatering = () => {
    if (state.batches.length === 0 || state.moisture >= 90 || controlsBusy) return;
    dispatch({ type: "add-water" });
    if (!reduceMotion) setIsWatering(true);
  };

  return (
    <section className="compost-lab" aria-labelledby={titleId}>
      <header className="compost-lab__header">
        <p className="compost-lab__eyebrow">Permainan kompos 3D</p>
        <h2 id={titleId}>Ayo Isi Ember Kompos</h2>
        <p id={instructionId}>
          Pilih bahan satu per satu, tambahkan air seperlunya, lalu aduk. Setiap bahan yang kamu pilih benar-benar masuk ke dalam komposter.
        </p>
        <p>Seret mendatar area gambar yang kosong untuk memutar kebun 360°. Coba target awal sekitar dua bagian bahan cokelat untuk satu bagian bahan hijau, lalu jaga kelembapannya seperti spons yang sudah diperas.</p>
      </header>

      <div className="compost-lab__layout">
        <div className="compost-lab__visual">
          {webGLAvailable ? (
            <div className="compost-lab__canvas" aria-hidden="true">
              <SimulationErrorBoundary
                fallback={<div className="compost-lab__webgl-fallback">Visual 3D tidak dapat dimuat.</div>}
              >
                <Canvas
                  camera={CAMERA}
                  dpr={DPR}
                  fallback={<div className="compost-lab__webgl-fallback">Visual 3D tidak dapat dimuat.</div>}
                  frameloop="demand"
                  gl={GL_OPTIONS}
                >
                  <CompostScene
                    state={state}
                    reduceMotion={reduceMotion}
                    waterActive={isWatering}
                    onMixComplete={finishMixing}
                  />
                </Canvas>
              </SimulationErrorBoundary>
            </div>
          ) : (
            <div
              className="compost-lab__fallback"
              role="img"
              aria-label={`Ilustrasi komposter: ${state.greens} bagian bahan hijau, ${state.browns} bagian bahan cokelat, kelembapan ${state.moisture} persen, sirkulasi udara ${state.aeration} persen.`}
            >
              <div className="compost-lab__fallback-bin">
                {fallbackLayers.map((layer) => (
                  <span
                    className={`compost-lab__fallback-layer compost-lab__fallback-layer--${layer.kind}`}
                    key={layer.id}
                  />
                ))}
              </div>
              <p>Mode visual sederhana aktif karena WebGL tidak tersedia.</p>
            </div>
          )}
          <div className="compost-stage-hud" aria-hidden="true">
            <span>Putar kebun 360°</span>
            <strong>{visualStateLabel}</strong>
          </div>
          <div className="compost-stage-scroll-hint" aria-hidden="true">Geser halaman</div>
        </div>

        <div className="compost-lab__panel">
          <div
            className="compost-lab__controls"
            role="group"
            aria-busy={controlsBusy}
            aria-describedby={instructionId}
            aria-label="Kontrol komposter"
          >
            <button
              className="compost-lab__control compost-lab__control--green"
              type="button"
              disabled={controlsBusy || state.greens >= 12}
              onClick={() => dispatch({ type: "add-material", material: "vegetable-scraps" })}
            >
              <span aria-hidden="true">＋</span> Sisa sayur
            </button>
            <button
              className="compost-lab__control compost-lab__control--green"
              type="button"
              disabled={controlsBusy || state.greens >= 12}
              onClick={() => dispatch({ type: "add-material", material: "fruit-peels" })}
            >
              <span aria-hidden="true">＋</span> Kulit buah
            </button>
            <button
              className="compost-lab__control compost-lab__control--brown"
              type="button"
              disabled={controlsBusy || state.browns >= 12}
              onClick={() => dispatch({ type: "add-material", material: "dry-leaves" })}
            >
              <span aria-hidden="true">＋</span> Daun kering
            </button>
            <button
              className="compost-lab__control compost-lab__control--brown"
              type="button"
              disabled={controlsBusy || state.browns >= 12}
              onClick={() => dispatch({ type: "add-material", material: "torn-cardboard" })}
            >
              <span aria-hidden="true">＋</span> Kardus sobek
            </button>
            <button
              className="compost-lab__control compost-lab__control--water"
              type="button"
              disabled={controlsBusy || state.batches.length === 0 || state.moisture >= 90}
              onClick={startWatering}
            >
              <span aria-hidden="true">＋</span> {isWatering ? "Sedang menyiram…" : "Siram sedikit"}
            </button>
            <button
              className="compost-lab__control compost-lab__control--mix"
              type="button"
              disabled={controlsBusy || state.batches.length === 0}
              onClick={startMixing}
            >
              {isMixing ? "Sedang mengaduk…" : "Aduk campuran"}
            </button>
          </div>

          <div
            className={`compost-lab__status compost-lab__status--${displayedEvaluation.tone}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="compost-lab__status-label">Kondisi campuranmu</p>
            <h3>{displayedEvaluation.title}</h3>
            <p>{displayedEvaluation.message}</p>
            <p className="compost-lab__next-action"><strong>Coba lakukan:</strong> {displayedEvaluation.nextAction}</p>
          </div>

          {!isMixing && mixReport ? (
            <div className="compost-lab__mix-result" role="status" aria-live="polite" aria-atomic="true">
              <div className="compost-lab__mix-result-heading">
                <span aria-hidden="true">✓</span>
                <div>
                  <p>Hasil aduk ke-{mixReport.sequence}</p>
                  <strong>{mixReport.layersMixed} lapisan sudah tercampur merata</strong>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Udara</dt>
                  <dd>{mixReport.aerationBefore}% <span aria-hidden="true">→</span> {mixReport.aerationAfter}%</dd>
                </div>
                <div>
                  <dt>Kelembapan</dt>
                  <dd>{mixReport.moistureBefore}% <span aria-hidden="true">→</span> {mixReport.moistureAfter}%</dd>
                </div>
              </dl>
              {!evaluation.isBalanced ? (
                <p>Aduk berhasil. Campurannya masih perlu diperbaiki: {evaluation.nextAction}</p>
              ) : (
                <p>Aduk berhasil. Rasio bahan, kelembapan, dan udaranya sekarang berada di rentang latihan yang baik.</p>
              )}
            </div>
          ) : null}

          <dl className="compost-lab__metrics">
            <div>
              <dt>Bahan hijau</dt>
              <dd>{state.greens} bagian</dd>
            </div>
            <div>
              <dt>Bahan cokelat</dt>
              <dd>{state.browns} bagian</dd>
            </div>
            <div>
              <dt>Komposisi · target 2:1</dt>
              <dd>
                <meter min={0} max={100} value={evaluation.ratioScore}>{evaluation.ratioScore}%</meter>
                <span>{evaluation.balanceLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Kelembapan</dt>
              <dd>
                <meter min={0} max={100} low={35} high={70} optimum={52} value={state.moisture}>
                  {state.moisture}%
                </meter>
                <span>{state.moisture}% · {evaluation.moistureLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Struktur</dt>
              <dd>{evaluation.structureLabel}</dd>
            </div>
            <div>
              <dt>Sirkulasi udara</dt>
              <dd>
                <meter min={0} max={100} low={35} high={65} optimum={80} value={state.aeration}>
                  {state.aeration}%
                </meter>
                <span>{state.aeration}% · {evaluation.aerationLabel}</span>
              </dd>
            </div>
            <div className="compost-lab__metric--readiness">
              <dt>Kesiapan campuran</dt>
              <dd>
                <meter min={0} max={100} low={45} high={75} optimum={100} value={evaluation.readinessScore}>
                  {evaluation.readinessScore}%
                </meter>
                <span>{evaluation.readinessScore}% · dihitung dari komposisi, air, dan udara</span>
              </dd>
            </div>
          </dl>

          <button
            className="compost-lab__reset"
            type="button"
            disabled={controlsBusy || !hasChanged(state)}
            onClick={() => dispatch({ type: "reset" })}
          >
            Ulangi simulasi
          </button>
        </div>
      </div>

      <p className="compost-lab__disclaimer">
        Ini adalah permainan untuk belajar. Kompos asli dapat berubah dengan cara yang berbeda, jadi periksa bau, panas, dan kelembapannya bersama orang dewasa.
      </p>
    </section>
  );
}
