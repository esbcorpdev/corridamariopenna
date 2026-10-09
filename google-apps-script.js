/**
 * ============================================================================
 * GOOGLE APPS SCRIPT — INTEGRAÇÃO OFICIAL DA DIV KIT CUIDAR DE VOCÊ (SORTEIO)
 * Planilha Oficial: https://docs.google.com/spreadsheets/d/1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk/edit?usp=sharing
 * 
 * Versão Ativa: Versão 4 (9 de out. de 2026, 13:32)
 * Código de Implantação: AKfycbw6feMl4blQaejupjOmeUS90g6C6e3KYLpUd-Lde90i5s0JAN_FyIfoWez0EY1eCK1l
 * App da Web URL: https://script.google.com/macros/s/AKfycbw6feMl4blQaejupjOmeUS90g6C6e3KYLpUd-Lde90i5s0JAN_FyIfoWez0EY1eCK1l/exec
 * Biblioteca: https://script.google.com/macros/library/d/1yEMRAgY2Cw4w8FFMgdS054EsZiLaQx0y3ujwDbbc7WFohuqJ_bawcVrY/4
 * 
 * Aba Exclusiva: "Inscritos"
 * 
 * ORDEM OFICIAL DAS COLUNAS (A até G):
 *   A: Nº Inscrição (Sequencial automático gerado pelo script)
 *   B: Nome Completo
 *   C: Email
 *   D: Telefone
 *   E: Cidade
 *   F: Estado
 *   G: Número da Sorte (Código único alocado para o participante)
 * ============================================================================
 * 
 * INSTRUÇÕES PARA ATUALIZAR NO GOOGLE SHEETS:
 * 1. Abra sua planilha do Google Sheets (ou acesse pelo link acima).
 * 2. No menu superior: Extensões > Apps Script.
 * 3. Substitua todo o conteúdo do arquivo Código.gs (ou codigo.gs) por este código.
 * 4. Clique em "Salvar" (ícone de disquete).
 * 5. Clique no botão azul "Implantar" > "Gerenciar implantações".
 * 6. Clique no ícone de lápis (Editar).
 * 7. No campo "Versão", selecione "Nova versão" (MUITO IMPORTANTE para aplicar as mudanças).
 * 8. Garanta que "Quem pode acessar" esteja como: "Qualquer pessoa" (Anyone).
 * 9. Clique em "Implantar" e confirme a autorização de permissões se solicitado.
 * ============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Aguarda até 10 segundos para evitar conflito de concorrência em múltiplos envios simultâneos
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};

    // 1. Parsing flexível do payload recebido (JSON ou x-www-form-urlencoded)
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (errJson) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 2. Proteção Anti-Spam / Honeypot: se o campo website foi preenchido, é bot
    var honeypot = (data.website || "").toString().trim();
    if (honeypot !== "") {
      Logger.log("Honeypot acionado. Descartando envio automático de bot: " + honeypot);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Recebido com sucesso."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Extração e sanitização dos campos da div Kit Cuidar
    var nome = (data.nome || data.nomeCompleto || data.Nome || "").toString().trim();
    var email = (data.email || data.Email || "").toString().trim();
    var telefone = (data.telefone || data.phone || data.Telefone || "").toString().trim();
    var cidade = (data.cidade || data.city || data.Cidade || "").toString().trim();
    var estado = (data.estado || data.uf || data.state || data.Estado || "").toString().trim();
    var numeroDaSorte = (data.numeroDaSorte || data.code || data.luckyCode || "").toString().trim();

    // 4. Validação dos dados obrigatórios
    if (!nome || !email || !telefone || !cidade || !estado) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Campos obrigatórios ausentes: Nome, Email, Telefone, Cidade ou Estado."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Localiza ou cria a aba "Inscritos"
    var sheetInscritos = ss.getSheetByName("Inscritos");
    if (!sheetInscritos) {
      sheetInscritos = ss.insertSheet("Inscritos");
      sheetInscritos.appendRow([
        "Nº Inscrição",
        "Nome Completo",
        "Email",
        "Telefone",
        "Cidade",
        "Estado",
        "Número da Sorte"
      ]);
      sheetInscritos.setFrozenRows(1);
      var headerRange = sheetInscritos.getRange(1, 1, 1, 7);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#005973");
      headerRange.setFontColor("#ffffff");
    }

    // 6. Mapeamento dinâmico de cabeçalhos (evita gravação na coluna errada caso a planilha tenha ordem diferente)
    var headers = sheetInscritos.getRange(1, 1, 1, Math.max(sheetInscritos.getLastColumn(), 7)).getValues()[0];
    
    // 7. Cálculo atômico e sequencial do Nº de Inscrição (Coluna A)
    var lastRow = sheetInscritos.getLastRow();
    var proximoNumero = 1;
    if (lastRow > 1) {
      var ultimoValor = sheetInscritos.getRange(lastRow, 1).getValue();
      if (!isNaN(ultimoValor) && Number(ultimoValor) > 0) {
        proximoNumero = Number(ultimoValor) + 1;
      } else {
        proximoNumero = lastRow;
      }
    }

    // Se número da sorte não foi informado, gera automaticamente um código único de 5 dígitos
    if (!numeroDaSorte) {
      numeroDaSorte = Math.floor(10000 + Math.random() * 90000).toString();
    }

    // 8. Construção dos dados na ordem padrão oficial (A até G):
    // A: Nº Inscrição | B: Nome Completo | C: Email | D: Telefone | E: Cidade | F: Estado | G: Número da Sorte
    var rowData = [
      proximoNumero,
      nome,
      email,
      telefone,
      cidade,
      estado,
      numeroDaSorte
    ];

    // Se a aba já possui cabeçalhos reconhecidos, mapeia estritamente pelo nome da coluna:
    var hasHeaderTitles = headers.some(function(h) { return h && h.toString().trim().length > 0; });
    if (hasHeaderTitles) {
      var customRow = new Array(headers.length);
      var matchedAny = false;

      for (var colIdx = 0; colIdx < headers.length; colIdx++) {
        var hTitle = (headers[colIdx] || "").toString().toLowerCase().trim();
        if (hTitle.indexOf("inscrição") !== -1 || hTitle.indexOf("inscricao") !== -1 || hTitle === "id") {
          customRow[colIdx] = proximoNumero;
          matchedAny = true;
        } else if (hTitle.indexOf("nome") !== -1) {
          customRow[colIdx] = nome;
          matchedAny = true;
        } else if (hTitle.indexOf("mail") !== -1) {
          customRow[colIdx] = email;
          matchedAny = true;
        } else if (hTitle.indexOf("tel") !== -1 || hTitle.indexOf("fone") !== -1 || hTitle.indexOf("cel") !== -1 || hTitle.indexOf("whatsapp") !== -1) {
          customRow[colIdx] = telefone;
          matchedAny = true;
        } else if (hTitle.indexOf("cidade") !== -1 || hTitle.indexOf("munic") !== -1) {
          customRow[colIdx] = cidade;
          matchedAny = true;
        } else if (hTitle.indexOf("estado") !== -1 || hTitle.indexOf("uf") !== -1) {
          customRow[colIdx] = estado;
          matchedAny = true;
        } else if (hTitle.indexOf("sorte") !== -1 || hTitle.indexOf("número") !== -1 || hTitle.indexOf("numero") !== -1 || hTitle.indexOf("ticket") !== -1) {
          customRow[colIdx] = numeroDaSorte;
          matchedAny = true;
        } else {
          customRow[colIdx] = "";
        }
      }

      // Se encontrou as colunas nomeadas na linha 1, usa a linha mapeada por cabeçalho
      if (matchedAny && customRow.filter(function(v) { return v !== undefined && v !== ""; }).length >= 4) {
        rowData = customRow;
      }
    }

    // 9. Grava a nova linha na planilha
    sheetInscritos.appendRow(rowData);

    // 10. Resposta de sucesso estruturada em JSON
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      tipo: "inscritos",
      inscricao: proximoNumero,
      numeroDaSorte: numeroDaSorte,
      message: "Inscrição no Kit Cuidar de Você confirmada com sucesso!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro no processamento do doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Health check e consulta de status da integração via requisição GET
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    servico: "Webhook Oficial — Sorteio Kit Cuidar de Você (Aba Inscritos)",
    colunas: [
      "A: Nº Inscrição",
      "B: Nome Completo",
      "C: Email",
      "D: Telefone",
      "E: Cidade",
      "F: Estado",
      "G: Número da Sorte"
    ],
    planilha: "https://docs.google.com/spreadsheets/d/1kXgtGloqrVjKPD9Uv1gey1PuCmLNIJwnQTGvCmPx3hk/edit?usp=sharing",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
