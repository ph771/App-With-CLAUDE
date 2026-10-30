// Testes da lógica de contagem. Rodar: node --test test/contador.test.js
// Vídeos reais (opcional, precisa de ffmpeg): VIDEOS="a.mp4,b.mp4" node --test test/contador.test.js
// Cada vídeo de teste deve ter exatamente 1 peça pendurada no suporte.
const test = require('node:test');
const assert = require('node:assert');
const { criarContador } = require('../counter.js');
const { rodarVideo, resumir } = require('./rodar-video.js');

const W = 160, H = 90, PASSO = 100;

// Cena falsa: fundo com textura, para o suporte ter "desenho".
function fundo(brilho = 0) {
  const img = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img[y * W + x] = Math.min(255, 80 + ((x * 7 + y * 13) % 60) + brilho);
  return img;
}
function pintar(img, area, valor) {
  const out = img.slice();
  for (let y = Math.round(area.y * H); y < Math.round((area.y + area.h) * H); y++)
    for (let x = Math.round(area.x * W); x < Math.round((area.x + area.w) * W); x++) out[y * W + x] = valor;
  return out;
}
// Listras, como uma canga nova pendurada.
function listras(img, area) {
  const out = img.slice();
  for (let y = Math.round(area.y * H); y < Math.round((area.y + area.h) * H); y++)
    for (let x = Math.round(area.x * W); x < Math.round((area.x + area.w) * W); x++) out[y * W + x] = (x % 6 < 3) ? 240 : 30;
  return out;
}

function rodar(quadros, opcoes) {
  const c = criarContador(opcoes);
  const eventos = [];
  quadros.forEach((img, i) => eventos.push(...c.processar(img, W, H, i * PASSO)));
  return resumir(eventos).certas;
}
const repetir = (img, n) => Array.from({ length: n }, () => img);
const SUP = { x: 0.72, y: 0.78, w: 0.28, h: 0.18 };

test('cena parada não conta nada', () => {
  assert.strictEqual(rodar(repetir(fundo(), 50)), 0);
});

test('câmera clareando e escurecendo sozinha não conta', () => {
  const quadros = [];
  for (let i = 0; i < 80; i++) quadros.push(fundo(Math.round(20 * Math.sin(i / 8))));
  assert.strictEqual(rodar(quadros), 0);
});

test('canga nova pendurada e parada no suporte conta 1', () => {
  const antes = fundo(), depois = listras(antes, SUP);
  const quadros = [...repetir(antes, 15), pintar(antes, SUP, 10), pintar(antes, SUP, 200), ...repetir(depois, 20)];
  assert.strictEqual(rodar(quadros), 1);
});

test('suporte marcado em outro lugar: conta só ali', () => {
  const outro = { x: 0.05, y: 0.1, w: 0.25, h: 0.3 };
  const antes = fundo();
  const noOutro = [...repetir(antes, 15), pintar(antes, outro, 10), ...repetir(listras(antes, outro), 20)];
  const noPadrao = [...repetir(antes, 15), pintar(antes, SUP, 10), ...repetir(listras(antes, SUP), 20)];
  assert.strictEqual(rodar(noOutro, { suporte: outro }), 1);
  assert.strictEqual(rodar(noPadrao, { suporte: outro }), 0);
});

test('duas cangas penduradas uma depois da outra contam 2', () => {
  const a = fundo(), b = listras(a, SUP);
  const c = b.slice();
  for (let y = Math.round(SUP.y * H); y < Math.round((SUP.y + SUP.h) * H); y++)
    for (let x = Math.round(SUP.x * W); x < Math.round((SUP.x + SUP.w) * W); x++) c[y * W + x] = (y % 4 < 2) ? 220 : 50;
  const quadros = [...repetir(a, 15), pintar(a, SUP, 10), ...repetir(b, 20), pintar(b, SUP, 10), ...repetir(c, 20)];
  assert.strictEqual(rodar(quadros), 2);
});

test('pessoa parada na frente do suporte e depois saindo não conta', () => {
  const base = fundo(), pessoa = pintar(base, { x: 0.72, y: 0.7, w: 0.2, h: 0.3 }, 20);
  const quadros = [...repetir(base, 15), ...repetir(pessoa, 20), ...repetir(base, 20)];
  assert.strictEqual(rodar(quadros), 0);
});

test('movimento fora do suporte (cortadeira, peça jogada) não conta', () => {
  const base = fundo(), maq = pintar(base, { x: 0.0, y: 0.0, w: 0.3, h: 1 }, 250);
  const quadros = [...repetir(base, 10)];
  for (let i = 0; i < 20; i++) quadros.push(i % 2 ? maq : base);
  quadros.push(...repetir(maq, 20));
  assert.strictEqual(rodar(quadros), 0);
});

test('celular sendo mexido e colocado em outra posição não conta', () => {
  // Fundo deslizando = câmera se mexendo; depois para numa posição nova.
  const deslocado = (dx) => {
    const img = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img[y * W + x] = 80 + (((x + dx) * 7 + y * 13) % 60) + (((x + dx) >> 3) % 2) * 60;
    return img;
  };
  const quadros = [...repetir(deslocado(0), 15)];
  for (let i = 1; i <= 20; i++) quadros.push(deslocado(i * 3));
  quadros.push(...repetir(deslocado(60), 40));
  assert.strictEqual(rodar(quadros), 0);
});

for (const video of (process.env.VIDEOS || '').split(',').filter(Boolean)) {
  test(`vídeo real ${video}: 1 peça no suporte`, async () => {
    assert.strictEqual(resumir(await rodarVideo(video)).certas, 1);
  });
}
