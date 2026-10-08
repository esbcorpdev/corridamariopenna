/**
 * Utilitários de Validação e Formatação de Dados (ESB / OnMed)
 * Padronização de regras, máscaras e validação semântica com retorno tipado.
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validação de Nome:
 * Mínimo de 3 caracteres, sem números.
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, message: "Nome obrigatório" };
  }
  if (trimmed.length < 3) {
    return { isValid: false, message: "Mín. 3 caracteres" };
  }
  if (/\d/.test(trimmed)) {
    return { isValid: false, message: "Apenas letras" };
  }
  return { isValid: true, message: "" };
}

/**
 * Validação de E-mail:
 * Verifica conformidade de sintaxe e estrutura de domínio.
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, message: "E-mail obrigatório" };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      message: "E-mail inválido",
    };
  }
  return { isValid: true, message: "" };
}

/**
 * Validação de Telefone Brasileiro:
 * Aceita telefones fixos (10 dígitos) e celulares (11 dígitos com 9 inicial).
 * Valida range de DDDs válidos (11 a 99).
 */
export function validatePhone(phone: string): ValidationResult {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) {
    return { isValid: false, message: "Telefone obrigatório" };
  }

  let cleanDigits = digits;
  if (cleanDigits.startsWith("55") && (cleanDigits.length === 12 || cleanDigits.length === 13)) {
    cleanDigits = cleanDigits.slice(2);
  }

  if (cleanDigits.length !== 10 && cleanDigits.length !== 11) {
    return {
      isValid: false,
      message: "Telefone inválido",
    };
  }

  const ddd = parseInt(cleanDigits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return { isValid: false, message: "DDD inválido" };
  }

  if (cleanDigits.length === 11 && cleanDigits[2] !== "9") {
    return {
      isValid: false,
      message: "Telefone inválido",
    };
  }

  return { isValid: true, message: "" };
}

/**
 * Validação de Empresa:
 */
export function validateCompany(company: string): ValidationResult {
  const trimmed = company.trim();
  if (!trimmed) {
    return { isValid: false, message: "Empresa obrigatória" };
  }
  if (trimmed.length < 2) {
    return { isValid: false, message: "Mín. 2 caracteres" };
  }
  return { isValid: true, message: "" };
}

/**
 * Validação de Quantidade de Funcionários:
 */
export function validateEmployeeCount(count: string | number): ValidationResult {
  const str = String(count).trim();
  if (!str) {
    return { isValid: false, message: "Qtd. obrigatória" };
  }
  const num = parseInt(str, 10);
  if (isNaN(num) || num < 1) {
    return { isValid: false, message: "Mínimo 1" };
  }
  if (num > 500000) {
    return { isValid: false, message: "Valor inválido" };
  }
  return { isValid: true, message: "" };
}

/**
 * Validação de Cidade:
 */
export function validateCity(city: string): ValidationResult {
  const trimmed = city.trim();
  if (!trimmed) {
    return { isValid: false, message: "Cidade obrigatória" };
  }
  if (trimmed.length < 2) {
    return { isValid: false, message: "Mín. 2 caracteres" };
  }
  return { isValid: true, message: "" };
}

/**
 * Máscara dinâmica de Telefone Nacional
 */
export function formatBrazilianPhone(value: string): string {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Sanitização básica de entrada
 */
export function sanitizeInput(value: string): string {
  return String(value).trim().replace(/[<>]/g, "");
}

/**
 * Helpers booleanos para compatibilidade
 */
export function isValidEmail(email: string): boolean {
  return validateEmail(email).isValid;
}

export function isValidBrazilianPhone(phone: string): boolean {
  return validatePhone(phone).isValid;
}

/**
 * Envio assíncrono seguro com fallback simulado
 */
export async function sendFormData(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; simulated: boolean }> {
  if (!endpoint || !endpoint.trim()) {
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    return { ok: true, simulated: true };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Falha na comunicação com o servidor (${response.status})`);
  }

  return { ok: true, simulated: false };
}
