import {
  FeatureGrid,
  InfoTileGrid,
  SafetyNotice,
  SourceList,
  StepList,
} from "../components/ContentBlocks";
import { Hero } from "../components/Hero";
import { PageMeta } from "../components/PageMeta";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const benefits = [
  {
    title: "Percobaan untuk Tanaman",
    description:
      "Jika ingin mencobanya pada tanaman, minta bantuan orang dewasa dan coba pada satu tanaman lebih dulu. Eco enzyme bukan pengganti pupuk.",
    icon: assets.eco.benefitPlant,
  },
  {
    title: "Pembersihan Ringan",
    description:
      "Eco enzyme yang sudah diencerkan dapat dicoba pada noda ringan. Uji dahulu di bagian kecil. Cairan ini bukan pembunuh kuman.",
    icon: assets.eco.benefitClean,
  },
  {
    title: "Mengurangi Sisa Organik",
    description:
      "Kulit buah dan potongan sayur dapat dimanfaatkan agar tidak langsung masuk tempat sampah.",
    icon: assets.eco.benefitEnvironment,
  },
  {
    title: "Ampas Bisa Jadi Kompos",
    description:
      "Ampas yang sudah disaring dapat dimasukkan ke kompos. Simpan cairannya dalam botol berlabel dan jangan gunakan pada makanan.",
    icon: assets.eco.benefitValue,
  },
];

const ingredients = [
  {
    title: "1 Bagian Gula",
    description: "Gunakan tetes tebu, gula merah, atau gula aren. Untuk percobaan kecil, siapkan 100 gram.",
    image: assets.eco.brownSugar,
    imageAlt: "Ilustrasi gula merah sebagai bahan fermentasi",
  },
  {
    title: "3 Bagian Sisa Buah dan Sayur",
    description:
      "Gunakan kulit buah atau potongan sayur mentah yang segar. Hindari daging, susu, minyak, makanan matang, dan bahan asin.",
    image: assets.eco.produce,
    imageAlt: "Ilustrasi kulit buah dan potongan sayur",
  },
  {
    title: "10 Bagian Air",
    description: "Gunakan air bersih. Untuk percobaan kecil ini, siapkan 1 liter air.",
    image: assets.eco.water,
    imageAlt: "Ilustrasi gelas ukur berisi air",
  },
  {
    title: "Wadah Plastik Bertutup",
    description:
      "Pilih wadah plastik yang bersih, kering, dan bertutup rapat. Sisakan seperlima wadah untuk tempat gas.",
    image: assets.eco.container,
    imageAlt: "Ilustrasi wadah plastik bertutup ulir",
  },
];

const steps = [
  {
    title: "Siapkan wadah yang aman",
    description:
      "Pastikan wadah plastik bersih dan kering. Sisakan seperlima ruang kosong dan jangan gunakan botol kaca.",
    image: assets.eco.stepContainer,
  },
  {
    title: "Pilih dan potong bahan organik",
    description:
      "Timbang tiga bagian kulit buah atau sayur mentah. Potong kecil agar mudah terendam.",
    image: assets.eco.stepProduce,
  },
  {
    title: "Tambahkan satu bagian gula",
    description:
      "Masukkan tetes tebu, gula merah, atau gula aren sesuai takaran. Jangan mengganti gula dengan pemanis buatan.",
    image: assets.eco.stepSugar,
  },
  {
    title: "Tuang sepuluh bagian air",
    description:
      "Tuangkan sepuluh bagian air. Jangan mengisi ruang kosong yang sudah disiapkan untuk gas.",
    image: assets.eco.stepWater,
  },
  {
    title: "Aduk dan tutup rapat",
    description:
      "Aduk dengan alat bersih sampai gula larut. Tutup wadah, lalu tulis tanggal mulai dan tanggal siap dibuka.",
    image: assets.eco.stepMix,
  },
  {
    title: "Simpan Selama 90 Hari",
    description:
      "Simpan di tempat teduh dengan aliran udara yang baik. Jika wadah mengembung, minta orang dewasa membuka tutupnya perlahan dan jauh dari wajah.",
    image: assets.eco.stepFerment,
  },
];

const sources = [
  {
    label: "BRMP Pertanian Jawa Tengah: Pembuatan dan Pemanfaatan Eco Enzyme",
    href: "https://jateng.brmp.pertanian.go.id/storage/assets/uploads/file/zeFPP9HCpOZEKaGMoeUEgD3YHhuJ05VBEg1tfKZY.pdf",
  },
  {
    label: "Tinjauan sistematis aplikasi lingkungan",
    href: "https://pubmed.ncbi.nlm.nih.gov/38678793/",
  },
  {
    label: "EPA: Cleaning, sanitizing, dan disinfecting",
    href: "https://www.epa.gov/coronavirus-and-disinfectants/whats-difference-between-products-disinfect-sanitize-and-clean",
  },
  {
    label: "CDC: Jangan mencampur pemutih dengan pembersih lain",
    href: "https://www.cdc.gov/hygiene/about/cleaning-and-disinfecting-with-bleach.html",
  },
];

