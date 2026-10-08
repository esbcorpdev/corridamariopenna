/**
 * ============================================================================
 * GOOGLE APPS SCRIPT — INTEGRAÇÃO AUTOMÁTICA COM GOOGLE SHEETS
 * Planilha Oficial: https://docs.google.com/spreadsheets/d/1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk/edit?usp=sharing
 * 
 * Abas Suportadas:
 *   1. "Leads" — Formulário Empresarial (B2B OnMed Empresas)
 *      Colunas: [Data, Nome, Telefone, E-mail, Nome da empresa, Quantidade de funcionários, Cidade, Estado]
 *   2. "Inscritos" — Sorteio Kit Cuidar de Você (B2C)
 *      Colunas: [Nº Inscrição, Nome Completo, Email, Cidade, Número da Sorte]
 * ============================================================================
 * 
 * INSTRUÇÕES PARA ATUALIZAR NO GOOGLE SHEETS:
 * 1. Abra a planilha (https://docs.google.com/spreadsheets/d/1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk/edit?usp=sharing).
 * 2. No menu superior: Extensões > Apps Script.
 * 3. Substitua todo o conteúdo do arquivo Código.gs por este código.
 * 4. Clique em "Salvar" (ícone de disquete).
 * 5. Clique em "Implantar" > "Gerenciar implantações" > Ícone de Lápis (Editar).
 * 6. Em "Versão", selecione "Nova versão" (MUITO IMPORTANTE).
 * 7. Garanta que "Quem pode acessar" esteja configurado como: "Qualquer pessoa" (Anyone).
 * 8. Clique em "Implantar".
 * ============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};

    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    // REGRA DE HONEYPOT: O campo website SEMPRE deve estar vazio.
    // Se vier com qualquer conteúdo, trata-se de um robô/bot. Descarta silenciosamente.
    var website = (data.website || "").toString().trim();
    if (website !== "") {
      Logger.log("Honeypot acionado! Descartando envio de robô: " + website);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Recebido com sucesso."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================================
    // FLUXO 1: FORMULÁRIO EMPRESARIAL (B2B ONMED) -> ABA "Leads"
    // ========================================================================
    var isEmpresa = data.empresa || data.nome_empresa || data["Nome da empresa"] ||
                    data.telefone || data.funcionarios ||
                    (data.origem && data.origem.indexOf("empresas") !== -1);

    if (isEmpresa) {
      var sheetLeads = ss.getSheetByName("Leads") || ss.getSheetByName("Empresas");
      if (!sheetLeads) {
        sheetLeads = ss.insertSheet("Leads");
        sheetLeads.appendRow([
          "Data",
          "Nome",
          "Telefone",
          "E-mail",
          "Nome da empresa",
          "Quantidade de funcionários",
          "Cidade",
          "Estado"
        ]);
        sheetLeads.setFrozenRows(1);
        var headerRange = sheetLeads.getRange(1, 1, 1, 8);
        headerRange.setFontWeight("bold");
        headerRange.setBackground("#005973");
        headerRange.setFontColor("#ffffff");
      }

      var nomeEmp = (data.nome || data.nomeCompleto || "").toString().trim();
      var telEmp = (data.telefone || "").toString().trim();
      var emailEmp = (data.email || "").toString().trim();
      var empresaNome = (data.empresa || data["Nome da empresa"] || data.nome_empresa || "").toString().trim();
      var funcionariosQtd = (data.funcionarios || data["Quantidade de funcionários"] || "").toString().trim();
      var cidadeEmp = (data.cidade || "").toString().trim();
      var estadoEmp = (data.estado || "").toString().trim();
      var dataHora = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");

      // Grava exatamente na ordem das 8 colunas da aba Leads:
      sheetLeads.appendRow([
        dataHora,
        nomeEmp,
        telEmp,
        emailEmp,
        empresaNome,
        funcionariosQtd,
        cidadeEmp,
        estadoEmp
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        tipo: "empresa",
        message: "Lead gravado com sucesso na aba Leads da planilha!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================================
    // FLUXO 2: SORTEIO KIT CUIDAR DE VOCÊ (B2C) -> ABA "Inscritos"
    // ========================================================================
    var sheetInscritos = ss.getSheetByName("Inscritos");
    if (!sheetInscritos) {
      sheetInscritos = ss.insertSheet("Inscritos");
      sheetInscritos.appendRow(["Nº Inscrição", "Nome Completo", "Email", "Cidade", "Número da Sorte"]);
      sheetInscritos.setFrozenRows(1);
    }

    var nome = (data.nome || data.nomeCompleto || "").toString().trim();
    var email = (data.email || "").toString().trim();
    var cidade = (data.cidade || "").toString().trim();
    var numeroDaSorte = (data.numeroDaSorte || data.code || "").toString().trim();

    if (!nome || !email || !cidade) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Campos obrigatórios ausentes: Nome, E-mail e Cidade."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastRow = sheetInscritos.getLastRow();
    var proximoNumero = lastRow > 1 ? lastRow : 1;

    sheetInscritos.appendRow([proximoNumero, nome, email, cidade, numeroDaSorte]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      tipo: "kit",
      inscricao: proximoNumero,
      numeroDaSorte: numeroDaSorte,
      message: "Inscrição gravada com sucesso!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    servico: "API de Gravação Google Sheets (Leads & Inscritos) — 5ª Corrida Mário Penna",
    planilha: "https://docs.google.com/spreadsheets/d/1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk/edit?usp=sharing",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
