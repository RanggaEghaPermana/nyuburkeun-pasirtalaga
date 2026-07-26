import { lazy, Suspense, type CSSProperties } from "react";
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

// Warnanya sengaja disamakan dengan tong pada simulasi pemilahan 3D (lihat
// sortingBins.ts) supaya anak langsung mengenali kategorinya saat bermain.
const sortingBinGuide = [
  {
    name: "Organik",
    color: "#238b57",
    contrast: "#ffffff",
    description: "Sisa makanan, daun, dan kulit buah yang mudah membusuk secara alami. Masukkan ke tong hijau untuk diolah menjadi kompos.",
  },
  {
    name: "Guna Ulang",
    color: "#f2b731",
    contrast: "#17362a",
    description: "Barang yang masih utuh dan bisa dipakai lagi, seperti botol, wadah, dan pakaian. Cuci bersih, lalu pakai kembali daripada membeli baru.",
  },
  {
    name: "Daur Ulang",
    color: "#287fa8",
    contrast: "#ffffff",
    description: "Kertas, kaleng, dan plastik bersih yang dapat diolah menjadi bahan baru. Kosongkan dan keringkan sebelum dibawa ke bank sampah.",
  },
  {
    name: "B3 Berbahaya",
    color: "#d94b3d",
    contrast: "#ffffff",
    description: "Baterai, lampu, dan kaleng aerosol mengandung bahan berbahaya. Jangan dibongkar atau disentuh jika bocor. Minta orang dewasa menyimpannya dengan aman dan membawanya ke tempat pengumpulan khusus.",
  },
  {
    name: "Lainnya",
    color: "#59615e",
    contrast: "#ffffff",
    description: "Tisu kotor, popok, dan puntung rokok tidak dapat diolah lagi. Masukkan ke tong lainnya agar tidak mengotori bahan yang masih berguna.",
  },
];

const threeR = [
  {
    title: "Kurangi (Reduce)",
    description: "Cegah sampah sejak awal. Bawa tas belanja dan botol minum sendiri agar tidak menerima kantong plastik dan botol sekali pakai.",
  },
  {
    title: "Pakai Lagi (Reuse)",
    description: "Gunakan kembali barang yang masih utuh. Wadah bekas bisa menjadi pot tanaman atau tempat penyimpanan.",
  },
  {
    title: "Daur Ulang (Recycle)",
    description: "Salurkan kertas, kaleng, dan plastik bersih ke bank sampah agar diolah menjadi barang baru.",
  },
];

// Angka perkiraan dari kurikulum Talking Trash & Taking Action (Ocean
// Conservancy dan NOAA) untuk sampah di lingkungan laut.
const decompositionTimes = [
  { item: "Kulit buah dan sisa sayur", time: "2–5 minggu" },
  { item: "Koran dan kertas", time: "±6 minggu" },
  { item: "Kardus", time: "±2 bulan" },
  { item: "Kantong plastik", time: "10–20 tahun" },
  { item: "Gelas styrofoam", time: "±50 tahun" },
  { item: "Kaleng aluminium", time: "±200 tahun" },
  { item: "Popok sekali pakai", time: "±450 tahun" },
  { item: "Botol plastik", time: "±450 tahun" },
  { item: "Kaca", time: "Jutaan tahun" },
];

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
  {
    label: "NOAA Marine Debris Program: The Mystery of How Long Until It's Gone",
    href: "https://marinedebris.noaa.gov/discover-marine-debris/mystery-how-long-until-it-s-gone",
  },
];

export default function WastePage() {
  return (
    <>
      <PageMeta
        title="Mengenal Berbagai Jenis Sampah"
        description="Kenali sampah organik dan anorganik, lima kategori tong pilah, prinsip 3R, lama terurainya sampah, dan cara memilah dengan benar sejak dari rumah."
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

        <section className="page-section page-container" aria-labelledby="waste-why-title">
          <div id="waste-why-title">
            <SectionTitle>Mengapa Harus Memilah?</SectionTitle>
          </div>
          <div className="intro-card">
            <p>
              Memilah bukan sekadar merapikan tong. Kalau semua sampah dicampur jadi satu, banyak
              hal baik yang ikut rusak:
            </p>
            <ul className="check-list">
              <li>Tumpukan di tempat pembuangan cepat penuh karena sampah yang masih berguna ikut terbuang.</li>
              <li>Sampah berbahaya dapat mencemari tanah dan air jika ikut terbuang sembarangan.</li>
              <li>Sisa organik yang mengotori kertas dan plastik membuat keduanya tidak bisa didaur ulang.</li>
            </ul>
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

        <section className="page-section page-container" aria-labelledby="waste-bins-title">
          <div id="waste-bins-title">
            <SectionTitle>Kenali Lima Tong Pilah</SectionTitle>
          </div>
          <p className="section-lead">
            Kedua jenis tadi dibagi lagi menjadi lima tong agar mudah ditangani. Warna kartunya sama
            seperti tong pada latihan memilah 3D di bawah, jadi coba kenali dulu sebelum bermain.
          </p>
          <div className="waste-bin-grid">
            {sortingBinGuide.map((bin) => (
              <article
                className="waste-bin-card"
                style={{ "--accent": bin.color, "--accent-contrast": bin.contrast } as CSSProperties}
                key={bin.name}
              >
                <span className="waste-bin-card__chip">{bin.name}</span>
                <p>{bin.description}</p>
              </article>
            ))}
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

        <section className="page-section page-container" aria-labelledby="three-r-title">
          <div id="three-r-title">
            <SectionTitle>Prinsip 3R</SectionTitle>
          </div>
          <p className="section-lead">
            Selain memilah, ada tiga kebiasaan yang membuat sampah kita semakin sedikit. Urutannya
            penting: kurangi dulu, lalu pakai lagi, terakhir daur ulang.
          </p>
          <p className="swipe-hint" id="three-r-hint">Geser kartu ke samping atau gunakan tombol panah.</p>
          <div
            className="uses-grid"
            tabIndex={0}
            role="region"
            aria-label="Daftar prinsip 3R"
            aria-describedby="three-r-hint"
          >
            {threeR.map((item, index) => (
              <article className="uses-card uses-card--compost" key={item.title}>
                <span className="uses-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="page-section page-container" aria-labelledby="decomposition-title">
          <div id="decomposition-title">
            <SectionTitle>Lama Terurainya Sampah</SectionTitle>
          </div>
          <p className="section-lead">
            Setiap benda terurai dalam waktu yang berbeda. Semakin lama terurainya, semakin penting
            untuk mengurangi, memakai ulang, atau mendaur ulangnya daripada membuang begitu saja.
          </p>
          <div className="decision-table-wrap">
            <table className="decision-table">
              <caption className="sr-only">Perkiraan waktu terurai berbagai jenis sampah</caption>
              <thead>
                <tr>
                  <th scope="col">Sampah</th>
                  <th scope="col">Perkiraan waktu terurai</th>
                </tr>
              </thead>
              <tbody>
                {decompositionTimes.map((entry) => (
                  <tr key={entry.item}>
                    <th scope="row">{entry.item}</th>
                    <td data-label="Perkiraan waktu terurai"><strong>{entry.time}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note">
            Angka di atas hanyalah perkiraan. Plastik sebenarnya tidak hilang sepenuhnya, melainkan
            pecah menjadi potongan sangat kecil yang disebut mikroplastik dan tetap ada di lingkungan.
            Karena itu, mencegah sampah sejak awal selalu lebih baik daripada membuangnya.
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
