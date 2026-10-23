// Plantão no Banheiro — ponto de entrada.
import * as THREE from 'three';
import { criarBanheiro } from './world/banheiro.js';
import { criarJogador } from './world/jogador.js';
import { criarRenderPS1 } from './world/ps1.js';
import { PAREDES, PONTOS } from './world/planta.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('tela');
const ps1 = criarRenderPS1(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 2, 11);
const camera = new THREE.PerspectiveCamera(70, 4 / 3, 0.05, 40);

const mundo = criarBanheiro(scene);
const jogador = criarJogador(camera, canvas, () => PAREDES, PONTOS.inicio);
jogador.olharPara({ x: 0, z: -2 });

// ?ver=x,z,alvoX,alvoZ posiciona a câmera (para prints de teste).
if (params.has('ver')) {
  const [x, z, ax, az] = params.get('ver').split(',').map(Number);
  jogador.teleportar({ x, z });
  jogador.olharPara({ x: ax, z: az });
}
canvas.addEventListener('click', () => jogador.travar());

let anterior = performance.now();
let quadro = 0;
function loop(agora) {
  const dt = Math.min((agora - anterior) / 1000, 0.1);
  anterior = agora;
  jogador.update(dt);
  if (quadro++ % 3 === 0) ps1.renderEm(mundo.monitor.alvo, scene, mundo.monitor.camera);
  ps1.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__jogo = { scene, camera, jogador, mundo };
