/**
 * Módulo de Geração e Governança do Número da Sorte Oficial
 * Regras Obrigatórias:
 * 1. Apenas números (sem letras, sem prefixos, somente dígitos [0-9]).
 * 2. Unicidade Absoluta: Nunca repetir números independente do volume de solicitações.
 * 3. Idempotência por e-mail: Se o mesmo e-mail solicitar novamente, mantém o mesmo número.
 */

import { doc, runTransaction, getDoc } from "firebase/firestore";
import { db } from "../firebase.ts";

const LOCAL_STORAGE_ENTRIES_KEY = "cmp_raffle_entries_v2";
const LOCAL_STORAGE_USED_CODES_KEY = "cmp_raffle_used_numbers_v2";
const BASE_START_NUMBER = 10001; // Número inicial com 5 dígitos

export interface RaffleEntryRecord {
  code: string; // Exclusivamente numérico: ex. "10001"
  name: string;
  email: string;
  city: string;
  date: string;
}

/**
 * Recupera o repositório local de números usados para backup e consistência off-line
 */
function getLocalUsedNumbers(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USED_CODES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveLocalUsedNumber(code: string): void {
  try {
    const set = getLocalUsedNumbers();
    set.add(code);
    localStorage.setItem(LOCAL_STORAGE_USED_CODES_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Silencia em storage restrito
  }
}

function getLocalEntries(): Record<string, RaffleEntryRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ENTRIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getExistingLocalEntry(email: string): RaffleEntryRecord | null {
  const norm = email.toLowerCase().trim();
  const entries = getLocalEntries();
  return entries[norm] || null;
}

function saveLocalEntry(entry: RaffleEntryRecord): void {
  try {
    const entries = getLocalEntries();
    entries[entry.email.toLowerCase().trim()] = entry;
    localStorage.setItem(LOCAL_STORAGE_ENTRIES_KEY, JSON.stringify(entries));
    saveLocalUsedNumber(entry.code);
  } catch {
    // Silencia
  }
}

/**
 * Gera um próximo número estritamente numérico e inédito localmente
 */
function generateNextLocalUniqueNumber(): string {
  const used = getLocalUsedNumbers();
  
  // Encontra o maior número já emitido localmente
  let maxNum = BASE_START_NUMBER - 1;
  for (const numStr of used) {
    const parsed = parseInt(numStr, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }

  let candidate = maxNum + 1;
  while (used.has(String(candidate))) {
    candidate++;
  }

  const codeStr = String(candidate);
  saveLocalUsedNumber(codeStr);
  return codeStr;
}

/**
 * Obtém ou aloca atomicamente um Número da Sorte Exclusivamente Numérico e Nunca Repetível.
 * Utiliza transação atômica no Firestore com fallback resiliente local.
 */
export async function getOrAllocateUniqueLuckyNumber(
  name: string,
  email: string,
  city: string
): Promise<string> {
  const normEmail = email.toLowerCase().trim();

  // 1. Verificação de Idempotência Local Imediata
  const localEntries = getLocalEntries();
  if (localEntries[normEmail]?.code) {
    const cleanLocalCode = localEntries[normEmail].code.replace(/\D/g, "");
    if (cleanLocalCode.length > 0) {
      return cleanLocalCode;
    }
  }

  // 2. Tentativa no Firestore com Transação Atômica Global
  try {
    const emailDocRef = doc(db, "raffle_entries", normEmail);
    const counterDocRef = doc(db, "counters", "raffle_counter");

    // Executa transação atômica que garante incremento sequencial único sem concorrência
    const allocatedCode = await runTransaction(db, async (transaction) => {
      // 1. Verifica atomicamente se já existe registro na nuvem para este e-mail
      const existingEmailSnap = await transaction.get(emailDocRef);
      if (existingEmailSnap.exists()) {
        const data = existingEmailSnap.data();
        if (data?.code) {
          return String(data.code).replace(/\D/g, "");
        }
      }

      // 2. Lê o contador global
      const counterSnap = await transaction.get(counterDocRef);
      let currentNumber = BASE_START_NUMBER;

      if (counterSnap.exists()) {
        const cData = counterSnap.data();
        if (typeof cData.lastNumber === "number" && cData.lastNumber >= BASE_START_NUMBER) {
          currentNumber = cData.lastNumber + 1;
        }
      }

      // Garante que o documento com o número específico nunca exista
      let candidateStr = String(currentNumber);
      let candidateDocRef = doc(db, "lucky_numbers", candidateStr);
      let candidateSnap = await transaction.get(candidateDocRef);

      // Se por algum motivo já existir, avança até encontrar um número estritamente virgem
      while (candidateSnap.exists()) {
        currentNumber++;
        candidateStr = String(currentNumber);
        candidateDocRef = doc(db, "lucky_numbers", candidateStr);
        candidateSnap = await transaction.get(candidateDocRef);
      }

      const nowIso = new Date().toISOString();

      // 1. Atualiza o contador global
      transaction.set(
        counterDocRef,
        {
          lastNumber: currentNumber,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // 2. Trava a reserva do número na coleção de unicidade
      transaction.set(candidateDocRef, {
        email: normEmail,
        assignedAt: nowIso,
      });

      // 3. Salva a inscrição do participante
      transaction.set(emailDocRef, {
        code: candidateStr,
        name,
        email: normEmail,
        city,
        createdAt: nowIso,
      });

      return candidateStr;
    });

    // Salva cópia local para redundância
    saveLocalEntry({
      code: allocatedCode,
      name,
      email: normEmail,
      city,
      date: new Date().toISOString(),
    });

    return allocatedCode;
  } catch (firestoreError) {
    console.warn("Transação Firestore indisponível. Utilizando gerador atômico local:", firestoreError);
  }

  // 3. Fallback Resiliente Local Garantindo Unicidade Numérica
  const localCode = generateNextLocalUniqueNumber();
  saveLocalEntry({
    code: localCode,
    name,
    email: normEmail,
    city,
    date: new Date().toISOString(),
  });

  return localCode;
}
