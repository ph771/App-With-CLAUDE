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
// Quantas vezes o app chegou a dar +1, mesmo que desfizesse depois.
function vezesQueContou(quadros) {
  const c = criarContador();
  let n = 0;
  quadros.forEach((img, i) => { for (const e of c.processar(img, W, H, i * PASSO)) if (e.tipo === 'certa') n++; });
  return n;
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
  const quadros = [...repetir(antes, 25), pintar(antes, SUP, 10), pintar(antes, SUP, 200), ...repetir(depois, 20)];
  assert.strictEqual(rodar(quadros), 1);
});

test('suporte marcado em outro lugar: conta só ali', () => {
  const outro = { x: 0.05, y: 0.1, w: 0.25, h: 0.3 };
  const antes = fundo();
  const noOutro = [...repetir(antes, 25), pintar(antes, outro, 10), ...repetir(listras(antes, outro), 20)];
  const noPadrao = [...repetir(antes, 25), pintar(antes, SUP, 10), ...repetir(listras(antes, SUP), 20)];
  assert.strictEqual(rodar(noOutro, { suporte: outro }), 1);
  assert.strictEqual(rodar(noPadrao, { suporte: outro }), 0);
});

test('duas cangas penduradas uma depois da outra contam 2', () => {
  const a = fundo(), b = listras(a, SUP);
  const c = b.slice();
  for (let y = Math.round(SUP.y * H); y < Math.round((SUP.y + SUP.h) * H); y++)
    for (let x = Math.round(SUP.x * W); x < Math.round((SUP.x + SUP.w) * W); x++) c[y * W + x] = (y % 4 < 2) ? 220 : 50;
  const quadros = [...repetir(a, 25), pintar(a, SUP, 10), ...repetir(b, 20), pintar(b, SUP, 10), ...repetir(c, 20)];
  assert.strictEqual(rodar(quadros), 2);
});

test('pessoa parada na frente do suporte e depois saindo não conta', () => {
  const base = fundo(), pessoa = pintar(base, { x: 0.72, y: 0.7, w: 0.2, h: 0.3 }, 20);
  const quadros = [...repetir(base, 15), ...repetir(pessoa, 20), ...repetir(base, 20)];
  assert.strictEqual(vezesQueContou(quadros), 0);
});

// Mão/máquina/pessoa: entra por cima do suporte (atravessa o anel) e cobre parte dele.
const BRACO = { x: 0.78, y: 0.4, w: 0.12, h: 0.5 };

test('mão apoiada no suporte por 5 segundos e depois saindo não conta', () => {
  const base = fundo(), mao = pintar(base, BRACO, 25);
  const quadros = [...repetir(base, 20), ...repetir(mao, 50), ...repetir(base, 30)];
  assert.strictEqual(vezesQueContou(quadros), 0);
});

test('pessoa parada na frente do suporte por 40 segundos e saindo não conta', () => {
  const base = fundo(), pessoa = pintar(base, { x: 0.6, y: 0.3, w: 0.4, h: 0.7 }, 30);
  const quadros = [...repetir(base, 20), ...repetir(pessoa, 400), ...repetir(base, 30)];
  assert.strictEqual(vezesQueContou(quadros), 0);
});

test('máquina passando por cima do suporte, devagar, não conta', () => {
  const base = fundo();
  const quadros = [...repetir(base, 20)];
  for (let i = 0; i <= 30; i++) {
    const maq = pintar(base, { x: 0.55 + i * 0.015, y: 0.55, w: 0.2, h: 0.4 }, 60);
    quadros.push(maq, maq, maq, maq); // parada um pouco em cada posição
  }
  quadros.push(...repetir(base, 30));
  assert.strictEqual(vezesQueContou(quadros), 0);
});

test('peça pendurada com a mão ainda no suporte só conta depois que a mão sai', () => {
  const base = fundo(), peca = listras(base, SUP), pecaComMao = pintar(peca, BRACO, 25);
  const c = criarContador();
  const q = [...repetir(base, 20), ...repetir(pecaComMao, 40)];
  let t = 0, certas = 0;
  for (const img of q) for (const e of c.processar(img, W, H, (t++) * PASSO)) if (e.tipo === 'certa') certas++;
  assert.strictEqual(certas, 0, 'não pode contar com a mão ainda no suporte');
  assert.ok(c.leitura.obstruido, 'deve avisar que tem algo na frente');
  for (const img of repetir(peca, 30)) for (const e of c.processar(img, W, H, (t++) * PASSO)) if (e.tipo === 'certa') certas++;
  assert.strictEqual(certas, 1);
});

// Estampa "lisa" (formas grandes), como várias cangas iguais empilhadas.
function estampa(desceY, bordaY) {
  const img = fundo();
  const y0 = Math.round(SUP.y * H), y1 = Math.round((SUP.y + SUP.h) * H), x0 = Math.round(SUP.x * W), x1 = Math.round((SUP.x + SUP.w) * W);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const v = y < bordaY ? 128 + 70 * Math.sin(x / 7) * Math.cos((y - desceY) / 6) : 90;
    img[y * W + x] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return img;
}

