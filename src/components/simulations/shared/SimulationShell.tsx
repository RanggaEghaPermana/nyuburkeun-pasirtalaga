import { useId, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { SimulationErrorBoundary } from "./SimulationErrorBoundary";

const DPR: [number, number] = [1, 1.5];

const GL_OPTIONS = {
  alpha: true,
  antialias: true,
  powerPreference: "low-power" as const,
};

export type ShellIds = {
  titleId: string;
  instructionId: string;
};

type SimulationShellProps = {
  eyebrow: string;
  title: string;
  instructions: ReactNode;
  camera: { position: [number, number, number]; fov: number };
  scene: ReactNode;
  fallback: ReactNode;
  fallbackLabel: string;
  hudHint: string;
  hudState: string;
  disclaimer: string;
  webGLAvailable: boolean;
  panel: (ids: ShellIds) => ReactNode;
};

// Kerangka bersama untuk seluruh laboratorium: kepala, panggung 3D beserta
// jalur cadangan tanpa WebGL, panel kontrol, dan catatan penutup. Dipakai agar
// setiap materi mendapat simulasi dengan tata letak dan perilaku yang sama.
export function SimulationShell({
  eyebrow,
  title,
  instructions,
  camera,
  scene,
  fallback,
  fallbackLabel,
  hudHint,
  hudState,
  disclaimer,
  webGLAvailable,
  panel,
}: SimulationShellProps) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const instructionId = `${instanceId}-instructions`;

  return (
    <section className="sim-lab" aria-labelledby={titleId}>
      <header className="sim-lab__header">
        <p className="sim-lab__eyebrow">{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
        <div id={instructionId}>{instructions}</div>
      </header>

      <div className="sim-lab__layout">
        <div className="sim-lab__visual">
          {webGLAvailable ? (
            <div className="sim-lab__canvas" aria-hidden="true">
              <SimulationErrorBoundary
                fallback={<div className="sim-lab__webgl-fallback">Visual 3D tidak dapat dimuat.</div>}
              >
                <Canvas
                  camera={camera}
                  dpr={DPR}
                  fallback={<div className="sim-lab__webgl-fallback">Visual 3D tidak dapat dimuat.</div>}
                  frameloop="demand"
                  gl={GL_OPTIONS}
                >
                  {scene}
                </Canvas>
              </SimulationErrorBoundary>
            </div>
          ) : (
            <div className="sim-lab__fallback" role="img" aria-label={fallbackLabel}>
              {fallback}
              <p>Mode visual sederhana aktif karena WebGL tidak tersedia.</p>
            </div>
          )}
          <div className="sim-stage-hud" aria-hidden="true">
            <span>{hudHint}</span>
            <strong>{hudState}</strong>
          </div>
          <div className="sim-stage-scroll-hint" aria-hidden="true">Geser halaman</div>
        </div>

        <div className="sim-lab__panel">{panel({ titleId, instructionId })}</div>
      </div>

      <p className="sim-lab__disclaimer">{disclaimer}</p>
    </section>
  );
}
