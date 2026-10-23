// Relógio da noite: 00:00 (minuto 0) até 06:00 (minuto 360).
export const MINUTO_FINAL = 360;
const DT_MAX = 0.1;
// Tolerância para somas de ponto flutuante (ex.: 59,99999 conta como 60).
const EPS = 1e-6;

export function createClock({ segundosPorHora }) {
  let minutos = 0;
  const minutosPorSegundo = 60 / segundosPorHora;

  return {
    tick(dt) {
      const passo = Math.min(Math.max(dt, 0), DT_MAX);
      minutos = Math.min(MINUTO_FINAL, minutos + passo * minutosPorSegundo);
    },
    minutos: () => minutos,
    hora: () => Math.floor((minutos + EPS) / 60),
    formatar() {
      const total = Math.floor(minutos + EPS);
      const h = String(Math.floor(total / 60)).padStart(2, '0');
      const m = String(total % 60).padStart(2, '0');
      return `${h}:${m}`;
    },
    terminou: () => minutos + EPS >= MINUTO_FINAL,
    // Tarefas da hora feitas: vai direto para a próxima hora cheia.
    pularParaProximaHora() { minutos = Math.min(MINUTO_FINAL, (Math.floor((minutos + EPS) / 60) + 1) * 60); },
    snapshot: () => ({ minutos }),
    restaurar(s) { minutos = s.minutos; },
  };
}
