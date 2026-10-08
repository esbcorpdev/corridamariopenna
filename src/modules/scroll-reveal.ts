/**
 * Módulo de Revelação Progressiva com IntersectionObserver.
 */

export function initScrollReveal(): void {
  const sections = document.querySelectorAll(".reveal-section");
  if (!sections.length) return;

  if (!("IntersectionObserver" in window)) {
    sections.forEach((sec) => sec.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  sections.forEach((sec) => observer.observe(sec));
}
