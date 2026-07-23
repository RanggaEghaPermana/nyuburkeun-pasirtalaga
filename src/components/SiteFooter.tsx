import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="site-footer page-container">
      <div className="site-footer__top">
        <Link className="brand-label brand-label--footer" to="/">Nyuburkeun Pasirtalaga</Link>
        <nav aria-label="Navigasi footer">
          <Link to="/">Beranda</Link>
          <Link to="/#materi">Materi</Link>
          <Link to="/#faq">FAQ</Link>
        </nav>
      </div>
      <div className="site-footer__rule" />
      <p>© 2026 KKN Pasirtalaga UBP Karawang. Hak cipta dilindungi.</p>
    </footer>
  );
}
