import { useId, type ReactNode } from "react";

export type Feature = {
  title: string;
  description: string;
  icon: string;
};

export function FeatureGrid({ items, className = "" }: { items: Feature[]; className?: string }) {
  const hintId = useId();

  return (
    <>
      <p className="swipe-hint" id={hintId}>Geser kartu ke samping atau gunakan tombol panah.</p>
      <div
        className={`feature-grid ${className}`.trim()}
        tabIndex={0}
        role="region"
        aria-label="Daftar kartu informasi"
        aria-describedby={hintId}
      >
        {items.map((item) => (
          <article className="feature-item" key={item.title}>
            <img src={item.icon} alt="" aria-hidden="true" />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}

type MediaCardProps = {
  title: string;
  children: ReactNode;
  image: string;
  imageAlt: string;
  tone?: "brand" | "neutral";
  reverse?: boolean;
};

export function MediaCard({ title, children, image, imageAlt, tone = "neutral", reverse = false }: MediaCardProps) {
  return (
    <article className={`media-card media-card--${tone}${reverse ? " media-card--reverse" : ""}`}>
      <div className="media-card__copy">
        <h3><span>{title}</span></h3>
        <div>{children}</div>
      </div>
      <div className="media-card__media">
        <img src={image} alt={imageAlt} loading="lazy" />
      </div>
    </article>
  );
}

export type InfoTile = {
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
};

export function InfoTileGrid({ items, compact = false }: { items: InfoTile[]; compact?: boolean }) {
  const hintId = useId();

  return (
    <>
      <p className="swipe-hint" id={hintId}>Geser kartu ke samping atau gunakan tombol panah.</p>
      <div
        className={`info-tile-grid${compact ? " info-tile-grid--compact" : ""}`}
        tabIndex={0}
        role="region"
        aria-label="Daftar kartu informasi"
        aria-describedby={hintId}
      >
        {items.map((item) => (
          <article className="info-tile" key={item.title}>
            <div className="info-tile__image">
              <img src={item.image} alt={item.imageAlt ?? ""} aria-hidden={item.imageAlt ? undefined : true} loading="lazy" />
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}

export type Step = {
  title: string;
  description: string;
  image?: string;
};

export function StepList({ items, visual = false }: { items: Step[]; visual?: boolean }) {
  return (
    <ol className={`step-list${visual ? " step-list--visual" : ""}`}>
      {items.map((item, index) => (
        <li key={item.title}>
          <span className="step-list__number" aria-hidden="true">{index + 1}</span>
          {item.image ? <img className="step-list__image" src={item.image} alt="" aria-hidden="true" loading="lazy" /> : null}
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SafetyNotice({ title = "Gunakan dengan aman", children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="safety-notice" aria-labelledby="safety-title">
      <div className="safety-notice__mark" aria-hidden="true">!</div>
      <div>
        <h2 id="safety-title">{title}</h2>
        {children}
      </div>
    </aside>
  );
}

export type Source = { label: string; href: string };

export function SourceList({ items }: { items: Source[] }) {
  return (
    <details className="source-list">
      <summary>Sumber dan Bacaan Lanjutan</summary>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}
