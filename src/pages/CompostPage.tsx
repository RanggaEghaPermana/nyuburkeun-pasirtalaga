import { lazy, Suspense } from "react";
import { FeatureGrid, InfoTileGrid, MediaCard, SafetyNotice, SourceList, StepList } from "../components/ContentBlocks";
import { DeferredSimulation } from "../components/simulations/shared/DeferredSimulation";
import { Hero } from "../components/Hero";
import { PageMeta } from "../components/PageMeta";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const CompostBalanceLab = lazy(() => import("../components/simulations/compost/CompostBalanceLab").then((module) => ({
  default: module.CompostBalanceLab,
})));

const benefits = [
  {
    title: "Mengurangi Sampah",
    description: "Sisa sayur, kulit buah, dan daun bisa diolah di rumah agar tidak menumpuk di tempat sampah.",
    icon: assets.compost.benefitWaste,
  },
  {
    title: "Menyuburkan Tanah",
    description: "Kompos membantu tanah menjadi lebih gembur dan tidak cepat kering.",
    icon: assets.compost.benefitPlant,
  },
  {
    title: "Nutrisi Kembali ke Tanah",
    description: "Nutrisi dari sisa dapur dan kebun dapat kembali membantu tanaman tumbuh.",
    icon: assets.compost.benefitCycle,
  },
];

const materials = [
  {
    title: "Ember Kompos",
    description: "Pakai ember bertutup yang memiliki lubang udara. Pilih ukuran yang cukup untuk sisa dapur di rumah.",
    image: assets.compost.bucket,
    imageAlt: "Ember untuk membuat kompos rumahan",
  },
  {
    title: "Sekop Kecil",
    description: "Gunakan sekop kecil untuk mengaduk bahan agar semuanya mendapat cukup udara.",
    image: assets.compost.shovel,
    imageAlt: "Sekop kecil untuk mengaduk kompos",
  },
  {
    title: "Sisa Sayur dan Kulit Buah",
    description: "Ini disebut bahan hijau. Potong kecil agar lebih cepat terurai.",
    image: assets.compost.greens,
    imageAlt: "Potongan sisa sayur dan kulit buah",
  },
  {
    title: "Daun Kering",
    description: "Ini disebut bahan cokelat. Daun kering membantu menyerap air yang berlebihan.",
    image: assets.compost.browns,
    imageAlt: "Daun kering sebagai bahan cokelat kompos",
  },
  {
    title: "Air Secukupnya",
    description: "Tambahkan sedikit air jika bahan terasa kering. Campuran harus lembap, tetapi tidak becek.",
    image: assets.compost.water,
    imageAlt: "Air untuk menjaga kelembapan kompos",
  },
];

const compostSteps = [
  {
    title: "Siapkan wadah",
    description: "Pilih wadah bertutup yang memiliki lubang udara. Letakkan di tempat teduh dan terlindung dari hujan.",
  },
  {
    title: "Buat lapisan dasar",
    description: "Masukkan daun kering sebagai lapisan pertama. Daun membantu menjaga udara dan air di dalam ember.",
  },
  {
    title: "Tambahkan bahan hijau",
    description: "Masukkan potongan sisa sayur dan kulit buah. Tutup lagi dengan daun kering agar tidak mudah berbau.",
  },
  {
    title: "Jaga udara dan kelembapan",
    description: "Aduk beberapa hari sekali. Tambahkan daun kering jika terlalu basah atau sedikit air jika terlalu kering. Campurannya harus terasa seperti spons yang sudah diperas.",
  },
  {
    title: "Tunggu hingga matang",
    description: "Tunggu sambil terus memeriksa campurannya. Kompos rumahan biasanya matang dalam 30 sampai 60 hari.",
  },
];

const sources = [
  {
    label: "Composting at Home: United States Environmental Protection Agency",
    href: "https://www.epa.gov/recycle/composting-home",
  },
  {
    label: "Approaches to Composting: United States Environmental Protection Agency",
    href: "https://www.epa.gov/sustainable-management-food/approaches-composting",
  },
];

export default function CompostPage() {
  return (
    <>
      <PageMeta
        title="Panduan Membuat Kompos"
        description="Panduan praktis membuat kompos rumahan, mulai dari alat dan bahan hingga mengenali kompos yang sudah matang."
      />
      <main>
        <Hero
          title="Panduan Membuat Kompos"
          subtitle="Yuk, ubah sisa dapur dan daun kering menjadi kompos yang baik untuk tanah."
          image={assets.compost.hero}
          className="hero--compost"
        />

        <section className="page-section page-container intro-section" aria-labelledby="compost-definition-title">
          <div id="compost-definition-title">
            <SectionTitle>Apa itu Kompos?</SectionTitle>
          </div>
          <div className="intro-card">
            <p>
              Kompos berasal dari sisa dapur dan kebun yang diuraikan oleh makhluk hidup sangat kecil. Kompos yang matang berwarna gelap, mudah diremas, dan berbau seperti tanah. Kompos membantu menyuburkan tanah, tetapi tanaman mungkin masih membutuhkan pupuk lain.
            </p>
          </div>
        </section>

        <section className="page-section page-container" aria-labelledby="compost-benefits-title">
          <div id="compost-benefits-title">
            <SectionTitle>Mengapa Membuat Kompos?</SectionTitle>
          </div>
          <FeatureGrid items={benefits} />
        </section>

        <section className="page-section page-container" aria-labelledby="compost-materials-title">
          <div id="compost-materials-title">
            <SectionTitle>Alat dan Bahan</SectionTitle>
          </div>
          <InfoTileGrid items={materials} compact />
        </section>

        <section className="page-section page-container" aria-labelledby="compost-steps-title">
          <div id="compost-steps-title">
            <SectionTitle>Ayo Membuat Kompos</SectionTitle>
          </div>
          <StepList items={compostSteps} />
        </section>

        <div className="simulation-section page-section page-container">
          <DeferredSimulation label="laboratorium kompos 3D">
            <Suspense fallback={<div className="simulation-placeholder" role="status">Memuat laboratorium 3D…</div>}>
              <CompostBalanceLab />
            </Suspense>
          </DeferredSimulation>
        </div>

        <section className="page-section page-container" aria-labelledby="mature-compost-title">
          <div id="mature-compost-title">
            <SectionTitle>Tanda Kompos Sudah Matang</SectionTitle>
          </div>
          <MediaCard
            title="Komposmu Siap Dipakai"
            image={assets.compost.mature}
            imageAlt="Kompos matang berwarna gelap dengan tekstur remah"
            tone="neutral"
          >
            <ul className="check-list">
              <li>Berwarna cokelat tua hingga kehitaman.</li>
              <li>Beraroma tanah dan tidak berbau busuk.</li>
              <li>Mudah diremas dan tidak berlendir.</li>
              <li>Tidak terasa lebih panas daripada udara di sekitarnya.</li>
              <li>Sebagian besar bentuk sisa makanan dan daun sudah tidak terlihat.</li>
            </ul>
          </MediaCard>
        </section>

        <section className="page-section page-container" aria-label="Catatan keamanan membuat kompos">
          <SafetyNotice title="Ayo Membuat Kompos dengan Aman">
            <p>
              Minta bantuan orang dewasa saat membuat kompos. Jangan masukkan daging, ikan, tulang, susu, makanan berminyak, kotoran hewan, atau tanaman yang sakit karena dapat menimbulkan bau, hama, dan kuman. Pakai sarung tangan, lalu cuci tangan setelah selesai.
            </p>
          </SafetyNotice>
        </section>

        <section className="page-section page-container page-sources" aria-label="Sumber informasi">
          <SourceList items={sources} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
