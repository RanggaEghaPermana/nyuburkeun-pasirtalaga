import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";

type FitCameraProps = {
  radius: number;
  centerY?: number;
  margin?: number;
};

const DIRECTION = new Vector3(0.52, 0.38, 1).normalize();

// Tinggi kanvas laboratorium mengikuti tinggi panel kontrol, sehingga rasio
// gambarnya berbeda jauh antara ponsel dan laptop. Dengan fov vertikal tetap,
// objek yang sama akan tampak jauh lebih besar pada kanvas yang lebih tinggi.
//
// Jarak kamera karena itu dihitung dari rasio kanvas: sisi yang paling sempit
// yang menentukan, sehingga bidang pandangnya konsisten di ukuran layar apa pun.
export function FitCamera({ radius, centerY = 0, margin = 1.45 }: FitCameraProps) {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || height === 0) return;

    // Rasio dikurung pada batas bawah: kanvas yang sangat tinggi kalau dituruti
    // sepenuhnya akan menarik kamera terlalu jauh sehingga objeknya jadi kecil.
    // Dengan batas ini, bidang pandang di ponsel dan laptop hampir sama, dan
    // meja yang melebar keluar frame justru membuat panggungnya terasa penuh.
    const aspect = MathUtils.clamp(width / height, 0.78, 1);
    const halfVertical = Math.tan(MathUtils.degToRad(camera.fov * 0.5));
    const distance = (radius / Math.max(halfVertical * aspect, 0.08)) * margin;
    const target = new Vector3(0, centerY, 0);

    camera.position.copy(target).addScaledVector(DIRECTION, distance);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, centerY, height, invalidate, margin, radius, width]);

  return null;
}
