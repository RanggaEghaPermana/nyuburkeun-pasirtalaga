import { type ReactNode, useEffect, useRef, useState } from "react";

type DeferredSimulationProps = {
  children: ReactNode;
  label: string;
};

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

// Berkas 3D-nya sekitar 240 KB terkompresi. Menagihkan itu hanya karena pembaca
// menggulir melewati simulasinya terasa mahal pada koneksi lambat atau saat
// mode hemat data menyala, jadi pada kondisi tersebut pemuatannya menunggu
// ketukan. Di koneksi lain perilakunya tetap seperti semula.
function prefersLighterPage(): boolean {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection?.saveData) return true;
  if (connection?.effectiveType && SLOW_CONNECTIONS.has(connection.effectiveType)) return true;

  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-data: reduce)").matches;
}

export function DeferredSimulation({ children, label }: DeferredSimulationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [onDemand] = useState(prefersLighterPage);
  const [ready, setReady] = useState(() => (
    typeof window !== "undefined" && !("IntersectionObserver" in window)
  ));

  useEffect(() => {
    const node = rootRef.current;
    if (!node || ready || onDemand) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onDemand, ready]);

  if (ready) {
    return <div className="deferred-simulation" ref={rootRef}>{children}</div>;
  }

  if (onDemand) {
    return (
      <div className="deferred-simulation" ref={rootRef}>
        <div className="simulation-placeholder simulation-placeholder--offer">
          <p className="simulation-placeholder__title">Simulasi 3D siap dijalankan</p>
          <button
            className="simulation-placeholder__start"
            onClick={() => setReady(true)}
            type="button"
          >
            Mulai {label}
          </button>
          <p className="simulation-placeholder__note">
            Perlu memuat sekitar 240 KB. Kami menunda pemuatannya karena koneksimu terbaca lambat atau mode hemat data sedang aktif.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="deferred-simulation" ref={rootRef}>
      <div className="simulation-placeholder" role="status" aria-label={`Menyiapkan ${label}`}>
        <span className="simulation-placeholder__orb" aria-hidden="true" />
        <span>Menyiapkan {label}…</span>
      </div>
    </div>
  );
}
