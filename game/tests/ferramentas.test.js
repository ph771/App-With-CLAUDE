import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFerramentas, VELOCIDADE_COM_FERRAMENTA } from '../src/logic/ferramentas.js';

test('começa de mão vazia', () => assert.equal(createFerramentas().naMao(), null));
test('pegar uma ferramenta', () => { const f = createFerramentas(); assert.deepEqual(f.pegar('esfregao'), { devolvida: null }); assert.equal(f.naMao(), 'esfregao'); });
test('pegar outra devolve a anterior à prateleira', () => {
  const f = createFerramentas(); f.pegar('esfregao');
  assert.deepEqual(f.pegar('rolos'), { devolvida: 'esfregao' });
  assert.equal(f.naMao(), 'rolos');
  assert.deepEqual(f.naPrateleira().sort(), ['desentupidor', 'esfregao', 'lampada', 'sabonete']);
});
test('pegar a mesma de novo devolve à prateleira (mão vazia)', () => {
  const f = createFerramentas(); f.pegar('rolos');
  assert.deepEqual(f.pegar('rolos'), { devolvida: 'rolos' });
  assert.equal(f.naMao(), null);
});
test('tarefa sem ferramenta sempre pode', () => assert.ok(createFerramentas().podeFazer({ ferramenta: null })));
test('tarefa exige a ferramenta certa', () => {
  const f = createFerramentas();
  assert.equal(f.podeFazer({ ferramenta: 'esfregao' }), false);
  f.pegar('rolos'); assert.equal(f.podeFazer({ ferramenta: 'esfregao' }), false);
  f.pegar('esfregao'); assert.equal(f.podeFazer({ ferramenta: 'esfregao' }), true);
});
test('velocidade com ferramenta é 85%', () => {
  const f = createFerramentas();
  assert.equal(f.multVelocidade(), 1);
  f.pegar('esfregao');
  assert.equal(f.multVelocidade(), VELOCIDADE_COM_FERRAMENTA);
  assert.equal(VELOCIDADE_COM_FERRAMENTA, 0.85);
});
test('snapshot e restaurar', () => {
  const f = createFerramentas(); f.pegar('lampada'); const s = f.snapshot();
  f.pegar('sabonete'); f.restaurar(s);
  assert.equal(f.naMao(), 'lampada');
});

test('largar (Q) deixa a ferramenta no chão e esvazia a mão', () => {
  const f = createFerramentas(); f.pegar('esfregao');
  assert.equal(f.largar({ x: 3, z: -2 }), 'esfregao');
  assert.equal(f.naMao(), null);
  assert.deepEqual(f.noChao(), { esfregao: { x: 3, z: -2 } });
  assert.equal(f.multVelocidade(), 1);
  assert.ok(!f.naPrateleira().includes('esfregao'));
});
test('largar de mão vazia não faz nada', () => {
  const f = createFerramentas();
  assert.equal(f.largar({ x: 0, z: 0 }), null);
  assert.deepEqual(f.noChao(), {});
});
test('pegar do chão segurando outra: troca (a da mão fica no chão)', () => {
  const f = createFerramentas(); f.pegar('esfregao'); f.largar({ x: 3, z: -2 }); f.pegar('rolos');
  assert.deepEqual(f.pegarDoChao('esfregao'), { largada: 'rolos' });
  assert.equal(f.naMao(), 'esfregao');
  assert.deepEqual(f.noChao(), { rolos: { x: 3, z: -2 } });
});
test('salvar e carregar guarda o que está no chão (e aceita o formato antigo)', () => {
  const f = createFerramentas(); f.pegar('esfregao'); f.largar({ x: 3, z: -2 }); f.pegar('rolos');
  const g = createFerramentas(); g.restaurar(f.snapshot());
  assert.equal(g.naMao(), 'rolos'); assert.deepEqual(g.noChao(), { esfregao: { x: 3, z: -2 } });
  const h = createFerramentas(); h.restaurar('lampada');
  assert.equal(h.naMao(), 'lampada'); assert.deepEqual(h.noChao(), {});
});
