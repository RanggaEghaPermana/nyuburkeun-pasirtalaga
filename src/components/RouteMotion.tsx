import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const revealSelector = [
  ".section-title",
  ".feature-item",
  ".lesson-card",
  ".media-card",
  ".info-tile",
  ".step-list > li",
  ".uses-card",
  ".strategy-card",
  ".selling-checklist > li",
  ".safety-notice",
  ".simulation-shell",
].join(",");

export function RouteMotion() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );

    const register = (root: ParentNode) => {
      root.querySelectorAll(revealSelector).forEach((element, index) => {
        if (observed.has(element)) return;
        observed.add(element);
        element.classList.add("reveal-target");
        if (element instanceof HTMLElement) {
          element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
        }
        observer.observe(element);
      });
    };

    const frame = window.requestAnimationFrame(() => register(document));
    const root = document.getElementById("root");
    const mutation = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches(revealSelector) && !observed.has(node)) {
              node.classList.add("reveal-target");
              observed.add(node);
              observer.observe(node);
            }
            register(node);
          }
        });
      });
    });

    if (root) mutation.observe(root, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutation.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
