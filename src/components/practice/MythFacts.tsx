const mythFacts = [
  {
    label: "Mitos",
    statement: "Semua sampah organik aman dimasukkan ke kompos rumahan.",
    explanation:
      "Daging, ikan, susu, minyak, kotoran hewan, dan tanaman sakit sebaiknya tidak masuk ke kompos rumahan karena dapat menarik hama atau membawa risiko kuman.",
  },
  {
    label: "Mitos",
    statement: "Semakin banyak air, kompos akan semakin cepat matang.",
    explanation:
      "Campuran yang becek kehilangan udara dan bisa berbau. Kondisi yang dicari adalah lembap seperti spons yang sudah diperas.",
  },
  {
    label: "Mitos",
    statement: "Kompos matang harus tetap terasa panas.",
    explanation:
      "Kompos yang siap digunakan biasanya kembali mendekati suhu lingkungan, berwarna gelap, remah, dan beraroma tanah.",
  },
  {
    label: "Mitos",
    statement: "Semua plastik yang bersih pasti dapat didaur ulang.",
    explanation:
      "Jenis yang diterima berbeda di setiap daerah dan fasilitas. Pisahkan bahan yang bersih, lalu ikuti aturan bank sampah atau pengelola setempat.",
  },
  {
    label: "Mitos",
    statement: "Eco enzyme buatan rumah aman diminum atau dapat menggantikan disinfektan.",
    explanation:
      "Hasil fermentasi rumahan tidak bebas kuman dan tidak boleh diminum. Gunakan produk yang sudah teruji bila tujuanmu membunuh kuman.",
  },
  {
    label: "Mitos",
    statement: "Karena alami, eco enzyme pasti aman untuk kulit dan tanaman.",
    explanation:
      "Bahan alami tetap dapat menyebabkan iritasi atau merusak tanaman. Jangan gunakan pada tubuh, dan jika dicoba pada tanaman harus diencerkan serta diuji pada satu tanaman bersama orang dewasa.",
  },
  {
    label: "Fakta",
    statement: "Mencegah makanan terbuang sebaiknya dilakukan sebelum mengomposkannya.",
    explanation:
      "Rencanakan belanja dan habiskan makanan yang masih layak. Kompos digunakan untuk bagian yang memang tidak dapat dimakan, seperti kulit atau potongan yang rusak.",
  },
  {
    label: "Fakta",
    statement: "Baterai, lampu, dan kemasan bahan kimia perlu dipisahkan.",
    explanation:
      "Sampah B3 tidak boleh dibakar, dibongkar, atau dicampur dengan sampah biasa. Simpan tertutup dan minta orang dewasa membawanya ke pengumpulan yang sesuai.",
  },
];

export function MythFacts() {
  return (
    <div className="myth-fact-list">
      {mythFacts.map((item, index) => (
        <details key={item.statement} open={index === 0}>
          <summary>
            <span className={`myth-fact-badge myth-fact-badge--${item.label === "Fakta" ? "fact" : "myth"}`}>
              {item.label}
            </span>
            <strong>{item.statement}</strong>
            <span className="myth-fact-toggle" aria-hidden="true">+</span>
          </summary>
          <p>{item.explanation}</p>
        </details>
      ))}
    </div>
  );
}
