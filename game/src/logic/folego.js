// Fôlego da corrida: dura 5 s, recarrega andando. Esvaziou = cansado até 40%.
export const VELOCIDADE_CORRIDA = 1.75;
const MAX = 5, RECARGA = 0.6, VOLTA_A_CORRER = 0.4;

export function createFolego() {
  let valor = MAX, cansado = false;
  return {
    // Devolve se está correndo neste quadro.
    update(dt, querCorrer, andando) {
      const corre = querCorrer && andando && !cansado && valor > 0;
      if (corre) {
        valor = Math.max(0, valor - dt);
        if (valor <= 1e-9) cansado = true;
      } else {
        valor = Math.min(MAX, valor + RECARGA * dt);
        if (cansado && valor >= MAX * VOLTA_A_CORRER - 1e-9) cansado = false;
      }
      return corre && valor > 0;
    },
    frac: () => valor / MAX,
    cansado: () => cansado,
    snapshot: () => ({ valor, cansado }),
    restaurar(s) { valor = s.valor; cansado = s.cansado; },
  };
}
