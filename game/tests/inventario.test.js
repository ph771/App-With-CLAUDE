import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInventario } from '../src/logic/inventario.js';

function ctx({ perguntaAtiva = false } = {}) {
  const chamadas = [];
  return {
    chamadas,
    fiscal: {
      pausar: (s) => chamadas.push(['pausar', s]),
      suspender: (s) => chamadas.push(['suspender', s]),
      distrair: (p) => chamadas.push(['distrair', p]),
    },
    quiz: { ativa: () => perguntaAtiva, pular: () => chamadas.push(['pular']) },
    jogador: { x: 0, z: 0, direcao: { x: 0, z: -1 } },
    efeitos: {},
  };
}
const com = (...ids) => { const inv = createInventario(); ids.forEach((i) => inv.adicionar(i)); return inv; };

test('microfone pausa o Fiscal 20 s', () => { const c = ctx(); assert.ok(com('microfone').usar('microfone', c).ok); assert.deepEqual(c.chamadas, [['pausar', 20]]); });
test('ordem suspende 30 s', () => { const c = ctx(); com('ordem').usar('ordem', c); assert.deepEqual(c.chamadas, [['suspender', 30]]); });
test('caneca distrai 8 m à frente', () => { const c = ctx(); com('caneca').usar('caneca', c); assert.deepEqual(c.chamadas, [['distrair', { x: 0, z: -8 }]]); });
test('peruca pula a pergunta', () => { const c = ctx({ perguntaAtiva: true }); assert.ok(com('peruca').usar('peruca', c).ok); assert.deepEqual(c.chamadas, [['pular']]); });
test('peruca fora da pergunta não funciona e não some', () => { const inv = com('peruca'); assert.equal(inv.usar('peruca', ctx()).ok, false); assert.ok(inv.tem('peruca')); });
test('leite: velocidade 1,5 por 60 s', () => { const c = ctx(); com('leite').usar('leite', c); assert.deepEqual(c.efeitos.leite, { velocidade: 1.5, segundos: 60 }); });
test('chave libera a cabine 01', () => { const c = ctx(); com('chave').usar('chave', c); assert.equal(c.efeitos.cabine01, true); });
test('mapa mostra a rota', () => { const c = ctx(); com('mapa').usar('mapa', c); assert.equal(c.efeitos.mostrarRota, true); });
test('lanterna liga e desliga e não some', () => {
  const c = ctx(); const inv = com('lanterna');
  inv.usar('lanterna', c); assert.equal(c.efeitos.lanterna, true);
  inv.usar('lanterna', c); assert.equal(c.efeitos.lanterna, false);
  assert.ok(inv.tem('lanterna'));
});
test('item usado some', () => { const inv = com('ordem'); inv.usar('ordem', ctx()); assert.equal(inv.tem('ordem'), false); assert.deepEqual(inv.itens(), []); });
test('usar item que não tem', () => assert.equal(createInventario().usar('ordem', ctx()).ok, false));
test('bloqueio durante a pergunta', () => {
  const inv = com('ordem'); const r = inv.usar('ordem', ctx({ perguntaAtiva: true }));
  assert.deepEqual(r, { ok: false, msg: 'Agora não!' }); assert.ok(inv.tem('ordem'));
});
test('snapshot e restaurar', () => {
  const inv = com('ordem', 'mapa'); const s = inv.snapshot();
  inv.usar('ordem', ctx()); inv.restaurar(s);
  assert.deepEqual(inv.itens(), ['ordem', 'mapa']);
});
test('caneca respeita o limite de arremesso (paredes)', () => {
  const c = ctx(); c.limitarArremesso = (_de, _para) => ({ x: 0, z: -2 });
  com('caneca').usar('caneca', c);
  assert.deepEqual(c.chamadas, [['distrair', { x: 0, z: -2 }]]);
});
