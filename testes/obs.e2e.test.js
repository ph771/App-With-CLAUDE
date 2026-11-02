// Teste ponta a ponta da transmissão: um "iPhone" e um "computador com OBS" no mesmo Chromium,
// conversando por um servidor de conexão local (no lugar do serviço público).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { iniciarServidor } from './servidor.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PeerServer } = require('peer');

let servidor;
let navegador;
let sinal;
let servidorSinal;

before(async () => {
  servidor = await iniciarServidor();
  servidorSinal = await new Promise((resolve) => {
    const s = PeerServer({ port: 0, host: '127.0.0.1', path: '/' }, (http) => resolve(http));
  });
  sinal = 'localhost:' + servidorSinal.address().port;
  navegador = await chromium.launch({
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
});

after(async () => {
  await navegador?.close();
  await servidor?.fechar();
  // O servidor de conexão mantém conexões abertas; fecha sem esperar por elas.
  servidorSinal?.close();
  servidorSinal?.closeAllConnections?.();
  servidorSinal?.unref();
});

async function abrir(caminho, { largura = 390, altura = 844 } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: altura },
    permissions: ['camera', 'microphone'],
    serviceWorkers: 'block',
  });
  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(servidor.url + caminho);
  return { pagina, contexto, erros };
}

async function imagemChegando(obs) {
  await obs.waitForFunction(() => {
    const v = document.querySelector('#video');
    return v && v.videoWidth > 0 && !v.paused && v.currentTime > 0.3;
  }, null, { timeout: 20000 });
  return obs.evaluate(() => {
    const s = document.querySelector('#video').srcObject;
    return { video: s.getVideoTracks().length, audio: s.getAudioTracks().length };
  });
}

test('a página do OBS cria um código de 4 dígitos e lembra dele', async () => {
  const { pagina, contexto, erros } = await abrir(`obs/?sinal=${sinal}`, { largura: 1280, altura: 720 });
  await pagina.waitForSelector('#painel:not([hidden])');
  const codigo = (await pagina.textContent('#codigo')).trim();
  assert.match(codigo, /^\d{4}$/);
  assert.match(await pagina.textContent('#endereco-obs'), new RegExp(`/obs/\\?codigo=${codigo}(&|$)`));
  assert.ok(await pagina.$('#qr svg, #qr img'), 'falta o QR code');
  await pagina.reload();
  await pagina.waitForSelector('#painel:not([hidden])');
  assert.equal((await pagina.textContent('#codigo')).trim(), codigo);
  assert.deepEqual(erros, []);
  await contexto.close();
});

test('o iPhone transmite câmera e som para o OBS, e o teleprompter funciona', async () => {
  const obs = await abrir(`obs/?codigo=4821&sinal=${sinal}`, { largura: 1280, altura: 720 });
  await obs.pagina.waitForSelector('#painel:not([hidden])');
  assert.equal((await obs.pagina.textContent('#codigo')).trim(), '4821');

  // O QR code abre o app já no modo transmitir, com o código.
  const cel = await abrir(`?conectar=4821&sinal=${sinal}`);
  assert.equal(await cel.pagina.getAttribute('#modo-transmitir', 'aria-pressed'), 'true');
  assert.equal(await cel.pagina.inputValue('#codigo-obs'), '4821');
  assert.ok(!cel.pagina.url().includes('conectar='), 'o código deve sair do endereço');

  await cel.pagina.click('#abrir');
  await cel.pagina.waitForSelector('#status-obs.ao-vivo', { timeout: 20000 });
  const trilhas = await imagemChegando(obs.pagina);
  assert.deepEqual(trilhas, { video: 1, audio: 1 });
  assert.ok(await obs.pagina.isHidden('#painel'), 'o painel com o código deve sumir quando a imagem chega');

  // O botão vermelho só controla o texto: contagem, rolagem e cronômetro. Não abre "Vídeo pronto".
  await cel.pagina.click('#gravar');
  await cel.pagina.waitForSelector('#cronometro:not([hidden])', { timeout: 6000 });
  await cel.pagina.waitForTimeout(1500);
  const desloc = await cel.pagina.$eval('#texto-rolando', (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
  assert.ok(desloc < -5, 'o texto deveria estar rolando');
  await cel.pagina.click('#gravar');
  await cel.pagina.waitForSelector('#cronometro', { state: 'hidden' });
  assert.ok(await cel.pagina.isHidden('#tela-pronto'));
  assert.ok(await cel.pagina.isVisible('#status-obs.ao-vivo'), 'parar o texto não desconecta do OBS');

  // Voltar ao texto desliga a transmissão.
  await cel.pagina.click('#voltar');
  await obs.pagina.waitForSelector('#painel:not([hidden])', { timeout: 15000 });

  assert.deepEqual(cel.erros, []);
  assert.deepEqual(obs.erros, []);
  await cel.contexto.close();
  await obs.contexto.close();
});

test('se o OBS abrir depois ou cair, o iPhone reconecta sozinho', async () => {
  const cel = await abrir(`?conectar=7316&sinal=${sinal}`);
  await cel.pagina.click('#abrir');
  await cel.pagina.waitForSelector('#status-obs.esperando', { timeout: 15000 });
  assert.match(await cel.pagina.textContent('#status-obs'), /OBS/);

  let obs = await abrir(`obs/?codigo=7316&sinal=${sinal}`, { largura: 1280, altura: 720 });
  await cel.pagina.waitForSelector('#status-obs.ao-vivo', { timeout: 25000 });
  await imagemChegando(obs.pagina);

  await obs.contexto.close(); // o computador fechou a página
  await cel.pagina.waitForSelector('#status-obs.esperando', { timeout: 20000 });

  obs = await abrir(`obs/?codigo=7316&sinal=${sinal}`, { largura: 1280, altura: 720 });
  await cel.pagina.waitForSelector('#status-obs.ao-vivo', { timeout: 25000 });
  await imagemChegando(obs.pagina);

  await cel.contexto.close();
  await obs.contexto.close();
});

test('código errado ou incompleto não deixa abrir a transmissão', async () => {
  const cel = await abrir(`?sinal=${sinal}`);
  await cel.pagina.click('#modo-transmitir');
  await cel.pagina.fill('#codigo-obs', '12');
  await cel.pagina.click('#abrir');
  assert.ok(await cel.pagina.isVisible('#tela-texto'));
  assert.match(await cel.pagina.textContent('#nota-codigo'), /4 números/);
  await cel.contexto.close();
});
