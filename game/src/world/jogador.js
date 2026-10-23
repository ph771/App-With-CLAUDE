// Jogador em 1ª pessoa: mouse para olhar, WASD para andar.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { moverComColisao, temVisao } from './fisica.js';

const VELOCIDADE = 2.2;
const ALTURA_OLHOS = 1.6;
const TECLAS = { KeyW: 'frente', ArrowUp: 'frente', KeyS: 'tras', ArrowDown: 'tras', KeyA: 'esq', ArrowLeft: 'esq', KeyD: 'dir', ArrowRight: 'dir' };

export function criarJogador(camera, dom, obterParedes, inicio) {
  const controles = new PointerLockControls(camera, dom);
  const apertadas = new Set();
  let pos = { ...inicio };
  let balanco = 0;
  camera.position.set(pos.x, ALTURA_OLHOS, pos.z);

  addEventListener('keydown', (e) => { if (TECLAS[e.code]) apertadas.add(TECLAS[e.code]); });
  addEventListener('keyup', (e) => { if (TECLAS[e.code]) apertadas.delete(TECLAS[e.code]); });
  addEventListener('blur', () => apertadas.clear());

  const frente = new THREE.Vector3();
  function direcao() {
    camera.getWorldDirection(frente);
    const n = Math.hypot(frente.x, frente.z) || 1;
    return { x: frente.x / n, z: frente.z / n };
  }

  return {
    controles,
    travar: () => controles.lock(),
    travado: () => controles.isLocked,
    onSoltar: (cb) => controles.addEventListener('unlock', cb),
    onTravar: (cb) => controles.addEventListener('lock', cb),
    update(dt, multVel = 1, podeAndar = true) {
      if (!podeAndar) { apertadas.clear(); return; }
      const f = direcao();
      const lado = { x: -f.z, z: f.x };
      let mx = 0, mz = 0;
      if (apertadas.has('frente')) { mx += f.x; mz += f.z; }
      if (apertadas.has('tras')) { mx -= f.x; mz -= f.z; }
      if (apertadas.has('dir')) { mx += lado.x; mz += lado.z; }
      if (apertadas.has('esq')) { mx -= lado.x; mz -= lado.z; }
      const n = Math.hypot(mx, mz);
      if (n > 0) {
        const d = (VELOCIDADE * multVel * dt) / n;
        pos = moverComColisao(pos, { x: mx * d, z: mz * d }, obterParedes(), 0.3);
        balanco += dt * 9 * multVel;
      }
      camera.position.set(pos.x, ALTURA_OLHOS + Math.sin(balanco) * 0.035, pos.z);
    },
    posicao: () => ({ ...pos }),
    teleportar(p) { pos = { ...p }; camera.position.set(pos.x, ALTURA_OLHOS, pos.z); },
    olharPara(p) { camera.lookAt(p.x, ALTURA_OLHOS, p.z); },
    direcao,
    // O ponto está no campo de visão (até `angulo` graus do centro) e sem parede no meio?
    olhandoPara(ponto, paredes, angulo = 35) {
      const f = direcao();
      const dx = ponto.x - pos.x, dz = ponto.z - pos.z, d = Math.hypot(dx, dz);
      if (d < 1e-6) return true;
      const cos = (f.x * dx + f.z * dz) / d;
      return cos >= Math.cos((angulo * Math.PI) / 180) && temVisao(pos, ponto, paredes);
    },
  };
}
