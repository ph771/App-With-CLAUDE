// Medidor de suspeita: o Fiscal precisa te ver por um tempo (ou te ouvir correndo) antes de te caçar.
const ESVAZIA = 0.6; // por segundo, quando ele não te vê nem ouve
const OUVIR = 0.45; // ouvir corrida enche a 45% da velocidade da visão

export const tempoParaNotar = (minuto) => (minuto >= 240 ? 1.1 : 1.6);

export function createSuspeita() {
  let v = 0;
  return {
    // Devolve 'cacar' no momento em que o medidor enche.
    update(dt, { minuto, vendo, ouvindo }) {
      const taxa = 1 / tempoParaNotar(minuto);
      if (vendo) v += taxa * dt;
      else if (ouvindo) v += taxa * OUVIR * dt;
      else v -= ESVAZIA * dt;
      v = Math.min(1, Math.max(0, v));
      return v >= 1 - 1e-9 ? 'cacar' : null;
    },
    frac: () => v,
    zerar() { v = 0; },
  };
}
