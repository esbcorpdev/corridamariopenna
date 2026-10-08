/**
 * Módulo de Integração com o Google Drive e Autenticação Google Workspace (OAuth / Firebase Auth)
 * Permite aos atletas e parceiros acessar, visualizar, salvar e organizar documentos oficiais da corrida no Google Drive.
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.activity",
  "https://www.googleapis.com/auth/drive.activity.readonly",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.apps.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.install",
  "https://www.googleapis.com/auth/drive.meet.readonly",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.photos.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.scripts",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export const DRIVE_SCOPES = WORKSPACE_SCOPES;

// Inicialização segura do Firebase (evita re-inicializações)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Cache do token em memória (NÃO armazenar em localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export function initDriveAuth(
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
): void {
  onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    } else {
      currentUser = null;
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
    renderDriveUI();
  });
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string } | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Não foi possível obter o token de acesso da conta Google.");
    }
    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    renderDriveUI();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Erro na autenticação com o Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export async function logoutDrive(): Promise<void> {
  await signOut(auth);
  currentUser = null;
  cachedAccessToken = null;
  renderDriveUI();
}

/**
 * Lista arquivos do Google Drive
 */
export async function listDriveFiles(searchTerm: string = ""): Promise<DriveFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado no Google Drive");

  let query = "trashed = false";
  if (searchTerm.trim()) {
    const escaped = searchTerm.replace(/'/g, "\\'");
    query += ` and name contains '${escaped}'`;
  }

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", query);
  url.searchParams.set("pageSize", "15");
  url.searchParams.set("fields", "files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)");
  url.searchParams.set("orderBy", "modifiedTime desc");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      renderDriveUI();
      throw new Error("Sessão expirada. Por favor, conecte-se novamente.");
    }
    throw new Error(`Erro ao consultar o Google Drive (${response.status})`);
  }

  const data = await response.json();
  return (data.files as DriveFile[]) || [];
}

/**
 * Salva documento oficial da corrida no Google Drive do usuário
 */
export async function saveOfficialRaceDocToDrive(): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado");

  const docContent = `5ª CORRIDA MÁRIO PENNA 2026 — GUIA OFICIAL DO ATLETA
===========================================================
DATA: Sábado – 24 de Outubro de 2026 às 07:00 (Largada)
LOCAL: Praça Nova – Pampulha – Belo Horizonte, MG

MODALIDADES:
- Corrida de 10 km
- Corrida de 5 km
- Caminhada de 2 km
- Corrida Kids (Nascidos entre 2013 e 2022)

REALIZAÇÃO E APOIO:
- Instituto Mário Penna
- Saúde ao Seu Alcance (saudealseualcance.com)
- Onmed Saúde Suplementar (Registro ANS)

INFORMAÇÕES DO KIT:
- Retirada com documento oficial com foto e comprovante de inscrição.
- O kit inclui camisa tecnológica esportiva, squeeze, número de peito com chip de cronometragem e brindes exclusivos.

CUIDADOS E PREVENÇÃO:
- Hidratação constante antes, durante e após a prova.
- Chegue ao local com no mínimo 45 minutos de antecedência.
Documento gerado automaticamente pelo portal oficial da 5ª Corrida Mário Penna.`;

  const metadata = {
    name: "5a-Corrida-Mario-Penna-2026-Guia-do-Atleta.txt",
    mimeType: "text/plain",
    description: "Guia Oficial e Regulamento da 5ª Corrida Mário Penna (24/10/2026)",
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
    docContent +
    closeDelimiter;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    throw new Error(`Falha ao salvar no Google Drive (${response.status})`);
  }

  return await response.json();
}

/**
 * Operação com confirmação explícita do usuário (mandatário por SKILL.md)
 */
