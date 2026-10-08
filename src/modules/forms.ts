/**
 * Módulo de Processamento e Governança de Formulários (ESB / OnMed)
 * Formulário Empresarial (B2B) e Sorteio Kit Cuidar de Você (B2C)
 * Validações robustas em tempo real, geração de comprovantes e sincronização automática.
 */

import {
  validateName,
  validateEmail,
  validatePhone,
  validateCompany,
  validateEmployeeCount,
  validateCity,
  formatBrazilianPhone,
  sanitizeInput,
  sendFormData,
} from "./validation.ts";
import { downloadLuckyNumberTicket, type TicketData } from "./ticket.ts";
import {
  getOrAllocateUniqueLuckyNumber,
  getExistingLocalEntry,
} from "./raffle-numbers.ts";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.ts";
import {
  syncEmpresaSubmissionToActiveSheet,
  syncKitSubmissionToActiveSheet,
  getActiveSpreadsheetId,
  DEFAULT_OFFICIAL_SPREADSHEET_URL,
} from "./sheets.ts";

export const FORM_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzvAR8zwQWzuBZ_c2svXjE1HTVHe3F9il3cDMy4XGD0YCgpAHZMELcdhl7TaV1Fh980Cg/exec";
export const KIT_FORM_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbw6feMl4blQaejupjOmeUS90g6C6e3KYLpUd-Lde90i5s0JAN_FyIfoWez0EY1eCK1l/exec";



/**
 * Utilitário Unificado para Manipulação de Erros de Campo (Acessibilidade + UI)
 */
