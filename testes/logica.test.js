import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarTempo,
  nomeVelocidade,
  pixelsPorSegundo,
  escolherFormatoGravacao,
  restricoesCamera,
  nomeArquivo,
  avisoDeGiro,
  ladoDaCamera,
  PADROES,
  carregarPreferencias,
  salvarPreferencias,
} from '../js/logica.js';

test('formatarTempo mostra minutos e segundos', () => {
  assert.equal(formatarTempo(0), '00:00');
  assert.equal(formatarTempo(59), '00:59');
  assert.equal(formatarTempo(60), '01:00');
  assert.equal(formatarTempo(3605), '60:05');
  assert.equal(formatarTempo(4503), '75:03');
  assert.equal(formatarTempo(12.9), '00:12');
});

test('formatarTempo trata valores inválidos como zero', () => {
  assert.equal(formatarTempo(-5), '00:00');
  assert.equal(formatarTempo(NaN), '00:00');
  assert.equal(formatarTempo(undefined), '00:00');
});

test('nomeVelocidade agrupa 1-3, 4-6 e 7-10', () => {
  assert.equal(nomeVelocidade(1), 'Devagar');
  assert.equal(nomeVelocidade(3), 'Devagar');
  assert.equal(nomeVelocidade(4), 'Média');
  assert.equal(nomeVelocidade(6), 'Média');
  assert.equal(nomeVelocidade(7), 'Rápida');
  assert.equal(nomeVelocidade(10), 'Rápida');
});

test('pixelsPorSegundo cresce com a velocidade e acompanha o tamanho da letra', () => {
  assert.equal(pixelsPorSegundo(4, 32), 38);
  assert.equal(pixelsPorSegundo(1, 32), 17);
  assert.equal(pixelsPorSegundo(10, 32), 80);
  assert.equal(pixelsPorSegundo(4, 64), 76);
  assert.ok(pixelsPorSegundo(5, 32) > pixelsPorSegundo(4, 32));
});

test('escolherFormatoGravacao prefere MP4 (Safari do iPhone)', () => {
  const safari = (t) => t === 'video/mp4' || t.startsWith('video/mp4;codecs=avc1,');
  assert.deepEqual(escolherFormatoGravacao(safari), {
    mimeType: 'video/mp4;codecs=avc1,mp4a.40.2',
    extensao: 'mp4',
  });
  const soMp4 = (t) => t === 'video/mp4';
  assert.deepEqual(escolherFormatoGravacao(soMp4), { mimeType: 'video/mp4', extensao: 'mp4' });
});

test('escolherFormatoGravacao usa WebM quando não há MP4', () => {
  const chromium = (t) => t.startsWith('video/webm');
  assert.deepEqual(escolherFormatoGravacao(chromium), {
    mimeType: 'video/webm;codecs=vp9,opus',
    extensao: 'webm',
  });
});

test('escolherFormatoGravacao devolve null quando nada é suportado', () => {
  assert.equal(escolherFormatoGravacao(() => false), null);
  assert.equal(escolherFormatoGravacao(() => { throw new Error('x'); }), null);
});

test('restricoesCamera usa a câmera da frente, Full HD e som', () => {
  const v = restricoesCamera('vertical');
  assert.equal(v.video.facingMode, 'user');
  assert.deepEqual(v.video.width, { ideal: 1080 });
  assert.deepEqual(v.video.height, { ideal: 1920 });
  assert.deepEqual(v.video.frameRate, { ideal: 30 });
  assert.equal(v.audio.echoCancellation, true);
  assert.equal(v.audio.noiseSuppression, true);

  const h = restricoesCamera('horizontal');
  assert.deepEqual(h.video.width, { ideal: 1920 });
  assert.deepEqual(h.video.height, { ideal: 1080 });
});

test('nomeArquivo usa data e hora local', () => {
  const d = new Date(2026, 10, 2, 18, 5);
  assert.equal(nomeArquivo(d, 'mp4'), 'teleprompter-2026-11-02-1805.mp4');
  assert.equal(nomeArquivo(d, 'webm'), 'teleprompter-2026-11-02-1805.webm');
});

test('avisoDeGiro bloqueia antes de gravar e só avisa durante a gravação', () => {
  assert.equal(avisoDeGiro('vertical', false, false), 'nenhum');
  assert.equal(avisoDeGiro('horizontal', true, false), 'nenhum');
  assert.equal(avisoDeGiro('horizontal', false, false), 'bloqueio');
  assert.equal(avisoDeGiro('vertical', true, false), 'bloqueio');
  assert.equal(avisoDeGiro('horizontal', false, true), 'faixa');
  assert.equal(avisoDeGiro('vertical', true, true), 'faixa');
  assert.equal(avisoDeGiro('vertical', false, true), 'nenhum');
});

test('ladoDaCamera segue a rotação da tela', () => {
  assert.equal(ladoDaCamera(90), 'esquerda');
  assert.equal(ladoDaCamera(0), 'esquerda');
  assert.equal(ladoDaCamera(270), 'direita');
  assert.equal(ladoDaCamera(-90), 'direita');
  assert.equal(ladoDaCamera(undefined), 'esquerda');
});

function armazenamentoFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
  };
}

test('carregarPreferencias devolve os padrões quando não há nada salvo', () => {
  assert.deepEqual(carregarPreferencias(armazenamentoFalso()), PADROES);
  assert.equal(PADROES.formato, 'vertical');
  assert.equal(PADROES.posicao, 'meio');
  assert.equal(PADROES.velocidade, 4);
  assert.equal(PADROES.tamanho, 32);
  assert.ok(PADROES.texto.length > 0);
});

test('salvarPreferencias e carregarPreferencias guardam o texto e os ajustes', () => {
  const a = armazenamentoFalso();
  const prefs = { texto: 'Olá, mundo', formato: 'horizontal', posicao: 'topo', velocidade: 7, tamanho: 40 };
  salvarPreferencias(a, prefs);
  assert.deepEqual(carregarPreferencias(a), prefs);
});

test('carregarPreferencias guarda texto vazio (a pessoa apagou de propósito)', () => {
  const a = armazenamentoFalso();
  salvarPreferencias(a, { ...PADROES, texto: '' });
  assert.equal(carregarPreferencias(a).texto, '');
});

test('carregarPreferencias corrige valores fora da faixa', () => {
  const a = armazenamentoFalso({
    'teleprompter:prefs': JSON.stringify({ texto: 5, formato: 'diagonal', posicao: 'x', velocidade: 99, tamanho: 3 }),
  });
  assert.deepEqual(carregarPreferencias(a), PADROES);
});

test('carregarPreferencias aguenta JSON quebrado e armazenamento que dá erro', () => {
  assert.deepEqual(carregarPreferencias(armazenamentoFalso({ 'teleprompter:prefs': '{quebrado' })), PADROES);
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.deepEqual(carregarPreferencias(quebrado), PADROES);
  assert.doesNotThrow(() => salvarPreferencias(quebrado, PADROES));
  assert.deepEqual(carregarPreferencias(null), PADROES);
});
