import { CatmullRomCurve3, CylinderGeometry, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { taperedTubeGeometry, warpGeometry } from "./geometry";
import { once } from "./textures";

// Alat kebun yang dipakai lebih dari satu simulasi: sekop kecil untuk
// mengaduk atau menyendok, dan gembor untuk menyiram. Titik asal sekop ada di
// ujung mata sekop; titik asal gembor di dasar badannya dengan corong ke +x.

export function trowelGeometry() {
  return once("compost-trowel", () => {
    const blade = warpGeometry(new CylinderGeometry(0.2, 0.2, 0.62, 16, 8, true, Math.PI - 1.05, 2.1), (vertex) => {
      const t = Math.min(Math.max((vertex.y + 0.31) / 0.62, 0), 1);
      const taper = Math.pow(t, 0.55);
      vertex.x *= taper;
      vertex.z = ((vertex.z + 0.2) * taper) - 0.2;
    });
    blade.translate(0, 0.31, 0.2);
    const neck = taperedTubeGeometry(new CatmullRomCurve3([
      new Vector3(0, 0.6, 0.02),
      new Vector3(0, 0.72, 0.06),
      new Vector3(0, 0.8, 0.14),
    ]), () => 0.022, { tubularSegments: 10, radialSegments: 8 });
    const grip = taperedTubeGeometry(new CatmullRomCurve3([
      new Vector3(0, 0.8, 0.14),
      new Vector3(0, 1.05, 0.16),
      new Vector3(0, 1.32, 0.16),
    ]), (t) => 0.05 + (Math.sin(t * Math.PI) * 0.012), { tubularSegments: 16, radialSegments: 12 });
    return { blade, neck, grip };
  });
}

// Gembor: badan lonjong tinggi, corong panjang dari dasar yang naik melewati
// tinggi badan, dan kepala pancuran di ujungnya.
export function wateringCanGeometry() {
  return once("compost-watering-can", () => {
    const body = new CylinderGeometry(0.3, 0.36, 0.86, 36, 1, false);
    body.scale(1.25, 1, 0.9);
    body.translate(0, 0.43, 0);
    const shoulder = new SphereGeometry(0.3, 36, 10, 0, Math.PI * 2, 0, Math.PI * 0.32);
    shoulder.scale(1.25, 0.5, 0.9);
    shoulder.translate(0, 0.86, 0);
    const spout = taperedTubeGeometry(new CatmullRomCurve3([
      new Vector3(0.32, 0.14, 0),
      new Vector3(0.78, 0.55, 0),
      new Vector3(1.22, 1.02, 0),
    ]), (t) => 0.06 - (t * 0.03), { tubularSegments: 18, radialSegments: 12 });
    const rose = new CylinderGeometry(0.035, 0.13, 0.12, 22);
    rose.rotateZ(-0.78);
    rose.translate(1.28, 1.08, 0);
    const handle = new TubeGeometry(new CatmullRomCurve3([
      new Vector3(-0.34, 0.8, 0),
      new Vector3(-0.3, 1.2, 0),
      new Vector3(0.05, 1.28, 0),
      new Vector3(0.3, 0.92, 0),
    ]), 30, 0.032, 8, false);
    const backHandle = new TubeGeometry(new CatmullRomCurve3([
      new Vector3(-0.36, 0.7, 0),
      new Vector3(-0.58, 0.5, 0),
      new Vector3(-0.38, 0.16, 0),
    ]), 20, 0.03, 8, false);
    return { body, shoulder, spout, rose, handle, backHandle };
  });
}
