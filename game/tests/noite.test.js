import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNoite } from '../src/logic/noite.js';
import { createClock } from '../src/logic/clock.js';
import { createFiscal } from '../src/logic/fiscal.js';
import { createInventario } from '../src/logic/inventario.js';
import { createQuiz } from '../src/logic/quiz.js';
import { PERGUNTAS, PERGUNTA_FINAL } from '../src/data/perguntas.js';
import { HORAS, SUSTOS } from '../src/data/noite.js';

function montar() {
  const clock = createClock({ segundosPorHora: 60 }); // 1 s = 1 minuto
  const fiscal = createFiscal({ rota: [], origem: { x: 0, z: 0 } });
  const inventario = createInventario();
  const quiz = createQuiz({ perguntas: PERGUNTAS, final: PERGUNTA_FINAL });
  const noite = createNoite({ clock, fiscal, inventario, quiz });
  return { clock, fiscal, inventario, quiz, noite };
}
function ate(n, m) {
  const ev = [...n.noite.update()];
  while (n.clock.minutos() < m - 1e-9) { n.clock.tick(0.1); ev.push(...n.noite.update()); }
  return ev;
}
const fazerTudo = (n) => { for (const t of n.noite.tarefas()) n.noite.progredir(t.id, 99); };

test('tarefas da hora vêm dos dados', () => {
  const n = montar(); n.noite.update();
  assert.deepEqual(n.noite.tarefas().map((t) => t.id), HORAS[0].map((t) => t.id));
});

test('segurar acumula progresso e não zera', () => {
  const n = montar(); n.noite.update();
  const id = HORAS[0][2].id; // 3 s
  assert.deepEqual(n.noite.progredir(id, 1), { feita: false, frac: 1 / 3 });
  const r = n.noite.progredir(id, 2);
  assert.equal(r.feita, true);
  assert.equal(n.noite.tarefas().find((t) => t.id === id).feita, true);
});

test('todas as tarefas feitas: hora aprovada e pula para a próxima', () => {
  const n = montar(); ate(n, 5);
  fazerTudo(n);
  const ev = n.noite.update();
  assert.deepEqual(ev.find((e) => e.tipo === 'hora_concluida'), { tipo: 'hora_concluida', hora: 0, aprovado: true });
  n.noite.avancarHora();
  const ev2 = n.noite.update();
  assert.equal(n.clock.formatar(), '01:00');
  assert.ok(ev2.some((e) => e.tipo === 'hora' && e.hora === 1));
  assert.deepEqual(n.noite.relatorio().slice(0, 2), ['aprovado', null]);
});

test('sustos da hora pulada não disparam depois', () => {
  const n = montar(); ate(n, 5);
  fazerTudo(n); n.noite.update(); n.noite.avancarHora();
  const ev = ate(n, 61);
  assert.ok(!ev.some((e) => e.tipo === 'susto' && e.id === 'porta_familia'));
  assert.ok(!ev.some((e) => e.tipo === 'telefone'));
});

test('tempo acabou com tarefa pendente: reprovado', () => {
  const n = montar();
  const ev = ate(n, 61);
  assert.deepEqual(ev.find((e) => e.tipo === 'hora_concluida'), { tipo: 'hora_concluida', hora: 0, aprovado: false });
  assert.equal(n.noite.relatorio()[0], 'reprovado');
});

test('poças só a partir das 02:00, no máximo 3, e entram nas tarefas', () => {
  const n = montar(); ate(n, 10);
  assert.equal(n.noite.adicionarPoca({ x: 1, z: 1 }), false);
  ate(n, 125);
  for (let i = 0; i < 5; i++) n.noite.adicionarPoca({ x: i, z: 0 });
  const pocas = n.noite.tarefas().filter((t) => t.poca);
  assert.equal(pocas.length, 3);
  assert.equal(pocas[0].ferramenta, 'esfregao');
});

test('hora não termina com poça aberta', () => {
  const n = montar(); ate(n, 125);
  for (const t of n.noite.tarefas()) n.noite.progredir(t.id, 99);
  n.noite.adicionarPoca({ x: 0, z: 0 });
  assert.ok(!n.noite.update().some((e) => e.tipo === 'hora_concluida'));
});

test('voltarCheckpoint: tarefas e poças zeram, relatório e eventos voltam', () => {
  const n = montar(); ate(n, 125);
  n.noite.progredir(HORAS[2][0].id, 99);
  n.noite.adicionarPoca({ x: 0, z: 0 });
  n.inventario.adicionar('ordem');
  n.noite.voltarCheckpoint();
  assert.ok(Math.abs(n.clock.minutos() - 120) < 1);
  assert.ok(n.noite.tarefas().every((t) => !t.feita && !t.poca));
  assert.equal(n.inventario.tem('ordem'), false);
  assert.deepEqual(n.noite.relatorio().slice(0, 3), ['reprovado', 'reprovado', null]);
  const ev = ate(n, 150);
  assert.ok(ev.some((e) => e.tipo === 'susto' && e.id === 'fiscal_cabine'));
});

test('visitantes saem logo no começo da hora', () => {
  const n = montar();
  assert.deepEqual(ate(n, 2).filter((e) => e.tipo === 'visitante').map((e) => e.visitante.id), ['lulao']);
});

test('06:00 vira final; resultado depende do relatório', () => {
  const a = montar();
  for (let h = 0; h < 6; h++) { a.noite.update(); fazerTudo(a); a.noite.update(); a.noite.avancarHora(); }
  a.noite.update();
  assert.equal(a.noite.fase(), 'final');
  assert.deepEqual(a.noite.tarefas().map((t) => t.id), ['painel']);
  assert.equal(a.noite.vencer(), 'arquivado');
  assert.equal(a.noite.fase(), 'vitoria');

  const b = montar(); ate(b, 360);
  assert.equal(b.noite.vencer(), 'aprovado_pl');
});

test('3 erros → derrota', () => {
  const n = montar(); ate(n, 130);
  for (let i = 0; i < 3; i++) { const m = n.quiz.iniciar(); n.quiz.responder(m.respostas.findIndex((t) => /trans/i.test(t))); }
  n.noite.update();
  assert.equal(n.noite.fase(), 'derrota');
  n.noite.voltarCheckpoint();
  assert.equal(n.noite.fase(), 'jogando');
});

test('6 sustos programados', () => assert.equal(SUSTOS.length, 6));
