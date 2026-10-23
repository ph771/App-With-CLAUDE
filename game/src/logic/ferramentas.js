// Ferramentas do almoxarifado: uma por vez na mão. Pegar outra devolve a anterior.
import { FERRAMENTAS } from '../data/noite.js';

export const VELOCIDADE_COM_FERRAMENTA = 0.85;

export function createFerramentas() {
  let mao = null;
  return {
    naMao: () => mao,
    naPrateleira: () => Object.keys(FERRAMENTAS).filter((id) => id !== mao),
    pegar(id) {
      const devolvida = mao;
      mao = mao === id ? null : id;
      return { devolvida };
    },
    podeFazer: (tarefa) => !tarefa.ferramenta || tarefa.ferramenta === mao,
    multVelocidade: () => (mao ? VELOCIDADE_COM_FERRAMENTA : 1),
    snapshot: () => mao,
    restaurar(s) { mao = s; },
  };
}
