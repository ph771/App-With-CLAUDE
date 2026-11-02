// Liga a câmera da frente e grava. O gravador recebe SÓ a imagem da câmera e o som do
// microfone; o texto do teleprompter é desenhado por cima na tela e nunca entra no vídeo.
import { restricoesCamera, escolherFormatoGravacao } from './logica.js';

export class ErroCamera extends Error {
  constructor(codigo, detalhe) {
    super(codigo + (detalhe ? ': ' + detalhe : ''));
    this.codigo = codigo; // negado | sem-camera | ocupada | inseguro | sem-suporte | sem-gravacao | outro
  }
}

export async function abrirCamera(formato) {
  if (!window.isSecureContext) throw new ErroCamera('inseguro');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new ErroCamera('sem-suporte');
  try {
    return await navigator.mediaDevices.getUserMedia(restricoesCamera(formato));
  } catch (e) {
    if (e && e.name === 'OverconstrainedError') {
      // A câmera não aceitou o tamanho pedido: tenta de novo com o básico.
      try {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      } catch (e2) {
        throw traduzirErro(e2);
      }
    }
    throw traduzirErro(e);
  }
}

function traduzirErro(e) {
  const nome = e && e.name;
  if (nome === 'NotAllowedError' || nome === 'SecurityError' || nome === 'PermissionDeniedError') return new ErroCamera('negado', nome);
  if (nome === 'NotFoundError' || nome === 'DevicesNotFoundError') return new ErroCamera('sem-camera', nome);
  if (nome === 'NotReadableError' || nome === 'TrackStartError' || nome === 'AbortError') return new ErroCamera('ocupada', nome);
  return new ErroCamera('outro', nome || String(e));
}

export function fecharCamera(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

export function formatoDeGravacaoDisponivel() {
  if (typeof window.MediaRecorder !== 'function') return null;
  const suporta = typeof MediaRecorder.isTypeSupported === 'function'
    ? (t) => MediaRecorder.isTypeSupported(t)
    : () => false;
  return escolherFormatoGravacao(suporta) || { mimeType: '', extensao: 'mp4' };
}

export class Gravador {
  constructor(stream, formato) {
    this.stream = stream;
    this.formato = formato; // { mimeType, extensao }
    this.pedacos = [];
    this.rec = null;
  }

  iniciar() {
    if (typeof window.MediaRecorder !== 'function') throw new ErroCamera('sem-gravacao');
    const opcoes = { videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 };
    if (this.formato.mimeType) opcoes.mimeType = this.formato.mimeType;
    try {
      this.rec = new MediaRecorder(this.stream, opcoes);
    } catch {
      try {
        this.rec = new MediaRecorder(this.stream);
      } catch (e) {
        throw new ErroCamera('sem-gravacao', e && e.name);
      }
    }
    this.pedacos = [];
    this.rec.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) this.pedacos.push(e.data);
    });
    // Entrega pedaços a cada segundo: se algo der errado, o que já foi gravado não se perde.
    this.rec.start(1000);
  }

  get gravando() {
    return !!this.rec && this.rec.state !== 'inactive';
  }

  // Para e devolve o vídeo inteiro.
  parar() {
    return new Promise((resolve, reject) => {
      const rec = this.rec;
      const tipo = () => ((rec && rec.mimeType) || this.formato.mimeType || 'video/mp4');
      const montar = () => resolve(new Blob(this.pedacos, { type: tipo() }));
      if (!rec || rec.state === 'inactive') { montar(); return; }
      rec.addEventListener('stop', montar, { once: true });
      rec.addEventListener('error', (e) => reject(e.error || e), { once: true });
      try { rec.requestData(); } catch { /* alguns navegadores não precisam */ }
      rec.stop();
    });
  }
}
