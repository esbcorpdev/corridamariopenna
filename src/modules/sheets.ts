/**
 * Módulo de Integração com a Google Sheets API v4
 * Tabela Oficial: "[Inscritos] Corrida Mario Penna - Onmed e Saúde ao seu Alcance"
 * Colunas: [Nº Inscrição | Número da Sorte | Nome Completo | EMAIL | CIDADE]
 */

import { getAccessToken, openDriveModal } from "./drive.ts";

export const OFFICIAL_INSCITOS_SHEET_TITLE =
  "[Inscritos] Corrida Mario Penna - Onmed e Saúde ao seu Alcance";

export interface EmpresaRow {
  dataHora: string;
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  funcionarios: number | string;
  cidade?: string;
  estado?: string;
  status?: string;
}

export interface KitRow {
  dataHora?: string;
  numeroInscricao?: number | string;
  numeroDaSorte: string;
  nomeCompleto: string;
  email: string;
  cidade: string;
  status?: string;
}

export const DEFAULT_OFFICIAL_SPREADSHEET_ID = "1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk";
export const DEFAULT_OFFICIAL_SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk/edit?usp=sharing";

const LOCAL_STORAGE_ACTIVE_SHEET_KEY = "cmp_active_spreadsheet";
const LOCAL_STORAGE_PENDING_QUEUE_KEY = "cmp_pending_sheet_sync";

let activeSpreadsheetId: string | null = DEFAULT_OFFICIAL_SPREADSHEET_ID;
let activeSpreadsheetUrl: string | null = DEFAULT_OFFICIAL_SPREADSHEET_URL;

// Tenta restaurar ID salvo localmente
try {
  const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_SHEET_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    activeSpreadsheetId = parsed.id || DEFAULT_OFFICIAL_SPREADSHEET_ID;
    activeSpreadsheetUrl = parsed.url || DEFAULT_OFFICIAL_SPREADSHEET_URL;
  } else {
    saveActiveSheetIdLocally(DEFAULT_OFFICIAL_SPREADSHEET_ID, DEFAULT_OFFICIAL_SPREADSHEET_URL);
  }
} catch {
  // Silencia erros de storage
}

function saveActiveSheetIdLocally(id: string, url: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_SHEET_KEY, JSON.stringify({ id, url }));
  } catch {
    // ignore
  }
}

/**
 * Enfileira inscrição para sincronização posterior caso o atleta ainda não esteja logado no Google
 */
export function queuePendingSheetInscrito(data: {
  numeroDaSorte: string;
  nomeCompleto: string;
  email: string;
  cidade: string;
}): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_QUEUE_KEY);
    const queue: Array<typeof data> = raw ? JSON.parse(raw) : [];
    // Evita duplicatas pelo e-mail
    if (!queue.some((item) => item.email.toLowerCase() === data.email.toLowerCase())) {
      queue.push(data);
      localStorage.setItem(LOCAL_STORAGE_PENDING_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // ignore
  }
}

/**
 * Despeja todas as inscrições pendentes na planilha do Google Sheets assim que o token estiver disponível
 */
export async function flushPendingInscritosToSheet(): Promise<number> {
  const token = await getAccessToken();
  if (!token) return 0;

  let queue: Array<{ numeroDaSorte: string; nomeCompleto: string; email: string; cidade: string }> = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_QUEUE_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch {
    return 0;
  }

  if (queue.length === 0) return 0;

  let count = 0;
  for (const item of queue) {
    try {
      const res = await appendInscritoToOfficialSheet(item);
      if (res.ok) count++;
    } catch {
      break;
    }
  }

  try {
    // Remove os que foram sincronizados
    if (count >= queue.length) {
      localStorage.removeItem(LOCAL_STORAGE_PENDING_QUEUE_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_PENDING_QUEUE_KEY, JSON.stringify(queue.slice(count)));
    }
  } catch {
    // ignore
  }

  return count;
}

/**
 * Localiza ou cria a planilha oficial no Google Sheets do usuário:
 * "[Inscritos] Corrida Mario Penna - Onmed e Saúde ao seu Alcance"
 * com o cabeçalho exato:
 * [Nº Inscrição | Número da Sorte | Nome Completo | EMAIL | CIDADE]
 */
