// Jogador em 1ª pessoa: mouse para olhar, WASD para andar.
import * as THREE from 'three';
import { moverComColisao, temVisao } from './fisica.js';
import { girarOlhar } from '../ui/toque-logica.js';

const VELOCIDADE = 2.2;
const ALTURA_OLHOS = 1.6;
const TECLAS = { KeyW: 'frente', ArrowUp: 'frente', KeyS: 'tras', ArrowDown: 'tras', KeyA: 'esq', ArrowLeft: 'esq', KeyD: 'dir', ArrowRight: 'dir' };

// `entrada` (opcional): função que devolve { lado, frente } de -1 a 1 (analógico na tela).
export function criarJogador(camera, dom, obterParedes, inicio, { entrada } = {}) {
  const apertadas = new Set();
  const ajustes = { sensMouse: 1, sensToque: 1, inverterY: false };
  const aoTravar = [], aoSoltar = [];
  const travado = () => document.pointerLockElement === dom;

  // Mouse com o ponteiro travado: gira a câmera.
  document.addEventListener('mousemove', (e) => {
    if (!travado()) return;
    girar(e.movementX, e.movementY * (ajustes.inverterY ? -1 : 1), 0.002 * ajustes.sensMouse);
  });
  document.addEventListener('pointerlockchange', () => (travado() ? aoTravar : aoSoltar).forEach((cb) => cb()));

  function girar(dx, dy, sensibilidade) {
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    const r = girarOlhar({ yaw: e.y, pitch: e.x }, dx, dy, sensibilidade);
    e.set(r.pitch, r.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(e);
  }
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
    travar() { try { const r = dom.requestPointerLock?.(); r?.catch?.(() => {}); } catch { /* recusado */ } },
    travado,
    onSoltar: (cb) => aoSoltar.push(cb),
    onTravar: (cb) => aoTravar.push(cb),
    ajustar(c) { Object.assign(ajustes, c); },
    update(dt, multVel = 1, podeAndar = true) {
      if (!podeAndar) { apertadas.clear(); return false; }
      const f = direcao();
      const lado = { x: -f.z, z: f.x };
      let mx = 0, mz = 0;
      if (apertadas.has('frente')) { mx += f.x; mz += f.z; }
      if (apertadas.has('tras')) { mx -= f.x; mz -= f.z; }
      if (apertadas.has('dir')) { mx += lado.x; mz += lado.z; }
      if (apertadas.has('esq')) { mx -= lado.x; mz -= lado.z; }
      let n = Math.hypot(mx, mz);
      let forca = 1;
      const analogico = entrada?.();
      if (n === 0 && analogico && (analogico.lado || analogico.frente)) {
        mx = f.x * analogico.frente + lado.x * analogico.lado;
        mz = f.z * analogico.frente + lado.z * analogico.lado;
        n = Math.hypot(mx, mz);
        forca = Math.min(1, n);
      }
      if (n > 0) {
        const d = (VELOCIDADE * multVel * forca * dt) / n;
        pos = moverComColisao(pos, { x: mx * d, z: mz * d }, obterParedes(), 0.3);
        balanco += dt * 9 * multVel;
      }
      camera.position.set(pos.x, ALTURA_OLHOS + Math.sin(balanco) * 0.035 * Math.min(multVel, 1.6), pos.z);
      return n > 0; // andou neste quadro
    },
    // Gira a câmera pelo arrasto do dedo (px).
    girar(dx, dy) { girar(dx, dy * (ajustes.inverterY ? -1 : 1), 0.006 * ajustes.sensToque); },
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
