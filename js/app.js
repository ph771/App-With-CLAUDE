// Liga as três telas: texto → câmera → vídeo pronto.
import {
  formatarTempo, nomeVelocidade, palavrasPorMinuto, pixelsPorSegundo, nomeArquivo, avisoDeGiro, ladoDaCamera,
  carregarPreferencias, salvarPreferencias,
} from './logica.js';
import { Prompter } from './prompter.js';
import { abrirCamera, fecharCamera, Gravador, ErroCamera, formatoDeGravacaoDisponivel } from './gravador.js';
import { Transmissor } from './transmissor.js';
import { codigoValido, opcoesDoSinal } from './conexao.js';

const $ = (s) => document.querySelector(s);
const celular = $('#celular');
const telas = { texto: $('#tela-texto'), camera: $('#tela-camera'), pronto: $('#tela-pronto') };
const roteiro = $('#roteiro');
const vel = $('#vel');
const tam = $('#tam');
const previa = $('#previa');
const botaoGravar = $('#gravar');
const videoPronto = $('#video-pronto');

function armazenamento() {
  try { return window.localStorage; } catch { return null; }
}

let prefs = carregarPreferencias(armazenamento());
function guardar() { salvarPreferencias(armazenamento(), prefs); }

// O QR code da página do OBS abre o app com ?conectar=1234: já entra no modo transmitir.
(() => {
  const u = new URL(location.href);
  const c = u.searchParams.get('conectar');
  if (c === null) return;
  if (codigoValido(c)) { prefs.modo = 'transmitir'; prefs.codigo = c; guardar(); }
  u.searchParams.delete('conectar');
  history.replaceState(null, '', u.pathname + u.search + u.hash);
})();
const transmitindo = () => prefs.modo === 'transmitir';

let telaAtual = 'texto';
let stream = null;
let gravador = null;
let gravando = false;
let contando = false;
let idContagem = null;
let idCronometro = null;
let inicioGravacao = 0;
let travaTela = null;
let arquivo = null;
let urlVideo = null;
let videoSalvo = true;
let pedidoCamera = 0;
let transmissor = null;

const prompter = new Prompter($('#prompter'), $('#texto-rolando'), {
  velocidade: (p) => pixelsPorSegundo(prefs.velocidade, p.alturaDoTexto(), p.palavras),
});
prompter.onMudou(atualizarBotaoPausar);

// ---------- telas ----------
function mostrar(nome) {
  telaAtual = nome;
  for (const [k, el] of Object.entries(telas)) el.hidden = k !== nome;
  atualizarOrientacao();
}

// ---------- ajustes ----------
const NOTAS_FORMATO = {
  vertical: 'Em pé, para Reels, TikTok, Stories e Shorts.',
  horizontal: 'Deitado, para YouTube, TV e computador. Você grava com o celular de lado.',
};
const NOTAS_POSICAO = {
  meio: 'No meio, seus olhos ficam longe da câmera. Quem assiste percebe que você está lendo.',
  topo: 'Perto da câmera, parece que você está olhando para quem assiste. Na horizontal, a câmera fica na lateral do celular, e o texto vai para esse lado.',
};
const DICAS_POSICAO = {
  meio: 'No meio, seus olhos ficam longe da câmera.',
  topo: 'Perto da câmera, parece que você olha para quem assiste.',
};
const DICA_GRAVAR = 'Só você aparece no vídeo. O texto fica só na sua tela.';
const DICA_TRANSMITIR = 'A imagem vai para o OBS sem o texto. O botão vermelho só começa o texto.';
const dicaPadrao = () => (transmitindo() ? DICA_TRANSMITIR : DICA_GRAVAR);
const rotuloComecar = () => (transmitindo() ? 'Começar o texto' : 'Começar a gravar');

function aplicarModo() {
  const t = transmitindo();
  document.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === prefs.modo)));
  $('#campo-codigo').hidden = !t;
  $('#codigo-obs').value = prefs.codigo;
  const nota = $('#nota-codigo');
  nota.hidden = !t;
  nota.classList.remove('erro');
  nota.textContent = 'No computador, abra ph771.github.io/App-With-CLAUDE/obs para ver o código.';
  $('#abrir').textContent = t ? 'Abrir câmera e conectar' : 'Abrir câmera';
  botaoGravar.setAttribute('aria-label', rotuloComecar());
  celular.classList.toggle('transmitindo', t);
}

