import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { PageMeta } from "./components/PageMeta";
import { RouteMotion } from "./components/RouteMotion";
import HomePage from "./pages/HomePage";

const BusinessPage = lazy(() => import("./pages/BusinessPage"));
const CompostPage = lazy(() => import("./pages/CompostPage"));
const EcoEnzymePage = lazy(() => import("./pages/EcoEnzymePage"));
const UsesPage = lazy(() => import("./pages/UsesPage"));
const WastePage = lazy(() => import("./pages/WastePage"));

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return null;
}

function NotFoundPage() {
  return (
    <main className="not-found page-container">
      <PageMeta title="Halaman tidak ditemukan" description="Halaman Nyuburkeun Pasirtalaga yang Anda cari tidak ditemukan." />
      <p className="not-found__code">404</p>
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat yang dibuka belum tersedia atau sudah dipindahkan.</p>
      <Link className="button" to="/">Kembali ke Home</Link>
    </main>
  );
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <RouteMotion />
      <Suspense fallback={<div className="route-loader" role="status">Memuat materi…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mengenal-sampah" element={<WastePage />} />
          <Route path="/panduan-kompos" element={<CompostPage />} />
          <Route path="/eco-enzyme" element={<EcoEnzymePage />} />
          <Route path="/pemanfaatan" element={<UsesPage />} />
          <Route path="/peluang-usaha" element={<BusinessPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
