import { type ReactNode, useEffect, useRef, useState } from "react";

type DeferredSimulationProps = {
  children: ReactNode;
  label: string;
};

export function DeferredSimulation({ children, label }: DeferredSimulationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => (
    typeof window !== "undefined" && !("IntersectionObserver" in window)
  ));

  useEffect(() => {
    const node = rootRef.current;
    if (!node || ready) return;

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
  }, [ready]);

  return (
    <div className="deferred-simulation" ref={rootRef}>
      {ready ? children : (
        <div className="simulation-placeholder" role="status" aria-label={`Menyiapkan ${label}`}>
          <span className="simulation-placeholder__orb" aria-hidden="true" />
          <span>Menyiapkan {label}…</span>
        </div>
      )}
    </div>
  );
}
