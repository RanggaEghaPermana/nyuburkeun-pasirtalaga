import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Beranda", to: "/" },
  { label: "Materi", to: "/#materi" },
  { label: "FAQ", to: "/#faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-label" to="/" aria-label="Nyuburkeun Pasirtalaga, kembali ke beranda" onClick={() => setOpen(false)}>
          Nyuburkeun Pasirtalaga
        </Link>

        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav id={menuId} className={`site-nav${open ? " is-open" : ""}`} aria-label="Navigasi utama">
          {navItems.map((item) => {
            const active = item.to === "/" && location.pathname === "/" && !location.hash;
            return (
              <Link
                key={item.label}
                className={active ? "is-active" : undefined}
                to={item.to}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
