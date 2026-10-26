// Modelos low-poly de ferramentas e objetos pequenos.
import * as THREE from 'three';
import { instanciar, temModelo } from './modelos.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
function bloco(w, h, d, cor, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(cor));
  m.position.set(x, y, z);
  return m;
}
function cilindro(r, h, cor, x = 0, y = 0, z = 0, lados = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, lados), lambert(cor));
  m.position.set(x, y, z);
  return m;
}

// Modelo 3D pronto (Kenney / Poly Haven, CC0), com a base no chão e a altura pedida; null se não carregou.
function modelo(nome, altura, { x = 0, z = 0, rot = 0 } = {}) {
  return temModelo(nome) ? instanciar(nome, { x, z, rot, altura }) : null;
}

// Esfregão: cabo de madeira e cabeça de tiras de pano (feito aqui; não há modelo livre bom).
function esfregao(g, x, z) {
  g.add(cilindro(0.016, 1.25, 0x9a7a4a, x, 0.72, z, 6));
  g.add(cilindro(0.03, 0.06, 0x3a6ac0, x, 0.1, z, 8)); // presilha azul
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = 0.05 + (i % 3) * 0.015;
    const tira = cilindro(0.012, 0.16, i % 2 ? 0xe4ddc8 : 0xcfc6ae, x + Math.cos(a) * r, 0.06, z + Math.sin(a) * r, 4);
    tira.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(tira);
  }
}

// Rolo de papel higiênico: papel branco com o tubo de papelão aparecendo no meio.
function rolo(g, x, y, z) {
  g.add(cilindro(0.055, 0.1, 0xf4f2ec, x, y, z, 12));
  const tubo = cilindro(0.02, 0.102, 0x8a6a44, x, y, z, 8);
  tubo.userData.interno = true; // na mão é desenhado antes do papel (não aparece "através")
  g.add(tubo);
}

// Escadinha de alumínio (A) com a lâmpada fluorescente nova.
function escadinha(g) {
  const metal = 0xa8adb2;
  for (const s of [-1, 1]) for (const lado of [-0.16, 0.16]) {
    const perna = bloco(0.03, 1.05, 0.03, metal, lado, 0.5, s * 0.14);
    perna.rotation.x = -s * 0.14; g.add(perna);
  }
  for (const y of [0.3, 0.6, 0.88]) g.add(bloco(0.36, 0.025, 0.1, 0x7d8388, 0, y, 0.11 - y * 0.12));
  g.add(bloco(0.36, 0.04, 0.2, 0x7d8388, 0, 1.03, 0)); // topo
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), new THREE.MeshLambertMaterial({ color: 0xfafaf2, emissive: 0x2a2a24 }));
  tubo.rotation.z = Math.PI / 2; tubo.position.set(0, 1.08, 0); g.add(tubo);
  for (const x of [-0.31, 0.31]) { const p = cilindro(0.02, 0.025, 0x777777, x, 1.08, 0, 8); p.rotation.z = Math.PI / 2; g.add(p); }
}

// Cada ferramenta em pé, com a base no chão (y = 0). Altura em torno de 1 m.
export function criarFerramenta(id) {
  const g = new THREE.Group();
  g.name = id;
  switch (id) {
    case 'esfregao': {
      const balde = modelo('item_balde', 0.32, { x: 0.12 });
      if (balde) g.add(balde); else g.add(cilindro(0.17, 0.3, 0xc0302a, 0.12, 0.15, 0, 10));
      esfregao(g, -0.14, 0);
      break;
    }
    case 'rolos':
      // Pacote com 4 rolos (2 em baixo, 2 em cima) e o plástico em volta.
      for (const [x, y] of [[-0.058, 0.05], [0.058, 0.05], [-0.058, 0.152], [0.058, 0.152]]) { rolo(g, x, y, 0.03); rolo(g, x, y, -0.085); }
      { const plastico = bloco(0.24, 0.21, 0.24, 0xdfe8ff, 0, 0.105, -0.028); plastico.material.transparent = true; plastico.material.opacity = 0.18; g.add(plastico); }
      break;
    case 'desentupidor': {
      const m = modelo('item_desentupidor', 0.62);
      if (m) g.add(m);
      else { g.add(cilindro(0.02, 0.8, 0x6a4a2a, 0, 0.5, 0)); const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.12, 8), lambert(0xb02020)); v.position.y = 0.06; g.add(v); }
      break;
    }
    case 'lampada':
      escadinha(g);
      break;
    case 'sabonete': {
      const m = modelo('item_sabonete', 0.22);
      if (m) g.add(m); else { g.add(bloco(0.12, 0.2, 0.08, 0xd9e8a0, 0, 0.1, 0)); g.add(cilindro(0.015, 0.06, 0x333333, 0, 0.23, 0)); }
      break;
    }
  }
  return g;
}

