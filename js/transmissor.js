// Manda a câmera e o microfone do iPhone, ao vivo, para a página do OBS no computador.
// Só a imagem da câmera vai: o texto do teleprompter fica só na tela do celular.
// Usa o PeerJS (vendor/peerjs.min.js, carregado em index.html como window.Peer).
import { idDoReceptor } from './conexao.js';

const ESPERA_RECONEXAO = 2500;

export class Transmissor {
  // aoMudar(estado): 'conectando' | 'esperando' | 'ao-vivo' | 'parado'
  constructor({ stream, codigo, opcoes = {}, aoMudar = () => {} }) {
    this.stream = stream;
    this.codigo = codigo;
    this.opcoes = opcoes;
    this.aoMudar = aoMudar;
    this.estado = 'parado';
    this.ativo = false;
    this.peer = null;
    this.chamada = null;
    this._espera = null;
  }

  iniciar() {
    if (this.ativo) return;
    this.ativo = true;
    this._criarPeer();
  }

  parar() {
    this.ativo = false;
    clearTimeout(this._espera);
    const chamada = this.chamada;
    this.chamada = null;
    try { if (chamada) chamada.close(); } catch { /* já fechada */ }
    try { if (this.peer) this.peer.destroy(); } catch { /* já destruído */ }
    this.peer = null;
    this._mudar('parado');
  }

  _mudar(estado) {
    if (this.estado === estado) return;
    this.estado = estado;
    this.aoMudar(estado);
  }

  _criarPeer() {
    if (!this.ativo) return;
    if (typeof window.Peer !== 'function') { this._mudar('esperando'); this._depois(() => this._criarPeer()); return; }
    this._mudar('conectando');
    const peer = new window.Peer({ ...this.opcoes, debug: 0 });
    this.peer = peer;
    const meu = () => this.ativo && peer === this.peer;
    peer.on('open', () => { if (meu()) this._ligar(); });
    peer.on('error', (e) => {
      if (!meu()) return;
      this._mudar('esperando');
      if (e && e.type === 'peer-unavailable') {
        this._depois(() => this._ligar()); // a página do OBS ainda não está aberta
      } else {
        this._depois(() => this._recriarPeer()); // sem internet ou o serviço caiu
      }
    });
    peer.on('disconnected', () => {
      if (!meu()) return;
      try { peer.reconnect(); } catch { this._depois(() => this._recriarPeer()); }
    });
  }

  _recriarPeer() {
    if (!this.ativo) return;
    const antigo = this.peer;
    this.peer = null;
    try { if (antigo) antigo.destroy(); } catch { /* ignora */ }
    this._criarPeer();
  }

  _ligar() {
    if (!this.ativo) return;
    const peer = this.peer;
    if (!peer || peer.destroyed) { this._recriarPeer(); return; }
    if (peer.disconnected) { this._depois(() => this._ligar()); return; }
    const anterior = this.chamada;
    this.chamada = null;
    try { if (anterior) anterior.close(); } catch { /* ignora */ }

    const chamada = peer.call(idDoReceptor(this.codigo), this.stream);
    if (!chamada) { this._depois(() => this._ligar()); return; }
    this.chamada = chamada;
    const minha = () => this.ativo && chamada === this.chamada;
    const caiu = () => {
      if (!minha()) return;
      this._mudar('esperando');
      this._depois(() => this._ligar());
    };
    const pc = chamada.peerConnection;
    let idQueda = null;
    if (pc) {
      pc.addEventListener('connectionstatechange', () => {
        if (!minha()) return;
        const s = pc.connectionState;
        if (s === 'connected') {
          clearTimeout(idQueda);
          this._mudar('ao-vivo');
          limitarQualidade(pc);
        } else if (s === 'failed' || s === 'closed') {
          caiu();
        } else if (s === 'disconnected') {
          clearTimeout(idQueda);
          idQueda = setTimeout(() => { if (pc.connectionState !== 'connected') caiu(); }, 4000);
        }
      });
    }
    chamada.on('close', caiu);
    chamada.on('error', caiu);
  }

  _depois(fn) {
    clearTimeout(this._espera);
    this._espera = setTimeout(() => { if (this.ativo) fn(); }, ESPERA_RECONEXAO);
  }
}

// Boa qualidade sem travar o Wi-Fi: até 4 Mbps de vídeo.
function limitarQualidade(pc) {
  try {
    pc.getSenders().forEach((s) => {
      if (!s.track || s.track.kind !== 'video') return;
      const p = s.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.encodings[0].maxBitrate = 4_000_000;
      s.setParameters(p).catch(() => {});
    });
  } catch { /* navegador sem esse ajuste: segue no automático */ }
}
