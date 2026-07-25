export type RecipeStep = {
  label: string;
  done: boolean;
};

type RecipeCardProps = {
  title: string;
  steps: RecipeStep[];
  note?: string;
};

// Kartu resep menampilkan sasaran yang harus dicapai beserta centang yang
// mengikuti keadaan simulasi, sehingga anak tahu urutan langkahnya tanpa perlu
// menebak dari angka-angka metrik.
export function RecipeCard({ title, steps, note }: RecipeCardProps) {
  const done = steps.filter((step) => step.done).length;
  const complete = done === steps.length;

  return (
    <div className={`sim-lab__recipe${complete ? " sim-lab__recipe--complete" : ""}`}>
      <div className="sim-lab__recipe-head">
        <p>{title}</p>
        <span>{done}/{steps.length} langkah</span>
      </div>
      <ol>
        {steps.map((step, index) => (
          <li className={step.done ? "is-done" : undefined} key={step.label}>
            <span className="sim-lab__recipe-mark" aria-hidden="true">{step.done ? "✓" : index + 1}</span>
            <span>
              {step.label}
              <span className="sr-only">{step.done ? " — sudah tercapai" : " — belum tercapai"}</span>
            </span>
          </li>
        ))}
      </ol>
      {note ? <p className="sim-lab__recipe-note">{note}</p> : null}
    </div>
  );
}