// Versão para segurar na frente da câmera (1ª pessoa).
export function criarFerramentaNaMao(id) {
  const g = criarFerramenta(id);
  // [escala, altura na tela]: cada uma bem visível no canto de baixo à direita.
  const [escala, y] = { esfregao: [0.42, -0.36], rolos: [1.0, -0.3], desentupidor: [0.55, -0.32], lampada: [0.4, -0.4], sabonete: [1.2, -0.3] }[id] ?? [0.6, -0.42];
  g.scale.setScalar(escala);
  g.position.set(0.28, y, -0.55);
  g.rotation.set(0.15, -0.4, 0.15);
  g.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = o.userData.interno ? 9 : o.material.transparent ? 11 : 10; } });
  return g;
}

// Página da prancheta caída no chão.
export function criarPagina() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0xf4eedc, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  const linhas = bloco(0.2, 0.002, 0.02, 0x555555, 0, 0.003, 0);
  linhas.rotation.x = 0;
  const g = new THREE.Group();
  g.add(m);
  for (let i = 0; i < 4; i++) { const l = linhas.clone(); l.position.z = -0.12 + i * 0.07; g.add(l); }
  return g;
}

// Poça d'água.
export function criarPoca() {
  // Água: clara e brilhante, para aparecer até no granito escuro.
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.7, 10), new THREE.MeshPhongMaterial({ color: 0x8fc4e0, emissive: 0x16303c, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.75 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}

// Objetos dos favores dos visitantes, no chão ou em cima de móveis.
export function criarObjetoFavor(id) {
  const g = new THREE.Group();
  g.name = id;
  const pronto = { cafe: ['item_cafe', 0.24], caneca: ['item_caneca', 0.11], leite_condensado: ['item_leite', 0.08] }[id];
  const m = pronto && modelo(pronto[0], pronto[1]);
  if (m) g.add(m);
  else switch (id) {
    case 'cafe': g.add(bloco(0.16, 0.22, 0.08, 0x6b3a1a, 0, 0.11, 0)); g.add(bloco(0.17, 0.06, 0.09, 0xd8c070, 0, 0.16, 0)); break;
    case 'caneca': g.add(cilindro(0.06, 0.12, 0xf2f2f2, 0, 0.06, 0)); break;
    case 'leite_condensado': g.add(cilindro(0.05, 0.1, 0x2f6fc0, 0, 0.05, 0)); g.add(cilindro(0.051, 0.03, 0xf0f0f0, 0, 0.06, 0)); break;
  }
  if (id === 'celular') {
    // Celular deitado: corpo preto, tela acesa (a live ainda está aberta) e a câmera.
    g.add(bloco(0.075, 0.01, 0.155, 0x161616, 0, 0.005, 0));
    const tela = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.002, 0.138), new THREE.MeshBasicMaterial({ color: 0x4a8ad8 }));
    tela.position.set(0, 0.011, 0); g.add(tela);
    g.add(bloco(0.03, 0.003, 0.012, 0xd03030, -0.012, 0.0125, -0.05)); // "AO VIVO"
    g.add(cilindro(0.008, 0.004, 0x333333, 0.02, -0.001, -0.06, 8));
  }
  if (id === 'peruca_nicolas') {
    // Peruca loira "chanel": calota em cima e mechas caindo em volta (aberta na frente, para o rosto).
    const loiro = 0xe0c060, escuro = 0xc9a447;
    const calota = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert(loiro));
    calota.scale.set(1, 0.8, 1.1); calota.position.y = 0.14; g.add(calota);
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * 0.35 + (i / 12) * Math.PI * 1.3; // de um lado ao outro, passando por trás
      const mecha = bloco(0.035, 0.15, 0.02, i % 2 ? loiro : escuro, Math.cos(a) * 0.1, 0.075, Math.sin(a) * 0.11);
      mecha.rotation.y = -a + Math.PI / 2; mecha.rotation.x = 0.12;
      g.add(mecha);
    }
  }
  // Brilho discreto para dar para achar no escuro.
  const brilho = new THREE.PointLight(0xfff0c0, 0.6, 1.6, 2);
  brilho.position.y = 0.3;
  g.add(brilho);
  return g;
}
