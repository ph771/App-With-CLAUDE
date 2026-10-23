// Texturas desenhadas em canvas. O desenho é feito em 64×64 e ampliado para 256×256,
// com uma camada de microdetalhe por cima (fica nítido em 1080p sem perder o estilo).
import * as THREE from 'three';

const RES = 256;
let anisotropia = 4;
export function definirAnisotropia(a) { anisotropia = a; }

function microdetalhe(g, semente) {
  let s = semente;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)';
    g.fillRect(Math.floor(rnd() * RES), Math.floor(rnd() * RES), 1 + Math.floor(rnd() * 2), 1);
  }
}

function canvasTextura(tam, desenhar, repetir = [1, 1], semente = 3) {
  const c = document.createElement('canvas');
  c.width = c.height = RES;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.save();
  g.scale(RES / tam, RES / tam);
  desenhar(g, tam);
  g.restore();
  microdetalhe(g, semente);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = anisotropia;
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
  // Pontos pequenos (a textura é ampliada 4x): mais pontos, menores.
  for (let i = 0; i < qtd * 3; i++) g.fillRect(rnd() * tam, rnd() * tam, 0.25 + rnd() * 0.6, 0.25 + rnd() * 0.6);
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
// Placa com texto. `aspecto` = largura ÷ altura da placa no mundo; o texto encolhe até caber.
export function placa(texto, { fundo = '#1d3d6b', cor = '#ffffff', aspecto = 4 } = {}) {
  const largura = 512, altura = Math.max(64, Math.round(largura / aspecto));
  const c = document.createElement('canvas');
  c.width = largura; c.height = altura;
  const g = c.getContext('2d');
  g.fillStyle = fundo; g.fillRect(0, 0, largura, altura);
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(3, altura * 0.05);
  g.strokeRect(g.lineWidth, g.lineWidth, largura - 2 * g.lineWidth, altura - 2 * g.lineWidth);
  let tamanho = Math.floor(altura * 0.58);
  g.font = `bold ${tamanho}px "Arial Narrow", Arial, sans-serif`;
  while (g.measureText(texto).width > largura * 0.88 && tamanho > 8) {
    tamanho -= 2;
    g.font = `bold ${tamanho}px "Arial Narrow", Arial, sans-serif`;
  }
  g.fillStyle = cor; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, largura / 2, altura / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = anisotropia;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function marmore() {
  return canvasTextura(64, (g, t) => {
    const grad = g.createLinearGradient(0, 0, t, t);
    grad.addColorStop(0, '#dcd6c8'); grad.addColorStop(1, '#cfc7b6');
    g.fillStyle = grad; g.fillRect(0, 0, t, t);
    // Veios suaves e curvos.
    let s = 17; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = `rgba(110,100,85,${0.18 + rnd() * 0.2})`; g.lineWidth = 0.4 + rnd() * 0.6;
      g.beginPath(); let x = rnd() * t, y = 0; g.moveTo(x, y);
      while (y < t) { const nx = x + (rnd() - 0.5) * 14, ny = y + 6 + rnd() * 8; g.quadraticCurveTo(x + (rnd() - 0.5) * 10, (y + ny) / 2, nx, ny); x = nx; y = ny; }
      g.stroke();
    }
    g.strokeStyle = 'rgba(40,30,20,0.55)'; g.lineWidth = 0.4; // rachadura
    g.beginPath(); g.moveTo(40, 10); g.lineTo(41, 22); g.lineTo(47, 28); g.lineTo(46, 38); g.stroke();
    g.fillStyle = 'rgba(120,112,98,0.6)'; g.fillRect(0, 0, t, 0.5); g.fillRect(0, 0, 0.5, t); // rejunte
  });
}

export function carpete(cor = '#4a1a1a') {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = cor; g.fillRect(0, 0, t, t);
    sujeira(g, t, 'rgba(0,0,0,0.25)', 300, 19);
    sujeira(g, t, 'rgba(255,255,255,0.05)', 200, 23);
  });
}

export function madeira() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#5b3a22'; g.fillRect(0, 0, t, t);
    g.fillStyle = 'rgba(30,15,5,0.45)';
    for (let x = 0; x < t; x += 16) g.fillRect(x, 0, 1, t);
    sujeira(g, t, 'rgba(90,60,35,0.6)', 120, 29);
  });
}

// Parede de repartição: bege em cima, lambri de madeira embaixo.
export function paredeOficial() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#b9ae92'; g.fillRect(0, 0, t, t);
    g.fillStyle = '#5b3a22'; g.fillRect(0, 40, t, 24);
    g.fillStyle = '#3a2312'; g.fillRect(0, 39, t, 2);
    for (let x = 0; x < t; x += 16) g.fillRect(x, 41, 1, 23);
    sujeira(g, t, 'rgba(80,70,50,0.3)', 70, 31);
  });
}

export function granito() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#6c665e'; g.fillRect(0, 0, t, t);
    sujeira(g, t, 'rgba(20,20,20,0.6)', 260, 37);
    sujeira(g, t, 'rgba(220,210,190,0.4)', 160, 41);
    g.fillStyle = '#4a4540'; g.fillRect(0, 0, t, 1); g.fillRect(0, 0, 1, t);
  });
}
