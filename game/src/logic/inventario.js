// Itens deixados pelos visitantes. Todos são de uso único, menos a lanterna.
const DISTANCIA_CANECA = 8;

const EFEITOS = {
  lanterna: ({ efeitos }) => { efeitos.lanterna = !efeitos.lanterna; },
  microfone: ({ fiscal }) => fiscal.pausar(20),
  caneca: ({ fiscal, jogador, limitarArremesso }) => {
    const alvo = {
      x: jogador.x + jogador.direcao.x * DISTANCIA_CANECA,
      z: jogador.z + jogador.direcao.z * DISTANCIA_CANECA,
    };
    // A caneca para na primeira parede.
    fiscal.distrair(limitarArremesso ? limitarArremesso({ x: jogador.x, z: jogador.z }, alvo) : alvo);
  },
  ordem: ({ fiscal }) => fiscal.suspender(30),
  peruca: ({ quiz }) => quiz.pular(),
  leite: ({ efeitos }) => { efeitos.leite = { velocidade: 1.5, segundos: 60 }; },
  chave: ({ efeitos }) => { efeitos.cabine01 = true; },
  mapa: ({ efeitos }) => { efeitos.mostrarRota = true; },
};
const PERMANENTES = new Set(['lanterna']);

export function createInventario() {
  let itens = [];

  return {
    adicionar(id) { if (!itens.includes(id)) itens.push(id); },
    tem: (id) => itens.includes(id),
    itens: () => [...itens],
    usar(id, ctx) {
      if (!itens.includes(id)) return { ok: false };
      const emPergunta = ctx.quiz.ativa();
      if (id === 'peruca' && !emPergunta) return { ok: false, msg: 'Só funciona quando ele pergunta.' };
      if (id !== 'peruca' && emPergunta) return { ok: false, msg: 'Agora não!' };
      EFEITOS[id](ctx);
      if (!PERMANENTES.has(id)) itens = itens.filter((i) => i !== id);
      return { ok: true };
    },
    snapshot: () => [...itens],
    restaurar(s) { itens = [...s]; },
  };
}
