// Controles de toque: analógico à esquerda, arrastar à direita para olhar, botão de ação e pausa.
import { vetorJoystick } from './toque-logica.js';

const RAIO = 56; // px do analógico

export function criarControlesToque(antesDe) {
  const camada = document.createElement('div');
  camada.id = 'toque';
  camada.innerHTML = `
    <div class="toque-olhar"></div>
    <div class="toque-joy"><div class="toque-joy-base"><div class="toque-joy-pino"></div></div></div>
    <button class="toque-acao" type="button" aria-label="Ação">E</button>
    <button class="toque-pausa" type="button" aria-label="Pausar">II</button>`;
  antesDe.before(camada);

  const joy = camada.querySelector('.toque-joy');
  const base = camada.querySelector('.toque-joy-base');
  const pino = camada.querySelector('.toque-joy-pino');
  const olhar = camada.querySelector('.toque-olhar');
  const botaoAcao = camada.querySelector('.toque-acao');
  const botaoPausa = camada.querySelector('.toque-pausa');

  let vetor = { lado: 0, frente: 0 };
  let dedoJoy = null, centro = null;
  let dedoOlhar = null, ultimo = null;
  let acumulado = { dx: 0, dy: 0 };

  // Analógico: nasce onde o dedo encosta (dentro da área da esquerda).
  joy.addEventListener('pointerdown', (e) => {
    if (dedoJoy !== null) return;
    dedoJoy = e.pointerId;
    try { joy.setPointerCapture(e.pointerId); } catch { /* alguns navegadores recusam */ }
    const r = joy.getBoundingClientRect();
    centro = { x: e.clientX, y: e.clientY };
    base.style.left = `${e.clientX - r.left}px`;
    base.style.top = `${e.clientY - r.top}px`;
    base.classList.add('ativo');
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dedoJoy) return;
    const dx = e.clientX - centro.x, dy = e.clientY - centro.y;
    vetor = vetorJoystick(dx, dy, RAIO);
    const d = Math.min(1, Math.hypot(dx, dy) / RAIO);
    const ang = Math.atan2(dy, dx);
    pino.style.transform = `translate(${Math.cos(ang) * d * RAIO}px, ${Math.sin(ang) * d * RAIO}px)`;
  });
  const soltarJoy = (e) => {
    if (e.pointerId !== dedoJoy) return;
    dedoJoy = null; vetor = { lado: 0, frente: 0 };
    pino.style.transform = '';
    base.classList.remove('ativo');
  };
  joy.addEventListener('pointerup', soltarJoy);
  joy.addEventListener('pointercancel', soltarJoy);

  // Olhar: arrastar na metade direita.
  olhar.addEventListener('pointerdown', (e) => {
    if (dedoOlhar !== null) return;
    dedoOlhar = e.pointerId;
    try { olhar.setPointerCapture(e.pointerId); } catch { /* idem */ }
    ultimo = { x: e.clientX, y: e.clientY };
  });
  olhar.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dedoOlhar) return;
    acumulado.dx += e.clientX - ultimo.x;
    acumulado.dy += e.clientY - ultimo.y;
    ultimo = { x: e.clientX, y: e.clientY };
  });
  const soltarOlhar = (e) => { if (e.pointerId === dedoOlhar) dedoOlhar = null; };
  olhar.addEventListener('pointerup', soltarOlhar);
  olhar.addEventListener('pointercancel', soltarOlhar);

  return {
    entrada: () => vetor,
    consumirOlhar() { const a = acumulado; acumulado = { dx: 0, dy: 0 }; return a; },
    // Ação: `aoApertar` ao encostar; `aoSoltar` ao tirar o dedo (tarefas de segurar).
    onAcao(aoApertar, aoSoltar) {
      botaoAcao.addEventListener('pointerdown', (e) => { e.preventDefault(); aoApertar(); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) botaoAcao.addEventListener(ev, () => aoSoltar?.());
    },
    onPausa(cb) { botaoPausa.addEventListener('click', cb); },
    rotuloAcao(texto) {
      botaoAcao.textContent = texto ?? 'E';
      botaoAcao.classList.toggle('com-texto', Boolean(texto));
    },
    mostrar(v) { camada.classList.toggle('oculto', !v); },
    zerar() { vetor = { lado: 0, frente: 0 }; acumulado = { dx: 0, dy: 0 }; dedoJoy = dedoOlhar = null; pino.style.transform = ''; },
  };
}
