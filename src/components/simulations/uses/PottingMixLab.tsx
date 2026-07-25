import { useEffect, useReducer, useState } from "react";
import { RecipeCard } from "../shared/RecipeCard";
import { SimulationShell } from "../shared/SimulationShell";
import { useWebGLSupport } from "../shared/useWebGLSupport";
import { useReducedMotion } from "../shared/useReducedMotion";
import { PottingMixScene } from "./PottingMixScene";
import {
  MIX_CAPACITY,
  createInitialMixState,
  evaluatePottingMix,
  type MixMaterial,
  type MixState,
  type Watering,
} from "./evaluatePottingMix";

type MixAction =
  | { type: "add"; material: MixMaterial }
  | { type: "remove"; material: MixMaterial }
  | { type: "water"; watering: Watering }
  | { type: "reset" };

const MATERIALS: { material: MixMaterial; label: string; hint: string }[] = [
  { material: "soil", label: "Tanah", hint: "bagian terbanyak" },
  { material: "compost", label: "Kompos matang", hint: "sekitar seperempat" },
  { material: "sand", label: "Pasir", hint: "sedikit saja" },
];

const CAMERA = {
  position: [2.7, 2.1, 4.6] as [number, number, number],
  fov: 38,
};

const POUR_DURATION_MS = 1500;

function mixReducer(state: MixState, action: MixAction): MixState {
  switch (action.type) {
    case "add": {
      if (state.layers.length >= MIX_CAPACITY) return state;

      return {
        ...state,
        [action.material]: state[action.material] + 1,
        layers: [...state.layers, { id: state.actionId + 1, material: action.material }],
        actionId: state.actionId + 1,
      };
    }
    case "remove": {
      if (state[action.material] === 0) return state;

      // Butir terakhir dari bahan itu yang dilepas, agar tinggi isi pot ikut
      // turun sesuai jumlah yang benar-benar tersisa.
      let lastIndex = -1;
      for (let index = state.layers.length - 1; index >= 0; index -= 1) {
        if (state.layers[index].material === action.material) {
          lastIndex = index;
          break;
        }
      }

      if (lastIndex === -1) return state;

      return {
        ...state,
        [action.material]: state[action.material] - 1,
        layers: state.layers.filter((_, index) => index !== lastIndex),
        actionId: state.actionId + 1,
      };
    }
    case "water":
      return { ...state, watering: action.watering, actionId: state.actionId + 1 };
    case "reset":
      return createInitialMixState();
  }
}

