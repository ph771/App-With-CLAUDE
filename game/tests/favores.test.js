import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFavores } from '../src/logic/favores.js';
import { FAVORES } from '../src/data/favores.js';
import { VISITANTES } from '../src/data/visitantes.js';

test('todo visitante tem favor', () => { for (const v of VISITANTES) assert.ok(FAVORES[v.id], v.id); });

test('pegar: pede, pega o objeto, entrega', () => {
  const f = createFavores();
  assert.equal(f.estado('lulao'), 'novo');
  f.pedir('lulao');
  assert.equal(f.estado('lulao'), 'pedido');
  assert.equal(f.podeEntregar('lulao', {}), false);
  assert.deepEqual(f.objetosVisiveis().map((o) => o.id), ['cafe']);
  f.pegarObjeto('cafe');
  assert.deepEqual(f.objetosVisiveis(), []);
  assert.equal(f.podeEntregar('lulao', {}), true);
  f.concluir('lulao');
  assert.equal(f.estado('lulao'), 'feito');
  assert.deepEqual(f.carregando(), []);
});

test('objeto só aparece depois do pedido', () => {
  const f = createFavores();
  assert.deepEqual(f.objetosVisiveis(), []);
});

test('filmar: 5 s perto do Fiscal', () => {
  const f = createFavores(); f.pedir('mamae_falou');
  f.filmar(4.9);
  assert.equal(f.podeEntregar('mamae_falou', {}), false);
  f.filmar(0.2);
  assert.equal(f.podeEntregar('mamae_falou', {}), true);
  assert.ok(f.fracFilmagem() >= 1);
});

test('mandado: pronto depois de entregar ao Fiscal', () => {
  const f = createFavores(); f.pedir('moraez');
  assert.equal(f.temMandado(), true);
  f.entregarMandado();
  assert.equal(f.temMandado(), false);
  assert.equal(f.podeEntregar('moraez', {}), true);
});

test('ferramenta: precisa estar com os rolos na mão', () => {
  const f = createFavores(); f.pedir('flavio');
  assert.equal(f.podeEntregar('flavio', { naMao: 'esfregao' }), false);
  assert.equal(f.podeEntregar('flavio', { naMao: 'rolos' }), true);
});

test('snapshot e restaurar', () => {
  const f = createFavores(); f.pedir('kim'); const s = f.snapshot();
  f.pegarObjeto('celular'); f.concluir('kim');
  f.restaurar(s);
  assert.equal(f.estado('kim'), 'pedido');
  assert.deepEqual(f.objetosVisiveis().map((o) => o.id), ['celular']);
});
