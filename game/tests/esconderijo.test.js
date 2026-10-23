import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRespiracao, FOLEGO_RESPIRACAO } from '../src/logic/esconderijo.js';

const rodar = (r, seg, ctx) => { let x = null; for (let i = 0; i < Math.round(seg * 10); i++) x = r.update(0.1, ctx) ?? x; return x; };

test('fora do esconderijo nunca acha', () => assert.equal(rodar(createRespiracao(), 5, { escondido: false, fiscalPerto: true, segurando: false }), null));
test('escondido com Fiscal longe: tranquilo', () => assert.equal(rodar(createRespiracao(), 10, { escondido: true, fiscalPerto: false, segurando: false }), null));
test('Fiscal perto e sem segurar a respiração: acha em ~1,2 s', () => {
  const r = createRespiracao();
  assert.equal(rodar(r, 1, { escondido: true, fiscalPerto: true, segurando: false }), null);
  assert.equal(rodar(r, 0.4, { escondido: true, fiscalPerto: true, segurando: false }), 'achou');
});
test('segurando: aguenta 6 s e depois solta o ar', () => {
  const r = createRespiracao();
  assert.equal(FOLEGO_RESPIRACAO, 6);
  assert.equal(rodar(r, 5.8, { escondido: true, fiscalPerto: true, segurando: true }), null);
  assert.equal(rodar(r, 0.4, { escondido: true, fiscalPerto: true, segurando: true }), 'achou');
});
test('recupera o fôlego quando ele se afasta', () => {
  const r = createRespiracao();
  rodar(r, 4, { escondido: true, fiscalPerto: true, segurando: true });
  rodar(r, 4, { escondido: true, fiscalPerto: false, segurando: false });
  assert.equal(r.frac(), 1);
});
test('precisa segurar só com ele perto', () => {
  const r = createRespiracao();
  r.update(0.1, { escondido: true, fiscalPerto: true, segurando: false });
  assert.equal(r.precisaSegurar(), true);
  r.update(0.1, { escondido: true, fiscalPerto: false, segurando: false });
  assert.equal(r.precisaSegurar(), false);
});