export async function getOrCreateOfficialInscritosSheet(): Promise<{ id: string; url: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Faça login com sua conta Google para conectar à planilha.");
  }

  // Se já temos a ativa confirmada, retorna
  if (activeSpreadsheetId) {
    return {
      id: activeSpreadsheetId,
      url: activeSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}`,
    };
  }

  // 1. Pesquisa no Google Drive se a planilha com este nome exato já existe
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  const escapedTitle = OFFICIAL_INSCITOS_SHEET_TITLE.replace(/'/g, "\\'");
  searchUrl.searchParams.set(
    "q",
    `name = '${escapedTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  searchUrl.searchParams.set("fields", "files(id, name, webViewLink)");
  searchUrl.searchParams.set("pageSize", "1");

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const file = searchData.files[0];
      const fileUrl: string = file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`;
      activeSpreadsheetId = file.id;
      activeSpreadsheetUrl = fileUrl;
      saveActiveSheetIdLocally(file.id, fileUrl);
      return { id: file.id, url: fileUrl };
    }
  }

  // 2. Se não existir, cria a planilha com a formatação idêntica à do print
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: OFFICIAL_INSCITOS_SHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: "Inscritos",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    {
                      userEnteredValue: { stringValue: "Nº Inscrição" },
                      userEnteredFormat: {
                        backgroundColor: { red: 0.62, green: 0.62, blue: 0.62 }, // Cinza do print
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: "CENTER",
                      },
                    },
                    {
                      userEnteredValue: { stringValue: "Nome Completo" },
                      userEnteredFormat: {
                        backgroundColor: { red: 0.0, green: 0.35, blue: 0.45 },
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: "CENTER",
                      },
                    },
                    {
                      userEnteredValue: { stringValue: "EMAIL" },
                      userEnteredFormat: {
                        backgroundColor: { red: 0.0, green: 0.35, blue: 0.45 },
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: "CENTER",
                      },
                    },
                    {
                      userEnteredValue: { stringValue: "CIDADE" },
                      userEnteredFormat: {
                        backgroundColor: { red: 0.0, green: 0.35, blue: 0.45 },
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: "CENTER",
                      },
                    },
                    {
                      userEnteredValue: { stringValue: "Número da Sorte" },
                      userEnteredFormat: {
                        backgroundColor: { red: 0.0, green: 0.35, blue: 0.45 }, // Azul petróleo do print
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: "CENTER",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Erro ao criar planilha no Google Sheets (${createRes.status})`);
  }

  const created = await createRes.json();
  const createdId: string = created.spreadsheetId;
  const createdUrl: string = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${createdId}`;
  activeSpreadsheetId = createdId;
  activeSpreadsheetUrl = createdUrl;
  saveActiveSheetIdLocally(createdId, createdUrl);

  return { id: createdId, url: createdUrl };
}

/**
 * Armazena o inscrito diretamente na tabela oficial:
 * [Inscritos] Corrida Mario Penna - Onmed e Saúde ao seu Alcance
 * Colunas: [Nº Inscrição | Número da Sorte | Nome Completo | EMAIL | CIDADE]
 */
export async function appendInscritoToOfficialSheet(data: {
  numeroDaSorte: string;
  nomeCompleto: string;
  email: string;
  cidade: string;
}): Promise<{ ok: boolean; numeroInscricao: number }> {
  const token = await getAccessToken();
  if (!token) {
    queuePendingSheetInscrito(data);
    return { ok: false, numeroInscricao: 0 };
  }

  const sheet = await getOrCreateOfficialInscritosSheet();

  // Descobre a contagem de inscritos para calcular o "Nº Inscrição"
  let nextNumber = 1;
  try {
    const rangeCheck = `Inscritos!A:A`;
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      sheet.id
    )}/values/${encodeURIComponent(rangeCheck)}`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (checkRes.ok) {
      const valData = await checkRes.json();
      if (valData.values && valData.values.length > 0) {
        nextNumber = valData.values.length; // Como linha 1 é o cabeçalho, a primeira entrada é 1, segunda é 2...
      }
    }
  } catch (err) {
    console.warn("Contador de linhas prévias, usando padrão", err);
  }

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    sheet.id
  )}/values/Inscritos!A:E:append?valueInputOption=USER_ENTERED`;

  const appendRes = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: "Inscritos!A:E",
      majorDimension: "ROWS",
      values: [
        [
          nextNumber,
          data.nomeCompleto,
          data.email,
          data.cidade,
          data.numeroDaSorte,
        ],
      ],
    }),
  });

  return { ok: appendRes.ok, numeroInscricao: nextNumber };
}

/**
 * Cria a Planilha Oficial da Corrida com confirmação explícita
 */
export async function createRaceSpreadsheetWithConfirm(): Promise<{ id: string; url: string }> {
  const token = await getAccessToken();
  if (!token) {
    openDriveModal();
    throw new Error("Faça login com sua conta Google para criar a planilha.");
  }

  const confirmed = window.confirm(
    `Deseja conectar ou criar a tabela oficial:\n\n"${OFFICIAL_INSCITOS_SHEET_TITLE}"\n\nno seu Google Sheets com as colunas [Nº Inscrição | Número da Sorte | Nome Completo | EMAIL | CIDADE]?`
  );
  if (!confirmed) {
    throw new Error("Operação cancelada pelo usuário.");
  }

  return await getOrCreateOfficialInscritosSheet();
}

/**
 * Adiciona linha de empresa à planilha
 */
export async function appendEmpresaToSheet(
  spreadsheetId: string,
  row: EmpresaRow
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const range = "Leads!A:H";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values: [
        [
          row.dataHora,
          row.nome,
          row.telefone,
          row.email,
          row.empresa,
          row.funcionarios,
          row.cidade || "",
          row.estado || "",
        ],
      ],
    }),
  });

  return response.ok;
}

export function getActiveSpreadsheetId(): string | null {
  return activeSpreadsheetId;
}

export function getActiveSpreadsheetUrl(): string | null {
  return activeSpreadsheetUrl;
}

export async function syncEmpresaSubmissionToActiveSheet(lead: EmpresaRow): Promise<boolean> {
  if (!activeSpreadsheetId) return false;
  try {
    return await appendEmpresaToSheet(activeSpreadsheetId, lead);
  } catch {
    return false;
  }
}

export async function syncKitSubmissionToActiveSheet(kit: {
  numeroDaSorte: string;
  nomeCompleto: string;
  email: string;
  cidade: string;
}): Promise<boolean> {
  try {
    const res = await appendInscritoToOfficialSheet(kit);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Lista planilhas do usuário no Google Drive
 */
export async function listUserSpreadsheets(): Promise<Array<{ id: string; name: string; webViewLink?: string }>> {
  const token = await getAccessToken();
  if (!token) return [];

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("fields", "files(id, name, webViewLink, modifiedTime)");
  url.searchParams.set("orderBy", "modifiedTime desc");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.files || [];
}

/**
 * Lê os dados de uma planilha
 */
export async function readSheetValues(
  spreadsheetId: string,
  range: string = "Inscritos!A1:E20"
): Promise<string[][]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Usuário não autenticado");

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Erro ao ler dados da planilha (${response.status})`);
  }

  const data = await response.json();
  return (data.values as string[][]) || [];
}

