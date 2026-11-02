// Teste ponta a ponta: abre o app no Chromium com uma câmera falsa e usa como uma pessoa usaria.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { iniciarServidor } from './servidor.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

let servidor;
let navegador;

before(async () => {
  servidor = await iniciarServidor();
  navegador = await chromium.launch({
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

async function novaPagina({ largura = 390, altura = 844, antes } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: altura },
    permissions: ['camera', 'microphone'],
    serviceWorkers: 'block',
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  if (antes) await pagina.addInitScript(antes);
  await pagina.goto(servidor.url);
  return { pagina, contexto, erros };
}

// Registra quais trilhas o app pede à câmera e quais trilhas ele grava.
function espiarGravacao() {
  window.__trilhasCamera = [];
  window.__trilhasGravadas = [];
  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (r) => {
    const s = await getUserMedia(r);
    s.getTracks().forEach((t) => window.__trilhasCamera.push({ id: t.id, kind: t.kind, label: t.label }));
    return s;
  };
  const Original = window.MediaRecorder;
  window.MediaRecorder = class extends Original {
    constructor(stream, opcoes) {
      super(stream, opcoes);
      stream.getTracks().forEach((t) => window.__trilhasGravadas.push({ id: t.id, kind: t.kind, label: t.label }));
    }
  };
  window.MediaRecorder.isTypeSupported = Original.isTypeSupported.bind(Original);
}

async function gravarPorSegundos(pagina, segundos) {
  await pagina.click('#abrir');
  await pagina.waitForSelector('#gravar:not([disabled])', { timeout: 10000 });
  await pagina.click('#gravar');
  await pagina.waitForSelector('#cronometro:not([hidden])', { timeout: 6000 });
  await pagina.waitForTimeout(segundos * 1000);
  await pagina.click('#gravar');
  await pagina.waitForSelector('#tela-pronto:not([hidden])', { timeout: 10000 });
}

test('grava e mostra o vídeo pronto', async () => {
  const { pagina, contexto, erros } = await novaPagina();
  await pagina.fill('#roteiro', 'Teste de gravação do teleprompter.');
  await gravarPorSegundos(pagina, 3);

  const info = await pagina.evaluate(async () => {
    const v = document.querySelector('#video-pronto');
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    const blob = await fetch(v.src).then((r) => r.blob());
    return { largura: v.videoWidth, altura: v.videoHeight, bytes: blob.size, tipo: blob.type };
  });
  assert.ok(info.bytes > 10_000, `arquivo pequeno demais: ${info.bytes} bytes`);
  assert.ok(info.largura > 0 && info.altura > 0, 'o vídeo gravado não tem imagem');
  assert.match(info.tipo, /^video\/(mp4|webm)/);
  assert.match(await pagina.textContent('#duracao'), /^00:0[2-5]$/);
  assert.deepEqual(erros, []);
  await contexto.close();
});

test('o texto do teleprompter não entra na gravação', async () => {
  const { pagina, contexto } = await novaPagina({ antes: espiarGravacao });
  await gravarPorSegundos(pagina, 1);
  const { camera, gravadas } = await pagina.evaluate(() => ({ camera: window.__trilhasCamera, gravadas: window.__trilhasGravadas }));
  assert.ok(gravadas.length >= 1, 'nada foi gravado');
  const idsCamera = new Set(camera.map((t) => t.id));
  for (const t of gravadas) assert.ok(idsCamera.has(t.id), `trilha gravada não veio da câmera: ${t.kind} ${t.label}`);
  assert.equal(gravadas.filter((t) => t.kind === 'video').length, 1);
  assert.equal(gravadas.filter((t) => t.kind === 'audio').length, 1);
  await contexto.close();
});

test('câmera negada mostra como liberar', async () => {
  const { pagina, contexto } = await novaPagina({
    antes: () => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    },
  });
  await pagina.click('#abrir');
  await pagina.waitForSelector('#aviso-erro:not([hidden])', { timeout: 5000 });
  const texto = await pagina.textContent('#aviso-erro');
  assert.match(texto, /Ajustes/);
  assert.ok(await pagina.isVisible('#tentar-de-novo'));
  assert.ok(await pagina.isDisabled('#gravar'));
  await contexto.close();
});

test('texto e ajustes voltam ao reabrir o app', async () => {
  const { pagina, contexto } = await novaPagina();
  await pagina.fill('#roteiro', 'Meu roteiro salvo');
  await pagina.click('#fmt-horizontal');
  await pagina.click('#pos-topo');
  await pagina.$eval('#vel', (el) => { el.value = '8'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await pagina.reload();
  assert.equal(await pagina.inputValue('#roteiro'), 'Meu roteiro salvo');
  assert.equal(await pagina.getAttribute('#fmt-horizontal', 'aria-pressed'), 'true');
  assert.equal(await pagina.getAttribute('#pos-topo', 'aria-pressed'), 'true');
  assert.equal(await pagina.inputValue('#vel'), '8');
  await contexto.close();
});

test('vídeo horizontal com o celular em pé pede para girar', async () => {
  const { pagina, contexto } = await novaPagina();
  await pagina.click('#fmt-horizontal');
  await pagina.click('#abrir');
  await pagina.waitForSelector('#gire:not([hidden])', { timeout: 5000 });
  assert.match(await pagina.textContent('#gire'), /horizontal/);
  await pagina.setViewportSize({ width: 844, height: 390 });
  await pagina.waitForSelector('#gire', { state: 'hidden', timeout: 5000 });
  await pagina.waitForSelector('#gravar:not([disabled])', { timeout: 10000 });
  await contexto.close();
});

test('texto vazio ainda deixa gravar', async () => {
  const { pagina, contexto, erros } = await novaPagina();
  await pagina.fill('#roteiro', '');
  await gravarPorSegundos(pagina, 1);
  assert.deepEqual(erros, []);
  await contexto.close();
});

async function medirPalavrasPorMinuto(pagina, segundos) {
  await pagina.click('#pausar');
  await pagina.waitForTimeout(segundos * 1000);
  await pagina.click('#pausar');
  return pagina.evaluate((s) => {
    const el = document.querySelector('#texto-rolando');
    const desloc = -new DOMMatrixReadOnly(getComputedStyle(el).transform).m42;
    const cs = getComputedStyle(el);
    const altura = el.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const palavras = el.textContent.trim().split(/\s+/).length;
    return (desloc / (altura / palavras)) / s * 60;
  }, segundos);
}

test('o texto rola perto de 140 palavras por minuto, em pé e deitado', async () => {
  const { pagina, contexto } = await novaPagina();
  await pagina.click('#abrir');
  await pagina.waitForSelector('#gravar:not([disabled])');
  const emPe = await medirPalavrasPorMinuto(pagina, 3);
  assert.ok(emPe > 115 && emPe < 165, `em pé: ${emPe.toFixed(0)} palavras/min`);

  await pagina.click('#voltar');
  await pagina.click('#fmt-horizontal');
  await pagina.setViewportSize({ width: 844, height: 390 });
  await pagina.click('#abrir');
  await pagina.waitForSelector('#gravar:not([disabled])');
  const deitado = await medirPalavrasPorMinuto(pagina, 3);
  assert.ok(deitado > 115 && deitado < 165, `deitado: ${deitado.toFixed(0)} palavras/min`);
  await contexto.close();
});

test('tocar no texto durante a contagem não faz ele andar antes da hora', async () => {
  const { pagina, contexto } = await novaPagina();
  await pagina.click('#abrir');
  await pagina.waitForSelector('#gravar:not([disabled])');
  await pagina.click('#gravar');
  await pagina.waitForTimeout(800);
  await pagina.click('#prompter');
  await pagina.waitForTimeout(1200);
  const desloc = await pagina.$eval('#texto-rolando', (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
  assert.equal(Math.abs(desloc), 0);
  await contexto.close();
});

test('app é instalável: manifest e service worker', async () => {
  const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  const pagina = await contexto.newPage();
  await pagina.goto(servidor.url);
  const manifestoUrl = await pagina.getAttribute('link[rel="manifest"]', 'href');
  assert.ok(manifestoUrl, 'falta o link do manifest');
  const manifesto = await pagina.evaluate(async (u) => (await fetch(u)).json(), manifestoUrl);
  assert.equal(manifesto.display, 'standalone');
  assert.equal(manifesto.start_url, './');
  assert.ok(manifesto.icons.some((i) => i.sizes === '512x512'));
  assert.ok(await pagina.getAttribute('link[rel="apple-touch-icon"]', 'href'));
  const registrado = await pagina.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  assert.ok(registrado, 'service worker não ficou ativo');
  await contexto.close();
});
