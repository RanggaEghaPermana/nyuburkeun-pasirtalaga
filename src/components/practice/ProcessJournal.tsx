import { useState } from "react";
import { usePersistentState } from "./usePersistentState";

type JournalKind = "compost" | "eco";

type JournalEntry = {
  id: string;
  date: string;
  condition: string;
  note: string;
};

type JournalState = {
  kind: JournalKind;
  processes: Record<JournalKind, {
    startDate: string;
    entries: JournalEntry[];
  }>;
};

const milestones = {
  compost: [
    { day: 0, label: "Mulai dan beri tanggal pada wadah" },
    { day: 3, label: "Periksa bau dan kelembapan pertama" },
    { day: 7, label: "Aduk dari tepi menuju tengah" },
    { day: 14, label: "Periksa bahan hijau dan cokelat" },
    { day: 30, label: "Mulai cek tanda kematangan" },
    { day: 60, label: "Periksa kembali sebelum digunakan" },
  ],
  eco: [
    { day: 0, label: "Mulai, tutup, dan beri tanggal" },
    { day: 7, label: "Periksa tekanan bersama orang dewasa" },
    { day: 30, label: "Periksa wadah dan bahan yang mengapung" },
    { day: 60, label: "Pastikan wadah tetap teduh dan utuh" },
    { day: 90, label: "Periksa hasil sebelum disaring" },
  ],
} as const;

const conditionOptions = {
  compost: ["Normal", "Terlalu basah", "Terlalu kering", "Berbau", "Belum terurai"],
  eco: ["Normal", "Wadah mengembung", "Bahan mengapung", "Bau mencurigakan", "Ada jamur"],
};

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function differenceInDays(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date(`${todayInputValue()}T00:00:00`);
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

const initialJournal: JournalState = {
  kind: "compost",
  processes: {
    compost: {
      startDate: todayInputValue(),
      entries: [],
    },
    eco: {
      startDate: todayInputValue(),
      entries: [],
    },
  },
};

export function ProcessJournal() {
  const [journal, setJournal] = usePersistentState<JournalState>("nyuburkeun-practice-journal-v2", initialJournal);
  const [entryDate, setEntryDate] = useState(todayInputValue());
  const [condition, setCondition] = useState(conditionOptions[journal.kind][0]);
  const [note, setNote] = useState("");

  const activeProcess = journal.processes[journal.kind];
  const processMilestones = milestones[journal.kind];
  const targetDay = journal.kind === "compost" ? 60 : 90;
  const rawElapsedDays = differenceInDays(activeProcess.startDate);
  const elapsedDays = Math.max(0, rawElapsedDays);
  const progress = Math.min(100, Math.round((elapsedDays / targetDay) * 100));
  const nextMilestone = processMilestones.find((milestone) => milestone.day > elapsedDays);

  const switchKind = (kind: JournalKind) => {
    setJournal((current) => ({ ...current, kind }));
    setCondition(conditionOptions[kind][0]);
  };

  const addEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedNote = note.trim();
    const nextEntry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: entryDate,
      condition,
      note: cleanedNote,
    };

    setJournal((current) => ({
      ...current,
      processes: {
        ...current.processes,
        [current.kind]: {
          ...current.processes[current.kind],
          entries: [nextEntry, ...current.processes[current.kind].entries].slice(0, 30),
        },
      },
    }));
    setNote("");
  };

  const removeEntry = (id: string) => {
    setJournal((current) => ({
      ...current,
      processes: {
        ...current.processes,
        [current.kind]: {
          ...current.processes[current.kind],
          entries: current.processes[current.kind].entries.filter((entry) => entry.id !== id),
        },
      },
    }));
  };

  return (
    <div className="practice-journal">
      <div className="practice-mode-switch" role="group" aria-label="Pilih jurnal proses">
        <button
          type="button"
          className={journal.kind === "compost" ? "is-active" : undefined}
          aria-pressed={journal.kind === "compost"}
          onClick={() => switchKind("compost")}
        >
          Jurnal kompos
        </button>
        <button
          type="button"
          className={journal.kind === "eco" ? "is-active" : undefined}
          aria-pressed={journal.kind === "eco"}
          onClick={() => switchKind("eco")}
        >
          Jurnal eco enzyme
        </button>
      </div>

      <div className="practice-journal-layout">
        <div className="practice-form-card">
          <p className="practice-card-kicker">Pengaturan proses</p>
          <label htmlFor="journal-start-date">Tanggal mulai</label>
          <input
            id="journal-start-date"
            type="date"
            value={activeProcess.startDate}
            onChange={(event) => setJournal((current) => ({
              ...current,
              processes: {
                ...current.processes,
                [current.kind]: {
                  ...current.processes[current.kind],
                  startDate: event.target.value,
                },
              },
            }))}
          />
          {rawElapsedDays < 0 ? (
            <p className="practice-field-note practice-field-note--warning">
              Tanggal mulai masih di masa depan. Progres akan dihitung setelah tanggal tersebut.
            </p>
          ) : null}

          <div className="practice-progress-summary" aria-live="polite">
            <div>
              <span>Hari proses</span>
              <strong>{elapsedDays}</strong>
            </div>
            <div>
              <span>Target pemeriksaan</span>
              <strong>Hari {targetDay}</strong>
            </div>
          </div>
          <div
            className="practice-progress-track"
            role="progressbar"
            aria-label="Progres proses"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="practice-next-step">
            {nextMilestone
              ? <><strong>Berikutnya, hari {nextMilestone.day}:</strong> {nextMilestone.label}</>
              : <><strong>Target waktu tercapai.</strong> Periksa seluruh tanda kesiapan sebelum menggunakan hasil.</>}
          </p>
        </div>

        <div className="practice-timeline-card">
          <p className="practice-card-kicker">Panduan pemeriksaan</p>
          <ol className="practice-timeline">
            {processMilestones.map((milestone) => {
              const completed = elapsedDays >= milestone.day;
              return (
                <li className={completed ? "is-complete" : undefined} key={milestone.day}>
                  <span aria-hidden="true">{completed ? "✓" : milestone.day}</span>
                  <div>
                    <strong>{milestone.day === 0 ? "Hari mulai" : `Hari ${milestone.day}`}</strong>
                    <p>{milestone.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="practice-log-panel">
        <form className="practice-log-form" onSubmit={addEntry}>
          <div>
            <label htmlFor="journal-entry-date">Tanggal pemeriksaan</label>
            <input
              id="journal-entry-date"
              type="date"
              max={todayInputValue()}
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="journal-condition">Kondisi</label>
            <select
              id="journal-condition"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
            >
              {conditionOptions[journal.kind].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div className="practice-log-form__note">
            <label htmlFor="journal-note">Catatan singkat</label>
            <input
              id="journal-note"
              type="text"
              maxLength={120}
              placeholder="Contoh: ditambah dua genggam daun kering"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <button className="practice-primary-button" type="submit">Simpan pemeriksaan</button>
        </form>

        <div className="practice-log-history">
          <h3>Riwayat pemeriksaan</h3>
          {activeProcess.entries.length === 0 ? (
            <p className="practice-empty-state">Belum ada catatan. Tambahkan pemeriksaan pertama saat kamu mengecek wadah.</p>
          ) : (
            <ul>
              {activeProcess.entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <span>{formatDate(entry.date)}</span>
                    <strong>{entry.condition}</strong>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                  <button type="button" onClick={() => removeEntry(entry.id)} aria-label={`Hapus catatan ${formatDate(entry.date)}`}>
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="practice-storage-note">Catatan tersimpan hanya di browser perangkat ini.</p>
    </div>
  );
}
