import { test } from 'node:test';
import assert from 'node:assert/strict';
import { salvarNoite, carregarNoite, apagarNoite } from '../src/logic/salvar.js';

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const exemplo = { hora: 3, relatorio: ['aprovado', 'aprovado', 'reprovado', null, null, null], itens: ['lanterna'], votos: ['lulao'], favores: {}, ferramenta: null, cabineAberta: false, paginas: [1], visitantes: [], stats: { pego: 2 } };

test('salva e carrega', () => { const s = memoria(); salvarNoite(s, exemplo); assert.deepEqual(carregarNoite(s), { ...exemplo, versao: 1 }); });
test('sem nada: null', () => assert.equal(carregarNoite(memoria()), null));
test('hora fora de 1 a 6 não vale', () => { const s = memoria(); salvarNoite(s, { ...exemplo, hora: 0 }); assert.equal(carregarNoite(s), null); });
test('JSON quebrado ou armazenamento bloqueado: null, sem erro', () => {
  const s = memoria(); s.setItem('plantao-noite', '{x'); assert.equal(carregarNoite(s), null);
  const ruim = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(carregarNoite(ruim), null);
  assert.doesNotThrow(() => { salvarNoite(ruim, exemplo); apagarNoite(ruim); });
});
test('apagar', () => { const s = memoria(); salvarNoite(s, exemplo); apagarNoite(s); assert.equal(carregarNoite(s), null); });