export async function deleteDriveFileWithConfirm(fileId: string, fileName: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado");

  const confirmed = window.confirm(
    `Tem certeza que deseja mover o arquivo "${fileName}" para a lixeira do seu Google Drive?\n\nEsta ação pode ser desfeita na lixeira do Drive.`
  );
  if (!confirmed) return false;

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Erro ao excluir arquivo (${response.status})`);
  }

  return true;
}

// -----------------------------------------------------------------------------
// UI CONTROLLER & MODAL
// -----------------------------------------------------------------------------
export function initDriveUI(): void {
  // Inicializa listener de autenticação
  initDriveAuth(
    () => {
      renderDriveUI();
      loadFilesList();
    },
    () => {
      renderDriveUI();
    }
  );

  // Botões de abertura do modal
  document.querySelectorAll("[data-open-drive-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openDriveModal();
    });
  });

  // Fechamento do modal
  const modal = document.getElementById("drive-modal");
  const closeBtn = document.getElementById("drive-modal-close");
  const backdrop = document.getElementById("drive-modal-backdrop");

  if (closeBtn) closeBtn.addEventListener("click", closeDriveModal);
  if (backdrop) backdrop.addEventListener("click", closeDriveModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) {
      closeDriveModal();
    }
  });

  // Eventos de Ação do Drive
  const loginBtn = document.getElementById("btn-drive-login");
  const logoutBtn = document.getElementById("btn-drive-logout");
  const saveDocBtn = document.getElementById("btn-drive-save-guide");
  const refreshBtn = document.getElementById("btn-drive-refresh");
  const searchInput = document.getElementById("drive-search-input") as HTMLInputElement | null;

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        setDriveFeedback("Conectando com o Google...", "info");
        const res = await googleSignIn();
        if (res) {
          setDriveFeedback(`Conectado com sucesso como ${res.user.displayName || res.user.email}!`, "success");
          await loadFilesList();
        }
      } catch (err: any) {
        setDriveFeedback(err?.message || "Não foi possível conectar com o Google.", "error");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logoutDrive();
      setDriveFeedback("Você foi desconectado do Google Drive.", "info");
    });
  }

  if (saveDocBtn) {
    saveDocBtn.addEventListener("click", async () => {
      try {
        saveDocBtn.setAttribute("disabled", "true");
        setDriveFeedback("Salvando Guia Oficial no seu Google Drive...", "info");
        const file = await saveOfficialRaceDocToDrive();
        setDriveFeedback(`Arquivo salvo com sucesso no seu Drive!`, "success");
        await loadFilesList();
        if (file.webViewLink) {
          window.open(file.webViewLink, "_blank", "noopener,noreferrer");
        }
      } catch (err: any) {
        setDriveFeedback(err?.message || "Erro ao salvar arquivo no Drive.", "error");
      } finally {
        saveDocBtn.removeAttribute("disabled");
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      const q = searchInput ? searchInput.value : "";
      loadFilesList(q);
    });
  }

  if (searchInput) {
    let debounceTimer: number | undefined;
    searchInput.addEventListener("input", () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        loadFilesList(searchInput.value);
      }, 400);
    });
  }
}

export function openDriveModal(): void {
  const modal = document.getElementById("drive-modal");
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    renderDriveUI();
    if (cachedAccessToken) {
      loadFilesList();
    }
  }
}

export function closeDriveModal(): void {
  const modal = document.getElementById("drive-modal");
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
}

function setDriveFeedback(msg: string, type: "info" | "success" | "error"): void {
  const fb = document.getElementById("drive-feedback");
  if (!fb) return;
  fb.textContent = msg;
  fb.className = `drive-feedback drive-feedback--${type}`;
  if (!msg) fb.style.display = "none";
  else fb.style.display = "block";
}

function renderDriveUI(): void {
  const loggedOutView = document.getElementById("drive-logged-out");
  const loggedInView = document.getElementById("drive-logged-in");
  const userAvatar = document.getElementById("drive-user-avatar") as HTMLImageElement | null;
  const userName = document.getElementById("drive-user-name");
  const userEmail = document.getElementById("drive-user-email");
  const navBadge = document.getElementById("nav-drive-status");

  const isAuthenticated = !!(currentUser && cachedAccessToken);

  if (navBadge) {
    if (isAuthenticated) {
      navBadge.textContent = "Conectado";
      navBadge.classList.add("is-connected");
    } else {
      navBadge.textContent = "Conectar";
      navBadge.classList.remove("is-connected");
    }
  }

  if (loggedOutView && loggedInView) {
    if (isAuthenticated) {
      loggedOutView.style.display = "none";
      loggedInView.style.display = "block";

      if (userName) userName.textContent = currentUser?.displayName || "Atleta";
      if (userEmail) userEmail.textContent = currentUser?.email || "";
      if (userAvatar) {
        if (currentUser?.photoURL) {
          userAvatar.src = currentUser.photoURL;
          userAvatar.style.display = "block";
        } else {
          userAvatar.style.display = "none";
        }
      }
    } else {
      loggedOutView.style.display = "block";
      loggedInView.style.display = "none";
    }
  }
}

async function loadFilesList(query: string = ""): Promise<void> {
  const listEl = document.getElementById("drive-files-list");
  if (!listEl) return;

  if (!cachedAccessToken) {
    listEl.innerHTML = `<p class="drive-files-empty">Conecte sua conta Google para visualizar seus arquivos.</p>`;
    return;
  }

  listEl.innerHTML = `<div class="drive-files-loading"><span class="drive-spinner"></span> Carregando arquivos do Google Drive...</div>`;

  try {
    const files = await listDriveFiles(query);
    if (!files.length) {
      listEl.innerHTML = `<p class="drive-files-empty">Nenhum arquivo encontrado no seu Google Drive com este critério.</p>`;
      return;
    }

    listEl.innerHTML = "";
    files.forEach((file) => {
      const item = document.createElement("div");
      item.className = "drive-file-card";

      const icon = getFileIconSvg(file.mimeType);
      const formattedDate = file.modifiedTime
        ? new Date(file.modifiedTime).toLocaleDateString("pt-BR")
        : "";

      item.innerHTML = `
        <div class="drive-file-icon">${icon}</div>
        <div class="drive-file-info">
          <a href="${file.webViewLink || "#"}" target="_blank" rel="noopener noreferrer" class="drive-file-name" title="${file.name}">
            ${escapeHtml(file.name)}
          </a>
          <span class="drive-file-meta">${file.mimeType.split("/").pop() || "Arquivo"} • Modificado em ${formattedDate}</span>
        </div>
        <div class="drive-file-actions">
          ${
            file.webViewLink
              ? `<a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer" class="btn-drive-action" aria-label="Abrir ${escapeHtml(file.name)} no Google Drive" title="Abrir no Google Drive">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                </a>`
              : ""
          }
          <button type="button" class="btn-drive-action btn-drive-action--delete" data-delete-file="${file.id}" data-file-name="${escapeHtml(file.name)}" aria-label="Excluir arquivo ${escapeHtml(file.name)}" title="Excluir">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;

      const delBtn = item.querySelector("[data-delete-file]");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          try {
            const success = await deleteDriveFileWithConfirm(file.id, file.name);
            if (success) {
              setDriveFeedback(`Arquivo "${file.name}" removido com sucesso.`, "info");
              await loadFilesList(query);
            }
          } catch (err: any) {
            setDriveFeedback(err?.message || "Erro ao excluir arquivo.", "error");
          }
        });
      }

      listEl.appendChild(item);
    });
  } catch (err: any) {
    listEl.innerHTML = `<p class="drive-files-error">${err?.message || "Erro ao listar arquivos do Drive."}</p>`;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getFileIconSvg(mimeType: string): string {
  if (mimeType.includes("folder")) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="#F4B400"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
  }
  if (mimeType.includes("pdf")) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="#EA4335"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>`;
  }
  if (mimeType.includes("document") || mimeType.includes("text")) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="#4285F4"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;
  }
  if (mimeType.includes("image")) {
    return `<svg viewBox="0 0 24 24" width="22" height="22" fill="#34A853"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="#5f6368"><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></svg>`;
}
