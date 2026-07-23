import { Hero } from "../components/Hero";
import { InfoTileGrid } from "../components/ContentBlocks";
import { PageMeta } from "../components/PageMeta";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const targets = [
  {
    title: "Pecinta Tanaman",
    description: "Masyarakat yang memiliki hobi berkebun dan merawat tanaman.",
    image: assets.business.targetGarden,
  },
  {
    title: "Petani",
    description: "Dapat memanfaatkan produk untuk membantu menjaga kesuburan tanaman dan kondisi tanah.",
    image: assets.business.targetFarmer,
  },
  {
    title: "Rumah Tangga",
    description: "Dapat memanfaatkan produk untuk perawatan tanaman dan kebutuhan kebersihan ringan.",
    image: assets.business.targetHome,
  },
  {
    title: "Toko Pertanian",
    description: "Berpotensi menjadi mitra penjualan agar produk lebih mudah dijangkau masyarakat.",
    image: assets.business.targetShop,
  },
];

type Strategy = {
  title: string;
  description: string;
  images: readonly string[];
  imageAlts: readonly string[];
  imageLabels?: readonly string[];
  kind?: "branding" | "promotion";
  visualLabel?: string;
  tutorials?: ReadonlyArray<{ label: string; url: string }>;
  steps?: readonly string[];
  instagramUrl?: string;
};

const strategies: Strategy[] = [
  {
    title: "Logo dan Kemasan Produk",
    description: "Gunakan logo usaha yang mudah dikenali serta kemasan yang bersih, rapi, dan berlabel agar lebih menarik perhatian pembeli.",
    images: [assets.business.businessLogo, assets.business.labelCompost, assets.business.labelEcoEnzyme],
    imageAlts: [
      "Logo usaha Nyuburkeun",
      "Contoh desain label produk kompos organik",
      "Contoh desain label eco enzyme",
    ],
    imageLabels: ["Logo Usaha", "Label Produk Kompos", "Label Produk Eco Enzyme"],
    kind: "branding",
    visualLabel: "Logo usaha dan contoh label produk kompos serta eco enzyme",
    tutorials: [
      {
        label: "Cara Membuat Label Produk di Canva",
        url: "https://youtu.be/3uaIK315454?si=qfnVcJoUwxOOQuz3",
      },
      {
        label: "5 Menit Desain Logo Pakai Canva",
        url: "https://youtu.be/NJBIYkNqW8k?si=hD08nD8Rl1zrKIzc",
      },
    ],
  },
  {
    title: "Promosi",
    description: "Gunakan media sosial untuk memperkenalkan produk dan memudahkan calon pembeli menghubungi penjual.",
    images: [assets.business.digital],
    imageAlts: ["Contoh promosi produk eco enzyme melalui media sosial"],
    kind: "promotion",
    steps: [
      "Membuat akun media sosial.",
      "Membuat konten yang menarik dan edukatif agar menarik perhatian konsumen.",
      "Gunakan caption promosi dengan call to action untuk mendorong konsumen agar membeli produk.",
      "Tautkan nomor telepon sebagai sarana komunikasi dengan konsumen dan untuk memudahkan pembelian produk.",
      "Kunjungi akun Instagram @nyuburkeun_.",
    ],
    instagramUrl: "https://www.instagram.com/nyuburkeun_/",
  },
  {
    title: "Berikan Informasi yang Jujur",
    description: "Tuliskan komposisi, manfaat, dan penggunaan produk agar pembeli merasa aman.",
    images: [assets.business.trust],
    imageAlts: ["Ilustrasi berjabat tangan sebagai simbol kepercayaan"],
  },
  {
    title: "Ikut Kegiatan Lokal",
    description: "Promosikan produk pada bazar, pameran UMKM, atau kegiatan desa untuk memperluas jangkauan pasar.",
    images: [assets.business.local],
    imageAlts: ["Suasana bazar dan pameran usaha lokal"],
  },
];

const checklist = [
  {
    title: "Produk Sudah Siap",
    description:
      "Kompos harus tidak panas dan berbau seperti tanah. Untuk eco enzyme, catat tanggal mulai, tanggal selesai, dan kondisi hasilnya.",
  },
  {
    title: "Label dan Tanggal Sudah Lengkap",
    description:
      "Tulis isi, jumlah, tanggal dibuat, nomor produksi, cara pakai, peringatan, dan kontak pembuat.",
  },
  {
    title: "Kemasan bersih dan utuh",
    description:
      "Pastikan wadah bersih, tidak bocor, mudah disimpan, dan cocok untuk produknya.",
  },
  {
    title: "Biaya sudah dihitung",
    description:
      "Masukkan biaya bahan, kemasan, label, tenaga, penyimpanan, pengiriman, dan risiko produk gagal sebelum menetapkan harga.",
  },
  {
    title: "Jangan Membuat Janji Kesehatan",
    description:
      "Jangan mengatakan produk dapat diminum, menyembuhkan penyakit, merawat luka, atau membunuh kuman.",
  },
];

