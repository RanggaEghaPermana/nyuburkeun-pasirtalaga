import { Link } from "react-router-dom";
import { SourceList } from "../components/ContentBlocks";
import { Hero } from "../components/Hero";
import { MythFacts } from "../components/practice/MythFacts";
import { PracticalCalculator } from "../components/practice/PracticalCalculator";
import { ProcessJournal } from "../components/practice/ProcessJournal";
import { Troubleshooter } from "../components/practice/Troubleshooter";
import { WasteAudit } from "../components/practice/WasteAudit";
import { PageMeta } from "../components/PageMeta";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const practiceTools = [
  {
    number: "01",
    title: "Kalkulator Takaran",
    description: "Ubah ukuran ember atau jumlah air menjadi takaran bahan yang mudah disiapkan.",
    href: "#kalkulator",
  },
  {
    number: "02",
    title: "Jurnal Proses",
    description: "Pantau umur campuran, jadwal pemeriksaan, kondisi, dan tindakan yang sudah dilakukan.",
    href: "#jurnal",
  },
  {
    number: "03",
    title: "Masalah dan Solusi",
    description: "Kenali kemungkinan penyebab bau, kondisi terlalu basah, gas, jamur, dan masalah lainnya.",
    href: "#masalah-solusi",
  },
  {
    number: "04",
    title: "Audit Sampah 7 Hari",
    description: "Catat sampah rumah selama satu minggu dan temukan kebiasaan yang paling perlu diubah.",
    href: "#audit",
  },
  {
    number: "05",
    title: "Mitos atau Fakta",
    description: "Buka penjelasan singkat untuk membedakan kebiasaan yang tepat dari klaim yang keliru.",
    href: "#mitos-fakta",
  },
];

const sources = [
  {
    label: "EPA: Composting at Home",
    href: "https://www.epa.gov/recycle/composting-home",
  },
  {
    label: "EPA: Preventing Wasted Food at Home",
    href: "https://www.epa.gov/recycle/preventing-wasted-food-home",
  },
  {
    label: "NOAA Marine Debris Program: Conduct a Waste Audit",
    href: "https://marinedebris.noaa.gov/how-help/school",
  },
  {
    label: "Permen LHK Nomor 14 Tahun 2021 tentang Pengelolaan Sampah pada Bank Sampah",
    href: "https://jdih.menlhk.go.id/kiosk/files/2021pmlhk014_menlhk_07162021153127.pdf",
  },
  {
    label: "CDC: Keselamatan penggunaan pemutih dan bahan pembersih",
    href: "https://www.cdc.gov/hygiene/about/cleaning-and-disinfecting-with-bleach.html",
  },
];

