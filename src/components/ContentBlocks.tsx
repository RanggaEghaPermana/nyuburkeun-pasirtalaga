import { useId, useState, type ReactNode } from "react";

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

export type VideoLink = { title: string; channel: string; url: string };

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith("youtu.be")
      ? parsed.pathname.slice(1) || null
      : parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

export function VideoList({ items, tone = "light" }: { items: readonly VideoLink[]; tone?: "light" | "dark" }) {
  // Hanya satu video boleh diputar agar suaranya tidak bertumpuk.
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <ul className={`video-list${tone === "dark" ? " video-list--dark" : ""}`}>
      {items.map((item) => {
        const id = youtubeId(item.url);
        const isPlaying = id !== null && playingId === id;

        return (
          <li className={`video-card${isPlaying ? " video-card--playing" : ""}`} key={item.url}>
            {id ? (
              <div className="video-card__frame">
                {isPlaying ? (
                  <iframe
                    className="video-card__player"
                    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                    title={item.title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <button type="button" className="video-card__cover" onClick={() => setPlayingId(id)}>
                    <img
                      src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
                      }}
                    />
                    <span className="video-card__play" aria-hidden="true">▶</span>
                    <span className="sr-only">Putar video {item.title}</span>
                  </button>
                )}
              </div>
            ) : null}
            <div className="video-card__copy">
              <h3>{item.title}</h3>
              <p className="video-card__channel">{item.channel}</p>
              <a className="video-card__external" href={item.url} target="_blank" rel="noreferrer">
                Buka di YouTube
                <span className="sr-only"> (tab baru)</span>
                <span aria-hidden="true"> ↗</span>
              </a>
            </div>
          </li>
        );
      })}
    </ul>
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