/**
 * Inicializa a interface e modal do Google Sheets
 */
export function initSheetsUI(): void {
  // Botões de abertura do modal
  document.querySelectorAll("[data-open-sheets-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openSheetsModal();
    });
  });

  // Fechamento
  const modal = document.getElementById("sheets-modal");
  const closeBtn = document.getElementById("sheets-modal-close");
  const backdrop = document.getElementById("sheets-modal-backdrop");

  if (closeBtn) closeBtn.addEventListener("click", closeSheetsModal);
  if (backdrop) backdrop.addEventListener("click", closeSheetsModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) {
      closeSheetsModal();
    }
  });

  // Botão Criar Planilha
  const createBtn = document.getElementById("btn-sheets-create");
  if (createBtn) {
    createBtn.addEventListener("click", async () => {
      try {
        setSheetsFeedback("Conectando à tabela oficial no seu Google Sheets...", "info");
        createBtn.setAttribute("disabled", "true");
        const res = await createRaceSpreadsheetWithConfirm();
        setSheetsFeedback(
          `Tabela "${OFFICIAL_INSCITOS_SHEET_TITLE}" conectada com sucesso!`,
          "success"
        );
        updateSheetsActiveLink(res.url, res.id);
        await flushPendingInscritosToSheet();
        await renderSpreadsheetList();
      } catch (err: any) {
        setSheetsFeedback(err?.message || "Não foi possível conectar à planilha.", "error");
      } finally {
        createBtn.removeAttribute("disabled");
      }
    });
  }

  // Botão Exportar Demonstração / Dados Atuais
  const exportBtn = document.getElementById("btn-sheets-export-sample");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      try {
        setSheetsFeedback("Sincronizando com a tabela oficial...", "info");
        exportBtn.setAttribute("disabled", "true");

        const res = await appendInscritoToOfficialSheet({
          numeroDaSorte: `#CMP-${Math.floor(10000 + Math.random() * 90000)}`,
          nomeCompleto: "Participante Demonstrativo",
          email: "atleta@exemplo.com.br",
          cidade: "Belo Horizonte",
        });

        if (res.ok) {
          setSheetsFeedback(
            `Inscrito Nº ${res.numeroInscricao} gravado com sucesso na tabela oficial!`,
            "success"
          );
        } else {
          setSheetsFeedback("Inscrição gravada localmente e aguardando conexão.", "info");
        }
      } catch (err: any) {
        setSheetsFeedback(err?.message || "Erro ao exportar dados.", "error");
      } finally {
        exportBtn.removeAttribute("disabled");
      }
    });
  }

  // Tenta localizar a planilha automaticamente se já houver token
  getAccessToken().then((token) => {
    if (token) {
      getOrCreateOfficialInscritosSheet()
        .then((sheet) => {
          updateSheetsActiveLink(sheet.url, sheet.id);
          flushPendingInscritosToSheet();
        })
        .catch(() => {});
    }
  });
}

