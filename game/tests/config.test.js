import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarConfig, salvarConfig, PADRAO, normalizar } from '../src/logic/config.js';

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('sem nada salvo: padrão', () => assert.deepEqual(carregarConfig(memoria()), PADRAO));
test('salva e carrega', () => {
  const s = memoria();
  salvarConfig(s, { ...PADRAO, volumeGeral: 0.3, qualidade: 'media' });
  const c = carregarConfig(s);
  assert.equal(c.volumeGeral, 0.3); assert.equal(c.qualidade, 'media');
});
test('valores fora da faixa são corrigidos', () => {
  const c = normalizar({ volumeGeral: 7, sensMouse: -1, fov: 200, qualidade: 'ultra', inverterY: 'sim' });
  assert.equal(c.volumeGeral, 1); assert.equal(c.sensMouse, 0.2); assert.equal(c.fov, 95);
  assert.equal(c.qualidade, 'alta'); assert.equal(c.inverterY, false);
});
test('armazenamento quebrado não derruba o jogo', () => {
  const ruim = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.deepEqual(carregarConfig(ruim), PADRAO);
  assert.doesNotThrow(() => salvarConfig(ruim, PADRAO));
});
test('JSON inválido: padrão', () => { const s = memoria(); s.setItem('plantao-config', '{oops'); assert.deepEqual(carregarConfig(s), PADRAO); });
