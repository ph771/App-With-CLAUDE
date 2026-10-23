import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFolego, VELOCIDADE_CORRIDA } from '../src/logic/folego.js';

const rodar = (f, seg, quer, andando = true) => { let r; for (let i = 0; i < Math.round(seg * 10); i++) r = f.update(0.1, quer, andando); return r; };

test('começa cheio e corre quando pede', () => {
  const f = createFolego();
  assert.equal(f.frac(), 1);
  assert.equal(f.update(0.1, true, true), true);
});
test('não corre parado (sem andar)', () => assert.equal(createFolego().update(0.1, true, false), false));
test('acaba em 5 s de corrida e fica cansado', () => {
  const f = createFolego();
  assert.equal(rodar(f, 4.9, true), true);
  assert.equal(rodar(f, 0.3, true), false);
  assert.equal(f.cansado(), true);
});
test('cansado só volta a correr com 40% do fôlego', () => {
  const f = createFolego(); rodar(f, 6, true);
  rodar(f, 2, false); // recarrega 0,6/s x 2 s = 1,2 de 5 = 24%
  assert.equal(f.update(0.1, true, true), false);
  rodar(f, 1.5, false); // ~42%
  assert.equal(f.update(0.1, true, true), true);
});
test('recarrega até cheio', () => { const f = createFolego(); rodar(f, 3, true); rodar(f, 10, false); assert.equal(f.frac(), 1); });
test('velocidade da corrida é 1,75x', () => assert.equal(VELOCIDADE_CORRIDA, 1.75));
test('snapshot e restaurar', () => { const f = createFolego(); rodar(f, 3, true); const s = f.snapshot(); rodar(f, 1, true); f.restaurar(s); assert.ok(Math.abs(f.frac() - 0.4) < 1e-6); });
