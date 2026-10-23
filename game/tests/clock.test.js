import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../src/logic/clock.js';

test('começa em 00:00', () => assert.equal(createClock({ segundosPorHora: 180 }).formatar(), '00:00'));

test('180 s reais = 1 hora', () => {
  const c = createClock({ segundosPorHora: 180 });
  for (let i = 0; i < 1800; i++) c.tick(0.1);
  assert.equal(c.formatar(), '01:00');
  assert.equal(c.hora(), 1);
});

test('dt grande é limitado a 0,1 s', () => {
  const c = createClock({ segundosPorHora: 180 });
  c.tick(600);
  assert.ok(c.minutos() < 0.1);
});

test('para em 06:00', () => {
  const c = createClock({ segundosPorHora: 10 });
  for (let i = 0; i < 1000; i++) c.tick(0.1);
  assert.equal(c.formatar(), '06:00');
  assert.ok(c.terminou());
});

test('snapshot e restaurar', () => {
  const c = createClock({ segundosPorHora: 10 });
  for (let i = 0; i < 150; i++) c.tick(0.1);
  const s = c.snapshot();
  c.tick(0.1);
  c.restaurar(s);
  assert.ok(Math.abs(c.minutos() - 90) < 1e-6);
});
