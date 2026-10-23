import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNoite, SUSTOS } from '../src/logic/noite.js';
import { createClock } from '../src/logic/clock.js';
import { createFiscal } from '../src/logic/fiscal.js';
import { createInventario } from '../src/logic/inventario.js';
import { createQuiz } from '../src/logic/quiz.js';
import { PERGUNTAS, PERGUNTA_FINAL } from '../src/data/perguntas.js';

function montar() {
  const clock = createClock({ segundosPorHora: 60 }); // 1 s = 1 minuto
  const fiscal = createFiscal({ rota: [{ x: 0, z: 0 }], origem: { x: 0, z: 0 } });
  const inventario = createInventario();
  const quiz = createQuiz({ perguntas: PERGUNTAS, final: PERGUNTA_FINAL });
  const noite = createNoite({ clock, fiscal, inventario, quiz });
  return { clock, fiscal, inventario, quiz, noite };
}
// Avança até o minuto `m` e devolve todos os eventos.
function ate(n, m) {
  const ev = [...n.noite.update()];
  while (n.clock.minutos() < m - 1e-9) { n.clock.tick(0.1); ev.push(...n.noite.update()); }
  return ev;
}

test('visitante sai no minuto certo e uma vez só', () => {
  const n = montar();
  const ev = ate(n, 65).filter((e) => e.tipo === 'visitante').map((e) => e.visitante.id);
  assert.deepEqual(ev, ['lulao', 'mamae_falou']);
  assert.deepEqual(n.noite.update().filter((e) => e.tipo === 'visitante'), []);
});

test('6 sustos e o telefone nos minutos certos', () => {
  const n = montar();
  const ev = ate(n, 360);
  assert.deepEqual(ev.filter((e) => e.tipo === 'susto').map((e) => e.id), SUSTOS.map((s) => s.id));
  assert.deepEqual(SUSTOS.map((s) => s.minuto), [15, 65, 130, 190, 250, 310]);
  assert.deepEqual(ev.filter((e) => e.tipo === 'telefone').map((e) => e.id), ['telefone_mudo']);
});

test('evento de hora em cada virada', () => {
  const n = montar();
  assert.deepEqual(ate(n, 360).filter((e) => e.tipo === 'hora').map((e) => e.hora), [0, 1, 2, 3, 4, 5, 6]);
});

test('tarefas da hora: 3, e zeram na virada', () => {
  const n = montar(); ate(n, 1);
  assert.deepEqual(n.noite.tarefas().map((t) => t.id), ['repor_papel', 'passar_pano', 'conferir_monitor']);
  n.noite.concluirTarefa('passar_pano');
  assert.equal(n.noite.tarefas().find((t) => t.id === 'passar_pano').feita, true);
  ate(n, 61);
  assert.ok(n.noite.tarefas().every((t) => !t.feita));
});

test('voltarCheckpoint restaura relógio, inventário e eventos e zera erros', () => {
  const n = montar(); ate(n, 61);
  n.inventario.adicionar('ordem');
  ate(n, 70);
  n.inventario.usar('ordem', { fiscal: n.fiscal, quiz: n.quiz, jogador: {}, efeitos: {} });
  const m = n.quiz.iniciar(); n.quiz.responder(m.respostas.findIndex((t) => /trans/i.test(t)));
  n.noite.voltarCheckpoint();
  assert.ok(Math.abs(n.clock.minutos() - 60) < 1);
  assert.ok(n.inventario.tem('ordem') === false); // ganhou depois do checkpoint
  assert.equal(n.quiz.erros(), 0);
  const ev = ate(n, 70);
  assert.ok(ev.some((e) => e.tipo === 'susto' && e.id === 'fiscal_monitor'), 'susto volta a disparar');
});

test('item ganho antes da hora fica no checkpoint', () => {
  const n = montar(); ate(n, 30);
  n.inventario.adicionar('lanterna');
  ate(n, 61);
  n.inventario.adicionar('microfone');
  n.noite.voltarCheckpoint();
  assert.deepEqual(n.inventario.itens(), ['lanterna']);
});

test('06:00 vira fase final; vencer', () => {
  const n = montar(); ate(n, 360);
  assert.equal(n.noite.fase(), 'final');
  n.noite.vencer();
  assert.equal(n.noite.fase(), 'vitoria');
});

test('3 erros → derrota', () => {
  const n = montar(); ate(n, 130);
  for (let i = 0; i < 3; i++) { const m = n.quiz.iniciar(); n.quiz.responder(m.respostas.findIndex((t) => /trans/i.test(t))); }
  n.noite.update();
  assert.equal(n.noite.fase(), 'derrota');
  n.noite.voltarCheckpoint();
  assert.equal(n.noite.fase(), 'jogando');
});
