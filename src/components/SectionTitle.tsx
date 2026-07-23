type SectionTitleProps = {
  children: string;
  invert?: boolean;
  eyebrow?: string;
};

export function SectionTitle({ children, invert = false, eyebrow }: SectionTitleProps) {
  return (
    <div className="section-title">
      {eyebrow ? <p className="section-title__eyebrow">{eyebrow}</p> : null}
      <h2>
        <span className={invert ? "label-pill label-pill--light" : "label-pill"}>{children}</span>
      </h2>
    </div>
  );
}
