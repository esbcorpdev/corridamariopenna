/**
 * Módulo de Contagem Regressiva para a 5ª Corrida Mário Penna.
 * Data Oficial: 24 de outubro de 2026 às 07:00 BRT (Belo Horizonte, MG).
 */

export const EVENT_DATE = "2026-10-24T07:00:00-03:00";

export function initCountdown(eventDateStr: string = EVENT_DATE): void {
  const daysEl = document.getElementById("cd-days");
  const hoursEl = document.getElementById("cd-hours");
  const minutesEl = document.getElementById("cd-minutes");
  const secondsEl = document.getElementById("cd-seconds");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const targetTimestamp = new Date(eventDateStr).getTime();

  function padTwoDigits(num: number): string {
    return String(Math.max(0, num)).padStart(2, "0");
  }

  function updateUnit(el: HTMLElement, newValue: string): void {
    if (el.textContent !== newValue) {
      el.textContent = newValue;
      el.classList.add("is-ticking");
      window.setTimeout(() => {
        el.classList.remove("is-ticking");
      }, 150);
    }
  }

  function tick(): boolean {
    const now = Date.now();

    if (Number.isNaN(targetTimestamp) || now >= targetTimestamp) {
      updateUnit(daysEl!, "00");
      updateUnit(hoursEl!, "00");
      updateUnit(minutesEl!, "00");
      updateUnit(secondsEl!, "00");
      return false;
    }

    const diffSeconds = Math.floor((targetTimestamp - now) / 1000);
    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    updateUnit(daysEl!, padTwoDigits(days));
    updateUnit(hoursEl!, padTwoDigits(hours));
    updateUnit(minutesEl!, padTwoDigits(minutes));
    updateUnit(secondsEl!, padTwoDigits(seconds));
    return true;
  }

  const shouldContinue = tick();
  if (shouldContinue) {
    const timerId = window.setInterval(() => {
      if (!tick()) {
        window.clearInterval(timerId);
      }
    }, 1000);
  }
}