test('canga igual pendurada em cima de outra igual conta 1', () => {
  const y1 = Math.round((SUP.y + SUP.h) * H);
  const pilha1 = estampa(0, y1 - 3), pilha2 = estampa(2, y1 - 1); // dobra 2 px abaixo, borda mais baixa
  const { semelhanca } = (() => { // confirma que o "desenho" quase não muda (o caso difícil)
    const r = [], q = [];
    for (let y = Math.round(SUP.y * H); y < y1; y++) for (let x = Math.round(SUP.x * W); x < Math.round((SUP.x + SUP.w) * W); x++) { r.push(pilha1[y * W + x]); q.push(pilha2[y * W + x]); }
    const m = (v) => v.reduce((a, b) => a + b) / v.length, ma = m(r), mb = m(q);
    let ab = 0, aa = 0, bb = 0; r.forEach((v, i) => { ab += (v - ma) * (q[i] - mb); aa += (v - ma) ** 2; bb += (q[i] - mb) ** 2; });
    return { semelhanca: ab / Math.sqrt(aa * bb) };
  })();
  assert.ok(semelhanca > 0.6, `caso de teste deveria ser parecido (semelhança ${semelhanca.toFixed(2)})`);
  const maoPassando = pintar(pilha1, BRACO, 25);
  const quadros = [...repetir(pilha1, 25), maoPassando, maoPassando, ...repetir(pilha2, 25)];
  assert.strictEqual(rodar(quadros), 1);
});

test('mão passando sobre pilha de cangas iguais, sem pendurar nada, não conta', () => {
  const y1 = Math.round((SUP.y + SUP.h) * H);
  const pilha = estampa(0, y1 - 3), mao = pintar(pilha, BRACO, 25);
  const quadros = [...repetir(pilha, 25), mao, mao, mao, ...repetir(pilha, 25)];
  assert.strictEqual(vezesQueContou(quadros), 0);
});

test('não trava se aprendeu a faixa com alguém parado nela', () => {
  // No começo alguém fica parado na faixa (sem cobrir o suporte); depois sai e pendura uma peça.
  const base = fundo(), aoLado = pintar(base, { x: 0.6, y: 0.5, w: 0.1, h: 0.5 }, 30);
  const peca = listras(base, SUP), maoNaPeca = pintar(peca, BRACO, 25);
  const quadros = [...repetir(aoLado, 30), ...repetir(base, 70), maoNaPeca, maoNaPeca, ...repetir(peca, 30)];
  assert.strictEqual(rodar(quadros), 1);
});

// Contra a luz: a câmera reajusta brilho e contraste sozinha (de forma não uniforme).
function exposicao(img, ganho, gama) {
  const out = new Uint8Array(img.length);
  for (let i = 0; i < img.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(255 * Math.pow(img[i] / 255, gama) * ganho)));
  return out;
}

test('contra a luz: câmera reajustando brilho e contraste sem nada mudar não conta', () => {
  const base = listras(fundo(), SUP), quadros = [];
  for (let i = 0; i < 300; i++) {
    const k = Math.sin(i / 6); // reajuste rápido, como quando alguém passa na frente da luz
    quadros.push(exposicao(base, 1 + 0.35 * k, 1 + 0.2 * Math.cos(i / 9)));
  }
  assert.strictEqual(vezesQueContou(quadros), 0);
});

test('contra a luz: pessoa passando perto (fora do suporte) escurecendo a imagem não conta', () => {
  const base = listras(fundo(), SUP), quadros = [...repetir(base, 25)];
  for (let i = 0; i < 30; i++) {
    const pessoa = pintar(base, { x: 0.25 + i * 0.01, y: 0.1, w: 0.3, h: 0.9 }, 20); // passa no meio da imagem
    quadros.push(exposicao(pessoa, 1.45, 0.85)); // a câmera clareia tudo por causa da pessoa escura
  }
  quadros.push(...repetir(base, 30));
  assert.strictEqual(vezesQueContou(quadros), 0);
});

test('contra a luz: peça pendurada enquanto a câmera muda a luz conta 1', () => {
  const y1 = Math.round((SUP.y + SUP.h) * H);
  const antes = estampa(0, y1 - 3), depois = estampa(2, y1 - 1), mao = pintar(antes, BRACO, 25);
  const quadros = [...repetir(antes, 25), exposicao(mao, 1.4, 0.9), exposicao(mao, 1.4, 0.9)];
  quadros.push(...repetir(exposicao(depois, 1.3, 0.9), 30)); // depois a imagem fica mais clara
  assert.strictEqual(rodar(quadros), 1);
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
