/**
 * Módulo de Cursor Follower Magnético para o CTA da Saúde ao Seu Alcance
 *
 * Requisito:
 * - Quando o usuário entrar com o mouse na div .saude-frame, o componente <a>
 *   (#cta-saude-alcance) deve acompanhar o mouse suavemente e permanecer 100%
 *   clicável.
 * - Ao rolar a página para fora da div ou sair do perímetro, retorna suavemente
 *   para a posição padrão de repouso.
 */

export function initMagneticCtaFollower(): void {
  const saudeFrame = document.querySelector(".saude-frame") as HTMLElement | null;
  const cta = document.getElementById("cta-saude-alcance") as HTMLAnchorElement | null;
  const stage = document.getElementById("runner-stage") as HTMLElement | null;

  if (!saudeFrame || !cta || !stage) return;

  function isMobile(): boolean {
    return window.innerWidth <= 820 || !window.matchMedia("(pointer: fine)").matches;
  }

  let isInsideFrame = false;
  let lastClientX = 0;
  let lastClientY = 0;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const DEFAULT_SCALE = 0.65;
  const ACTIVE_SCALE = 0.72;
  let currentScale = DEFAULT_SCALE;

  let rafId: number | null = null;
  let isLoopRunning = false;

  function updateTargetPosition(clientX: number, clientY: number): void {
    const frameRect = saudeFrame!.getBoundingClientRect();
    const runnerRect = stage!.getBoundingClientRect();
    const ctaRect = cta!.getBoundingClientRect();

    // Centro padrão do CTA (dentro do runner-stage)
    const defaultCenterX = runnerRect.left + runnerRect.width / 2;
    const defaultCenterY = runnerRect.top + runnerRect.height / 2;

    const halfW = (ctaRect.width || 300) / 2;
    const halfH = (ctaRect.height || 54) / 2;

    // Escala do contêiner visual pai (.saude-frame__visual)
    const visualEl = document.querySelector(".saude-frame__visual") as HTMLElement | null;
    let visualScale = 1.0;
    if (visualEl) {
      const vRect = visualEl.getBoundingClientRect();
      const vW = visualEl.offsetWidth || vRect.width;
      if (vW > 0) {
        visualScale = vRect.width / vW;
      }
    }

    // Clamping estrito nas extremidades da moldura:
    // Garante que o CTA permaneça 100% visível e não adentre ou ultrapasse a borda
    const edgeMargin = 22;
    const minX = frameRect.left + halfW + edgeMargin;
    const maxX = frameRect.right - halfW - edgeMargin;
    const minY = frameRect.top + halfH + edgeMargin;
    const maxY = frameRect.bottom - halfH - edgeMargin;

    const clampedX = Math.max(minX, Math.min(maxX, clientX));
    const clampedY = Math.max(minY, Math.min(maxY, clientY));

    // Deslocamento compensado pela escala do contêiner visual pai
    targetX = (clampedX - defaultCenterX) / (visualScale || 1.0);
    targetY = (clampedY - defaultCenterY) / (visualScale || 1.0);
  }

  function loop(): void {
    if (isInsideFrame) {
      // Interpolação suave em direção ao cursor (lerp 0.16)
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      currentScale += (ACTIVE_SCALE - currentScale) * 0.16;

      cta!.classList.add("is-following");
      cta!.style.transform = `translate(calc(-50% + ${currentX.toFixed(2)}px), calc(-50% + ${currentY.toFixed(2)}px)) scale(${currentScale.toFixed(3)})`;

      rafId = requestAnimationFrame(loop);
    } else {
      // Retorno suave à posição de repouso
      currentX += (0 - currentX) * 0.14;
      currentY += (0 - currentY) * 0.14;
      currentScale += (DEFAULT_SCALE - currentScale) * 0.14;

      if (Math.abs(currentX) < 0.2 && Math.abs(currentY) < 0.2 && Math.abs(currentScale - DEFAULT_SCALE) < 0.005) {
        currentX = 0;
        currentY = 0;
        currentScale = DEFAULT_SCALE;
        cta!.classList.remove("is-following");
        cta!.style.transform = "";
        isLoopRunning = false;
        rafId = null;
        return;
      }

      cta!.style.transform = `translate(calc(-50% + ${currentX.toFixed(2)}px), calc(-50% + ${currentY.toFixed(2)}px)) scale(${currentScale.toFixed(3)})`;
      rafId = requestAnimationFrame(loop);
    }
  }

  function startLoop(): void {
    if (!isLoopRunning) {
      isLoopRunning = true;
      rafId = requestAnimationFrame(loop);
    }
  }

  function onMouseEnter(e: MouseEvent): void {
    if (isMobile()) return;
    isInsideFrame = true;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    updateTargetPosition(e.clientX, e.clientY);
    startLoop();
  }

  function onMouseMove(e: MouseEvent): void {
    if (isMobile()) return;
    if (!isInsideFrame) {
      isInsideFrame = true;
      startLoop();
    }
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    updateTargetPosition(e.clientX, e.clientY);
  }

  function onMouseLeave(): void {
    if (isMobile()) return;
    isInsideFrame = false;
    targetX = 0;
    targetY = 0;
    startLoop();
  }

  function onScroll(): void {
    if (isMobile() || !isInsideFrame) return;

    const frameRect = saudeFrame!.getBoundingClientRect();

    // Se o usuário rolou e o cursor não está mais dentro do perímetro da moldura
    if (
      lastClientX < frameRect.left ||
      lastClientX > frameRect.right ||
      lastClientY < frameRect.top ||
      lastClientY > frameRect.bottom
    ) {
      onMouseLeave();
    } else {
      // Atualiza coordenadas relativas à nova posição de rolagem
      updateTargetPosition(lastClientX, lastClientY);
    }
  }

  function onResize(): void {
    if (isMobile()) {
      isInsideFrame = false;
      targetX = 0;
      targetY = 0;
      currentX = 0;
      currentY = 0;
      cta!.classList.remove("is-following");
      cta!.style.transform = "";
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
        isLoopRunning = false;
      }
    }
  }

  saudeFrame.addEventListener("mouseenter", onMouseEnter);
  saudeFrame.addEventListener("mousemove", onMouseMove);
  saudeFrame.addEventListener("mouseleave", onMouseLeave);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
}
