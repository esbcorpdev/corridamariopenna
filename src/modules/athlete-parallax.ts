/**
 * Módulo de Transição dos Atletas & Parallax na Seção Saúde ao Seu Alcance.
 *
 * Alterna ciclicamente entre 4 atletas (2 masculinos e 2 femininas) enquanto
 * a div (.saude-frame__visual) estiver visível no viewport, com crossfade suave,
 * micro-cadência de corrida e pausa automática para economia de CPU/bateria
 * quando fora de visão.
 */

interface Waypoint {
  pose: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export function initAthleteParallaxAndRun(): void {
  const stage = document.getElementById("runner-stage");
  const actor = document.getElementById("runner-actor") as HTMLElement | null;
  const poseImages = document.querySelectorAll<HTMLImageElement>(".runner-pose-img");
  const saudeSection = document.getElementById("saude-ao-seu-alcance");
  const visualContainer = (document.querySelector(".saude-frame__visual") as HTMLElement | null) || saudeSection;

  if (!stage || !actor || !poseImages.length || !saudeSection) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 4 Posições da Corrida Alternando Gêneros (Desktop):
  // 1: Masculino 1 (Esq) | 2: Feminina 1 (Dir) | 3: Masculino 2 (Esq) | 4: Feminina 2 (Dir)
  const WAYPOINTS_DESKTOP: Waypoint[] = [
    { pose: 1, x: 8, y: 0, scale: 1.0, rotate: 0 },
    { pose: 2, x: -8, y: 0, scale: 1.0, rotate: 0 },
    { pose: 3, x: 8, y: 0, scale: 1.0, rotate: 0 },
    { pose: 4, x: -8, y: 0, scale: 1.0, rotate: 0 },
  ];

  // 4 Posições da Corrida (Mobile / Tablet)
  const WAYPOINTS_MOBILE: Waypoint[] = [
    { pose: 1, x: 4, y: 0, scale: 1.0, rotate: 0 },
    { pose: 2, x: -4, y: 0, scale: 1.0, rotate: 0 },
    { pose: 3, x: 4, y: 0, scale: 1.0, rotate: 0 },
    { pose: 4, x: -4, y: 0, scale: 1.0, rotate: 0 },
  ];

  let currentPose = 1;
  let isDivVisible = false;
  let autoTimer: ReturnType<typeof setInterval> | null = null;

  // Posições interpoladas para movimento suave
  let currentX = WAYPOINTS_DESKTOP[0].x;
  let currentY = WAYPOINTS_DESKTOP[0].y;
  let currentScale = WAYPOINTS_DESKTOP[0].scale;
  let currentRotate = WAYPOINTS_DESKTOP[0].rotate;

  let lastScrollY = window.scrollY;
  let strideAccumulator = 0;

  /**
   * Ativa a imagem do atleta correspondente e desativa as demais
   */
  function setPose(poseNumber: number): void {
    currentPose = poseNumber;
    poseImages.forEach((img) => {
      const p = Number(img.getAttribute("data-pose"));
      if (p === poseNumber) {
        img.classList.add("is-active");
      } else {
        img.classList.remove("is-active");
      }
    });
  }

  /**
   * Avança para a próxima pose no ciclo: 1 -> 2 -> 3 -> 4 -> 1
   * (Alternando: Masc 1 -> Fem 1 -> Masc 2 -> Fem 2)
   */
  function nextPose(): void {
    const next = (currentPose % 4) + 1;
    setPose(next);
  }

  let rafId: number | null = null;

  // Loop de renderização (60fps) com interpolação suave
  function render(timestamp: number): void {
    if (prefersReducedMotion) {
      actor!.style.transform = "none";
      rafId = null;
      return;
    }

    if (!isDivVisible || document.hidden) {
      rafId = null;
      return;
    }

    const isMobile = window.innerWidth <= 820;
    const waypoints = isMobile ? WAYPOINTS_MOBILE : WAYPOINTS_DESKTOP;
    const targetWp = waypoints[currentPose - 1] || waypoints[0];

    // Lerp suave em direção ao waypoint da pose ativa
    currentX += (targetWp.x - currentX) * 0.08;
    currentY += (targetWp.y - currentY) * 0.08;
    currentScale += (targetWp.scale - currentScale) * 0.08;
    currentRotate += (targetWp.rotate - currentRotate) * 0.08;

    // Oscilação natural de passada (sutil: 3.5px vertical e 0.25° rotação)
    const cadenceFreq = timestamp * 0.0028 + strideAccumulator;
    const cadenceY = Math.sin(cadenceFreq) * 3.5;
    const cadenceRotate = Math.sin(cadenceFreq) * 0.25;

    const finalX = currentX;
    const finalY = currentY + cadenceY;
    const finalScale = currentScale;
    const finalRotate = currentRotate + cadenceRotate;

    actor!.style.transform = `translate3d(${finalX.toFixed(1)}px, ${finalY.toFixed(1)}px, 0) scale(${finalScale.toFixed(3)}) rotate(${finalRotate.toFixed(2)}deg)`;

    rafId = requestAnimationFrame(render);
  }

  function startRenderLoop(): void {
    if (!rafId && !prefersReducedMotion && isDivVisible && !document.hidden) {
      rafId = requestAnimationFrame(render);
    }
  }

  function stopRenderLoop(): void {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Inicia o timer de transição contínua enquanto a div está visível
  function startAutoTransition(): void {
    startRenderLoop();
    if (autoTimer) return;
    autoTimer = setInterval(() => {
      if (isDivVisible && !document.hidden) {
        nextPose();
      }
    }, 2800);
  }

  // Pausa o timer quando a div sai do campo visual
  function stopAutoTransition(): void {
    stopRenderLoop();
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Observer de visibilidade da div selecionada
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isDivVisible = entry.isIntersecting;
        if (isDivVisible) {
          startAutoTransition();
        } else {
          stopAutoTransition();
        }
      });
    },
    {
      root: null,
      threshold: [0.15, 0.5],
    }
  );

  if (visualContainer) {
    observer.observe(visualContainer);
  }

  // Pausa ao trocar de aba no navegador
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoTransition();
    } else if (isDivVisible) {
      startAutoTransition();
    }
  });

  // Reação sutil ao scroll
  function onScroll(): void {
    if (!isDivVisible) return;
    const scrollY = window.scrollY;
    const delta = Math.abs(scrollY - lastScrollY);
    lastScrollY = scrollY;
    strideAccumulator += delta * 0.006;
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  // Inicializa a primeira pose
  setPose(1);
}
