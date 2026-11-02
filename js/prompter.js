// Faz o texto subir sozinho dentro da faixa do teleprompter.
// Toque rápido: pausa ou continua. Arrastar: volta ou avança o texto com o dedo.
import { contarPalavras } from './logica.js';

export class Prompter {
  constructor(faixa, texto, { velocidade }) {
    this.faixa = faixa;
    this.texto = texto;
    this.velocidade = velocidade; // função (prompter) => pixels por segundo
    this.palavras = 0;
    this.travado = false; // durante a contagem 3-2-1 o toque não mexe no texto
    this._margens = 0;
    this.offset = 0;
    this._rolando = false;
    this._ultimo = 0;
    this._ouvintes = [];
    this._passo = this._passo.bind(this);
    this._ligarToque();
  }

  definirTexto(t) {
    const vazio = !t.trim();
    this.texto.textContent = vazio ? 'Seu texto aparece aqui. Escreva na tela anterior.' : t;
    this.texto.classList.toggle('vazio', vazio);
    this.palavras = contarPalavras(this.texto.textContent);
    this.offset = 0;
    this.medir();
  }

  // Recalcula as margens depois de mudar o tamanho da faixa, da letra ou da tela.
  medir() {
    const h = this.faixa.clientHeight;
    if (!h) return;
    const cima = Math.round(h * 0.22);
    const baixo = Math.round(h * 0.78);
    this.texto.style.paddingTop = cima + 'px';
    this.texto.style.paddingBottom = baixo + 'px';
    this._margens = cima + baixo;
    this.offset = Math.min(this.offset, this.maximo());
    this._aplicar();
  }

  // Altura só das palavras, sem as margens de cima e de baixo.
  alturaDoTexto() {
    return Math.max(0, this.texto.offsetHeight - this._margens);
  }

  maximo() {
    return Math.max(0, this.texto.offsetHeight - this.faixa.clientHeight);
  }

  get rolando() { return this._rolando; }
  get noFim() { return this.offset > 0 && this.offset >= this.maximo(); }

  iniciar() {
    if (this._rolando) return;
    if (this.offset >= this.maximo()) this.offset = 0;
    this._rolando = true;
    this._ultimo = performance.now();
    requestAnimationFrame(this._passo);
    this._avisar();
  }

  pausar() {
    if (!this._rolando) return;
    this._rolando = false;
    this._avisar();
  }

  alternar() {
    if (this._rolando) this.pausar();
    else this.iniciar();
  }

  voltarAoInicio() {
    this._rolando = false;
    this.offset = 0;
    this._aplicar();
    this._avisar();
  }

  onMudou(cb) { this._ouvintes.push(cb); }

  _passo(t) {
    if (!this._rolando) return;
    const dt = Math.min(0.1, Math.max(0, (t - this._ultimo) / 1000));
    this._ultimo = t;
    this.offset += this.velocidade(this) * dt;
    const max = this.maximo();
    if (this.offset >= max) {
      this.offset = max;
      this._aplicar();
      this._rolando = false;
      this._avisar();
      return;
    }
    this._aplicar();
    requestAnimationFrame(this._passo);
  }

  _aplicar() {
    this.texto.style.transform = 'translateY(' + (-this.offset) + 'px)';
  }

  _avisar() { this._ouvintes.forEach((cb) => cb()); }

  _ligarToque() {
    let inicioY = 0, offsetInicial = 0, arrastou = false, ativo = false, rolavaAntes = false;
    this.faixa.addEventListener('pointerdown', (e) => {
      if (this.travado) return;
      ativo = true; arrastou = false;
      inicioY = e.clientY; offsetInicial = this.offset;
      rolavaAntes = this._rolando;
      try { this.faixa.setPointerCapture(e.pointerId); } catch { /* sem captura, segue igual */ }
    });
    this.faixa.addEventListener('pointermove', (e) => {
      if (!ativo) return;
      const dy = e.clientY - inicioY;
      if (!arrastou && Math.abs(dy) < 8) return;
      if (!arrastou) { arrastou = true; this._rolando = false; }
      this.offset = Math.min(this.maximo(), Math.max(0, offsetInicial - dy));
      this._aplicar();
    });
    const soltar = () => {
      if (!ativo) return;
      ativo = false;
      if (!arrastou) { this.alternar(); return; }
      if (rolavaAntes) { this._rolando = false; this.iniciar(); } else this._avisar();
    };
    this.faixa.addEventListener('pointerup', soltar);
    this.faixa.addEventListener('pointercancel', soltar);
  }
}
