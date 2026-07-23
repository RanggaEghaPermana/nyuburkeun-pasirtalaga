import { lazy, Suspense } from "react";
import { MediaCard, SourceList, StepList } from "../components/ContentBlocks";
import { DeferredSimulation } from "../components/simulations/shared/DeferredSimulation";
import { Hero } from "../components/Hero";
import { PageMeta } from "../components/PageMeta";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const WasteSortingLab = lazy(() => import("../components/simulations/sorting/WasteSortingLab").then((module) => ({
  default: module.WasteSortingLab,
})));

const sortingSteps = [
  {
    title: "Siapkan wadah terpisah",
    description: "Siapkan tong berbeda untuk sampah organik, barang yang bisa dipakai lagi, bahan daur ulang, sampah berbahaya, dan sampah lainnya.",
  },
  {
    title: "Pilah sejak dari sumbernya",
    description: "Pilah sampah setelah selesai dipakai agar sisa makanan tidak mengotori barang lain.",
  },
  {
    title: "Jaga bahan daur ulang tetap bersih",
    description: "Kosongkan kemasan, bilas jika perlu, lalu keringkan agar tidak berbau dan mudah didaur ulang.",
  },
  {
    title: "Olah atau salurkan dengan tepat",
    description: "Olah sisa organik menjadi kompos. Bawa bahan daur ulang ke bank sampah dan minta orang dewasa menangani sampah berbahaya.",
  },
];

const sources = [
  {
    label: "Undang-Undang Nomor 18 Tahun 2008 tentang Pengelolaan Sampah",
    href: "https://peraturan.bpk.go.id/Details/39067/uu-no-18-tahun-2008",
  },
  {
    label: "Sistem Informasi Pengelolaan Sampah Nasional: Kementerian Lingkungan Hidup",
    href: "https://sipsn.menlhk.go.id/sipsn/",
  },
];

export default function WastePage() {
  return (
    <>
      <PageMeta
        title="Mengenal Berbagai Jenis Sampah"
        description="Kenali sampah organik dan anorganik, lalu pelajari cara memilahnya dengan benar sejak dari rumah."
      />
      <main>
        <Hero
          title="Mengenal Berbagai Jenis Sampah"
          subtitle="Yuk, kenali jenis sampah dan pilah mulai dari rumah."
          image={assets.waste.hero}
          className="hero--waste"
        />

        <section className="page-section page-container intro-section" aria-labelledby="waste-definition-title">
          <div id="waste-definition-title">
            <SectionTitle>Apa itu Sampah?</SectionTitle>
          </div>
          <div className="intro-card">
            <p>
              Sampah adalah benda atau sisa yang sudah tidak kita pakai. Setiap jenis sampah perlu dipisahkan karena cara mengolahnya berbeda. Dengan memilah sejak awal, barang yang masih berguna tidak ikut terbuang.
            </p>
          </div>
        </section>

        <section className="page-section page-container" aria-labelledby="waste-types-title">
          <div id="waste-types-title">
            <SectionTitle>Berbagai Jenis Sampah</SectionTitle>
          </div>
          <div className="media-card-stack">
            <MediaCard
              title="Sampah Organik"
              image={assets.waste.organic}
              imageAlt="Sisa sayuran dan kulit buah sebagai contoh sampah organik"
              tone="neutral"
            >
              <p>
                Sampah organik berasal dari tumbuhan atau hewan dan mudah terurai. Contohnya sisa sayur, kulit buah, ampas kopi, dan daun kering. Sampah ini dapat diolah menjadi kompos.
              </p>
            </MediaCard>
            <MediaCard
              title="Sampah Anorganik"
              image={assets.waste.inorganic}
              imageAlt="Kemasan plastik dan kaleng sebagai contoh sampah anorganik"
              tone="brand"
              reverse
            >
              <p>
                Sampah anorganik seperti plastik, kaca, dan logam membutuhkan waktu sangat lama untuk terurai. Kosongkan, bersihkan, dan keringkan sebelum dipakai lagi atau dibawa ke tempat daur ulang.
              </p>
            </MediaCard>
          </div>
        </section>

        <div className="simulation-section page-section page-container">
          <DeferredSimulation label="latihan memilah sampah 3D">
            <Suspense fallback={<div className="simulation-placeholder" role="status">Memuat latihan 3D…</div>}>
              <WasteSortingLab />
            </Suspense>
          </DeferredSimulation>
        </div>

        <section className="page-section page-container" aria-labelledby="sorting-title">
          <div id="sorting-title">
            <SectionTitle>Cara Memilah Sampah</SectionTitle>
          </div>
          <StepList items={sortingSteps} />
          <p className="section-note">
            Baterai, lampu, obat kedaluwarsa, dan barang elektronik bekas perlu ditangani khusus. Jangan dibongkar atau disentuh jika bocor. Minta orang dewasa menyimpannya dengan aman dan membawanya ke tempat pengumpulan khusus.
          </p>
        </section>

        <section className="page-section page-container page-sources" aria-label="Sumber informasi">
          <SourceList items={sources} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
