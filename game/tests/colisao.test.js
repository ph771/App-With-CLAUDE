import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverComColisao, temVisao } from '../src/world/fisica.js';
import { regiaoDe, proximoAlvo } from '../src/world/nav.js';
import { PAREDES } from '../src/world/planta.js';

const parede = [{ minX: 1, maxX: 1.2, minZ: -5, maxZ: 5 }];

test('não atravessa parede', () => {
  const p = moverComColisao({ x: 0, z: 0 }, { x: 2, z: 0 }, parede, 0.3);
  assert.ok(p.x <= 1 - 0.3 + 1e-9, String(p.x));
});

test('desliza ao longo da parede', () => {
  const p = moverComColisao({ x: 0.6, z: 0 }, { x: 1, z: 1 }, parede, 0.3);
  assert.ok(p.x <= 0.7 + 1e-9);
  assert.ok(Math.abs(p.z - 1) < 1e-9);
});

test('anda livre sem parede', () => {
  const p = moverComColisao({ x: 0, z: 0 }, { x: 1, z: 1 }, [], 0.3);
  assert.ok(Math.abs(p.x - 1) < 1e-9 && Math.abs(p.z - 1) < 1e-9);
});

test('passo grande não atravessa parede fina', () => {
  const p = moverComColisao({ x: 0, z: 0 }, { x: 5, z: 0 }, parede, 0.3);
  assert.ok(p.x < 1);
});

test('linha de visão bloqueada por parede', () => {
  assert.equal(temVisao({ x: 0, z: 0 }, { x: 3, z: 0 }, parede), false);
  assert.equal(temVisao({ x: 0, z: 0 }, { x: 0, z: 3 }, parede), true);
});

test('regiões da planta', () => {
  assert.equal(regiaoDe({ x: 0, z: 3 }), 'hall');
  assert.equal(regiaoDe({ x: 0, z: -1 }), 'corredor');
  assert.equal(regiaoDe({ x: -8, z: -5 }), 'masculino');
  assert.equal(regiaoDe({ x: 8, z: -5 }), 'feminino');
  assert.equal(regiaoDe({ x: 14, z: -1.5 }), 'deposito');
});

test('mesma região: vai direto ao jogador', () => {
  assert.deepEqual(proximoAlvo({ x: 8, z: -1 }, { x: -5, z: -1 }), { x: -5, z: -1 });
});

// Simula o Fiscal andando pelo caminho e confere que ele nunca atravessa parede.
function chega(de, para) {
  let p = { ...de };
  for (let i = 0; i < 4000; i++) {
    const alvo = proximoAlvo(p, para);
    const dx = alvo.x - p.x, dz = alvo.z - p.z, d = Math.hypot(dx, dz);
    if (Math.hypot(para.x - p.x, para.z - p.z) < 0.2) return true;
    const passo = Math.min(0.05, d);
    const novo = { x: p.x + (dx / d) * passo, z: p.z + (dz / d) * passo };
    assert.ok(temVisao(p, novo, PAREDES), `atravessou parede em ${JSON.stringify(p)}`);
    p = novo;
  }
  return false;
}

test('do feminino até o masculino passando pelas portas', () => assert.ok(chega({ x: 9.2, z: -7 }, { x: -11, z: -3 })));
test('do corredor até o hall', () => assert.ok(chega({ x: 8.5, z: -1 }, { x: 3, z: 5 })));
test('do hall até o depósito', () => assert.ok(chega({ x: -3, z: 5 }, { x: 15, z: -3 })));
