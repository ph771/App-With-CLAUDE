// Página do computador: recebe a câmera do iPhone e mostra em tela cheia para o OBS.
import { codigoValido, gerarCodigo, idDoReceptor, opcoesDoSinal, enderecoDoObs, enderecoDoCelular } from '../js/conexao.js';

const $ = (s) => document.querySelector(s);
const video = $('#video');
const painel = $('#painel');
const endereco = new URL(location.href);
const opcoes = opcoesDoSinal(endereco);
const CHAVE = 'teleprompter:codigo-obs';

const doEndereco = endereco.searchParams.get('codigo');
const fixo = codigoValido(doEndereco); // código no endereço do OBS: nunca muda
let codigo = fixo ? doEndereco : lerCodigo() || gerarCodigo();
guardarCodigo(codigo);

let peer = null;
let chamada = null;
let espera = null;

function lerCodigo() {
  try { const c = localStorage.getItem(CHAVE); return codigoValido(c) ? c : null; } catch { return null; }
}
function guardarCodigo(c) {
  try { localStorage.setItem(CHAVE, c); } catch { /* sem memória: o código do endereço resolve */ }
}

function estado(texto) { $('#estado').textContent = texto; }

function mostrarPainel() {
  video.srcObject = null;
  $('#ativar-som').hidden = true;
  $('#codigo').textContent = codigo;
  $('#endereco-obs').textContent = enderecoDoObs(endereco, codigo);
  desenharQr(enderecoDoCelular(endereco, codigo));
  painel.hidden = false;
}

function desenharQr(texto) {
  const alvo = $('#qr');
  if (typeof window.qrcode !== 'function') { alvo.textContent = ''; return; }
  const qr = window.qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  alvo.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
}

async function mostrarVideo(stream) {
  painel.hidden = true;
  video.srcObject = stream;
  video.muted = false;
  try {
    await video.play();
    $('#ativar-som').hidden = true;
  } catch {
    // Navegador comum bloqueia som sem um clique. No OBS isso não acontece.
    video.muted = true;
    video.play().catch(() => {});
    $('#ativar-som').hidden = false;
  }
}

function ligar() {
  clearTimeout(espera);
  if (typeof window.Peer !== 'function') { espera = setTimeout(ligar, 300); return; }
  if (peer) { try { peer.destroy(); } catch { /* ignora */ } }
  const p = new window.Peer(idDoReceptor(codigo), { ...opcoes, debug: 0 });
  peer = p;
  estado('Ligando…');
  p.on('open', () => {
    if (p !== peer) return;
    estado('Esperando o iPhone conectar…');
    if (!chamada) mostrarPainel();
  });
  p.on('call', (nova) => {
    if (p !== peer) return;
    const antiga = chamada;
    chamada = nova;
    try { if (antiga) antiga.close(); } catch { /* ignora */ }
    nova.answer();
    nova.on('stream', (s) => { if (nova === chamada) mostrarVideo(s); });
    const acabou = () => {
      if (nova !== chamada) return;
      chamada = null;
      estado('O iPhone desconectou. Esperando de novo…');
      mostrarPainel();
    };
    nova.on('close', acabou);
    nova.on('error', acabou);
    const pc = nova.peerConnection;
    if (pc) pc.addEventListener('connectionstatechange', () => {
      if (['failed', 'closed'].includes(pc.connectionState)) acabou();
    });
  });
  p.on('error', (e) => {
    if (p !== peer) return;
    if (e && e.type === 'unavailable-id') {
      if (fixo) {
        // Normalmente é esta mesma página acabando de recarregar: o nome volta a ficar livre em segundos.
        estado('Este código ainda está em uso. Tentando de novo…');
      } else {
        codigo = gerarCodigo();
        guardarCodigo(codigo);
      }
      espera = setTimeout(ligar, fixo ? 3000 : 200);
      return;
    }
    if (e && e.type === 'peer-unavailable') return;
    estado('Sem conexão com a internet. Tentando de novo…');
    espera = setTimeout(ligar, 3000);
  });
  p.on('disconnected', () => {
    if (p !== peer) return;
    try { p.reconnect(); } catch { espera = setTimeout(ligar, 3000); }
  });
}

$('#copiar').addEventListener('click', async () => {
  const texto = $('#endereco-obs').textContent;
  try {
    await navigator.clipboard.writeText(texto);
    $('#copiar').textContent = 'Copiado';
  } catch {
    const r = document.createRange();
    r.selectNodeContents($('#endereco-obs'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  setTimeout(() => { $('#copiar').textContent = 'Copiar'; }, 2000);
});

$('#ativar-som').addEventListener('click', () => {
  video.muted = false;
  video.play().catch(() => {});
  $('#ativar-som').hidden = true;
});

window.addEventListener('pagehide', () => { try { if (peer) peer.destroy(); } catch { /* ignora */ } });

mostrarPainel();
ligar();