function aplicarFormato() {
  document.querySelectorAll('[data-formato]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.formato === prefs.formato)));
  $('#nota-formato').textContent = NOTAS_FORMATO[prefs.formato];
  atualizarOrientacao();
}

function aplicarPosicao() {
  const p = prefs.posicao;
  document.querySelectorAll('[data-pos]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pos === p)));
  $('#prompter').classList.toggle('pos-meio', p === 'meio');
  $('#prompter').classList.toggle('pos-topo', p === 'topo');
  $('#trocar-pos').textContent = p === 'meio' ? 'Texto: no meio' : 'Texto: perto da câmera';
  $('#nota-pos').textContent = NOTAS_POSICAO[p];
  requestAnimationFrame(() => prompter.medir());
}

function aplicarEspaco() {
  document.querySelectorAll('[data-espaco]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.espaco === prefs.espaco)));
  ['pequeno', 'medio', 'grande'].forEach((e) => celular.classList.toggle('espaco-' + e, e === prefs.espaco));
  setTimeout(() => prompter.medir(), 450); // depois que a faixa termina de mudar de tamanho
}

function aplicarVelocidade() {
  vel.value = String(prefs.velocidade);
  const nome = nomeVelocidade(prefs.velocidade);
  $('#vel-out').textContent = nome + ' · ' + palavrasPorMinuto(prefs.velocidade) + ' palavras/min';
  $('#vel-cam').innerHTML = nome + '<br>' + prefs.velocidade + ' de 10';
}

function aplicarTamanho() {
  tam.value = String(prefs.tamanho);
  celular.style.setProperty('--cue-size', prefs.tamanho + 'px');
  $('#tam-out').textContent = prefs.tamanho < 28 ? 'Pequena' : prefs.tamanho < 38 ? 'Média' : 'Grande';
  prompter.medir();
}

let idDica = null;
function mostrarDica(texto) {
  if (telaAtual !== 'camera' || gravando || contando) return;
  $('#dica').textContent = texto;
  clearTimeout(idDica);
  idDica = setTimeout(() => { $('#dica').textContent = dicaPadrao(); }, 4000);
}

// ---------- orientação ----------
const mqMoldura = window.matchMedia('(min-width: 620px) and (min-height: 720px)');
const mqPaisagem = window.matchMedia('(orientation: landscape)');

function anguloDaTela() {
  if (typeof window.orientation === 'number') return window.orientation;
  return screen.orientation ? screen.orientation.angle : 0;
}

function atualizarOrientacao() {
  const horizontal = prefs.formato === 'horizontal';
  const emMoldura = mqMoldura.matches; // no computador não existe "girar o celular"
  const emPaisagem = mqPaisagem.matches;
  const deitado = emMoldura ? horizontal && telaAtual !== 'texto' : emPaisagem;
  celular.classList.toggle('deitado', deitado);
  celular.classList.toggle('camera-direita', deitado && !emMoldura && ladoDaCamera(anguloDaTela()) === 'direita');

  const aviso = emMoldura ? 'nenhum' : avisoDeGiro(prefs.formato, emPaisagem, gravando);
  $('#gire').hidden = !(telaAtual === 'camera' && aviso === 'bloqueio');
  $('#gire-titulo').textContent = horizontal ? 'Gire o celular para a horizontal' : 'Gire o celular para a vertical';
  $('#gire-sub').textContent = horizontal
    ? 'Você escolheu vídeo deitado, como no YouTube. Deixe a trava de rotação do iPhone desligada.'
    : 'Você escolheu vídeo em pé, como no Reels e no TikTok.';
  $('.gire-icone').classList.toggle('para-vertical', !horizontal);
  const faixa = $('#faixa-giro');
  faixa.hidden = !(telaAtual === 'camera' && aviso === 'faixa');
  faixa.textContent = horizontal ? 'Volte o celular para a horizontal' : 'Volte o celular para a vertical';
  requestAnimationFrame(() => prompter.medir());
}

// ---------- câmera ----------
const TEXTOS_ERRO = {
  negado: 'O app precisa da câmera e do microfone. No Safari, toque em “aA” na barra de endereço › Ajustes do Site › Câmera e Microfone › Permitir. Se instalou na Tela de Início, abra Ajustes do iPhone › Apps › Safari › Câmera e Microfone › Permitir.',
  'sem-camera': 'Não encontrei uma câmera neste aparelho.',
  ocupada: 'A câmera está sendo usada por outro app. Feche o outro app e toque em Tentar de novo.',
  inseguro: 'A câmera só funciona quando o app é aberto pelo endereço seguro (https://ph771.github.io/App-With-CLAUDE/).',
  'sem-suporte': 'Este navegador não consegue usar a câmera. Abra o app no Safari, com o iPhone atualizado.',
  'sem-gravacao': 'Este navegador não consegue gravar vídeo. Atualize o iPhone (iOS 14.3 ou mais novo) e abra no Safari.',
  outro: 'Algo deu errado ao ligar a câmera. Toque em Tentar de novo.',
};

function mostrarErro(codigo) {
  $('#erro-titulo').textContent = codigo === 'sem-gravacao' ? 'Não consigo gravar aqui' : 'Não consegui ligar a câmera';
  $('#erro-texto').textContent = TEXTOS_ERRO[codigo] || TEXTOS_ERRO.outro;
  $('#aviso-erro').hidden = false;
  $('#carregando').hidden = true;
  botaoGravar.disabled = true;
}

async function ligarCamera() {
  const meuPedido = ++pedidoCamera;
  $('#aviso-erro').hidden = true;
  $('#carregando').hidden = false;
  botaoGravar.disabled = true;
  desligarCamera();
  if (!transmitindo() && !formatoDeGravacaoDisponivel()) { mostrarErro('sem-gravacao'); return; }
  try {
    const s = await abrirCamera(prefs.formato);
    if (meuPedido !== pedidoCamera || telaAtual !== 'camera') { fecharCamera(s); return; }
    stream = s;
    stream.getVideoTracks().forEach((t) => t.addEventListener('ended', aoPerderCamera));
    previa.srcObject = stream;
    try { await previa.play(); } catch { /* o autoplay mudo costuma funcionar mesmo assim */ }
    $('#carregando').hidden = true;
    botaoGravar.disabled = false;
    manterTelaAcesa();
    if (transmitindo()) iniciarTransmissao();
  } catch (e) {
    if (meuPedido !== pedidoCamera) return;
    mostrarErro(e instanceof ErroCamera ? e.codigo : 'outro');
  }
}

// ---------- transmissão para o OBS ----------
const TEXTOS_STATUS = { conectando: 'Conectando…', esperando: 'Esperando o OBS', 'ao-vivo': 'Ao vivo', parado: '' };

function mostrarStatusObs(estado) {
  const el = $('#status-obs');
  el.className = 'status-obs ' + estado;
  el.textContent = TEXTOS_STATUS[estado] || '';
  el.hidden = estado === 'parado';
}

function iniciarTransmissao() {
  pararTransmissao();
  transmissor = new Transmissor({
    stream,
    codigo: prefs.codigo,
    opcoes: opcoesDoSinal(new URL(location.href)),
    aoMudar: mostrarStatusObs,
  });
  transmissor.iniciar();
}

function pararTransmissao() {
  if (transmissor) { transmissor.parar(); transmissor = null; }
  $('#status-obs').hidden = true;
}

function desligarCamera() {
  pararTransmissao();
  if (stream) {
    fecharCamera(stream);
    stream = null;
  }
  previa.srcObject = null;
}

function aoPerderCamera() {
  if (gravando) pararGravacao();
}

async function manterTelaAcesa() {
  if (!('wakeLock' in navigator) || travaTela) return;
  try {
    travaTela = await navigator.wakeLock.request('screen');
    travaTela.addEventListener('release', () => { travaTela = null; });
  } catch { travaTela = null; }
}

function soltarTela() {
  if (travaTela) { travaTela.release().catch(() => {}); travaTela = null; }
}

function abrirTelaCamera() {
  if (transmitindo()) {
    const c = $('#codigo-obs').value;
    if (!codigoValido(c)) {
      const nota = $('#nota-codigo');
      nota.textContent = 'Digite os 4 números que aparecem na página do OBS no computador.';
      nota.classList.add('erro');
      nota.hidden = false;
      $('#codigo-obs').focus();
      return;
    }
    prefs.codigo = c;
    guardar();
  }
  prompter.pausar();
  mostrar('camera');
  $('#dica').textContent = dicaPadrao();
  $('#dica').hidden = false;
  requestAnimationFrame(() => prompter.definirTexto(prefs.texto));
  ligarCamera();
}

function voltarAoTexto() {
  cancelarContagem();
  prompter.pausar();
  pedidoCamera++;
  desligarCamera();
  soltarTela();
  mostrar('texto');
}

// ---------- gravação ----------
function atualizarBotaoPausar() {
  $('#pausar').textContent = prompter.rolando ? 'Pausar texto' : prompter.noFim ? 'Do início' : 'Rolar texto';
}

function comecarContagem() {
  if (!stream || contando || gravando) return;
  contando = true;
  prompter.voltarAoInicio();
  prompter.travado = true;
  $('#voltar').disabled = true;
  $('#dica').hidden = true;
  const c = $('#contagem');
  let n = 3;
  const pulsar = () => { c.textContent = String(n); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); };
  c.hidden = false;
  pulsar();
  idContagem = setInterval(() => {
    n -= 1;
    if (n > 0) { pulsar(); return; }
    clearInterval(idContagem);
    idContagem = null;
    c.hidden = true;
    contando = false;
    prompter.travado = false;
    iniciarGravacao();
  }, 1000);
}

function cancelarContagem() {
  if (!contando) return;
  clearInterval(idContagem);
  idContagem = null;
  contando = false;
  prompter.travado = false;
  $('#contagem').hidden = true;
  $('#voltar').disabled = false;
  $('#dica').hidden = false;
}

function iniciarGravacao() {
  if (!stream) { $('#voltar').disabled = false; $('#dica').hidden = false; return; }
  if (!transmitindo()) {
    gravador = new Gravador(stream, formatoDeGravacaoDisponivel());
    try {
      gravador.iniciar();
    } catch (e) {
      gravador = null;
      $('#voltar').disabled = false;
      mostrarErro(e instanceof ErroCamera ? e.codigo : 'sem-gravacao');
      return;
    }
  }
  gravando = true;
  celular.classList.add('rodando');
  inicioGravacao = Date.now();
  $('#tempo').textContent = '00:00';
  $('#cronometro').hidden = false;
  botaoGravar.classList.add('on');
  botaoGravar.setAttribute('aria-label', transmitindo() ? 'Parar o texto' : 'Parar de gravar');
  idCronometro = setInterval(() => {
    $('#tempo').textContent = formatarTempo((Date.now() - inicioGravacao) / 1000);
  }, 250);
  prompter.iniciar();
  atualizarOrientacao();
}

async function pararGravacao() {
  if (!gravando) return;
  gravando = false;
  celular.classList.remove('rodando');
  const segundos = (Date.now() - inicioGravacao) / 1000;
  clearInterval(idCronometro);
  prompter.pausar();
  $('#cronometro').hidden = true;
  botaoGravar.classList.remove('on');
  botaoGravar.setAttribute('aria-label', rotuloComecar());
  $('#voltar').disabled = false;
  $('#dica').hidden = false;
  if (!gravador) { atualizarOrientacao(); return; } // transmitindo: só o texto parou, o OBS continua recebendo
  botaoGravar.disabled = true;
  let blob;
  try {
    blob = await gravador.parar();
  } catch {
    blob = null;
  }
  gravador = null;
  pedidoCamera++;
  desligarCamera();
  soltarTela();
  if (!blob || blob.size === 0) {
    mostrar('camera');
    mostrarErro('outro');
    return;
  }
  prepararResultado(blob, segundos);
  mostrar('pronto');
}

function prepararResultado(blob, segundos) {
  if (urlVideo) URL.revokeObjectURL(urlVideo);
  const tipo = (blob.type || 'video/mp4').split(';')[0];
  const extensao = tipo.includes('webm') ? 'webm' : 'mp4';
  arquivo = new File([blob], nomeArquivo(new Date(), extensao), { type: tipo });
  urlVideo = URL.createObjectURL(arquivo);
  videoPronto.src = urlVideo;
  $('#duracao').textContent = formatarTempo(Math.max(1, segundos));
  $('#aviso').hidden = true;
  videoSalvo = false;
}

// ---------- salvar ----------
function mostrarAviso(texto) {
  const a = $('#aviso');
  a.textContent = texto;
  a.hidden = false;
}

async function salvar() {
  if (!arquivo) return;
  const dados = { files: [arquivo] };
  if (navigator.canShare && navigator.share && navigator.canShare(dados)) {
    try {
      await navigator.share(dados);
      videoSalvo = true;
      mostrarAviso('Pronto! Se você tocou em “Salvar Vídeo”, ele já está no app Fotos.');
    } catch (e) {
      if (e && e.name === 'AbortError') mostrarAviso('Para guardar o vídeo, toque em Salvar nas Fotos e escolha “Salvar Vídeo”.');
      else baixar();
    }
    return;
  }
  baixar();
}

function baixar() {
  const a = document.createElement('a');
  a.href = urlVideo;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  videoSalvo = true;
  mostrarAviso('O vídeo foi baixado. No iPhone, ele fica no app Arquivos, na pasta Transferências.');
}

function podeDescartar() {
  if (videoSalvo) return true;
  return window.confirm('Você ainda não salvou este vídeo. Se continuar, ele será apagado. Continuar?');
}

// ---------- dica de instalar ----------
function mostrarDicaInstalar() {
  const ehIphone = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalado = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  let fechada = false;
  try { fechada = localStorage.getItem('teleprompter:dica-instalar') === 'fechada'; } catch { /* ignora */ }
  $('#dica-instalar').hidden = !(ehIphone && !instalado && !fechada);
}

// ---------- eventos ----------
roteiro.addEventListener('input', () => { prefs.texto = roteiro.value; guardar(); });
vel.addEventListener('input', () => { prefs.velocidade = Number(vel.value); aplicarVelocidade(); guardar(); });
tam.addEventListener('input', () => { prefs.tamanho = Number(tam.value); aplicarTamanho(); guardar(); });
document.querySelectorAll('[data-formato]').forEach((b) => b.addEventListener('click', () => {
  prefs.formato = b.dataset.formato; aplicarFormato(); guardar();
}));
document.querySelectorAll('[data-pos]').forEach((b) => b.addEventListener('click', () => {
  prefs.posicao = b.dataset.pos; aplicarPosicao(); guardar();
}));
document.querySelectorAll('[data-espaco]').forEach((b) => b.addEventListener('click', () => {
  prefs.espaco = b.dataset.espaco; aplicarEspaco(); guardar();
}));
$('#trocar-pos').addEventListener('click', () => {
  prefs.posicao = prefs.posicao === 'meio' ? 'topo' : 'meio';
  aplicarPosicao(); guardar(); mostrarDica(DICAS_POSICAO[prefs.posicao]);
});
$('#mais-devagar').addEventListener('click', () => { prefs.velocidade = Math.max(1, prefs.velocidade - 1); aplicarVelocidade(); guardar(); });
$('#mais-rapido').addEventListener('click', () => { prefs.velocidade = Math.min(10, prefs.velocidade + 1); aplicarVelocidade(); guardar(); });
$('#pausar').addEventListener('click', () => { if (!contando) prompter.alternar(); });

$('#abrir').addEventListener('click', abrirTelaCamera);
document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
  prefs.modo = b.dataset.modo; aplicarModo(); guardar();
}));
$('#codigo-obs').addEventListener('input', (e) => {
  const limpo = e.target.value.replace(/\D/g, '').slice(0, 4);
  if (limpo !== e.target.value) e.target.value = limpo;
  if (codigoValido(limpo)) { prefs.codigo = limpo; guardar(); $('#nota-codigo').classList.remove('erro'); }
});
$('#voltar').addEventListener('click', voltarAoTexto);
$('#erro-voltar').addEventListener('click', voltarAoTexto);
$('#tentar-de-novo').addEventListener('click', ligarCamera);
botaoGravar.addEventListener('click', () => {
  if (contando) return;
  if (gravando) pararGravacao();
  else comecarContagem();
});

