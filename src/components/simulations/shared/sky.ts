import { Vector3 } from "three";

// Palet langit sengaja pucat dan hangat: cakrawalanya hampir sama dengan krem
// halaman, sehingga panel 3D terasa satu keluarga dengan kartu di sekitarnya.
export const SKY = {
  zenith: "#9fc9d2",
  horizon: "#eef0df",
  cloud: "#fdfcf5",
  sun: "#fff1cf",
  groundBounce: "#8f9d6a",
} as const;

export const SUN_DIRECTION = new Vector3(0.52, 0.78, 0.36).normalize();
