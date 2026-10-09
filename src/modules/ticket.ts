/**
 * Módulo Gerador de Comprovante / Número da Sorte da 5ª Corrida Mário Penna
 * Gera o Card oficial em alta resolução (PNG) EXATO ao card exibido na tela após o preenchimento.
 */

export interface TicketData {
  name: string;
  email: string;
  phone?: string;
  city: string;
  state?: string;
  code: string;
  inscricao?: number | string;
  date?: string;
}

export async function downloadLuckyNumberTicket(data: TicketData): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // continua caso falhe
    }
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Alta definição para download e compartilhamento em redes (760 x 920)
  canvas.width = 760;
  canvas.height = 920;

  // 1. Fundo Geral Transparente com Card Principal Centralizado
  const cardX = 30;
  const cardY = 30;
  const cardW = 700;
  const cardH = 860;
  const cardR = 28;

  // Sombra suave do card
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 18;

  // Gradiente Azul Royal Oficial (mesmo tom do .kit-promo-banner)
  const bgGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  bgGrad.addColorStop(0, "#0a0d82");
  bgGrad.addColorStop(0.45, "#10109b");
  bgGrad.addColorStop(1, "#07095c");
  ctx.fillStyle = bgGrad;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.restore();

  // Borda suave do card principal
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();

  // 2. Grafismos Técnicos Esportivos de Fundo (Linhas dinâmicas sutis)
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  for (let i = -100; i < 900; i += 38) {
    ctx.beginPath();
    ctx.moveTo(i, cardY);
    ctx.lineTo(i + 220, cardY + cardH);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Cabeçalho Oficial do Evento
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.font = "bold 15px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("5ª CORRIDA MÁRIO PENNA • 2026", 70, 84);

  // Selo Dourado de Sorteio Oficial
  ctx.fillStyle = "rgba(255, 184, 0, 0.16)";
  roundRect(ctx, 520, 64, 170, 30, 15);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(255, 184, 0, 0.45)";
  roundRect(ctx, 520, 64, 170, 30, 15);
  ctx.stroke();

  ctx.fillStyle = "#ffb800";
  ctx.font = "bold 12px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("★ SORTEIO OFICIAL", 544, 84);

  // Linha divisória sutil superior
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 114);
  ctx.lineTo(690, 114);
  ctx.stroke();

  // 4. Kicker Exato da Tela (🎉 PARABÉNS POR PARTICIPAR!)
  ctx.fillStyle = "#ffb800";
  ctx.font = "bold 23px 'Montserrat', 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("🎉 PARABÉNS POR PARTICIPAR!", 70, 164);

  // 5. Tagline Exata da Tela (Você está concorrendo ao Kit Cuidar de Você!)
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.font = "500 20px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("Você está concorrendo ao Kit Cuidar de Você!", 70, 206);

  // 6. Card Translúcido Exato do Código (.kit-success-code-card)
  const codeBoxX = 70;
  const codeBoxY = 246;
  const codeBoxW = 620;
  const codeBoxH = 216;
  const codeBoxR = 20;

  ctx.save();
  // Fundo translúcido com gradiente
  const codeGrad = ctx.createLinearGradient(codeBoxX, codeBoxY, codeBoxX + codeBoxW, codeBoxY + codeBoxH);
  codeGrad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
  codeGrad.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = codeGrad;
  roundRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, codeBoxR);
  ctx.fill();

  // Borda iluminada
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  roundRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, codeBoxR);
  ctx.stroke();
  ctx.restore();

  // Label Exato (.kit-success-code-label)
  ctx.fillStyle = "#ffb800";
  ctx.font = "bold 15px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("SEU NÚMERO DA SORTE", 102, 292);

  // Valor Digital Exato (.kit-success-code-value: apenas números)
  const formattedCode = data.code.replace(/\D/g, "") || data.code;
  ctx.save();
  ctx.shadowColor = "rgba(255, 184, 0, 0.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 60px 'Chakra Petch', 'Arial Black', monospace";
  ctx.fillText(formattedCode, 102, 372);
  ctx.restore();

  // Mensagem explicativa no interior do card de código
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.font = "500 14px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("Guarde este número para a apuração oficial no dia da corrida.", 102, 424);

  // 7. Informações do Participante (.kit-success-user-info)
  // E-mail Associado
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 16px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("Associado ao e-mail:", 70, 514);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText(truncateText(ctx, data.email, 600), 70, 546);

  // Nome do Atleta
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 16px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("Participante:", 70, 604);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText(truncateText(ctx, data.name, 600), 70, 636);

  // Cidade / Estado (se houver)
  if (data.city) {
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 15px 'Plus Jakarta Sans', Arial, sans-serif";
    ctx.fillText("Localidade:", 70, 690);

    ctx.fillStyle = "#ffffff";
    ctx.font = "600 18px 'Plus Jakarta Sans', Arial, sans-serif";
    const locText = data.state ? `${data.city} - ${data.state}` : data.city;
    ctx.fillText(truncateText(ctx, locText, 550), 160, 690);
  }

  // 8. Rodapé Institucional com Apoio e Certificação de Autenticidade
  const footerBoxY = 730;
  const footerBoxH = 110;
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  roundRect(ctx, 70, footerBoxY, 620, footerBoxH, 16);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  roundRect(ctx, 70, footerBoxY, 620, footerBoxH, 16);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("Saúde ao Seu Alcance  •  Onmed  •  Instituto Mário Penna", 96, footerBoxY + 38);

  const dateFormatted = data.date || new Date().toLocaleString("pt-BR");
  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText(`Comprovante Oficial  •  Sorteio: 24/10/2026  •  ${dateFormatted}`, 96, footerBoxY + 74);

  // Selo verde de autenticação
  ctx.fillStyle = "rgba(74, 222, 128, 0.16)";
  roundRect(ctx, 550, footerBoxY + 22, 120, 32, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(74, 222, 128, 0.45)";
  roundRect(ctx, 550, footerBoxY + 22, 120, 32, 10);
  ctx.stroke();
  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 12px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText("✓ AUTÊNTICO", 564, footerBoxY + 43);

  // 9. Download Automático do PNG do Card
  const cleanCode = data.code.replace(/[^a-zA-Z0-9-]/g, "") || "comprovante";
  const imageUri = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = `Card-Numero-da-Sorte-${cleanCode}.png`;
  link.href = imageUri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "…").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}