export function openSheetsModal(): void {
  const modal = document.getElementById("sheets-modal");
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (activeSpreadsheetUrl && activeSpreadsheetId) {
      updateSheetsActiveLink(activeSpreadsheetUrl, activeSpreadsheetId);
    }
    renderSpreadsheetList();
  }
}

export function closeSheetsModal(): void {
  const modal = document.getElementById("sheets-modal");
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
}

function setSheetsFeedback(msg: string, type: "info" | "success" | "error"): void {
  const fb = document.getElementById("sheets-feedback");
  if (!fb) return;
  fb.textContent = msg;
  fb.className = `drive-feedback drive-feedback--${type}`;
  if (!msg) fb.style.display = "none";
  else fb.style.display = "block";
}

function updateSheetsActiveLink(url: string, id: string): void {
  activeSpreadsheetId = id;
  activeSpreadsheetUrl = url;
  saveActiveSheetIdLocally(id, url);

  const linkWrap = document.getElementById("sheets-active-link-wrap");
  const linkEl = document.getElementById("sheets-active-link") as HTMLAnchorElement | null;
  const tableNameEl = document.getElementById("sheets-active-table-name");

  if (tableNameEl) {
    tableNameEl.textContent = OFFICIAL_INSCITOS_SHEET_TITLE;
  }
  if (linkWrap && linkEl) {
    linkEl.href = url;
    linkWrap.style.display = "flex";
  }
}

async function renderSpreadsheetList(): Promise<void> {
  const container = document.getElementById("sheets-existing-list");
  if (!container) return;

  const token = await getAccessToken();
  if (!token) {
    container.innerHTML = `<p class="drive-files-empty">Conecte sua conta Google no topo para sincronizar com a tabela <strong>${OFFICIAL_INSCITOS_SHEET_TITLE}</strong>.</p>`;
    return;
  }

  container.innerHTML = `<div class="drive-files-loading"><span class="drive-spinner"></span> Consultando Google Sheets...</div>`;

  try {
    const list = await listUserSpreadsheets();
    if (!list.length) {
      container.innerHTML = `<p class="drive-files-empty">Nenhuma planilha encontrada. Clique no botão acima para criar a tabela oficial da corrida.</p>`;
      return;
    }

    container.innerHTML = "";
    list.forEach((sheet) => {
      const isOfficial = sheet.name.includes("[Inscritos] Corrida Mario Penna");
      const card = document.createElement("div");
      card.className = `drive-file-card ${isOfficial ? "is-official-card" : ""}`;
      card.innerHTML = `
        <div class="drive-file-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#0F9D58">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm0-4H6v-2h6v2zm0-4H6V7h6v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z"/>
          </svg>
        </div>
        <div class="drive-file-info">
          <a href="${sheet.webViewLink || "#"}" target="_blank" rel="noopener noreferrer" class="drive-file-name">
            ${sheet.name}
          </a>
          <span class="drive-file-meta">${isOfficial ? "⭐ Tabela Oficial da Corrida" : "Planilha do Google Sheets"}</span>
        </div>
        <div class="drive-file-actions">
          <button type="button" class="btn-sheets-select" data-select-sheet="${sheet.id}" data-sheet-url="${sheet.webViewLink || ""}">
            ${sheet.id === activeSpreadsheetId ? "Conectada ✓" : "Selecionar"}
          </button>
          <a href="${sheet.webViewLink || "#"}" target="_blank" rel="noopener noreferrer" class="btn-drive-action" title="Abrir no Google Sheets">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          </a>
        </div>
      `;

      const selectBtn = card.querySelector("[data-select-sheet]");
      if (selectBtn) {
        selectBtn.addEventListener("click", () => {
          updateSheetsActiveLink(sheet.webViewLink || "", sheet.id);
          setSheetsFeedback(`Planilha "${sheet.name}" selecionada como ativa!`, "info");
        });
      }

      container.appendChild(card);
    });
  } catch (err: any) {
    container.innerHTML = `<p class="drive-files-error">${err?.message || "Erro ao carregar planilhas."}</p>`;
  }
}
