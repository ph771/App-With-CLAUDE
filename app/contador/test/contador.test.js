// Testes da lógica de contagem. Rodar: node --test test/
// Vídeos reais (opcional): VIDEOS="a.mp4,b.mp4" node --test test/
// Cada vídeo de teste deve ter exatamente 1 certa e 1 errada.
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

function rodar(quadros) {
  const c = criarContador();
  const eventos = [];
  quadros.forEach((img, i) => eventos.push(...c.processar(img, W, H, i * PASSO)));
  return resumir(eventos);
}
const repetir = (img, n) => Array.from({ length: n }, () => img);
const SUP = { x: 0.72, y: 0.78, w: 0.28, h: 0.18 };

test('cena parada não conta nada', () => {
  assert.deepStrictEqual(rodar(repetir(fundo(), 50)), { certas: 0, erradas: 0, total: 0 });
});

test('câmera clareando e escurecendo sozinha não conta', () => {
  const quadros = [];
  for (let i = 0; i < 80; i++) quadros.push(fundo(Math.round(20 * Math.sin(i / 8))));
  assert.deepStrictEqual(rodar(quadros), { certas: 0, erradas: 0, total: 0 });
});

test('canga nova pendurada e parada no suporte conta 1 certa', () => {
  const antes = fundo(), depois = listras(antes, SUP);
  const quadros = [...repetir(antes, 15), pintar(antes, SUP, 10), pintar(antes, SUP, 200), ...repetir(depois, 20)];
  assert.deepStrictEqual(rodar(quadros), { certas: 1, erradas: 0, total: 1 });
});

test('pessoa parada na frente do suporte e depois saindo não conta', () => {
  const base = fundo(), pessoa = pintar(base, { x: 0.72, y: 0.7, w: 0.2, h: 0.3 }, 20);
  const quadros = [...repetir(base, 15), ...repetir(pessoa, 20), ...repetir(base, 20)];
  assert.deepStrictEqual(rodar(quadros), { certas: 0, erradas: 0, total: 0 });
});

test('tecido grande atravessando a saída conta 1 errada', () => {
  const base = fundo();
  const pano = (y) => pintar(base, { x: 0, y, w: 0.1, h: 0.3 }, 250);
  const quadros = [...repetir(base, 10), pano(0.15), pano(0.0), base, ...repetir(base, 10)];
  assert.deepStrictEqual(rodar(quadros), { certas: 0, erradas: 1, total: 1 });
});

test('mesma errada balançando por 2 segundos conta só 1', () => {
  const base = fundo(), pano = pintar(base, { x: 0, y: 0, w: 0.1, h: 0.45 }, 250);
  const quadros = [...repetir(base, 10)];
  for (let i = 0; i < 20; i++) quadros.push(i % 2 ? pano : base);
  quadros.push(...repetir(base, 10));
  assert.strictEqual(rodar(quadros).erradas, 1);
});

test('retalho pequeno passando pela saída não conta', () => {
  const base = fundo(), retalho = pintar(base, { x: 0.02, y: 0.1, w: 0.04, h: 0.08 }, 250);
  const quadros = [...repetir(base, 10), retalho, retalho, retalho, base, ...repetir(base, 10)];
  assert.strictEqual(rodar(quadros).total, 0);
});

test('cortadeira se mexendo na área ignorada não conta', () => {
  const base = fundo(), maq = pintar(base, { x: 0.0, y: 0.5, w: 0.3, h: 0.5 }, 30);
  const quadros = [...repetir(base, 10)];
  for (let i = 0; i < 20; i++) quadros.push(i % 2 ? maq : base);
  assert.strictEqual(rodar(quadros).total, 0);
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
  assert.deepStrictEqual(rodar(quadros), { certas: 0, erradas: 0, total: 0 });
});

for (const video of (process.env.VIDEOS || '').split(',').filter(Boolean)) {
  test(`vídeo real ${video}: 1 certa e 1 errada`, async () => {
    assert.deepStrictEqual(resumir(await rodarVideo(video)), { certas: 1, erradas: 1, total: 2 });
  });
}