export default function PracticePage() {
  return (
    <>
      <PageMeta
        title="Pendamping Praktik"
        description="Kalkulator takaran, jurnal kompos dan eco enzyme, pusat masalah dan solusi, audit sampah 7 hari, serta materi mitos atau fakta."
      />
      <main className="practice-page">
        <Hero
          title="Pendamping Praktik"
          subtitle="Bukan cuma membaca—hitung bahan, catat proses, periksa masalah, dan ukur perubahan dari rumah."
          image={assets.home.hero}
          className="hero--practice"
        >
          <a className="button button--hero" href="#alat-praktik">Buka alat praktik</a>
        </Hero>

        <section className="page-section page-container practice-intro" id="alat-praktik" aria-labelledby="practice-intro-title">
          <div id="practice-intro-title">
            <SectionTitle eyebrow="Dari belajar menjadi kebiasaan">Pilih Alat yang Kamu Butuhkan</SectionTitle>
          </div>
          <p className="section-lead">
            Gunakan alat berikut saat praktik berlangsung. Jurnal dan audit tersimpan hanya di browser
            perangkat ini, sehingga catatanmu tetap tersedia ketika halaman dibuka kembali.
          </p>
          <nav className="practice-tool-nav" aria-label="Daftar alat pendamping praktik">
            {practiceTools.map((tool) => (
              <a href={tool.href} key={tool.href}>
                <span>{tool.number}</span>
                <div>
                  <strong>{tool.title}</strong>
                  <p>{tool.description}</p>
                </div>
                <i aria-hidden="true">↘</i>
              </a>
            ))}
          </nav>
        </section>

        <section className="page-section practice-tool-section practice-tool-section--tint" id="kalkulator" aria-labelledby="calculator-title">
          <div className="page-container">
            <div id="calculator-title">
              <SectionTitle eyebrow="Sesuaikan dengan wadahmu">Kalkulator Takaran Praktis</SectionTitle>
            </div>
            <p className="section-lead">
              Pilih kompos atau eco enzyme. Hasilnya adalah takaran awal; kondisi bahan tetap perlu
              diperiksa selama proses berlangsung.
            </p>
            <PracticalCalculator />
          </div>
        </section>

        <section className="page-section practice-tool-section" id="jurnal" aria-labelledby="journal-title">
          <div className="page-container">
            <div id="journal-title">
              <SectionTitle eyebrow="Simpan perkembangan">Jurnal Kompos dan Eco Enzyme</SectionTitle>
            </div>
            <p className="section-lead">
              Masukkan tanggal mulai untuk melihat hari proses dan pemeriksaan berikutnya. Tambahkan catatan
              setiap kali kamu mengecek wadah.
            </p>
            <ProcessJournal />
          </div>
        </section>

        <section className="page-section practice-tool-section practice-tool-section--dark" id="masalah-solusi" aria-labelledby="troubleshooter-title">
          <div className="page-container">
            <div id="troubleshooter-title">
              <SectionTitle eyebrow="Periksa sebelum bertindak" invert>Masalah dan Solusi</SectionTitle>
            </div>
            <p className="section-lead">
              Pilih kondisi yang paling mirip dengan campuranmu. Jika wadah rusak, muncul jamur berwarna,
              atau baunya sangat mencurigakan, hentikan penggunaan dan minta bantuan orang dewasa.
            </p>
            <Troubleshooter />
          </div>
        </section>

        <section className="page-section practice-tool-section" id="audit" aria-labelledby="audit-title">
          <div className="page-container">
            <div id="audit-title">
              <SectionTitle eyebrow="Kenali kebiasaan rumah">Audit Sampah 7 Hari</SectionTitle>
            </div>
            <p className="section-lead">
              Timbang sampah yang dihasilkan setiap hari. Di akhir minggu, gunakan kategori terbesar
              sebagai sasaran perubahan pertama.
            </p>
            <WasteAudit />
          </div>
        </section>

        <section className="page-section practice-tool-section practice-tool-section--tint" id="mitos-fakta" aria-labelledby="myth-title">
          <div className="page-container practice-myth-layout">
            <div>
              <div id="myth-title">
                <SectionTitle eyebrow="Jangan mudah percaya">Mitos atau Fakta?</SectionTitle>
              </div>
              <p className="section-lead">
                Buka setiap pernyataan untuk mengetahui penjelasannya. Informasi ini juga membantu
                menjaga klaim produk tetap jujur dan aman.
              </p>
              <aside className="practice-reminder">
                <strong>Ingat tiga batas aman</strong>
                <p>Jangan diminum, jangan dicampur bahan pembersih, dan jangan menangani wadah bermasalah tanpa orang dewasa.</p>
              </aside>
            </div>
            <MythFacts />
          </div>
        </section>

        <section className="page-section page-container practice-finish" aria-labelledby="practice-finish-title">
          <div>
            <p className="practice-card-kicker">Sudah siap memulai?</p>
            <h2 id="practice-finish-title">Pelajari langkah dasarnya sebelum memakai alat pendamping.</h2>
          </div>
          <div>
            <Link className="practice-secondary-button" to="/panduan-kompos">Baca panduan kompos</Link>
            <Link className="practice-primary-button" to="/eco-enzyme">Baca panduan eco enzyme</Link>
          </div>
        </section>

        <section className="page-section page-container page-sources" aria-label="Sumber informasi">
          <SourceList items={sources} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