function setInputError(
  inputEl: HTMLElement | null,
  errorId: string,
  message: string,
  isKitForm: boolean = false
): void {
  const errorEl = document.getElementById(errorId);
  const container = isKitForm && inputEl ? inputEl.closest(".kit-input-card") : inputEl;

  if (container) {
    container.classList.add("is-invalid");
  }
  if (inputEl) {
    inputEl.setAttribute("aria-invalid", "true");
  }
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearInputError(
  inputEl: HTMLElement | null,
  errorId: string,
  isKitForm: boolean = false
): void {
  const errorEl = document.getElementById(errorId);
  const container = isKitForm && inputEl ? inputEl.closest(".kit-input-card") : inputEl;

  if (container) {
    container.classList.remove("is-invalid");
  }
  if (inputEl) {
    inputEl.removeAttribute("aria-invalid");
  }
  if (errorEl) {
    errorEl.textContent = "";
  }
}

/**
 * Vincula listeners de validação em tempo real (input e blur) de forma declarativa e concisa
 */
function bindFieldValidation(
  inputEl: HTMLInputElement | null,
  errorId: string,
  validator: (val: string) => { isValid: boolean; message: string },
  isKitForm: boolean = false
): void {
  if (!inputEl) return;
  inputEl.addEventListener("input", () => clearInputError(inputEl, errorId, isKitForm));
  inputEl.addEventListener("blur", () => {
    const res = validator(inputEl.value);
    if (!res.isValid && inputEl.value.trim().length > 0) {
      setInputError(inputEl, errorId, res.message, isKitForm);
    }
  });
}

/**
 * =============================================================================
 * FORMULÁRIO 1: OPORTUNIDADES CORPORATIVAS (EMPRESAS PARCEIRAS)
 * =============================================================================
 */
export function initEmpresaForm(endpoint: string = FORM_ENDPOINT): void {
  const form = document.getElementById("empresa-form") as HTMLFormElement | null;
  if (!form) return;

  const nomeInput = document.getElementById("emp-nome") as HTMLInputElement | null;
  const telefoneInput = document.getElementById("emp-telefone") as HTMLInputElement | null;
  const emailInput = document.getElementById("emp-email") as HTMLInputElement | null;
  const empresaInput = document.getElementById("emp-empresa") as HTMLInputElement | null;
  const funcionariosInput = document.getElementById("emp-funcionarios") as HTMLInputElement | null;
  const cidadeInput = document.getElementById("emp-cidade") as HTMLInputElement | null;
  const estadoInput = document.getElementById("emp-estado") as HTMLSelectElement | null;
  const feedbackEl = document.getElementById("empresa-form-feedback");
  const submitBtn = document.getElementById("btn-empresa-submit") as HTMLButtonElement | null;

  // Máscara e validação dinâmica de telefone
  if (telefoneInput) {
    telefoneInput.addEventListener("input", () => {
      telefoneInput.value = formatBrazilianPhone(telefoneInput.value);
      clearInputError(telefoneInput, "emp-telefone-error");
    });
    telefoneInput.addEventListener("blur", () => {
      const res = validatePhone(telefoneInput.value);
      if (!res.isValid && telefoneInput.value.trim().length > 0) {
        setInputError(telefoneInput, "emp-telefone-error", res.message);
      }
    });
  }

  // Tratamento numérico para colaboradores
  if (funcionariosInput) {
    funcionariosInput.addEventListener("input", () => {
      funcionariosInput.value = funcionariosInput.value.replace(/\D/g, "");
      clearInputError(funcionariosInput, "emp-funcionarios-error");
    });
    funcionariosInput.addEventListener("blur", () => {
      const res = validateEmployeeCount(funcionariosInput.value);
      if (!res.isValid && funcionariosInput.value.trim().length > 0) {
        setInputError(funcionariosInput, "emp-funcionarios-error", res.message);
      }
    });
  }

  // Validação declarativa em tempo real
  bindFieldValidation(nomeInput, "emp-nome-error", validateName);
  bindFieldValidation(emailInput, "emp-email-error", validateEmail);
  bindFieldValidation(empresaInput, "emp-empresa-error", validateCompany);
  bindFieldValidation(cidadeInput, "emp-cidade-error", validateCity);

  if (estadoInput) {
    estadoInput.addEventListener("change", () => clearInputError(estadoInput, "emp-estado-error"));
  }

  // Botão de preenchimento de teste para homologação
  const fillTestBtn = document.getElementById("btn-empresa-fill-test");
  if (fillTestBtn) {
    fillTestBtn.addEventListener("click", () => {
      if (nomeInput) nomeInput.value = "Fernando Calvo";
      if (telefoneInput) telefoneInput.value = "(33) 99921-3596";
      if (emailInput) emailInput.value = "fernando@exemplo.com";
      if (empresaInput) empresaInput.value = "Fernando Empresa Exemplo Ltda";
      if (funcionariosInput) funcionariosInput.value = "29";
      if (cidadeInput) cidadeInput.value = "Belo Horizonte";
      if (estadoInput) estadoInput.value = "MG";

      clearInputError(nomeInput, "emp-nome-error");
      clearInputError(telefoneInput, "emp-telefone-error");
      clearInputError(emailInput, "emp-email-error");
      clearInputError(empresaInput, "emp-empresa-error");
      clearInputError(funcionariosInput, "emp-funcionarios-error");
      clearInputError(cidadeInput, "emp-cidade-error");
      clearInputError(estadoInput, "emp-estado-error");

      if (feedbackEl) {
        feedbackEl.textContent =
          "Cadastro de teste preenchido! Clique em 'GARANTIR OPORTUNIDADE' para validar o envio.";
        feedbackEl.className = "form-feedback is-success";
      }
    });
  }

  // Auto-preenchimento opcional via URL (?teste=1)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("teste") === "1" || urlParams.get("test") === "true") {
      if (fillTestBtn) {
        window.setTimeout(() => fillTestBtn.click(), 200);
      }
    }
  } catch {
    // ignore
  }

  form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();

    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "form-feedback";
    }

    const nome = sanitizeInput(nomeInput?.value || "");
    const telefone = sanitizeInput(telefoneInput?.value || "");
    const email = sanitizeInput(emailInput?.value || "");
    const empresa = sanitizeInput(empresaInput?.value || "");
    const funcionarios = sanitizeInput(funcionariosInput?.value || "");
    const cidade = sanitizeInput(cidadeInput?.value || "");
    const estado = sanitizeInput(estadoInput?.value || "");

    const vNome = validateName(nome);
    const vTel = validatePhone(telefone);
    const vEmail = validateEmail(email);
    const vEmp = validateCompany(empresa);
    const vFunc = validateEmployeeCount(funcionarios);
    const vCidade = validateCity(cidade);

    let hasErrors = false;

    if (!vNome.isValid) {
      setInputError(nomeInput, "emp-nome-error", vNome.message);
      hasErrors = true;
    }
    if (!vTel.isValid) {
      setInputError(telefoneInput, "emp-telefone-error", vTel.message);
      hasErrors = true;
    }
    if (!vEmail.isValid) {
      setInputError(emailInput, "emp-email-error", vEmail.message);
      hasErrors = true;
    }
    if (!vEmp.isValid) {
      setInputError(empresaInput, "emp-empresa-error", vEmp.message);
      hasErrors = true;
    }
    if (!vFunc.isValid) {
      setInputError(funcionariosInput, "emp-funcionarios-error", vFunc.message);
      hasErrors = true;
    }
    if (!vCidade.isValid) {
      setInputError(cidadeInput, "emp-cidade-error", vCidade.message);
      hasErrors = true;
    }
    if (!estado) {
      setInputError(estadoInput, "emp-estado-error", "Obrigatório");
      hasErrors = true;
    }

    if (hasErrors) return;

    // 1. HONEYPOT: Proteção anti-spam invisível.
    // O campo website SEMPRE deve estar vazio para humanos. Se vier preenchido por robô, descarta.
    const formData = new FormData(form);
    const websiteValue = (formData.get("website") as string) || "";
    if (websiteValue.trim() !== "") {
      form.reset();
      if (feedbackEl) {
        feedbackEl.textContent = "Cadastro realizado com sucesso! Nossa equipe entrará em contato em breve.";
        feedbackEl.classList.add("is-success");
      }
      return;
    }

    const originalBtnText = submitBtn?.innerHTML || "<span>QUERO CONDIÇÕES ESPECIAIS</span>";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>ENVIANDO...</span>";
    }

    // Limpa caracteres do telefone mantendo apenas números (ex.: 33999213596 conforme especificação)
    const cleanPhone = telefone.replace(/\D/g, "");

    // 2. Construção do corpo da requisição conforme regra oficial e payload validado
    // CRÍTICO: "website": "" DEVE ser enviado (sempre presente e string vazia)
    const body = new URLSearchParams();
    body.append("nome", nome);
    body.append("telefone", cleanPhone || telefone);
    body.append("email", email);
    body.append("empresa", empresa);
    body.append("funcionarios", String(funcionarios));
    body.append("cidade", cidade);
    body.append("estado", estado);
    body.append("website", ""); // Mantém a chave e o valor vazio conforme validação do servidor/webhook
    body.append("origem", "5a-corrida-mario-penna-onmed-empresas");

    const payloadJson = {
      nome,
      telefone: cleanPhone || telefone,
      email,
      empresa,
      funcionarios: String(funcionarios),
      cidade,
      estado,
      website: "",
      origem: "5a-corrida-mario-penna-onmed-empresas",
    };

    try {
      const webhookUrl =
        endpoint ||
        (import.meta.env.VITE_EMPRESAS_WEBHOOK_URL as string) ||
        FORM_ENDPOINT;

      if (webhookUrl && webhookUrl.startsWith("http")) {
        // Atenção: em chamadas do navegador para Apps Script / Webhooks a resposta pode ser opaca (CORS).
        // mode: "no-cors" permite POST seguro sem bloqueio no navegador.
        try {
          await fetch(webhookUrl, {
            method: "POST",
            mode: "no-cors",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          });
        } catch (fetchErr) {
          console.warn("Aviso no disparo do webhook:", fetchErr);
        }
      }

      // 3. Gravação na Planilha Oficial do Google Sheets (Aba "Leads")
      const nowStr = new Date().toLocaleString("pt-BR");
      syncEmpresaSubmissionToActiveSheet({
        dataHora: nowStr,
        nome,
        telefone: cleanPhone || telefone,
        email,
        empresa,
        funcionarios: String(funcionarios),
        cidade,
        estado,
        status: "Recebido via Landing Page",
      }).catch((err) => console.warn("Google Sheets sync fallback:", err));

      // 4. Gravação Segura no Firebase Firestore (garantia de retenção definitiva de leads)
      try {
        await addDoc(collection(db, "empresa_leads"), {
          ...payloadJson,
          dataHoraStr: nowStr,
          timestamp: serverTimestamp(),
        });
      } catch (dbErr) {
        console.warn("Firestore lead fallback:", dbErr);
      }

      // 5. Armazenamento local no navegador para histórico e conferência imediata
      try {
        const localSubmissions = JSON.parse(localStorage.getItem("cmp_empresa_submissions") || "[]");
        localSubmissions.unshift({
          ...payloadJson,
          dataHora: nowStr,
        });
        localStorage.setItem("cmp_empresa_submissions", JSON.stringify(localSubmissions.slice(0, 100)));
      } catch {
        // ignore
      }

      if (feedbackEl) {
        feedbackEl.textContent = "Cadastro realizado com sucesso! Nossa equipe entrará em contato em breve.";
        feedbackEl.classList.add("is-success");
      }
      form.reset();
    } catch {
      if (feedbackEl) {
        feedbackEl.textContent =
          "Não foi possível concluir o envio no momento. Por favor, tente novamente em instantes.";
        feedbackEl.classList.add("is-error");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
}

/**
 * =============================================================================
 * FORMULÁRIO 2: SEÇÃO KIT CUIDAR DE VOCÊ (SORTEIO OFICIAL)
 * =============================================================================
 */
export function initKitForm(endpoint: string = KIT_FORM_ENDPOINT): void {
  const form = document.getElementById("kit-form") as HTMLFormElement | null;
  if (!form) return;

  const nomeInput = document.getElementById("kit-nome") as HTMLInputElement | null;
  const emailInput = document.getElementById("kit-email") as HTMLInputElement | null;
  const cidadeInput = document.getElementById("kit-cidade") as HTMLInputElement | null;
  const feedbackEl = document.getElementById("kit-form-feedback");
  const submitBtn = document.getElementById("btn-kit-submit") as HTMLButtonElement | null;

  // Elementos do Banner à Esquerda
  const bannerInitial = document.getElementById("kit-banner-initial");
  const bannerSuccess = document.getElementById("kit-banner-success");
  const successCodeEl = document.getElementById("kit-success-code-value");
  const successEmailEl = document.getElementById("kit-success-user-email");
  const downloadTicketBtn = document.getElementById("btn-kit-download-ticket");

  // Elementos de Ações à Direita
  const postActionsEl = document.getElementById("kit-post-actions");
  const downloadAltBtn = document.getElementById("btn-kit-download-alt");
  const newEntryBtn = document.getElementById("btn-kit-new-entry");

  let activeTicketData: TicketData | null = null;

  function handleTicketDownload(): void {
    if (activeTicketData) {
      downloadLuckyNumberTicket(activeTicketData);
    }
  }

  if (downloadTicketBtn) {
    downloadTicketBtn.addEventListener("click", handleTicketDownload);
  }
  if (downloadAltBtn) {
    downloadAltBtn.addEventListener("click", handleTicketDownload);
  }

  if (newEntryBtn) {
    newEntryBtn.addEventListener("click", () => {
      form.reset();
      activeTicketData = null;
      if (bannerInitial) bannerInitial.style.display = "block";
      if (bannerSuccess) bannerSuccess.style.display = "none";
      if (submitBtn) {
        submitBtn.style.display = "flex";
        submitBtn.disabled = false;
      }
      if (postActionsEl) postActionsEl.style.display = "none";
      if (feedbackEl) {
        feedbackEl.textContent = "";
        feedbackEl.className = "kit-form-feedback";
      }
    });
  }

  // Validação em Tempo Real
  bindFieldValidation(nomeInput, "kit-nome-error", validateName, true);
  bindFieldValidation(cidadeInput, "kit-cidade-error", validateCity, true);

  if (emailInput) {
    emailInput.addEventListener("input", () => {
      clearInputError(emailInput, "kit-email-error", true);
      // Notificação sutil se o e-mail já estiver cadastrado
      const existing = getExistingLocalEntry(emailInput.value);
      if (existing && feedbackEl) {
        feedbackEl.textContent = `Este e-mail já possui o Número da Sorte ${existing.code}. Ao enviar, seu comprovante será exibido novamente.`;
        feedbackEl.className = "kit-form-feedback is-info";
      }
    });
    emailInput.addEventListener("blur", () => {
      const res = validateEmail(emailInput.value);
      if (!res.isValid && emailInput.value.trim().length > 0) {
        setInputError(emailInput, "kit-email-error", res.message, true);
      }
    });
  }

  form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();

    if (feedbackEl) {
      feedbackEl.textContent = "";
      feedbackEl.className = "kit-form-feedback";
    }

    const nome = sanitizeInput(nomeInput?.value || "");
    const email = sanitizeInput(emailInput?.value || "");
    const cidade = sanitizeInput(cidadeInput?.value || "");

    const vNome = validateName(nome);
    const vEmail = validateEmail(email);
    const vCidade = validateCity(cidade);

    let hasErrors = false;

    if (!vNome.isValid) {
      setInputError(nomeInput, "kit-nome-error", vNome.message, true);
      hasErrors = true;
    }
    if (!vEmail.isValid) {
      setInputError(emailInput, "kit-email-error", vEmail.message, true);
      hasErrors = true;
    }
    if (!vCidade.isValid) {
      setInputError(cidadeInput, "kit-cidade-error", vCidade.message, true);
      hasErrors = true;
    }

    if (hasErrors) return;

    // Resgata ou aloca número da sorte estritamente numérico e nunca repetível
    const luckyCode = await getOrAllocateUniqueLuckyNumber(nome, email, cidade);
    const nowStr = new Date().toLocaleString("pt-BR");

    activeTicketData = {
      code: luckyCode,
      name: nome,
      email,
      city: cidade,
      date: nowStr,
    };

    const payload = {
      origem: "5a-corrida-mario-penna-kit-cuidar",
      nome,
      email,
      cidade,
      numeroDaSorte: luckyCode,
      enviadoEm: new Date().toISOString(),
    };

    const originalKitBtnText = "<span>CONFIRMAR INSCRIÇÃO</span>";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "<span>ENVIANDO...</span>";
    }

    try {
      let sequentialInscricao: number | string | null = null;

      // 1. Envio para Apps Script Web App (endpoint oficial configurado)
      const appsScriptUrl = endpoint || localStorage.getItem("cmp_apps_script_url") || "";
      if (appsScriptUrl) {
        try {
          const res = await fetch(appsScriptUrl, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
              nome,
              email,
              cidade,
              numeroDaSorte: luckyCode,
              code: luckyCode,
            }),
          });
          if (res.ok) {
            try {
              const resData = await res.json();
              if (resData && resData.inscricao) {
                sequentialInscricao = resData.inscricao;
              }
            } catch {
              // Resposta opaca ou redirecionamento padrão do Google Apps Script
            }
          }
        } catch (err) {
          console.warn("Disparo para Google Apps Script:", err);
        }
      } else {
        await sendFormData(endpoint, payload);
      }

      // 2. Sincroniza diretamente na tabela oficial [Inscritos] Corrida Mario Penna - Onmed e Saúde ao seu Alcance
      syncKitSubmissionToActiveSheet({
        numeroDaSorte: luckyCode,
        nomeCompleto: nome,
        email,
        cidade,
      }).catch((err) => {
        console.warn("Sincronização com Google Sheets pendente de conexão:", err);
      });

      // 3. Atualiza dados do bilhete com o número sequencial se retornado
      activeTicketData = {
        code: luckyCode,
        name: nome,
        email,
        city: cidade,
        inscricao: sequentialInscricao || undefined,
        date: nowStr,
      };

      // 4. Atualiza a div azul à esquerda com a mensagem de parabéns e o código único
      if (bannerInitial) bannerInitial.style.display = "none";
      if (bannerSuccess) bannerSuccess.style.display = "flex";
      if (successCodeEl) successCodeEl.textContent = luckyCode;
      if (successEmailEl) successEmailEl.textContent = email;

      // 5. Atualiza a área de envio à direita com botão para download
      if (submitBtn) submitBtn.style.display = "none";
      if (postActionsEl) postActionsEl.style.display = "flex";

      // 6. Limpa os campos após envio bem-sucedido
      if (nomeInput) nomeInput.value = "";
      if (emailInput) emailInput.value = "";
      if (cidadeInput) cidadeInput.value = "";

      if (feedbackEl) {
        feedbackEl.textContent = "";
        feedbackEl.className = "kit-form-feedback";
      }
    } catch {
      if (feedbackEl) {
        feedbackEl.textContent =
          "Ocorreu um erro ao registrar sua participação. Por favor, tente novamente.";
        feedbackEl.classList.add("is-error");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalKitBtnText;
      }
    }
  });
}
