type GlassMaterialProps = {
  color?: string;
  thickness?: number;
  ior?: number;
};

// Kaca sebelumnya dibuat dengan `transparent` dan `opacity` rendah, yang
// hasilnya selubung susu: isi wadah di belakangnya ikut pudar sampai hilang.
//
// Kaca sungguhan dibuat dengan `transmission`, bukan `opacity`. Three
// membiaskan pemandangan di belakang objek melalui lintasan transmisi
// tersendiri, dan `opacity` justru mematikan efek itu. Pantulannya datang dari
// Environment pada StageDressing.
//
// meshPhysicalMaterial dipakai, bukan MeshTransmissionMaterial dari drei:
// hasilnya sedikit di bawahnya, tetapi ini jalur bawaan three tanpa lintasan
// render tambahan per objek, jadi jauh lebih ringan di ponsel.
export function GlassMaterial({ color = "#e6f2ed", thickness = 0.26, ior = 1.5 }: GlassMaterialProps) {
  return (
    <meshPhysicalMaterial
      clearcoat={0.6}
      clearcoatRoughness={0.12}
      color={color}
      envMapIntensity={1.1}
      ior={ior}
      metalness={0}
      roughness={0.07}
      specularIntensity={1}
      thickness={thickness}
      transmission={1}
    />
  );
}
