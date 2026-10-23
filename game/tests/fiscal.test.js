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

test('anda 0,5 m/s às 02:00 seguindo a rota', () => {
  const f = novo();
  passo(f, 4, { minuto: 130, jogador: longe, olhando: false });
  assert.ok(Math.abs(f.posicao().x - 2) < 1e-6, String(f.posicao().x));
});

test('fica mais rápido às 04:00 e às 05:00', () => {
  const a = novo(); passo(a, 2, { minuto: 250, jogador: longe, olhando: false });
  assert.ok(Math.abs(a.posicao().x - 1.8) < 1e-6);
  const b = novo(); passo(b, 2, { minuto: 310, jogador: longe, olhando: false });
  assert.ok(Math.abs(b.posicao().x - 2.4) < 1e-6);
});

test('depois da rota vai direto ao jogador e avisa que alcançou', () => {
  const f = novo();
  const r = passo(f, 40, { minuto: 130, jogador: { x: 10, z: 5 }, olhando: false });
  assert.equal(r, 'alcancou');
});

test('alcança a menos de 1,5 m', () => {
  const f = novo();
  assert.equal(f.update(0.1, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: true }), 'alcancou');
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
  assert.ok(Math.abs(f.posicao().x - 1.15) < 1e-6);
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
  assert.ok(Math.abs(f.posicao().x - 1.15) < 1e-6);
});

test('usa navegar para contornar paredes', () => {
  // Navegação falsa: para chegar em qualquer lugar, passa antes por (0, 5).
  const navegar = (p, alvo) => (p.z < 5 - 1e-9 && p.x < 1e-9 ? { x: 0, z: 5 } : alvo);
  const f = createFiscal({ rota: [], origem, navegar });
  passo(f, 4, { minuto: 130, jogador: { x: 30, z: 0 }, olhando: false });
  assert.ok(Math.abs(f.posicao().x) < 1e-6 && Math.abs(f.posicao().z - 2) < 1e-6, JSON.stringify(f.posicao()));
});

test('pausado não alcança o jogador, mesmo perto', () => {
  const f = novo(); f.pausar(3);
  assert.equal(passo(f, 2, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: false }), null);
  assert.equal(passo(f, 2, { minuto: 130, jogador: { x: 1, z: 0 }, olhando: false }), 'alcancou');
});
