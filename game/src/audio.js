// Sons sintetizados com Web Audio (sem arquivos).
export function criarAudio() {
  let destino = null; // saída dos efeitos (troca para sons com volume menor)
  let ctx = null, mestre = null, efeitos = null, ambienteBus = null, zumbido = null, ambienteNos = null;
  const volumeAmbiente = 1;
  let volumes = { geral: 0.8, efeitos: 0.8, ambiente: 0.6 };
  const buffersVoz = new Map();
  let vozAtual = null, pedidoVoz = 0;
  // Baixa e decodifica um mp3 de voz uma vez só (null se o arquivo não existir).
  function carregarVoz(url) {
    if (!buffersVoz.has(url)) {
      buffersVoz.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => ctx.decodeAudioData(b)).catch(() => null));
    }
    return buffersVoz.get(url);
  }

  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new AudioContext();
    mestre = ctx.createGain();
    mestre.connect(ctx.destination);
    efeitos = ctx.createGain(); efeitos.connect(mestre);
    ambienteBus = ctx.createGain(); ambienteBus.connect(mestre);
    aplicarVolumes();
  }

  function aplicarVolumes() {
    if (!ctx) return;
    mestre.gain.value = 0.9 * volumes.geral;
    efeitos.gain.value = volumes.efeitos;
    ambienteBus.gain.value = volumes.ambiente;
  }

  function ruido(seg) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seg), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  function envelope(no, t0, ataque, duracao, pico) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(pico, t0 + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
    no.connect(g);
    g.connect(destino ?? efeitos);
    return g;
  }

  function tom(freq, tipo, t0, duracao, pico, freqFim) {
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0);
    if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, t0 + duracao);
    envelope(o, t0, 0.01, duracao, pico);
    o.start(t0); o.stop(t0 + duracao + 0.05);
  }

  function ruidoFiltrado(t0, duracao, freq, q, pico, tipo = 'bandpass') {
    const n = ruido(duracao + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = tipo; f.frequency.value = freq; f.Q.value = q;
    n.connect(f);
    envelope(f, t0, 0.005, duracao, pico);
    n.start(t0);
  }

  const SONS = {
    passo_molhado: (t) => { ruidoFiltrado(t, 0.18, 700, 2, 0.5); tom(90, 'sine', t, 0.12, 0.3, 50); },
    porta_bate: (t) => { tom(70, 'square', t, 0.35, 0.6, 35); ruidoFiltrado(t, 0.3, 300, 0.7, 0.8, 'lowpass'); },
    telefone: (t) => { for (let i = 0; i < 2; i++) { tom(440, 'square', t + i * 0.45, 0.35, 0.12); tom(480, 'square', t + i * 0.45, 0.35, 0.12); } },
    susto: (t) => {
      tom(1400, 'sawtooth', t, 1.1, 0.25, 300);
      tom(1480, 'sawtooth', t, 1.1, 0.2, 320);
      ruidoFiltrado(t, 0.9, 2500, 0.5, 0.5);
      tom(55, 'sine', t, 1.4, 0.7, 30);
    },
    acerto: (t) => { tom(660, 'triangle', t, 0.12, 0.25); tom(880, 'triangle', t + 0.1, 0.18, 0.25); },
    erro: (t) => { tom(140, 'sawtooth', t, 0.5, 0.4, 70); ruidoFiltrado(t, 0.4, 200, 1, 0.4); },
    descarga: (t) => { ruidoFiltrado(t, 2.2, 900, 0.4, 0.35); ruidoFiltrado(t + 0.3, 1.8, 400, 0.6, 0.3); },
    item: (t) => { tom(520, 'square', t, 0.08, 0.15); tom(780, 'square', t + 0.08, 0.12, 0.15); },
    batida: (t) => { for (let i = 0; i < 3; i++) { tom(110, 'sine', t + i * 0.35, 0.15, 0.8, 60); ruidoFiltrado(t + i * 0.35, 0.1, 400, 1, 0.5); } },
    entrada: (t) => { tom(988, 'sine', t, 0.4, 0.15); tom(784, 'sine', t + 0.25, 0.6, 0.15); },
    papel: (t) => ruidoFiltrado(t, 0.6, 3000, 0.6, 0.25),
    pano: (t) => { ruidoFiltrado(t, 0.5, 1200, 0.8, 0.25); ruidoFiltrado(t + 0.5, 0.5, 1000, 0.8, 0.25); },
    prancheta: (t) => { tom(2400, 'square', t, 0.02, 0.25); tom(1800, 'square', t + 0.05, 0.02, 0.2); },
    assobio: (t) => { [0, 0.28, 0.56, 0.9].forEach((d, i) => tom([988, 880, 784, 659][i], 'sine', t + d, 0.24, 0.12, [1047, 932, 830, 622][i])); },
    alarme: (t) => { tom(880, 'square', t, 0.25, 0.1, 660); tom(660, 'square', t + 0.3, 0.25, 0.1, 880); },
    fita: (t) => { ruidoFiltrado(t, 0.35, 2500, 1.2, 0.35); ruidoFiltrado(t + 0.12, 0.25, 1800, 1.2, 0.3); },
    rangido: (t) => { tom(180, 'sawtooth', t, 0.9, 0.12, 120); tom(240, 'sawtooth', t + 0.1, 0.7, 0.06, 160); },
    suspiro: (t) => { ruidoFiltrado(t, 0.8, 700, 0.8, 0.45); },
    interruptor: (t) => { ruidoFiltrado(t, 0.05, 4000, 1, 0.6); tom(60, 'square', t, 0.08, 0.3); },
  };

  return {
    iniciar,
    definirVolumes(v) { volumes = { ...volumes, ...v }; aplicarVolumes(); },
    // Fala dublada (mp3). Para a anterior; `url` vazio só cala.
    voz(url) {
      vozAtual?.stop(); vozAtual = null;
      if (!ctx || !url) return;
      const pedido = ++pedidoVoz;
      carregarVoz(url).then((buf) => {
        if (!buf || pedido !== pedidoVoz) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(mestre);
        src.start();
        vozAtual = src;
      });
    },
    // Voz que vem de longe (o Fiscal na caçada): devolve um controle para ajustar
    // o volume a cada quadro conforme a distância. `acabou` vira true no fim.
    vozDistante(url, volume = 1) {
      if (!ctx || !url) return null;
      const g = ctx.createGain();
      g.gain.value = volume;
      g.connect(mestre);
      const h = { acabou: false, src: null, volume(v) { g.gain.setTargetAtTime(Math.max(0, v), ctx.currentTime, 0.08); }, parar() { h.acabou = true; h.src?.stop(); } };
      carregarVoz(url).then((buf) => {
        if (!buf || h.acabou) { h.acabou = true; return; }
        h.src = ctx.createBufferSource();
        h.src.buffer = buf;
        h.src.connect(g);
        h.src.onended = () => { h.acabou = true; g.disconnect(); };
        h.src.start();
      });
      return h;
    },
    // `volume` (0 a 1): para sons à distância (pistas do Fiscal).
    tocar(id, volume = 1) {
      if (!ctx || !SONS[id]) return;
      const antes = destino;
      if (volume < 1) { destino = ctx.createGain(); destino.gain.value = Math.max(0, volume); destino.connect(efeitos); }
      SONS[id](ctx.currentTime + 0.01);
      destino = antes;
    },
    // Ambiente de terror: drone grave e baixo. `nivel` (0 a 1) = quão perto o Fiscal está.
    ambiente(ligado) {
      if (!ctx) return;
      if (ligado && !ambienteNos) {
        const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(ambienteBus);
        const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 180; filtro.connect(g);
        const oscs = [55, 58.3, 82.4].map((f, i) => {
          const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = i === 2 ? 0.25 : 0.6;
          o.connect(og); og.connect(filtro); o.start(); return o;
        });
        const n = ruido(4); n.loop = true;
        const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 0.6;
        const ng = ctx.createGain(); ng.gain.value = 0.08;
        n.connect(nf); nf.connect(ng); ng.connect(g); n.start();
        ambienteNos = { g, filtro, oscs, n, batida: 0 };
      } else if (!ligado && ambienteNos) {
        ambienteNos.oscs.forEach((o) => o.stop()); ambienteNos.n.stop(); ambienteNos = null;
      }
    },
    nivelAmbiente(nivel, dt = 0) {
      if (!ambienteNos) return;
      const t = ctx.currentTime;
      ambienteNos.g.gain.setTargetAtTime((0.05 + 0.13 * nivel) * volumeAmbiente, t, 0.4);
      ambienteNos.filtro.frequency.setTargetAtTime(160 + 500 * nivel, t, 0.4);
      // Coração acelera quando ele está muito perto.
      if (nivel > 0.55) {
        ambienteNos.batida -= dt;
        if (ambienteNos.batida <= 0) {
          tom(60, 'sine', t, 0.12, 0.35 * volumeAmbiente, 40); tom(55, 'sine', t + 0.16, 0.12, 0.25 * volumeAmbiente, 38);
          ambienteNos.batida = 1.1 - nivel * 0.6;
        }
      }
    },

    // Zumbido de lâmpada fluorescente, contínuo.
    zumbidoLuz(ligado) {
      if (!ctx) return;
      if (ligado && !zumbido) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
        const g = ctx.createGain(); g.gain.value = 0.025;
        o.connect(f); f.connect(g); g.connect(mestre); o.start();
        zumbido = { o, g };
      } else if (!ligado && zumbido) {
        zumbido.o.stop(); zumbido = null;
      }
    },
    volumeZumbido(v) { if (zumbido) zumbido.g.gain.value = 0.025 * v; },
  };
}
