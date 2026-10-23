// Favores dos visitantes: novo → pedido → (cumprir) → feito.
import { FAVORES } from '../data/favores.js';

export function createFavores() {
  let s = { estados: {}, carregando: [], filmagem: 0, mandado: 'nenhum' };
  const estado = (id) => s.estados[id] ?? 'novo';

  return {
    estado,
    favor: (id) => FAVORES[id],
    pedir(id) {
      s.estados[id] = 'pedido';
      if (FAVORES[id].tipo === 'mandado') s.mandado = 'na_mao';
    },
    // Objetos de favores pedidos que ainda estão no chão.
    objetosVisiveis() {
      return Object.entries(s.estados)
        .filter(([id, e]) => e === 'pedido' && FAVORES[id].tipo === 'pegar' && !s.carregando.includes(FAVORES[id].objeto.id))
        .map(([id]) => ({ ...FAVORES[id].objeto, de: id }));
    },
    pegarObjeto(objId) { if (!s.carregando.includes(objId)) s.carregando.push(objId); },
    carregando: () => [...s.carregando],
    filmar(dt) { s.filmagem += dt; },
    fracFilmagem: () => Math.min(1, s.filmagem / FAVORES.mamae_falou.segundos),
    temMandado: () => s.mandado === 'na_mao',
    entregarMandado() { s.mandado = 'entregue'; },
    podeEntregar(id, { naMao } = {}) {
      if (estado(id) !== 'pedido') return false;
      const f = FAVORES[id];
      if (f.tipo === 'pegar') return s.carregando.includes(f.objeto.id);
      if (f.tipo === 'filmar') return s.filmagem >= f.segundos - 1e-9;
      if (f.tipo === 'mandado') return s.mandado === 'entregue';
      if (f.tipo === 'ferramenta') return naMao === f.ferramenta;
      return false;
    },
    concluir(id) {
      s.estados[id] = 'feito';
      const f = FAVORES[id];
      if (f.tipo === 'pegar') s.carregando = s.carregando.filter((o) => o !== f.objeto.id);
    },
    snapshot: () => structuredClone(s),
    restaurar(x) { s = structuredClone(x); },
  };
}
