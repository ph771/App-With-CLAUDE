import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vetorJoystick, girarOlhar } from '../src/ui/toque-logica.js';

test('joystick no centro não anda', () => assert.deepEqual(vetorJoystick(0, 0, 50), { lado: 0, frente: 0 }));
test('zona morta pequena ignora tremidas', () => assert.deepEqual(vetorJoystick(3, -2, 50), { lado: 0, frente: 0 }));
test('para cima = frente', () => { const v = vetorJoystick(0, -50, 50); assert.equal(v.lado, 0); assert.ok(Math.abs(v.frente - 1) < 1e-9); });
test('para a direita = lado', () => { const v = vetorJoystick(25, 0, 50); assert.ok(Math.abs(v.lado - 0.5) < 1e-9); assert.equal(v.frente, 0); });
test('passar do raio limita em 1', () => { const v = vetorJoystick(300, -400, 50); assert.ok(Math.abs(Math.hypot(v.lado, v.frente) - 1) < 1e-9); });

test('girar olhar: arrasto horizontal vira o yaw', () => {
  const r = girarOlhar({ yaw: 0, pitch: 0 }, 100, 0, 0.005);
  assert.ok(Math.abs(r.yaw + 0.5) < 1e-9); assert.equal(r.pitch, 0);
});
test('girar olhar: pitch limitado para não dar cambalhota', () => {
  const r = girarOlhar({ yaw: 0, pitch: 0 }, 0, -10000, 0.005);
  assert.ok(r.pitch <= Math.PI / 2 - 0.05 + 1e-9);
});
