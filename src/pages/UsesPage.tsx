import { Hero } from "../components/Hero";
import { PageMeta } from "../components/PageMeta";
import { SafetyNotice, SourceList } from "../components/ContentBlocks";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const compostUses = [
  {
    title: "Campuran Tanah untuk Pot",
    description:
      "Campurkan kompos matang dengan tanah dan bahan lain. Jangan isi pot hanya dengan kompos.",
  },
  {
    title: "Tabur di Atas Tanah",
    description:
      "Taburkan kompos matang di atas tanah atau pot. Jauhkan sedikit dari batang tanaman, lalu siram.",
  },
  {
    title: "Untuk Kebun dan Pot",
    description:
      "Gunakan sedikit demi sedikit pada kebun sayur, tanaman hias, atau tanaman dalam pot.",
  },
  {
    title: "Kompos Halus untuk Pot",
    description:
      "Ayak kompos matang, lalu campurkan dengan tanah agar air tetap mudah mengalir. Jangan gunakan kompos murni untuk mengisi pot.",
  },
];

const ecoUses = [
  {
    title: "Pembersihan Ringan",
    description:
      "Eco enzyme yang sudah diencerkan dapat dicoba pada noda ringan. Uji dahulu di bagian kecil dan bilas setelahnya.",
  },
  {
    title: "Ampas Kembali ke Kompos",
    description:
      "Masukkan ampas sedikit demi sedikit ke kompos. Tambahkan daun kering agar campurannya tidak terlalu basah.",
  },
  {
    title: "Catat Setiap Percobaan",
    description:
      "Catat bahan, tanggal, dan baunya. Jika ada alatnya, minta orang dewasa membantu mengukur tingkat keasamannya.",
  },
  {
    title: "Coba pada Satu Tanaman Dulu",
    description:
      "Jangan menyiramkan eco enzyme pekat ke tanaman. Minta bantuan orang dewasa dan coba pada satu tanaman lebih dulu.",
  },
];

const decisions = [
  {
    need: "Membuat tanah lebih gembur",
    choice: "Kompos matang",
    note: "Campurkan sedikit ke tanah atau taburkan di atasnya.",
  },
  {
    need: "Mengolah sisa dapur dan daun",
    choice: "Buat kompos",
    note: "Sisa mentah perlu diolah lebih dulu sampai matang.",
  },
  {
    need: "Membersihkan noda ringan",
    choice: "Sabun atau detergen",
    note: "Eco enzyme hanya boleh dicoba untuk noda ringan, bukan untuk membunuh kuman.",
  },
  {
    need: "Membunuh kuman pada permukaan",
    choice: "Disinfektan yang teruji",
    note: "Pilih produk yang terdaftar dan ikuti petunjuk pada label.",
  },
  {
    need: "Mencuci buah dan sayur",
    choice: "Air mengalir",
    note: "Jangan gunakan eco enzyme, sabun, detergen, atau cairan pencuci rumah tangga pada bahan pangan.",
  },
];

const sources = [
  {
    label: "US EPA: Composting at Home dan penggunaan kompos matang",
    href: "https://www.epa.gov/recycle/composting-home",
  },
  {
    label: "BRMP Jawa Tengah: Panduan pembuatan dan pemanenan eco enzyme (PDF)",
    href: "https://jateng.brmp.pertanian.go.id/storage/assets/uploads/file/zeFPP9HCpOZEKaGMoeUEgD3YHhuJ05VBEg1tfKZY.pdf",
  },
  {
    label: "US EPA: Perbedaan membersihkan, sanitasi, dan disinfeksi",
    href: "https://www.epa.gov/coronavirus-and-disinfectants/whats-difference-between-products-disinfect-sanitize-and-clean",
  },
  {
    label: "CDC: Keamanan saat membersihkan dan menggunakan disinfektan",
    href: "https://www.cdc.gov/hygiene/about/cleaning-and-disinfecting-with-bleach.html",
  },
  {
    label: "US FDA: Cara aman mencuci buah dan sayur",
    href: "https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-produce-safely",
  },
];

