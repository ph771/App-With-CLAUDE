// Modelos low-poly de ferramentas e objetos pequenos.
import * as THREE from 'three';

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

// Cada ferramenta em pé, com a base no chão (y = 0). Altura em torno de 1 m.
export function criarFerramenta(id) {
  const g = new THREE.Group();
  g.name = id;
  switch (id) {
    case 'esfregao':
      g.add(cilindro(0.025, 1.3, 0x9a7a4a, 0, 0.75, 0));
      g.add(bloco(0.32, 0.12, 0.12, 0xd8d0b8, 0, 0.08, 0));
      g.add(cilindro(0.17, 0.3, 0xc0302a, 0.3, 0.15, 0, 10)); // balde
      break;
    case 'rolos':
      for (let i = 0; i < 3; i++) g.add(cilindro(0.07, 0.11, 0xf2f0ea, (i - 1) * 0.15, 0.06, 0));
      g.add(cilindro(0.07, 0.11, 0xf2f0ea, 0, 0.17, 0));
      break;
    case 'desentupidor':
      g.add(cilindro(0.02, 0.8, 0x6a4a2a, 0, 0.5, 0));
      { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.12, 8), lambert(0xb02020)); v.position.y = 0.06; g.add(v); }
      break;
    case 'lampada':
      g.add(bloco(0.36, 1.1, 0.06, 0x9aa0a6, 0, 0.55, 0)); // escadinha
      for (let y = 0.2; y < 1.1; y += 0.25) g.add(bloco(0.36, 0.03, 0.12, 0x7a8086, 0, y, 0));
      g.add(cilindro(0.04, 0.5, 0xf6f6ee, 0.3, 0.3, 0)); // lâmpada tubular
      break;
    case 'sabonete':
      g.add(bloco(0.12, 0.2, 0.08, 0xd9e8a0, 0, 0.1, 0));
      g.add(cilindro(0.015, 0.06, 0x333333, 0, 0.23, 0));
      break;
  }
  return g;
}

// Versão para segurar na frente da câmera (1ª pessoa).
export function criarFerramentaNaMao(id) {
  const g = criarFerramenta(id);
  const escala = { esfregao: 0.45, rolos: 0.9, desentupidor: 0.6, lampada: 0.45, sabonete: 1.2 }[id] ?? 0.6;
  g.scale.setScalar(escala);
  g.position.set(0.28, -0.42, -0.55);
  g.rotation.set(0.15, -0.4, 0.15);
  g.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
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
  switch (id) {
    case 'cafe': g.add(bloco(0.16, 0.22, 0.08, 0x6b3a1a, 0, 0.11, 0)); g.add(bloco(0.17, 0.06, 0.09, 0xd8c070, 0, 0.16, 0)); break;
    case 'caneca': g.add(cilindro(0.06, 0.12, 0xf2f2f2, 0, 0.06, 0)); break;
    case 'celular': g.add(bloco(0.08, 0.012, 0.15, 0x111111, 0, 0.006, 0)); g.add(bloco(0.07, 0.002, 0.13, 0x3a6aa0, 0, 0.013, 0)); break;
    case 'peruca_nicolas': g.add(bloco(0.28, 0.12, 0.28, 0xd9b85c, 0, 0.06, 0)); g.add(bloco(0.22, 0.08, 0.1, 0xd9b85c, 0, 0.05, 0.16)); break;
    case 'leite_condensado': g.add(cilindro(0.05, 0.1, 0x2f6fc0, 0, 0.05, 0)); g.add(cilindro(0.051, 0.03, 0xf0f0f0, 0, 0.06, 0)); break;
  }
  // Brilho discreto para dar para achar no escuro.
  const brilho = new THREE.PointLight(0xfff0c0, 0.6, 1.6, 2);
  brilho.position.y = 0.3;
  g.add(brilho);
  return g;
}
