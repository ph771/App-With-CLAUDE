import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuiz } from '../src/logic/quiz.js';
import { PERGUNTAS, PERGUNTA_FINAL } from '../src/data/perguntas.js';

// rng determinístico
const seq = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const novo = () => createQuiz({ perguntas: PERGUNTAS, final: PERGUNTA_FINAL, rng: seq() });
const indiceSeguro = (q, mostrada) => mostrada.respostas.findIndex((t) => !/trans/i.test(t));
const indiceArmadilha = (q, mostrada) => mostrada.respostas.findIndex((t) => /trans/i.test(t));

test('resposta segura não conta erro', () => {
  const q = novo(); const m = q.iniciar();
  assert.deepEqual(q.responder(indiceSeguro(q, m)), { segura: true });
  assert.equal(q.erros(), 0);
  assert.equal(q.ativa(), false);
});

test('resposta com trans conta 1 erro', () => {
  const q = novo(); const m = q.iniciar();
  assert.deepEqual(q.responder(indiceArmadilha(q, m)), { segura: false });
  assert.equal(q.erros(), 1);
});

test('5 s sem responder conta erro e tick devolve tempo', () => {
  const q = novo(); q.iniciar();
  let r = null;
  for (let i = 0; i < 49; i++) assert.equal(q.tick(0.1), null);
  r = q.tick(0.1); r = r ?? q.tick(0.1);
  assert.equal(r, 'tempo');
  assert.equal(q.erros(), 1);
  assert.equal(q.ativa(), false);
});

test('restante diminui com o tempo', () => {
  const q = novo(); q.iniciar(); q.tick(0.1); q.tick(0.1);
  assert.ok(Math.abs(q.restante() - 4.8) < 1e-6);
});

test('3 erros = perdeu; zerarErros', () => {
  const q = novo();
  for (let i = 0; i < 3; i++) { const m = q.iniciar(); q.responder(indiceArmadilha(q, m)); }
  assert.ok(q.perdeu());
  q.zerarErros();
  assert.equal(q.erros(), 0);
  assert.ok(!q.perdeu());
});

test('pular não conta erro', () => {
  const q = novo(); q.iniciar(); q.pular();
  assert.equal(q.erros(), 0); assert.equal(q.ativa(), false);
});

test('não repete pergunta antes de usar as 15', () => {
  const q = novo(); const vistas = new Set();
  for (let i = 0; i < 15; i++) { const m = q.iniciar(); vistas.add(m.fala); q.pular(); }
  assert.equal(vistas.size, 15);
});

test('iniciar(true) usa a pergunta final', () => {
  const q = novo();
  assert.equal(q.iniciar(true).fala, PERGUNTA_FINAL.fala);
});

test('respostas mostradas são as 3 da pergunta', () => {
  const q = novo(); const m = q.iniciar();
  const original = PERGUNTAS.find((p) => p.fala === m.fala);
  assert.deepEqual([...m.respostas].sort(), original.respostas.map((r) => r.texto).sort());
});

test('limite de tempo por pergunta (4 s nas horas finais)', () => {
  const q = novo(); q.iniciar(false, 4);
  assert.ok(Math.abs(q.restante() - 4) < 1e-9);
  let r = null; for (let i = 0; i < 41; i++) r = q.tick(0.1) ?? r;
  assert.equal(r, 'tempo');
  assert.equal(q.limite(), 4);
});
