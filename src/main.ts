/**
 * 5ª Corrida Mário Penna — Aplicação Web Oficial (ESB / OnMed)
 * Arquivo Principal (TypeScript Modular)
 */

import "./style.css";

import { initCountdown } from "./modules/countdown.ts";
import { initNavigation } from "./modules/navigation.ts";
import { initEmpresaForm, initKitForm } from "./modules/forms.ts";
import { initScrollReveal } from "./modules/scroll-reveal.ts";
import { initLegalModal } from "./modules/modal.ts";
import { initAthleteParallaxAndRun } from "./modules/athlete-parallax.ts";
import { initMagneticCtaFollower } from "./modules/cta-follower.ts";
import { initDriveUI } from "./modules/drive.ts";
import { initSheetsUI } from "./modules/sheets.ts";

function bootstrap(): void {
  // Inicialização imediata de módulos críticos da interface
  initCountdown();
  initNavigation();
  initEmpresaForm();
  initKitForm();
  initScrollReveal();
  initLegalModal();
  initAthleteParallaxAndRun();
  initMagneticCtaFollower();

  // Integrações secundárias diferidas para garantir tempo de resposta ideal (FID / INP)
  if (typeof (window as any).requestIdleCallback === "function") {
    (window as any).requestIdleCallback(() => {
      initDriveUI();
      initSheetsUI();
    });
  } else {
    setTimeout(() => {
      initDriveUI();
      initSheetsUI();
    }, 100);
  }
}

if (window.location.pathname === "/admin") {
  window.location.replace("/admin/");
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
