import { useState } from "react";

type ProcessType = "compost" | "eco";

type Problem = {
  id: string;
  label: string;
  cause: string;
  action: string[];
  caution?: string;
};

const problemSets: Record<ProcessType, Problem[]> = {
  compost: [
    {
      id: "smell",
      label: "Bau busuk",
      cause: "Campuran biasanya terlalu basah atau kekurangan udara.",
      action: [
        "Tambahkan daun kering, sobekan kardus polos, atau bahan cokelat lain.",
        "Aduk dari bagian tepi menuju tengah agar udara kembali masuk.",
        "Pastikan air tidak menggenang di dasar wadah.",
      ],
    },
    {
      id: "dry",
      label: "Terlalu kering",
      cause: "Mikroorganisme kekurangan kelembapan sehingga penguraian melambat.",
      action: [
        "Percikkan air sedikit demi sedikit sambil diaduk.",
        "Berhenti ketika bahan terasa lembap seperti spons yang sudah diperas.",
        "Lindungi wadah dari matahari langsung.",
      ],
    },
    {
      id: "cold",
      label: "Tidak hangat",
      cause: "Campuran mungkin terlalu sedikit, terlalu kering, atau kekurangan bahan hijau.",
      action: [
        "Aduk dan periksa kelembapannya.",
        "Tambahkan sedikit potongan sisa sayur atau kulit buah, lalu tutup dengan bahan cokelat.",
        "Beri waktu beberapa hari; ember kecil tidak selalu terasa sangat panas.",
      ],
    },
    {
      id: "flies",
      label: "Banyak lalat atau belatung",
      cause: "Sisa makanan terbuka atau ada bahan yang menarik hama.",
      action: [
        "Kubur sisa dapur di tengah campuran dan tutup seluruhnya dengan daun kering.",
        "Pastikan tutup dan lubang udara tidak mudah dimasuki hama.",
        "Jangan masukkan daging, ikan, susu, minyak, atau makanan berminyak.",
      ],
      caution: "Gunakan sarung tangan dan minta orang dewasa membantu membersihkan area di sekitar wadah.",
    },
    {
      id: "slow",
      label: "Lama tidak terurai",
      cause: "Potongan mungkin terlalu besar atau campuran kurang air, udara, maupun bahan hijau.",
      action: [
        "Potong bahan baru menjadi ukuran lebih kecil.",
        "Aduk campuran dan lakukan uji kelembapan dengan tangan bersarung.",
        "Jangan terus menambahkan bahan baru jika ember sudah hampir penuh.",
      ],
    },
  ],
  eco: [
    {
      id: "swollen",
      label: "Wadah mengembung",
      cause: "Gas terbentuk selama fermentasi dan tekanan di dalam wadah meningkat.",
      action: [
        "Jangan kocok, tusuk, atau arahkan tutup ke wajah.",
        "Minta orang dewasa memindahkannya ke tempat terbuka yang teduh.",
        "Buka tutup perlahan untuk melepas tekanan, lalu tutup kembali.",
      ],
      caution: "Jika wadah retak, bocor, atau berubah bentuk parah, jangan digunakan kembali.",
    },
    {
      id: "floating",
      label: "Bahan mengapung",
      cause: "Potongan yang berada di atas cairan lebih mudah berubah atau berjamur.",
      action: [
        "Minta orang dewasa membuka wadah dengan aman.",
        "Gunakan alat bersih untuk mendorong bahan agar kembali basah dan terendam.",
        "Pastikan wadah tetap memiliki ruang kosong untuk gas.",
      ],
    },
    {
      id: "odd-smell",
      label: "Bau busuk atau sangat menyengat",
      cause: "Fermentasi mungkin tidak berjalan baik atau bahan telah terkontaminasi.",
      action: [
        "Jangan mencicipi, menghirup dari dekat, atau menggunakannya.",
        "Pisahkan wadah dari bahan makanan dan produk pembersih.",
        "Minta orang dewasa memeriksa kondisi wadah dan membuangnya bila meragukan.",
      ],
      caution: "Jangan pernah mencampurnya dengan pemutih, klorin, amonia, atau pembersih lain.",
    },
    {
      id: "mold",
      label: "Ada jamur berwarna",
      cause: "Jamur berbulu hijau, biru, atau hitam menandakan hasil yang perlu dicurigai.",
      action: [
        "Jangan mengaduk atau menghirup wadah dari dekat.",
        "Jangan gunakan cairan pada tanaman, benda, makanan, atau tubuh.",
        "Minta orang dewasa menutup dan membuang campuran dengan aman.",
      ],
    },
    {
      id: "early",
      label: "Belum tampak berubah",
      cause: "Perubahan bisa berlangsung perlahan, terutama jika belum mencapai 90 hari.",
      action: [
        "Periksa kembali tanggal mulai pada label wadah.",
        "Pastikan wadah disimpan teduh dan tidak dekat sumber panas.",
        "Jangan menambah bahan baru karena tanggal fermentasi akan menjadi tidak jelas.",
      ],
    },
  ],
};

export function Troubleshooter() {
  const [process, setProcess] = useState<ProcessType>("compost");
  const [selectedId, setSelectedId] = useState(problemSets.compost[0].id);
  const problems = problemSets[process];
  const selectedProblem = problems.find((problem) => problem.id === selectedId) ?? problems[0];

  const chooseProcess = (nextProcess: ProcessType) => {
    setProcess(nextProcess);
    setSelectedId(problemSets[nextProcess][0].id);
  };

  return (
    <div className="practice-diagnosis">
      <div className="practice-mode-switch" role="group" aria-label="Pilih proses yang bermasalah">
        <button
          type="button"
          className={process === "compost" ? "is-active" : undefined}
          aria-pressed={process === "compost"}
          onClick={() => chooseProcess("compost")}
        >
          Kompos
        </button>
        <button
          type="button"
          className={process === "eco" ? "is-active" : undefined}
          aria-pressed={process === "eco"}
          onClick={() => chooseProcess("eco")}
        >
          Eco enzyme
        </button>
      </div>

      <div className="practice-problem-layout">
        <div className="practice-problem-list" role="group" aria-label={`Masalah ${process === "compost" ? "kompos" : "eco enzyme"}`}>
          {problems.map((problem) => (
            <button
              type="button"
              key={problem.id}
              className={selectedProblem.id === problem.id ? "is-active" : undefined}
              aria-pressed={selectedProblem.id === problem.id}
              onClick={() => setSelectedId(problem.id)}
            >
              <span aria-hidden="true">{selectedProblem.id === problem.id ? "✓" : "→"}</span>
              {problem.label}
            </button>
          ))}
        </div>

        <article className="practice-answer-card" aria-live="polite">
          <p className="practice-card-kicker">Kemungkinan penyebab</p>
          <h3>{selectedProblem.label}</h3>
          <p>{selectedProblem.cause}</p>
          <h4>Yang bisa dilakukan</h4>
          <ol>
            {selectedProblem.action.map((step) => <li key={step}>{step}</li>)}
          </ol>
          {selectedProblem.caution ? (
            <p className="practice-caution"><strong>Perhatian:</strong> {selectedProblem.caution}</p>
          ) : null}
        </article>
      </div>
    </div>
  );
}