export default function BusinessPage() {
  return (
    <>
      <PageMeta
        title="Strategi Pemasaran dan Branding Penjualan"
        description="Panduan mengenali target pasar, menyusun strategi pemasaran, dan menyiapkan mutu produk kompos serta eco enzyme."
      />
      <main className="business-page">
        <Hero
          title="Strategi Pemasaran dan Branding Penjualan"
          subtitle="Yuk, belajar membuat produk yang rapi, jujur, dan bermanfaat agar bisa ditawarkan kepada orang lain."
          image={assets.business.hero}
          className="hero--business"
        />

        <section className="business-value page-section page-container">
          <SectionTitle>Mengapa Bisa Dijual?</SectionTitle>
          <div className="business-value__content">
            <div className="business-products">
              <img
                className="business-products__showcase"
                src={assets.business.productShowcase}
                alt="Produk Eco Enzyme dan Kompos Organik dengan label Nyuburkeun di taman"
                loading="lazy"
              />
            </div>
            <p className="section-lead">
              Kompos matang dapat membantu merawat tanah dan tanaman. Eco enzyme dapat ditawarkan untuk penggunaan terbatas. Produk harus dibuat dengan baik, dikemas dengan bersih, dan diberi informasi yang jujur.
            </p>
          </div>
        </section>

        <section className="target-section page-section page-container">
          <SectionTitle>Siapa Target Pasarnya?</SectionTitle>
          <InfoTileGrid items={targets} compact />
        </section>

        <section className="strategy-section page-section page-container">
          <SectionTitle>Cara Mengenalkan Produk (Branding)</SectionTitle>
          <div className="strategy-grid">
            {strategies.map((strategy) => (
              <article
                className={`strategy-card${strategy.kind ? ` strategy-card--${strategy.kind}` : ""}`}
                key={strategy.title}
              >
                <div
                  className={`strategy-card__visual${strategy.images.length > 1 ? " strategy-card__visual--pair" : ""}${strategy.kind === "branding" ? " strategy-card__visual--stickers" : ""}`}
                  aria-label={strategy.visualLabel}
                  role={strategy.visualLabel ? "group" : undefined}
                >
                  {strategy.images.map((image, index) => (
                    strategy.imageLabels ? (
                      <figure className="strategy-card__design" key={image}>
                        <figcaption>{strategy.imageLabels[index]}</figcaption>
                        <img
                          src={image}
                          alt={strategy.imageAlts[index]}
                          loading="lazy"
                        />
                      </figure>
                    ) : (
                      <img
                        src={image}
                        alt={strategy.imageAlts[index]}
                        loading="lazy"
                        key={image}
                      />
                    )
                  ))}
                </div>
                {strategy.kind === "branding" ? (
                  <div className="strategy-card__gallery-cue" aria-hidden="true">
                    <span className="strategy-card__gallery-dots">
                      {strategy.images.map((image) => <i key={image} />)}
                    </span>
                    <span>{strategy.images.length} desain · geser ke samping</span>
                    <span className="strategy-card__gallery-arrow">→</span>
                  </div>
                ) : null}
                <div className="strategy-card__copy">
                  <h3>{strategy.title}</h3>
                  <p>{strategy.description}</p>
                  {strategy.tutorials ? (
                    <div className="strategy-card__resources">
                      <strong>Tutorial membuat label atau logo:</strong>
                      <ul className="strategy-card__link-list">
                        {strategy.tutorials.map((tutorial) => (
                          <li key={tutorial.url}>
                            <a href={tutorial.url} target="_blank" rel="noreferrer">
                              {tutorial.label} <span aria-hidden="true">↗</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {strategy.steps ? (
                    <ol className="strategy-card__steps">
                      {strategy.steps.map((step, index) => (
                        <li key={step}>
                          {index === strategy.steps!.length - 1 && strategy.instagramUrl ? (
                            <a href={strategy.instagramUrl} target="_blank" rel="noreferrer">
                              {step} <span aria-hidden="true">↗</span>
                            </a>
                          ) : step}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="selling-section page-section page-container">
          <SectionTitle>Checklist Sebelum Menjual</SectionTitle>
          <p className="section-lead">
            Periksa lima hal ini sebelum menjual produk. Untuk usaha yang lebih besar, ajak orang dewasa memeriksa aturan usaha dan label yang berlaku di daerahmu.
          </p>
          <ol className="selling-checklist">
            {checklist.map((item, index) => (
              <li key={item.title}>
                <span className="selling-checklist__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

      </main>
      <SiteFooter />
    </>
  );
}
