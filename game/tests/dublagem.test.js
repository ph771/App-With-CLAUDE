import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DUBLAGEM, VOZES_CACADA } from '../src/data/dublagem.js';
import { VISITANTES } from '../src/data/visitantes.js';
import { FAVORES } from '../src/data/favores.js';

const JOGO = fileURLToPath(new URL('..', import.meta.url));

test('toda fala dublada existe no jogo (texto idêntico)', () => {
  const textos = new Set();
  for (const v of VISITANTES) { v.falas.forEach((f) => textos.add(f)); textos.add(v.voto); }
  for (const f of Object.values(FAVORES)) { f.pedido.forEach((p) => textos.add(p)); textos.add(f.obrigado); }
  for (const t of Object.keys(DUBLAGEM)) assert.ok(textos.has(t), `fala sumiu do jogo: ${t}`);
});

test('todo arquivo de voz existe', () => {
  for (const { arq } of VOZES_CACADA) assert.ok(existsSync(JOGO + arq), `falta ${arq}`);
  for (const arq of Object.values(DUBLAGEM)) assert.ok(existsSync(JOGO + arq), `falta ${arq}`);
});
