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

export function marmore() {
  return canvasTextura(64, (g, t) => {
    g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, t, t);
    g.strokeStyle = 'rgba(120,110,95,0.55)'; g.lineWidth = 1;
    let s = 17; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(rnd() * t, 0); for (let y = 8; y <= t; y += 8) g.lineTo(rnd() * t, y); g.stroke(); }
    g.fillStyle = 'rgba(40,30,20,0.6)'; g.fillRect(40, 10, 1, 30); g.fillRect(41, 28, 8, 1); // rachadura
    g.fillStyle = '#a49c8a'; g.fillRect(0, 0, t, 1); g.fillRect(0, 0, 1, t);
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
