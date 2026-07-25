import { ContactShadows, Environment, Lightformer } from "@react-three/drei";

type StageDressingProps = {
  groundY?: number;
  scale?: number;
  opacity?: number;
};

// Pencahayaan lingkungan dibangun dari Lightformer, bukan preset HDRI drei,
// karena preset itu mengunduh berkas dari CDN pihak ketiga. Dengan cara ini
// kaca dan cairan mendapat pantulan tanpa permintaan jaringan tambahan.
export function StageDressing({ groundY = -1.2, scale = 6, opacity = 0.38 }: StageDressingProps) {
  return (
    <>
      <Environment resolution={128}>
        <Lightformer color="#fff6dd" intensity={2.6} position={[0, 5, 2.5]} scale={[9, 3, 1]} />
        <Lightformer color="#d3ecdd" intensity={1.1} position={[-4.5, 2, 3]} scale={[3, 4, 1]} />
        <Lightformer color="#ffe6b0" intensity={0.8} position={[4.5, 1.6, -2.5]} scale={[3, 3, 1]} />
        <Lightformer color="#9fc4ad" intensity={0.5} position={[0, -3, 0]} scale={[6, 6, 1]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>
      <ContactShadows
        blur={2.6}
        far={3.2}
        opacity={opacity}
        position={[0, groundY, 0]}
        resolution={256}
        scale={scale}
      />
    </>
  );
}
