import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HORAS, TAREFA_FINAL } from '../src/data/noite.js';
import { PAREDES, PORTA_CABINE_01 } from '../src/world/planta.js';
import { regiaoDe } from '../src/world/nav.js';
import { FAVORES } from '../src/data/favores.js';

const RAIO_JOGADOR = 0.3, RAIO_INTERACAO = 1.5;
const livre = (p) => regiaoDe(p) && ![...PAREDES, PORTA_CABINE_01].some((w) =>
  p.x + RAIO_JOGADOR > w.minX && p.x - RAIO_JOGADOR < w.maxX && p.z + RAIO_JOGADOR > w.minZ && p.z - RAIO_JOGADOR < w.maxZ);

// Existe um lugar livre para ficar em pé perto o bastante para fazer a tarefa?
function alcancavel(ponto) {
  for (let r = 0; r <= RAIO_INTERACAO - 0.1; r += 0.1) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
      if (livre({ x: ponto.x + Math.cos(a) * r, z: ponto.z + Math.sin(a) * r })) return true;
    }
  }
  return false;
}

test('toda tarefa de toda hora fica num lugar alcançável', () => {
  for (const [h, tarefas] of HORAS.entries()) {
    for (const t of tarefas) {
      assert.ok(regiaoDe(t.ponto), `hora ${h}: ${t.id} fora de qualquer sala`);
      assert.ok(alcancavel(t.ponto), `hora ${h}: ${t.id} não dá para alcançar`);
    }
  }
  assert.ok(alcancavel(TAREFA_FINAL.ponto), 'painel');
});

test('toda tarefa diz onde fica e tem tempo de segurar', () => {
  for (const t of [...HORAS.flat(), TAREFA_FINAL]) {
    assert.ok(t.onde && t.texto, t.id);
    assert.ok(t.segundos >= 2 && t.segundos <= 4, t.id);
  }
});

test('objetos dos favores ficam em lugares alcançáveis', () => {
  for (const [id, f] of Object.entries(FAVORES)) {
    if (f.tipo !== 'pegar') continue;
    assert.ok(regiaoDe(f.objeto.ponto), `${id}: fora de sala`);
    assert.ok(alcancavel(f.objeto.ponto), `${id}: inalcançável`);
  }
});