$('#salvar').addEventListener('click', salvar);
$('#de-novo').addEventListener('click', () => { if (podeDescartar()) abrirTelaCamera(); });
$('#editar').addEventListener('click', () => { if (podeDescartar()) mostrar('texto'); });
$('#fechar-dica').addEventListener('click', () => {
  $('#dica-instalar').hidden = true;
  try { localStorage.setItem('teleprompter:dica-instalar', 'fechada'); } catch { /* ignora */ }
});

const aoGirar = () => atualizarOrientacao();
mqPaisagem.addEventListener('change', aoGirar);
mqMoldura.addEventListener('change', aoGirar);
window.addEventListener('orientationchange', () => setTimeout(aoGirar, 200));
window.addEventListener('resize', () => prompter.medir());

// Ligação, bloqueio de tela ou troca de app: o iPhone desliga a câmera.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (gravando) pararGravacao();
    else cancelarContagem();
    return;
  }
  if (telaAtual === 'camera') {
    const viva = stream && stream.getVideoTracks().some((t) => t.readyState === 'live');
    if (!viva && $('#aviso-erro').hidden) ligarCamera();
    else manterTelaAcesa();
  }
});

window.addEventListener('pagehide', () => { desligarCamera(); });

// ---------- início ----------
roteiro.value = prefs.texto;
aplicarModo();
aplicarFormato();
aplicarPosicao();
aplicarEspaco();
aplicarVelocidade();
aplicarTamanho();
mostrarDicaInstalar();
mostrar('texto');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* sem offline, o app funciona igual */ });
}
