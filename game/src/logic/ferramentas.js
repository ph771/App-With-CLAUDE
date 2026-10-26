// Ferramentas do almoxarifado: uma por vez na mão. Pegar outra devolve a anterior.
// Q larga a da mão no chão (fica lá até alguém pegar de novo).
import { FERRAMENTAS } from '../data/noite.js';

export const VELOCIDADE_COM_FERRAMENTA = 0.85;

export function createFerramentas() {
  let mao = null;
  let chao = {}; // id → { x, z }
  return {
    naMao: () => mao,
    naPrateleira: () => Object.keys(FERRAMENTAS).filter((id) => id !== mao && !chao[id]),
    noChao: () => ({ ...chao }),
    pegar(id) {
      const devolvida = mao;
      mao = mao === id ? null : id;
      return { devolvida };
    },
    // Larga a da mão em `ponto`. Devolve qual largou (ou null).
    largar(ponto) {
      if (!mao) return null;
      const id = mao;
      chao[id] = { x: ponto.x, z: ponto.z };
      mao = null;
      return id;
    },
    // Pega do chão; se estava segurando outra, ela fica no mesmo lugar.
    pegarDoChao(id) {
      const ponto = chao[id];
      if (!ponto) return { largada: null };
      delete chao[id];
      const largada = mao;
      if (largada) chao[largada] = ponto;
      mao = id;
      return { largada };
    },
    podeFazer: (tarefa) => !tarefa.ferramenta || tarefa.ferramenta === mao,
    multVelocidade: () => (mao ? VELOCIDADE_COM_FERRAMENTA : 1),
    snapshot: () => ({ mao, chao: { ...chao } }),
    // Aceita o formato antigo (só o id da mão).
    restaurar(s) {
      if (s && typeof s === 'object') { mao = s.mao ?? null; chao = { ...(s.chao ?? {}) }; } else { mao = s ?? null; chao = {}; }
    },
  };
}
