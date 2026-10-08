/**
 * Módulo de Modal Legal Acessível (Política de Privacidade e Termos de Uso).
 */

export function initLegalModal(): void {
  const modal = document.getElementById("legal-modal");
  const titleEl = document.getElementById("legal-modal-title");
  const bodyEl = document.getElementById("legal-modal-body");
  if (!modal || !titleEl || !bodyEl) return;

  const legalContent: Record<string, { title: string; html: string }> = {
    privacidade: {
      title: "Política de Privacidade",
      html: `
        <p>Os dados informados nos formulários desta página oficial da <strong>5ª Corrida Mário Penna</strong> (com apoio de <strong>Saúde ao Seu Alcance</strong> e <strong>Onmed</strong>) são utilizados exclusivamente para o relacionamento institucional relativo às ações descritas nesta campanha.</p>
        <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), suas informações de contato empresarial ou participação na ação promocional do <strong>Kit Cuidar de Você</strong> são armazenadas de forma segura e não são comercializadas com terceiros.</p>
        <p>Para solicitações de atualização ou exclusão de dados, utilize os canais de contato indicados no rodapé.</p>
      `,
    },
    termos: {
      title: "Termos de Uso e Participação",
      html: `
        <p>Esta landing page apresenta informações institucionais sobre a <strong>5ª Corrida Mário Penna</strong>, o portal <strong>Saúde ao Seu Alcance</strong>, a expansão da <strong>Onmed</strong> em Minas Gerais e a ação promocional do <strong>Kit Cuidar de Você</strong>.</p>
        <p>O pré-cadastro empresarial garante atendimento prioritário para apresentação das condições promocionais de lançamento da Onmed em Minas Gerais.</p>
        <p>A participação no sorteio do Kit Cuidar de Você é destinada aos participantes que preencherem corretamente os campos Nome, E-mail e Cidade.</p>
      `,
    },
  };

  let lastFocusedElement: HTMLElement | null = null;

  document.querySelectorAll<HTMLElement>(".footer-modal-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const key = trigger.getAttribute("data-modal");
      if (!key) return;
      const content = legalContent[key];
      if (!content) return;

      lastFocusedElement = document.activeElement as HTMLElement | null;
      titleEl.textContent = content.title;
      bodyEl.innerHTML = content.html;
      modal.hidden = false;

      const closeBtn = modal.querySelector<HTMLButtonElement>(".legal-modal__close");
      if (closeBtn) closeBtn.focus();
    });
  });

  function closeModal(): void {
    modal!.hidden = true;
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  modal.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}