export function PottingMixLab() {
  const [state, dispatch] = useReducer(mixReducer, undefined, createInitialMixState);
  const [pouring, setPouring] = useState(false);
  const webGLAvailable = useWebGLSupport();
  const reduceMotion = useReducedMotion();
  const evaluation = evaluatePottingMix(state);
  const untouched = state.layers.length === 0 && state.watering === "none";

  useEffect(() => {
    if (!pouring) return;

    const timer = window.setTimeout(() => setPouring(false), POUR_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [pouring]);

  const water = (watering: Watering) => {
    dispatch({ type: "water", watering });
    if (!reduceMotion) setPouring(true);
  };

  const hudState = state.layers.length === 0
    ? "Pot masih kosong"
    : `${state.layers.length}/${MIX_CAPACITY} bagian · kompos ${evaluation.compostShare}%`;

  return (
    <SimulationShell
      camera={CAMERA}
      disclaimer="Ini permainan untuk belajar takaran media tanam. Tanaman sungguhan bereaksi berbeda, jadi coba pada satu tanaman lebih dulu bersama orang dewasa."
      eyebrow="Permainan media tanam 3D"
      fallbackLabel={`Ilustrasi pot: ${state.soil} bagian tanah, ${state.compost} bagian kompos, ${state.sand} bagian pasir, penyiraman ${evaluation.wateringLabel}.`}
      hudHint="Putar pot 360°"
      hudState={hudState}
      instructions={(
        <>
          <p>
            Racik media tanam dengan <strong>tanah sebagai bagian terbanyak</strong>, kompos matang sekitar seperempat, dan sedikit pasir agar air mengalir.
          </p>
          <p>
            Seret mendatar area gambar untuk memutar pot 360°. Setelah campurannya seimbang, pilih cara menyiram dan perhatikan bagaimana tanamannya bereaksi.
          </p>
        </>
      )}
      scene={(
        <PottingMixScene
          plantHealth={evaluation.plantHealth}
          pouring={pouring}
          reduceMotion={reduceMotion}
          state={state}
        />
      )}
      title="Racik Media Tanam dari Kompos"
      webGLAvailable={webGLAvailable}
      fallback={(
        <div className="sim-lab__fallback-bin">
          {state.layers.slice(-10).map((layer) => (
            <span
              className={`sim-lab__fallback-layer sim-lab__fallback-layer--${layer.material}`}
              key={layer.id}
            />
          ))}
        </div>
      )}
      panel={({ instructionId }) => (
        <>
          <RecipeCard
            note="Kompos itu campuran, bukan pengganti tanah. Pot yang diisi kompos murni menahan terlalu banyak air."
            steps={[
              { label: "Tanah jadi bagian terbanyak", done: evaluation.soilShare >= 48 },
              {
                label: "Kompos matang sekitar seperempat pot",
                done: evaluation.compostShare >= 18 && evaluation.compostShare <= 34,
              },
              {
                label: "Sedikit pasir supaya air mengalir",
                done: evaluation.sandShare >= 5 && evaluation.sandShare <= 22,
              },
              { label: `Isi pot minimal 9 dari ${MIX_CAPACITY} bagian`, done: state.layers.length >= 9 },
              {
                label: "Siram air biasa atau eco enzyme yang sudah diencerkan",
                done: state.watering === "plain" || state.watering === "eco-diluted",
              },
            ]}
            title="Resep Media Tanam"
          />

          <div
            className="sim-lab__steppers"
            role="group"
            aria-describedby={instructionId}
            aria-label="Kontrol bahan media tanam"
          >
            {MATERIALS.map(({ material, label, hint }) => (
              <div className="sim-lab__stepper" key={material}>
                <span className="sim-lab__stepper-label">
                  {label} <span>· {hint}</span>
                </span>
                <div className="sim-lab__stepper-controls">
                  <button
                    aria-label={`Kurangi ${label}`}
                    disabled={state[material] === 0}
                    onClick={() => dispatch({ type: "remove", material })}
                    type="button"
                  >
                    −
                  </button>
                  <strong aria-live="off">{state[material]}</strong>
                  <button
                    aria-label={`Tambah ${label}`}
                    disabled={state.layers.length >= MIX_CAPACITY}
                    onClick={() => dispatch({ type: "add", material })}
                    type="button"
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="sim-lab__controls" role="group" aria-label="Cara menyiram">
            <button
              className="sim-lab__control sim-lab__control--water"
              type="button"
              disabled={state.layers.length === 0}
              onClick={() => water("plain")}
            >
              <span aria-hidden="true">＋</span> Siram air biasa
            </button>
            <button
              className="sim-lab__control sim-lab__control--water"
              type="button"
              disabled={state.layers.length === 0}
              onClick={() => water("eco-diluted")}
            >
              <span aria-hidden="true">＋</span> Siram eco enzyme encer
            </button>
            <button
              className="sim-lab__control sim-lab__control--warn"
              type="button"
              disabled={state.layers.length === 0}
              onClick={() => water("eco-strong")}
            >
              <span aria-hidden="true">！</span> Siram eco enzyme pekat
            </button>
          </div>

          <div
            className={`sim-lab__status sim-lab__status--${evaluation.tone}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="sim-lab__status-label">Kondisi media tanammu</p>
            <h3>{evaluation.title}</h3>
            <p>{evaluation.message}</p>
            <p className="sim-lab__next-action"><strong>Coba lakukan:</strong> {evaluation.nextAction}</p>
          </div>

          <dl className="sim-lab__metrics">
            <div>
              <dt>Isi pot</dt>
              <dd>{state.layers.length} dari {MIX_CAPACITY} bagian</dd>
            </div>
            <div>
              <dt>Porsi kompos · sasaran ±25%</dt>
              <dd>
                <meter min={0} max={100} low={18} high={34} optimum={26} value={evaluation.compostShare}>
                  {evaluation.compostShare}%
                </meter>
                <span>{evaluation.compostShare}% kompos · {evaluation.soilShare}% tanah · {evaluation.sandShare}% pasir</span>
              </dd>
            </div>
            <div>
              <dt>Keseimbangan campuran</dt>
              <dd>
                <meter min={0} max={100} low={55} high={82} optimum={100} value={evaluation.mixScore}>
                  {evaluation.mixScore}%
                </meter>
                <span>{evaluation.mixScore}% · {evaluation.mixLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Aliran air</dt>
              <dd>{evaluation.drainageLabel}</dd>
            </div>
            <div>
              <dt>Penyiraman</dt>
              <dd>{evaluation.wateringLabel}</dd>
            </div>
            <div className="sim-lab__metric--readiness">
              <dt>Kondisi tanaman</dt>
              <dd>
                <meter min={0} max={100} low={45} high={75} optimum={100} value={evaluation.plantHealth}>
                  {evaluation.plantHealth}%
                </meter>
                <span>{evaluation.plantHealth}% · dihitung dari campuran dan cara menyiram</span>
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
