import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERGUNTAS, PERGUNTA_FINAL } from '../src/data/perguntas.js';
import { VISITANTES } from '../src/data/visitantes.js';

const todas = () => [...PERGUNTAS, PERGUNTA_FINAL];

test('15 perguntas + final', () => {
  assert.equal(PERGUNTAS.length, 15);
  assert.ok(PERGUNTA_FINAL);
  assert.equal(new Set(PERGUNTAS.map((p) => p.id)).size, 15);
});

test('cada pergunta tem 3 respostas e 1 segura', () => {
  for (const p of todas()) {
    assert.equal(p.respostas.length, 3, p.id);
    assert.equal(p.respostas.filter((r) => r.segura).length, 1, p.id);
  }
});

test('segura sem "trans", as outras com "trans"', () => {
  for (const p of todas()) for (const r of p.respostas) assert.equal(/trans/i.test(r.texto), !r.segura, r.texto);
});

test('toda fala do Fiscal tem "trans"', () => {
  for (const p of todas()) assert.match(p.fala, /trans/i);
});

test('8 visitantes em ordem de horário, ids e itens únicos', () => {
  assert.equal(VISITANTES.length, 8);
  assert.deepEqual(VISITANTES.map((v) => v.id), ['lulao', 'mamae_falou', 'renan', 'moraez', 'kim', 'nicolas', 'jairo', 'flavio']);
  assert.deepEqual(VISITANTES.map((v) => v.minuto), [1, 61, 121, 121, 181, 241, 241, 301]);
  assert.deepEqual(VISITANTES.map((v) => v.item), ['lanterna', 'microfone', 'caneca', 'ordem', 'mapa', 'peruca', 'leite', 'chave']);
  for (const v of VISITANTES) { assert.ok(v.falas.length >= 1, v.id); assert.match(v.voto, /voto/i, v.id); }
});
