import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFiscal } from '../src/logic/fiscal.js';

const origem = { x: 0, z: 0 };
const rota = [{ x: 0, z: 0 }, { x: 10, z: 0 }];
const novo = () => createFiscal({ rota, origem });
const passo = (f, seg, ctx) => { let r = null; for (let i = 0; i < Math.round(seg * 10); i++) r = f.update(0.1, ctx) ?? r; return r; };
const longe = { x: 50, z: 0 };

test('inativo e invisível antes de 01:00', () => {
  const f = novo();
  passo(f, 5, { minuto: 30, jogador: longe, olhando: false });
  assert.deepEqual(f.posicao(), origem);
  assert.equal(f.visivel(30), false);
});

test('parado e visível na origem entre 01:00 e 02:00', () => {
  const f = novo();
  passo(f, 5, { minuto: 90, jogador: longe, olhando: false });
  assert.deepEqual(f.posicao(), origem);
  assert.equal(f.visivel(90), true);
});

test('não anda enquanto o jogador olha', () => {
  const f = novo();
  passo(f, 5, { minuto: 130, jogador: longe, olhando: true });
  assert.deepEqual(f.posicao(), origem);
});

test('anda 0,45 m/s às 02:00 seguindo a rota', () => {
  const f = novo();
  passo(f, 4, { minuto: 130, jogador: longe, olhando: false });
  assert.ok(Math.abs(f.posicao().x - 1.8) < 1e-6, String(f.posicao().x));
});

test('fica mais rápido às 04:00 e às 05:00', () => {
  const a = novo(); passo(a, 2, { minuto: 250, jogador: longe, olhando: false });
  assert.ok(Math.abs(a.posicao().x - 1.5) < 1e-6);
  const b = novo(); passo(b, 2, { minuto: 310, jogador: longe, olhando: false });
  assert.ok(Math.abs(b.posicao().x - 1.8) < 1e-6); // 0,9 m/s na última hora (equilíbrio)
});

test('depois da rota vai direto ao jogador e avisa que alcançou', () => {
  const f = novo();
  const r = passo(f, 40, { minuto: 130, jogador: { x: 10, z: 5 }, olhando: false });
  assert.equal(r, 'alcancou');
});

test('alcança a menos de 1,1 m', () => {
  const f = novo();
  assert.equal(f.update(0.1, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: true }), 'alcancou');
  assert.equal(f.update(0.1, { minuto: 130, jogador: { x: 1.3, z: 0 }, olhando: true }), null);
});

test('suspender 30 s: invisível e parado; depois volta', () => {
  const f = novo();
  f.suspender(30);
  assert.equal(passo(f, 29, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: false }), null);
  assert.equal(f.visivel(130), false);
  passo(f, 2, { minuto: 130, jogador: longe, olhando: false });
  assert.equal(f.visivel(130), true);
});

test('pausar: visível e parado', () => {
  const f = novo(); f.pausar(20);
  passo(f, 10, { minuto: 130, jogador: longe, olhando: false });
  assert.deepEqual(f.posicao(), origem);
  assert.equal(f.visivel(130), true);
});

test('distrair: vai até o ponto e espera', () => {
  const f = novo(); f.distrair({ x: 0, z: 3 });
  passo(f, 10, { minuto: 130, jogador: longe, olhando: false });
  assert.ok(Math.abs(f.posicao().z - 3) < 1e-6 && Math.abs(f.posicao().x) < 1e-6);
});

test('errou aumenta a velocidade em 15%', () => {
  const f = novo(); f.errou();
  passo(f, 2, { minuto: 130, jogador: longe, olhando: false });
  assert.ok(Math.abs(f.posicao().x - 0.9 * 1.15) < 1e-6);
});

test('voltarParaOrigem', () => {
  const f = novo();
  passo(f, 4, { minuto: 130, jogador: longe, olhando: false });
  f.voltarParaOrigem();
  assert.deepEqual(f.posicao(), origem);
});

