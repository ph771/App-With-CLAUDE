import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSuspeita, tempoParaNotar } from '../src/logic/suspeita.js';

const rodar = (s, seg, ctx) => { let r = null; for (let i = 0; i < Math.round(seg * 10); i++) r = s.update(0.1, ctx) ?? r; return r; };

test('tempo para te notar cai nas horas finais', () => {
  assert.equal(tempoParaNotar(130), 1.6);
  assert.equal(tempoParaNotar(250), 1.1);
});
test('te vendo, o medidor enche e então ele caça', () => {
  const s = createSuspeita();
  assert.equal(rodar(s, 1.4, { minuto: 130, vendo: true, ouvindo: false }), null);
  assert.ok(s.frac() > 0.8 && s.frac() < 1);
  assert.equal(rodar(s, 0.3, { minuto: 130, vendo: true, ouvindo: false }), 'cacar');
});
test('sair da vista esvazia o medidor', () => {
  const s = createSuspeita();
  rodar(s, 1, { minuto: 130, vendo: true, ouvindo: false });
  rodar(s, 3, { minuto: 130, vendo: false, ouvindo: false });
  assert.equal(s.frac(), 0);
});
test('barulho de corrida enche mais devagar que a visão', () => {
  const s = createSuspeita();
  rodar(s, 1, { minuto: 130, vendo: false, ouvindo: true });
  const ouvido = s.frac();
  s.zerar();
  rodar(s, 1, { minuto: 130, vendo: true, ouvindo: false });
  assert.ok(ouvido > 0 && ouvido < s.frac());
});