export default function EcoEnzymePage() {
  return (
    <>
      <PageMeta
        title="Panduan Membuat Eco Enzyme"
        description="Pelajari takaran 1:3:10, proses fermentasi 90 hari, ciri hasil yang siap, dan cara membuat eco enzyme dengan lebih aman."
      />
      <main className="eco-page">
        <Hero
          title="Panduan Membuat Eco Enzyme"
          subtitle="Yuk, pelajari cara mengolah kulit buah dan sisa sayur bersama orang dewasa."
          image={assets.eco.hero}
          className="hero--eco"
        />

        <section className="page-section page-container intro-section" aria-labelledby="eco-intro-title">
          <div id="eco-intro-title">
            <SectionTitle eyebrow="Kenali prosesnya">Apa Itu Eco Enzyme?</SectionTitle>
          </div>
          <div className="intro-card">
            <p>
              Eco enzyme adalah cairan yang dibuat dari sisa buah atau sayur mentah, gula, dan air.
              Campuran ini disimpan selama 90 hari agar mengalami fermentasi.
            </p>
            <p>
              Hasil buatan rumah bisa berbeda dan tidak bebas kuman. Jangan diminum, digunakan pada
              tubuh, atau dianggap sebagai obat dan cairan pembunuh kuman.
            </p>
          </div>
        </section>

        <section className="eco-benefits page-section page-container" aria-labelledby="eco-benefits-title">
          <div id="eco-benefits-title">
            <SectionTitle>Manfaat Eco Enzyme</SectionTitle>
          </div>
          <FeatureGrid items={benefits} />
        </section>

        <section className="ingredients-section page-section page-container" aria-labelledby="ingredients-title">
          <div id="ingredients-title">
            <SectionTitle eyebrow="Resep dasar">Bahan yang Dibutuhkan</SectionTitle>
          </div>
          <InfoTileGrid items={ingredients} compact />
        </section>

        <section className="steps-section page-section page-container" aria-labelledby="steps-title">
          <div id="steps-title">
            <SectionTitle eyebrow="Ikuti berurutan">Langkah Pembuatan</SectionTitle>
          </div>
          <div className="steps-layout">
            <StepList items={steps} visual />
            <aside
              className="ratio-card"
              aria-label="Perbandingan satu bagian gula, tiga bagian sisa buah dan sayur, dan sepuluh bagian air"
            >
              <p className="ratio-card__label">Perbandingan bahan</p>
              <p className="ratio-card__value" aria-hidden="true">1 : 3 : 10</p>
              <p>1 bagian gula · 3 bagian sisa buah dan sayur · 10 bagian air</p>
              <p className="ratio-card__example">Contoh: 100 g gula + 300 g sisa buah/sayur + 1 L air</p>
              <div className="ratio-card__tips">
                <h3>Tips fermentasi</h3>
                <ul>
                  <li>Pastikan semua potongan basah dan dorong kembali bahan yang mengapung.</li>
                  <li>Tulis tanggal mulai dan tanggal panen pada wadah.</li>
                  <li>Simpan jauh dari sinar matahari dan sumber panas.</li>
                </ul>
              </div>
            </aside>
          </div>
          <p className="process-note">
            <strong>Jangan dipanen lebih awal.</strong> Hitung 90 hari penuh sejak semua bahan dicampur.
            Gas biasanya lebih banyak terbentuk pada minggu awal. Periksa wadah secara rutin bersama orang dewasa.
          </p>
        </section>

        <section className="readiness-section page-section page-container" aria-labelledby="readiness-title">
          <div id="readiness-title">
            <SectionTitle eyebrow="Periksa sebelum disaring">Tanda Eco Enzyme Siap Pakai</SectionTitle>
          </div>
          <div className="readiness-card">
            <h3>Setelah 90 hari, periksa tanda berikut</h3>
            <ul className="check-list">
              <li>Warnanya cokelat atau cokelat tua. Sedikit endapan masih dapat muncul.</li>
              <li>Baunya asam dan manis, bukan busuk atau sangat menyengat.</li>
              <li>Tidak ada jamur berbulu berwarna hijau, biru, atau hitam.</li>
              <li>Wadah tidak retak, bocor, atau rusak akibat tekanan.</li>
            </ul>
            <p>
              Jika semua tandanya sesuai, minta orang dewasa menyaringnya dengan alat bersih. Simpan cairan
              dalam botol plastik yang diberi nama dan tanggal. Ampasnya dapat dimasukkan ke kompos. Jangan
              gunakan hasilnya jika bau, jamur, atau wadahnya terlihat mencurigakan.
            </p>
          </div>
        </section>

        <section className="safety-section page-section page-container" aria-label="Informasi keselamatan eco enzyme">
          <SafetyNotice title="Buat dan Gunakan Bersama Orang Dewasa">
            <ul>
              <li>Eco enzyme tidak boleh diminum, dicicipi, atau digunakan pada makanan, kulit, mata, dan luka.</li>
              <li>
                Eco enzyme bukan sanitizer atau disinfektan. Gunakan produk yang sudah teruji jika ingin membunuh kuman.
              </li>
              <li>
                Jangan campurkan eco enzyme dengan pemutih, klorin, amonia, atau cairan pembersih lain.
                Campuran tersebut dapat menghasilkan gas berbahaya.
              </li>
              <li>
                Pakai sarung tangan dan lakukan di tempat yang udaranya mengalir. Minta orang dewasa membuka wadah jauh dari wajah.
              </li>
            </ul>
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