test('snapshot e restaurar', () => {
  const f = novo(); f.errou();
  passo(f, 2, { minuto: 130, jogador: longe, olhando: false });
  const s = f.snapshot();
  passo(f, 2, { minuto: 130, jogador: longe, olhando: false });
  f.restaurar(s);
  assert.ok(Math.abs(f.posicao().x - 0.9 * 1.15) < 1e-6);
});

test('usa navegar para contornar paredes', () => {
  // Navegação falsa: para chegar em qualquer lugar, passa antes por (0, 5).
  const navegar = (p, alvo) => (p.z < 5 - 1e-9 && p.x < 1e-9 ? { x: 0, z: 5 } : alvo);
  const f = createFiscal({ rota: [], origem, navegar });
  passo(f, 4, { minuto: 130, jogador: { x: 30, z: 0 }, olhando: false });
  assert.ok(Math.abs(f.posicao().x) < 1e-6 && Math.abs(f.posicao().z - 1.8) < 1e-6, JSON.stringify(f.posicao()));
});

test('pausado não alcança o jogador, mesmo perto', () => {
  const f = novo(); f.pausar(3);
  assert.equal(passo(f, 2, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: false }), null);
  assert.equal(passo(f, 2, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: false }), 'alcancou');
});

test('teleporte da navegação (escada) pula na hora', () => {
  const navegar = (p, alvo) => (p.x < 50 ? (Math.hypot(p.x - 1, p.z) < 0.3 ? { x: 100, z: 0, teleporte: true } : { x: 1, z: 0 }) : alvo);
  const f = createFiscal({ rota: [], origem, navegar });
  passo(f, 4, { minuto: 130, jogador: { x: 103, z: 0 }, olhando: false });
  assert.ok(f.posicao().x >= 100, JSON.stringify(f.posicao()));
});

test('alvo separado: anda até o alvo mas alcança pelo jogador', () => {
  const f = createFiscal({ rota: [], origem });
  passo(f, 5, { minuto: 130, jogador: { x: 30, z: 0 }, alvo: { x: 0, z: 1 }, olhando: false });
  assert.ok(Math.abs(f.posicao().z - 1) < 1e-6 && Math.abs(f.posicao().x) < 1e-6);
  assert.equal(f.update(0.1, { minuto: 130, jogador: { x: 0.5, z: 1 }, alvo: { x: 0, z: 1 }, olhando: false }), 'alcancou');
});

test('voltarParaOrigem aceita outro ponto de recomeço', () => {
  const f = novo(); f.voltarParaOrigem({ x: 50, z: 2 });
  assert.deepEqual(f.posicao(), { x: 50, z: 2 });
});

test('trégua: anda mas não alcança', () => {
  const f = createFiscal({ rota: [], origem }); f.tregua(5);
  assert.equal(passo(f, 4, { minuto: 130, jogador: { x: 0.5, z: 0 }, olhando: false }), null);
  assert.equal(passo(f, 2, { minuto: 130, jogador: { x: 0.5, z: 0 }, olhando: false }), 'alcancou');
});

test('perseguição: corre 2,9 m/s mesmo sendo olhado', () => {
  const f = createFiscal({ rota: [], origem });
  f.perseguir(35);
  passo(f, 2, { minuto: 130, jogador: { x: 30, z: 0 }, olhando: true });
  assert.ok(Math.abs(f.posicao().x - 5.8) < 1e-6, JSON.stringify(f.posicao()));
  assert.ok(f.perseguindo());
});
test('perseguição acaba sozinha depois do tempo', () => {
  const f = createFiscal({ rota: [], origem });
  f.perseguir(3);
  passo(f, 3.2, { minuto: 130, jogador: { x: 30, z: 0 }, olhando: false });
  assert.equal(f.perseguindo(), false);
});
test('perseguição ignora trégua e alcança', () => {
  const f = createFiscal({ rota: [], origem });
  f.tregua(25); f.perseguir(35);
  assert.equal(passo(f, 1, { minuto: 130, jogador: { x: 2, z: 0 }, olhando: true }), 'alcancou');
});
test('pararPerseguicao', () => { const f = createFiscal({ rota: [], origem }); f.perseguir(30); f.pararPerseguicao(); assert.equal(f.perseguindo(), false); });
