import { useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { NeutralToneMapping } from "three";

const DPR: [number, number] = [1, 1.75];

const GL_OPTIONS = {
  alpha: false,
  antialias: true,
  powerPreference: "default" as const,
};

type LabCanvasProps = {
  camera: { position: [number, number, number]; fov: number };
  children: ReactNode;
  fallback?: ReactNode;
};

// Setelah kanvas kembali terlihat, satu gambar ulang diminta supaya animasi
// yang tadi dijeda (uap, gelembung, lalat) berjalan lagi.
function ResumeWhenVisible({ visible }: { visible: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (visible) invalidate();
  }, [invalidate, visible]);
  return null;
}

// Pengaturan render yang sama untuk kelima laboratorium: bayangan lunak dari
// matahari, dan pemetaan nada Neutral agar warna tong, label, dan brand hijau
// tampil apa adanya, tidak bergeser jingga seperti ACES.
//
// Kanvas berhenti menggambar saat digulir keluar layar. Tanpa ini animasi yang
// berulang terus memakai GPU walaupun tidak ada yang melihatnya.
export function LabCanvas({ camera, children, fallback }: LabCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(Boolean(entry?.isIntersecting));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ height: "100%", width: "100%" }}>
      <Canvas
        camera={camera}
        dpr={DPR}
        fallback={fallback}
        frameloop={visible ? "demand" : "never"}
        gl={GL_OPTIONS}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.toneMappingExposure = 1.02;
        }}
        shadows="percentage"
      >
        <ResumeWhenVisible visible={visible} />
        {children}
      </Canvas>
    </div>
  );
}
