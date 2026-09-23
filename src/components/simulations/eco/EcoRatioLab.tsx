import { useReducer } from "react";
import { RecipeCard } from "../shared/RecipeCard";
import { SimulationShell } from "../shared/SimulationShell";
import { useWebGLSupport } from "../shared/useWebGLSupport";
import { useReducedMotion } from "../shared/useReducedMotion";
import { EcoRatioScene } from "./EcoRatioScene";
import {
  ECO_BULGE_PRESSURE,
  ECO_CAPACITY,
  ECO_DAY_STEP,
  ECO_FERMENT_DAYS,
  ECO_LIMITS,
  createInitialEcoState,
  evaluateEcoRatio,
  pressureGain,
  type EcoState,
} from "./evaluateEcoRatio";

type EcoIngredient = "sugar" | "scraps" | "water";

type EcoLabAction =
  | { type: "add"; kind: EcoIngredient }
  | { type: "remove"; kind: EcoIngredient }
  | { type: "stir" }
  | { type: "seal" }
  | { type: "wait" }
  | { type: "release" }
  | { type: "reset" };

const CAMERA = {
  position: [4.0, 2.4, 7.0] as [number, number, number],
  fov: 36,
};

const INGREDIENTS: { kind: EcoIngredient; label: string; target: number }[] = [
  { kind: "sugar", label: "Gula", target: 1 },
  { kind: "scraps", label: "Sisa buah & sayur", target: 3 },
  { kind: "water", label: "Air", target: 10 },
];

function ecoReducer(state: EcoState, action: EcoLabAction): EcoState {
  switch (action.type) {
    case "add": {
      const filled = state.sugar + state.scraps + state.water;
      if (state.sealed || filled >= ECO_CAPACITY || state[action.kind] >= ECO_LIMITS[action.kind]) {
        return state;
      }

      return {
        ...state,
        [action.kind]: state[action.kind] + 1,
        // Gula baru mengendap lagi sampai diaduk ulang.
        stirred: action.kind === "sugar" ? false : state.stirred,
        actionId: state.actionId + 1,
        lastAction: action.kind,
      };
    }
    case "remove": {
      if (state.sealed || state[action.kind] === 0) return state;

      return {
        ...state,
        [action.kind]: state[action.kind] - 1,
        stirred: state.stirred && !(action.kind === "sugar" && state.sugar === 1),
        actionId: state.actionId + 1,
        lastAction: null,
      };
    }
    case "stir":
      if (state.sealed || state.sugar === 0 || state.water === 0) return state;
      return { ...state, stirred: true, actionId: state.actionId + 1, lastAction: "stir" };
    case "seal":
      if (state.sealed || !state.stirred) return state;
      return { ...state, sealed: true, actionId: state.actionId + 1, lastAction: "seal" };
    case "wait": {
      if (!state.sealed || state.days >= ECO_FERMENT_DAYS || state.pressure >= ECO_BULGE_PRESSURE) return state;
      const days = Math.min(state.days + ECO_DAY_STEP, ECO_FERMENT_DAYS);
      return {
        ...state,
        days,
        pressure: state.pressure + pressureGain(days),
        actionId: state.actionId + 1,
        lastAction: "wait",
      };
    }
    case "release":
      if (!state.sealed || state.pressure === 0) return state;
      return {
        ...state,
        pressure: 0,
        releases: state.releases + 1,
        actionId: state.actionId + 1,
        lastAction: "release",
      };
    case "reset":
      return createInitialEcoState();
  }
}

