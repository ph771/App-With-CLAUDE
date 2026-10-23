// O que aparece no lugar de cada tarefa: o "problema" em si
// (pegadas molhadas, privada vazando, porta-sabonete vazio, poeira na tribuna...).
import * as THREE from 'three';
import { criarPoca } from './objetos.js';

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

function pegadas(g) {
  const mat = new THREE.MeshPhongMaterial({ color: 0x9fc8de, emissive: 0x12303a, shininess: 100, transparent: true, opacity: 0.7 });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), mat);
    p.scale.set(0.7, 1.4, 1);
    p.rotation.x = -Math.PI / 2;
    p.position.set((i % 2 ? 0.12 : -0.12) - 1.6 + i * 0.45, 0.013, Math.sin(i) * 0.3 - 0.4);
    g.add(p);
  }
}

function caixinhaNaParede(g, cor, y, larg = 0.18, alt = 0.22) {
  const c = new THREE.Mesh(new THREE.BoxGeometry(larg, alt, 0.1), lambert(cor));
  c.position.y = y;
  g.add(c);
}

// O "problema" de cada tarefa, pelo id/ferramenta.
// Fita zebrada "INTERDITADO" cruzando a porta (porta numa parede horizontal, 1 m de largura).
let texturaFita = null;
function fita(g) {
  if (!texturaFita) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 32;
    const x = c.getContext('2d');
    for (let i = -32; i < 256; i += 32) { x.fillStyle = '#f2c200'; x.fillRect(i, 0, 16, 32); x.fillStyle = '#111'; x.fillRect(i + 16, 0, 16, 32); }
    x.fillStyle = 'rgba(242,194,0,0.92)'; x.fillRect(40, 6, 176, 20);
    x.fillStyle = '#111'; x.font = 'bold 16px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('INTERDITADO', 128, 17);
    texturaFita = new THREE.CanvasTexture(c); texturaFita.colorSpace = THREE.SRGBColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({ map: texturaFita, side: THREE.DoubleSide });
  for (const [y, rot] of [[1.5, 0.45], [1.5, -0.45], [0.9, 0.08], [2.0, -0.06]]) {
    const faixa = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.14), mat);
    faixa.position.set(0, y, 0); faixa.rotation.z = rot;
    g.add(faixa);
  }
}

function problema(g, t) {
  if (t.fita) { fita(g); return; }
  if (t.id === 'pano_portaria') { g.add(criarPoca()); pegadas(g); return; }
  if (t.poca || t.id === 'pano_vip') { g.add(criarPoca()); return; }
  if (t.ferramenta === 'desentupidor') {
    const agua = criarPoca(); agua.material = lambert(0x6b6a4a, { transparent: true, opacity: 0.7 }); agua.scale.setScalar(1.3);
    g.add(agua); return;
  }
  if (t.ferramenta === 'sabonete') { // porta-sabonete vazio, na parede da pia
    caixinhaNaParede(g, 0xd0d0c0, 1.25);
    g.children[g.children.length - 1].position.x = t.id === 'sabonete_fem_t' ? -0.5 : 0.5;
    return;
  }
  if (t.id === 'tribuna') {
    const poeira = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), lambert(0x8a8070, { transparent: true, opacity: 0.6 }));
    poeira.rotation.x = -Math.PI / 2; poeira.position.set(0, 1.22, -1.1);
    g.add(poeira);
  }
}

// Só o "problema" desenhado no lugar da tarefa (sem marcador: o jogador procura pelo relatório).
export function criarMarcador(t) {
  const g = new THREE.Group();
  g.position.set(t.ponto.x, 0, t.ponto.z);
  problema(g, t);
  return g;
}

export function animarMarcador() { /* nada para animar */ }
