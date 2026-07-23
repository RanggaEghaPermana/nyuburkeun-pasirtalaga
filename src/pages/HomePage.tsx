import { useState } from "react";
import { Link } from "react-router-dom";
import { FeatureGrid } from "../components/ContentBlocks";
import { Hero } from "../components/Hero";
import { PageMeta } from "../components/PageMeta";
import { SectionTitle } from "../components/SectionTitle";
import { SiteFooter } from "../components/SiteFooter";
import { assets } from "../lib/assets";

const benefits = [
  {
    title: "Mengurangi Sampah",
    description: "Sisa sayur, kulit buah, dan daun bisa diolah agar tidak menumpuk di tempat sampah.",
    icon: assets.home.benefitWaste,
  },
  {
    title: "Menjaga Lingkungan",
    description: "Yuk, biasakan memilah sampah mulai dari rumah.",
    icon: assets.home.benefitEnvironment,
  },
  {
    title: "Memberi Nilai Guna",
    description: "Sisa dapur dapat diubah menjadi kompos dan bahan lain yang berguna.",
    icon: assets.home.benefitValue,
  },
];

const lessons = [
  { title: "Mengenal Sampah", to: "/mengenal-sampah", image: assets.home.lessonWaste, tone: "neutral" },
  { title: "Panduan Kompos", to: "/panduan-kompos", image: assets.home.lessonCompost, tone: "brand" },
  { title: "Eco Enzyme", to: "/eco-enzyme", image: assets.home.lessonEco, tone: "brand" },
  { title: "Pemanfaatan Sampah", to: "/pemanfaatan", image: assets.home.lessonUses, tone: "neutral" },
  { title: "Strategi Pemasaran dan Branding Penjualan", to: "/peluang-usaha", image: assets.home.lessonBusiness, tone: "neutral", wide: true },
] as const;

const faqs = [
  {
    question: "Apa itu sampah organik?",
    answer: "Sampah organik berasal dari tumbuhan atau hewan dan mudah terurai. Contohnya kulit buah, sisa sayur, dan daun.",
  },
  {
    question: "Apa perbedaan kompos dan eco enzyme?",
    answer: "Kompos adalah bahan mirip tanah yang dibuat dari sisa organik. Eco enzyme adalah cairan dari sisa buah atau sayur, gula, dan air yang disimpan selama 90 hari. Cara membuat dan menggunakannya berbeda.",
  },
  {
    question: "Berapa lama kompos siap digunakan?",
    answer: "Pada sistem rumahan yang terawat, kompos umumnya matang dalam sekitar 30–60 hari. Tanda utamanya berwarna cokelat gelap, bertekstur remah, tidak panas, dan beraroma tanah.",
  },
  {
    question: "Berapa lama fermentasi eco enzyme?",
    answer: "Eco enzyme biasanya disimpan selama 90 hari. Sisakan ruang untuk gas, beri tanggal pada wadah, dan minta orang dewasa membantu membukanya jika wadah mengembung.",
  },
  {
    question: "Apakah eco enzyme bisa diminum atau menjadi disinfektan?",
    answer: "Tidak. Eco enzyme buatan rumah tidak aman untuk diminum dan belum terbukti sebagai pembunuh kuman. Jangan gunakan pada makanan atau tubuh.",
  },
  {
    question: "Bagaimana cara paling mudah memulai dari rumah?",
    answer: "Mulailah dengan memisahkan sisa makanan dari plastik, kaca, dan logam. Setelah terbiasa, siapkan wadah khusus untuk sampah berbahaya dan sampah lainnya.",
  },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <>
      <PageMeta
        title="Kelola Sampah Organik dengan Mudah"
        description="Belajar memilah sampah, membuat kompos, dan mengenal eco enzyme secara praktis dan aman bersama Nyuburkeun Pasirtalaga."
      />
      <main>
        <Hero
          title="Kelola Sampah Organik dengan Mudah"
          subtitle="Yuk, belajar memilah sampah dan membuat kompos agar lingkungan kita lebih bersih."
          image={assets.home.hero}
          className="hero--home"
        >
          <Link className="button button--hero" to="/#materi">Mulai Belajar</Link>
        </Hero>

        <section className="home-benefits page-section page-container">
          <SectionTitle>Kenapa Harus Mengolah Sampah?</SectionTitle>
          <FeatureGrid items={benefits} />
        </section>

        <section className="learning-section page-section page-container" id="materi">
          <SectionTitle>Mau Belajar Apa Hari Ini?</SectionTitle>
          <div className="lesson-grid">
            {lessons.map((lesson) => (
              <Link
                className={`lesson-card lesson-card--${lesson.tone}${"wide" in lesson && lesson.wide ? " lesson-card--wide" : ""}`}
                key={lesson.title}
                to={lesson.to}
              >
                <div className="lesson-card__copy">
                  <h3><span>{lesson.title}</span></h3>
                  <div className="lesson-card__link">
                    <img src={assets.home.linkArrow} alt="" aria-hidden="true" />
                    <span>Ayo pelajari</span>
                  </div>
                </div>
                <img className="lesson-card__image" src={lesson.image} alt="" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="faq-section page-section page-container" id="faq">
          <SectionTitle invert>FAQ</SectionTitle>
          <div className="faq-list">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              const number = String(index + 1).padStart(2, "0");
              const answerId = `faq-answer-${index}`;
              return (
                <article className={`faq-item${open ? " is-open" : ""}`} key={faq.question}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={answerId}
                      onClick={() => setOpenFaq(open ? -1 : index)}
                    >
                      <span className="faq-item__number">{number}</span>
                      <span className="faq-item__question">{faq.question}</span>
                      <span className="faq-item__icon" aria-hidden="true">{open ? "−" : "+"}</span>
                    </button>
                  </h3>
                  <div className="faq-item__answer" id={answerId} aria-hidden={!open}>
                    <div>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
