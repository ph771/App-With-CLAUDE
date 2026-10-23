// Texturas desenhadas em canvas (64×64), sem filtro: visual PS1.
import * as THREE from 'three';

function canvasTextura(tam, desenhar, repetir = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const g = c.getContext('2d');
  desenhar(g, tam);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repetir);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Sujeira aleatória, mas sempre igual entre partidas.
function sujeira(g, tam, cor, qtd, semente = 7) {
  let s = semente;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = cor;
  for (let i = 0; i < qtd; i++) g.fillRect(rnd() * tam, rnd() * tam, 1 + rnd() * 2, 1 + rnd() * 2);
}

export function azulejo() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#c9d3c4'; g.fillRect(0, 0, t, t);
    g.fillStyle = '#8e9a8a';
    for (let i = 0; i <= t; i += 16) { g.fillRect(i, 0, 1, t); g.fillRect(0, i, t, 1); }
    sujeira(g, t, 'rgba(90,80,50,0.35)', 60);
  });
}

export function pisoXadrez() {
  return canvasTextura(64, (g, t) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#2b2b2b' : '#bdb8a8';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    sujeira(g, t, 'rgba(60,50,30,0.4)', 90, 3);
  });
}

export function teto() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#9a9a92'; g.fillRect(0, 0, t, t);
    g.fillStyle = '#6f6f68'; g.fillRect(0, 0, t, 1); g.fillRect(0, 0, 1, t);
    sujeira(g, t, 'rgba(100,80,40,0.5)', 30, 11);
  });
}

export function portaCabine() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#4d6b5c'; g.fillRect(0, 0, t, t);
    g.fillStyle = '#3c5548'; g.fillRect(2, 2, t - 4, 2); g.fillRect(2, t - 4, t - 4, 2);
    sujeira(g, t, 'rgba(20,20,20,0.5)', 40, 5);
    g.fillStyle = '#b8b0a0'; g.fillRect(48, 30, 6, 3); // trinco
  });
}

export function concreto() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#5c5a55'; g.fillRect(0, 0, t, t);
    sujeira(g, t, 'rgba(30,30,30,0.5)', 120, 13);
  });
}

// Placa de texto (ex.: "MASCULINO", "CABINE 01").
export function placa(texto, { fundo = '#1d3d6b', cor = '#ffffff', largura = 128, altura = 32 } = {}) {
  const c = document.createElement('canvas');
  c.width = largura; c.height = altura;
  const g = c.getContext('2d');
  g.fillStyle = fundo; g.fillRect(0, 0, largura, altura);
  g.fillStyle = cor; g.font = `bold ${Math.floor(altura * 0.55)}px monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, largura / 2, altura / 2 + 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