export default function UsesPage() {
  return (
    <>
      <PageMeta
        title="Cara Menggunakan Kompos dan Eco Enzyme"
        description="Panduan memilih pemanfaatan kompos matang dan eco enzyme secara tepat, realistis, dan aman."
      />
      <main className="uses-page">
        <Hero
          title="Cara Menggunakan Kompos dan Eco Enzyme"
          subtitle="Yuk, gunakan hasil olahan organik dengan cara yang tepat dan aman bersama orang dewasa."
          image={assets.uses.hero}
          className="hero--uses"
        />

        <section className="uses-section page-section page-container">
          <SectionTitle eyebrow="Sudah matang dan stabil">Pemanfaatan Kompos</SectionTitle>
          <p className="section-lead">
            Kompos matang berwarna gelap, mudah diremas, tidak panas, dan berbau seperti tanah. Gunakan setelah bentuk bahan asalnya tidak terlihat lagi.
          </p>
          <p className="swipe-hint" id="compost-uses-hint">Geser kartu ke samping atau gunakan tombol panah.</p>
          <div
            className="uses-grid"
            tabIndex={0}
            role="region"
            aria-label="Daftar pemanfaatan kompos"
            aria-describedby="compost-uses-hint"
          >
            {compostUses.map((item, index) => (
              <article className="uses-card uses-card--compost" key={item.title}>
                <span className="uses-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="uses-section uses-section--eco page-section page-container">
          <SectionTitle eyebrow="Gunakan secara terbatas">Pemanfaatan Eco Enzyme</SectionTitle>
          <p className="section-lead">
            Hasil eco enzyme buatan rumah bisa berbeda. Gunakan hanya untuk percobaan yang aman bersama orang dewasa. Eco enzyme bukan obat, produk untuk tubuh, atau pembunuh kuman.
          </p>
          <p className="swipe-hint" id="eco-uses-hint">Geser kartu ke samping atau gunakan tombol panah.</p>
          <div
            className="uses-grid"
            tabIndex={0}
            role="region"
            aria-label="Daftar pemanfaatan eco enzyme"
            aria-describedby="eco-uses-hint"
          >
            {ecoUses.map((item, index) => (
              <article className="uses-card uses-card--eco" key={item.title}>
                <span className="uses-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="decision-section page-section page-container">
          <SectionTitle>Pilih Sesuai Kebutuhan</SectionTitle>
          <p className="section-lead">
            Nama produk tidak selalu menunjukkan fungsinya. Mulai dari tujuan, lalu pilih cara yang paling sesuai.
          </p>
          <div className="decision-table-wrap">
            <table className="decision-table">
              <caption className="sr-only">Pilihan pemanfaatan berdasarkan kebutuhan</caption>
              <thead>
                <tr>
                  <th scope="col">Kebutuhan</th>
                  <th scope="col">Pilihan utama</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((item) => (
                  <tr key={item.need}>
                    <th scope="row">{item.need}</th>
                    <td data-label="Pilihan utama"><strong>{item.choice}</strong></td>
                    <td data-label="Catatan">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="safety-section page-section page-container">
          <SafetyNotice title="Batas aman yang perlu diingat">
            <ul>
              <li>Jangan diminum, digunakan pada kulit atau luka, atau disemprotkan ke wajah dan udara.</li>
              <li>Jangan mencampur eco enzyme dengan pemutih, disinfektan, atau bahan pembersih lain.</li>
              <li>Jangan mengatakan eco enzyme dapat membunuh virus atau bakteri karena kemampuannya belum terbukti.</li>
              <li>Minta orang dewasa menyimpan cairan dalam wadah tertutup dan berlabel, jauh dari makanan, minuman, anak kecil, dan hewan.</li>
              <li>Untuk buah dan sayur, gunakan air mengalir; jangan gunakan cairan pembersih rumah tangga.</li>
            </ul>
          </SafetyNotice>
        </section>

        <section className="sources-section page-container" aria-label="Sumber informasi">
          <SourceList items={sources} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
