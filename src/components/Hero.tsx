import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";

type HeroProps = {
  title: string;
  subtitle: string;
  image: string;
  align?: "center" | "left";
  children?: ReactNode;
  className?: string;
};

export function Hero({ title, subtitle, image, align = "center", children, className = "" }: HeroProps) {
  return (
    <section className={`hero hero--${align} ${className}`.trim()} style={{ "--hero-image": `url(${image})` } as React.CSSProperties}>
      <SiteHeader />
      <div className="hero__overlay" aria-hidden="true" />
      <div className="hero__ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="hero__content page-container">
        <div className="hero__copy">
          <p className="hero__kicker">Belajar · Praktik · Bertumbuh</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
