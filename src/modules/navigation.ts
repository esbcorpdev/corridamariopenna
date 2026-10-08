/**
 * Módulo de Navegação e Scroll Suave da Landing Page.
 */

export const SAUDE_AO_SEU_ALCANCE_URL = "https://saudeaoseualcance.com/";

export function initNavigation(ctaTargetUrl: string = SAUDE_AO_SEU_ALCANCE_URL): void {
  const ctaSaude = document.getElementById("cta-saude-alcance") as HTMLAnchorElement | null;

  if (ctaSaude) {
    ctaSaude.setAttribute("href", ctaTargetUrl);
    ctaSaude.setAttribute("target", "_blank");
    ctaSaude.setAttribute("rel", "noopener noreferrer");
  }

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    if (anchor.id === "cta-saude-alcance") return;
    anchor.addEventListener("click", (event: MouseEvent) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#" || href.startsWith("#contato-")) {
        if (href && href.startsWith("#contato-")) {
          event.preventDefault();
        }
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}
