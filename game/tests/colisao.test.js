import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverComColisao, temVisao } from '../src/world/fisica.js';
import { regiaoDe, proximoAlvo } from '../src/world/nav.js';
import { PAREDES_SALA, PAREDES, SALAS, PORTAS, ESCADAS, PONTOS, andarDe } from '../src/world/planta.js';

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
test('linha de visão bloqueada por parede', () => {
  assert.equal(temVisao({ x: 0, z: 0 }, { x: 3, z: 0 }, parede), false);
  assert.equal(temVisao({ x: 0, z: 0 }, { x: 0, z: 3 }, parede), true);
});

test('regiões da Casa Legislativa', () => {
  const casos = {
    portaria: { x: 0, z: 5 }, corredor_t: { x: 0, z: -1.5 }, masc_t: { x: -15, z: -7 }, fem_t: { x: 15, z: -7 },
    almox: { x: -25, z: -5 }, copa: { x: 24, z: -3 },
    hall_1: { x: 100, z: 3 }, corredor_1: { x: 100, z: -1.5 }, plenario: { x: 100, z: -12 },
    banheiro_vip: { x: 119, z: -7 }, imprensa: { x: 81, z: -7 },
    hall_s: { x: 200, z: 0 }, maquinas: { x: 202, z: -9 },
  };
  for (const [nome, p] of Object.entries(casos)) assert.equal(regiaoDe(p), nome, nome);
  assert.equal(andarDe({ x: 0, z: 0 }), 'terreo');
  assert.equal(andarDe({ x: 100, z: 0 }), '1andar');
  assert.equal(andarDe({ x: 200, z: 0 }), 'subsolo');
});

test('portas abrem buraco na parede', () => {
  for (const d of PORTAS) {
    const c = d.z !== undefined ? { x: (d.x1 + d.x2) / 2, z: d.z } : { x: d.x, z: (d.z1 + d.z2) / 2 };
    const a = d.z !== undefined ? { x: c.x, z: c.z - 0.6 } : { x: c.x - 0.6, z: c.z };
    const b = d.z !== undefined ? { x: c.x, z: c.z + 0.6 } : { x: c.x + 0.6, z: c.z };
    assert.ok(temVisao(a, b, PAREDES_SALA), `porta ${JSON.stringify(d)}`);
  }
});

test('paredes fecham as salas (sem passagem fora das portas)', () => {
  // Do corredor do térreo até o banheiro masculino em linha reta, longe da porta: bloqueado.
  assert.equal(temVisao({ x: -12, z: -1.5 }, { x: -12, z: -5 }, PAREDES_SALA), false);
});

test('pontos importantes caem dentro de salas', () => {
  for (const k of ['inicio', 'guiche', 'origemFiscal', 'quadroGeral', 'painel']) assert.ok(regiaoDe(PONTOS[k]), k);
  for (const e of ESCADAS) { assert.ok(regiaoDe(e.a), JSON.stringify(e.a)); assert.ok(regiaoDe(e.b), JSON.stringify(e.b)); }
  assert.ok(SALAS.length >= 13);
  assert.ok(PAREDES.length > PAREDES_SALA.length);
});

// Simula o Fiscal andando; só pode "pular" quando a navegação manda (escada).
function chega(de, para) {
  let p = { ...de };
  for (let i = 0; i < 20000; i++) {
    if (Math.hypot(para.x - p.x, para.z - p.z) < 0.2) return true;
    const alvo = proximoAlvo(p, para);
    if (alvo.teleporte) { p = { x: alvo.x, z: alvo.z }; continue; }
    const dx = alvo.x - p.x, dz = alvo.z - p.z, d = Math.hypot(dx, dz);
    if (d < 1e-9) return false;
    const passo = Math.min(0.05, d);
    const novo = { x: p.x + (dx / d) * passo, z: p.z + (dz / d) * passo };
    assert.ok(temVisao(p, novo, PAREDES_SALA), `atravessou parede em ${JSON.stringify(p)}`);
    p = novo;
  }
  return false;
}

test('Fiscal: do 1º andar até o banheiro feminino do térreo', () => assert.ok(chega(PONTOS.origemFiscal, { x: 15, z: -8 })));
test('Fiscal: do plenário até o almoxarifado', () => assert.ok(chega({ x: 100, z: -15 }, { x: -26, z: -6 })));
test('Fiscal: da copa até a casa de máquinas', () => assert.ok(chega({ x: 25, z: -3 }, { x: 210, z: -10 })));
test('Fiscal: do térreo até o banheiro VIP', () => assert.ok(chega({ x: -15, z: -8 }, { x: 121, z: -9 })));
test('mesma sala: vai direto', () => assert.deepEqual(proximoAlvo({ x: 90, z: -10 }, { x: 110, z: -15 }), { x: 110, z: -15 }));