export function EcoRatioLab() {
  const [state, dispatch] = useReducer(ecoReducer, undefined, createInitialEcoState);
  const webGLAvailable = useWebGLSupport();
  const reduceMotion = useReducedMotion();
  const evaluation = evaluateEcoRatio(state);
  const filled = evaluation.filled;
  const fermenting = state.sealed && state.days < ECO_FERMENT_DAYS;
  const untouched = filled === 0 && !state.sealed && state.days === 0;

  const hudState = filled === 0
    ? "Wadah masih kosong"
    : !state.sealed
      ? `${state.sugar} : ${state.scraps} : ${state.water} · ${evaluation.headspace}% ruang gas${state.sugar > 0 && !state.stirred ? " · gula mengendap" : ""}`
      : state.days >= ECO_FERMENT_DAYS
        ? "Fermentasi 90 hari selesai"
        : evaluation.bulging
          ? `Hari ke-${state.days} · wadah mengembung!`
          : `Hari ke-${state.days} · ${evaluation.pressureLabel.toLowerCase()}`;

  return (
    <SimulationShell
      camera={CAMERA}
      disclaimer="Ini permainan untuk belajar takaran. Eco enzyme buatan rumah tidak steril, tidak boleh diminum, dan bukan pengganti disinfektan. Selalu kerjakan bersama orang dewasa."
      eyebrow="Permainan eco enzyme 3D"
      fallbackLabel={`Ilustrasi wadah eco enzyme: ${state.sugar} bagian gula, ${state.scraps} bagian sisa buah dan sayur, ${state.water} bagian air, ruang kosong ${evaluation.headspace} persen.`}
      hudHint="Putar wadah 360°"
      hudState={hudState}
      instructions={(
        <>
          <p>
            Susun takaran <strong>1 bagian gula : 3 bagian sisa buah dan sayur : 10 bagian air</strong>. Bahan di meja berpindah ke dalam wadah, dan skala di dinding wadah menunjukkan berapa bagian yang sudah terisi.
          </p>
          <p>
            Seret mendatar area gambar untuk memutar wadah 360°. Isi jangan melewati garis merah batas isi, aduk sampai gula larut, tutup rapat, lalu periksa wadahnya selama 90 hari karena gas terus terbentuk.
          </p>
        </>
      )}
      scene={<EcoRatioScene state={state} reduceMotion={reduceMotion} fermenting={fermenting} />}
      title="Racik Takaran Eco Enzyme"
      webGLAvailable={webGLAvailable}
      fallback={(
        <div className="sim-lab__fallback-bars">
          <span style={{ width: `${(state.sugar / ECO_LIMITS.sugar) * 100}%` }} data-kind="sugar" />
          <span style={{ width: `${(state.scraps / ECO_LIMITS.scraps) * 100}%` }} data-kind="scraps" />
          <span style={{ width: `${(state.water / ECO_LIMITS.water) * 100}%` }} data-kind="water" />
        </div>
      )}
      panel={({ instructionId }) => (
        <>
          <RecipeCard
            note="Perbandingannya boleh dikalikan, misal 2 : 6 : 20, selama wadahnya masih menyisakan ruang untuk gas."
            steps={[
              { label: "Masukkan gula sebagai patokan takaran", done: state.sugar > 0 },
              {
                label: "Sisa buah & sayur = 3 kali gula",
                done: state.sugar > 0 && Math.abs((state.scraps / state.sugar) - 3) <= 0.4,
              },
              {
                label: "Air = 10 kali gula",
                done: state.sugar > 0 && Math.abs((state.water / state.sugar) - 10) <= 1,
              },
              { label: "Isi tidak melewati garis batas isi (ruang gas 20%)", done: filled > 0 && evaluation.headspace >= 20 },
              { label: "Aduk sampai gula larut", done: state.stirred },
              { label: "Tutup rapat dan tulis tanggalnya", done: state.sealed },
              { label: "Buka tutup perlahan saat wadah mengembung", done: state.releases > 0 },
              { label: "Simpan di tempat teduh sampai hari ke-90", done: state.days >= ECO_FERMENT_DAYS },
            ]}
            title="Resep Eco Enzyme"
          />

          <div
            className="sim-lab__steppers"
            role="group"
            aria-describedby={instructionId}
            aria-label="Kontrol takaran eco enzyme"
          >
            {INGREDIENTS.map(({ kind, label, target }) => (
              <div className="sim-lab__stepper" key={kind}>
                <span className="sim-lab__stepper-label">
                  {label} <span>· target {target} bagian</span>
                </span>
                <div className="sim-lab__stepper-controls">
                  <button
                    aria-label={`Kurangi ${label}`}
                    disabled={state.sealed || state[kind] === 0}
                    onClick={() => dispatch({ type: "remove", kind })}
                    type="button"
                  >
                    −
                  </button>
                  <strong aria-live="off">{state[kind]}</strong>
                  <button
                    aria-label={`Tambah ${label}`}
                    disabled={state.sealed || state[kind] >= ECO_LIMITS[kind] || filled >= ECO_CAPACITY}
                    onClick={() => dispatch({ type: "add", kind })}
                    type="button"
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="sim-lab__controls" role="group" aria-label="Tahap fermentasi">
            <button
              className="sim-lab__control sim-lab__control--mix"
              type="button"
              disabled={!evaluation.canStir}
              onClick={() => dispatch({ type: "stir" })}
            >
              {state.stirred || state.sealed ? "✓ Gula sudah larut" : "Aduk sampai larut"}
            </button>
            <button
              className="sim-lab__control sim-lab__control--mix"
              type="button"
              disabled={!evaluation.canSeal}
              onClick={() => dispatch({ type: "seal" })}
            >
              {state.sealed ? "✓ Tertutup rapat" : "Tutup rapat"}
            </button>
            <button
              className="sim-lab__control sim-lab__control--mix"
              type="button"
              disabled={!evaluation.canWait}
              onClick={() => dispatch({ type: "wait" })}
            >
              Lewati {ECO_DAY_STEP} hari
            </button>
            <button
              className={`sim-lab__control${evaluation.bulging ? " sim-lab__control--warn" : ""}`}
              type="button"
              disabled={!evaluation.canRelease}
              onClick={() => dispatch({ type: "release" })}
            >
              Buka tutup perlahan
            </button>
          </div>

          <div
            className={`sim-lab__status sim-lab__status--${evaluation.tone}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="sim-lab__status-label">Kondisi racikanmu</p>
            <h3>{evaluation.title}</h3>
            <p>{evaluation.message}</p>
            <p className="sim-lab__next-action"><strong>Coba lakukan:</strong> {evaluation.nextAction}</p>
          </div>

          <dl className="sim-lab__metrics">
            <div>
              <dt>Takaranmu</dt>
              <dd>{state.sugar} : {state.scraps} : {state.water} <span>target 1 : 3 : 10</span></dd>
            </div>
            <div>
              <dt>Ketepatan takaran</dt>
              <dd>
                <meter min={0} max={100} low={55} high={85} optimum={100} value={evaluation.ratioScore}>
                  {evaluation.ratioScore}%
                </meter>
                <span>{evaluation.ratioScore}% · {evaluation.ratioLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Ruang untuk gas</dt>
              <dd>
                <meter min={0} max={100} low={20} high={60} optimum={40} value={evaluation.headspace}>
                  {evaluation.headspace}%
                </meter>
                <span>{evaluation.headspace}% · {evaluation.headspaceLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Tekanan gas</dt>
              <dd>
                <meter min={0} max={130} low={50} high={99} optimum={0} value={state.sealed ? state.pressure : 0}>
                  {state.pressure}
                </meter>
                <span>{evaluation.pressureLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Fermentasi</dt>
              <dd>
                <meter min={0} max={100} low={40} high={90} optimum={100} value={evaluation.fermentProgress}>
                  {evaluation.fermentProgress}%
                </meter>
                <span>{evaluation.fermentLabel}</span>
              </dd>
            </div>
            <div className="sim-lab__metric--readiness">
              <dt>Kesiapan racikan</dt>
              <dd>
                <meter min={0} max={100} low={45} high={75} optimum={100} value={evaluation.readinessScore}>
                  {evaluation.readinessScore}%
                </meter>
                <span>{evaluation.readinessScore}% · dihitung dari takaran, ruang gas, dan lama fermentasi</span>
              </dd>
            </div>
          </dl>

          <button
            className="sim-lab__reset"
            type="button"
            disabled={untouched}
            onClick={() => dispatch({ type: "reset" })}
          >
            Ulangi simulasi
          </button>
        </>
      )}
    />
  );
}
