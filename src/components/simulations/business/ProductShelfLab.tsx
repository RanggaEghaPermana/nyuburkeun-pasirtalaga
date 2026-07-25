import { useReducer } from "react";
import { SimulationShell } from "../shared/SimulationShell";
import { useWebGLSupport } from "../shared/useWebGLSupport";
import { ProductShelfScene } from "./ProductShelfScene";
import {
  CONTAINERS,
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  createInitialProductState,
  evaluateProduct,
  type Container,
  type ProductState,
} from "./evaluateProduct";

type ProductAction =
  | { type: "container"; container: Container }
  | { type: "toggle-label" }
  | { type: "toggle-info" }
  | { type: "price"; price: number }
  | { type: "reset" };

const CAMERA = {
  position: [2.4, 1.7, 3.9] as [number, number, number],
  fov: 38,
};

const CONTAINER_ORDER: Container[] = ["pouch", "bottle", "jar"];

function productReducer(state: ProductState, action: ProductAction): ProductState {
  switch (action.type) {
    case "container":
      return { ...state, container: action.container, actionId: state.actionId + 1 };
    case "toggle-label":
      return { ...state, hasLabel: !state.hasLabel, actionId: state.actionId + 1 };
    case "toggle-info":
      return { ...state, hasInfo: !state.hasInfo, actionId: state.actionId + 1 };
    case "price":
      return {
        ...state,
        price: Math.max(PRICE_MIN, Math.min(PRICE_MAX, action.price)),
        actionId: state.actionId + 1,
      };
    case "reset":
      return createInitialProductState();
  }
}

const rupiah = (value: number) => `Rp${value.toLocaleString("id-ID")}`;

export function ProductShelfLab() {
  const [state, dispatch] = useReducer(productReducer, undefined, createInitialProductState);
  const webGLAvailable = useWebGLSupport();
  const evaluation = evaluateProduct(state);
  const container = CONTAINERS[state.container];
  const initial = createInitialProductState();
  const untouched = state.container === initial.container
    && state.hasLabel === initial.hasLabel
    && state.hasInfo === initial.hasInfo
    && state.price === initial.price;

  return (
    <SimulationShell
      camera={CAMERA}
      disclaimer="Angka biaya dan harga di sini hanya contoh untuk belajar berhitung. Harga sesungguhnya bergantung pada bahan, ukuran, dan pasar di daerahmu."
      eyebrow="Permainan kemasan dan harga 3D"
      fallbackLabel={`Ilustrasi produk: ${container.label}, ${state.hasLabel ? "berlabel" : "tanpa label"}, ${state.hasInfo ? "ada keterangan" : "tanpa keterangan"}, harga ${rupiah(state.price)}.`}
      hudHint="Putar produk 360°"
      hudState={`${container.label} · ${rupiah(state.price)} · untung ${evaluation.marginShare}%`}
      instructions={(
        <>
          <p>
            Rakit produkmu: pilih kemasan, tempelkan label, tulis keterangan yang jujur, lalu tentukan harga jualnya.
          </p>
          <p>
            Seret mendatar area gambar untuk memutar produk 360°. Perhatikan bagaimana biaya kemasan, kepercayaan pembeli, dan harga saling memengaruhi.
          </p>
        </>
      )}
      scene={<ProductShelfScene ready={evaluation.isReady} state={state} />}
      title="Rakit Kemasan dan Tentukan Harga"
      webGLAvailable={webGLAvailable}
      fallback={(
        <div className="sim-lab__fallback-product">
          <strong>{container.label}</strong>
          <span>{state.hasLabel ? "Berlabel" : "Tanpa label"} · {state.hasInfo ? "Ada keterangan" : "Tanpa keterangan"}</span>
          <span>{rupiah(state.price)}</span>
        </div>
      )}
      panel={({ instructionId }) => (
        <>
          <div
            className="sim-lab__controls"
            role="group"
            aria-describedby={instructionId}
            aria-label="Kontrol kemasan dan harga"
          >
            {CONTAINER_ORDER.map((option) => (
              <button
                aria-pressed={state.container === option}
                className={`sim-lab__control${state.container === option ? " sim-lab__control--mix" : ""}`}
                key={option}
                type="button"
                onClick={() => dispatch({ type: "container", container: option })}
              >
                {CONTAINERS[option].label}
              </button>
            ))}
            <button
              aria-pressed={state.hasLabel}
              className={`sim-lab__control${state.hasLabel ? " sim-lab__control--mix" : ""}`}
              type="button"
              onClick={() => dispatch({ type: "toggle-label" })}
            >
              {state.hasLabel ? "✓ Label terpasang" : "Tempelkan label"}
            </button>
            <button
              aria-pressed={state.hasInfo}
              className={`sim-lab__control${state.hasInfo ? " sim-lab__control--mix" : ""}`}
              type="button"
              onClick={() => dispatch({ type: "toggle-info" })}
            >
              {state.hasInfo ? "✓ Keterangan lengkap" : "Tulis keterangan jujur"}
            </button>
          </div>

          <div className="sim-lab__slider">
            <label htmlFor="product-price">
              Harga jual: <strong>{rupiah(state.price)}</strong>
            </label>
            <input
              id="product-price"
              max={PRICE_MAX}
              min={PRICE_MIN}
              onChange={(event) => dispatch({ type: "price", price: Number(event.target.value) })}
              step={PRICE_STEP}
              type="range"
              value={state.price}
            />
            <p>
              Biaya kemasan {rupiah(evaluation.cost)} · kisaran nyaman pembeli {rupiah(container.sweetSpot.min)}–{rupiah(container.sweetSpot.max)}
            </p>
          </div>

          <div
            className={`sim-lab__status sim-lab__status--${evaluation.tone}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="sim-lab__status-label">Kondisi produkmu</p>
            <h3>{evaluation.title}</h3>
            <p>{evaluation.message}</p>
            <p className="sim-lab__next-action"><strong>Coba lakukan:</strong> {evaluation.nextAction}</p>
          </div>

          <dl className="sim-lab__metrics">
            <div>
              <dt>Kemasan terpilih</dt>
              <dd>{container.label} <span>{container.note}</span></dd>
            </div>
            <div>
              <dt>Untung per produk</dt>
              <dd>
                <meter min={0} max={100} low={20} high={60} optimum={40} value={Math.max(evaluation.marginShare, 0)}>
                  {evaluation.marginShare}%
                </meter>
                <span>{rupiah(evaluation.margin)} · {evaluation.marginShare}% · {evaluation.marginLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Kepercayaan pembeli</dt>
              <dd>
                <meter min={0} max={100} low={40} high={99} optimum={100} value={evaluation.trustScore}>
                  {evaluation.trustScore}%
                </meter>
                <span>{evaluation.trustScore}% · {evaluation.trustLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Kecocokan harga</dt>
              <dd>
                <meter min={0} max={100} low={50} high={99} optimum={100} value={evaluation.appealScore}>
                  {evaluation.appealScore}%
                </meter>
                <span>{evaluation.appealScore}% · {evaluation.appealLabel}</span>
              </dd>
            </div>
            <div className="sim-lab__metric--readiness">
              <dt>Kesiapan produk</dt>
              <dd>
                <meter min={0} max={100} low={45} high={75} optimum={100} value={evaluation.readinessScore}>
                  {evaluation.readinessScore}%
                </meter>
                <span>{evaluation.readinessScore}% · dihitung dari harga, kepercayaan, dan untung</span>
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
