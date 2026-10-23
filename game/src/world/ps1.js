// Renderizador: ocupa a tela toda (sem faixas pretas), em até 1080 linhas.
// Qualidades: 'alta' (até 1080p), 'media' (até 720p), 'retro' (240 linhas ampliadas, estilo PS1).
import * as THREE from 'three';

const LINHAS = { alta: 1080, media: 720, retro: 240 };

export function criarRenderPS1(canvas, { aoMudarProporcao } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  let qualidade = 'alta';

  function redimensionar() {
    const w = innerWidth, h = innerHeight;
    const linhas = LINHAS[qualidade] ?? 1080;
    // Pixels de verdade por pixel de CSS, sem passar do limite de linhas.
    const razao = Math.min(devicePixelRatio || 1, linhas / h);
    renderer.setPixelRatio(razao);
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.imageRendering = qualidade === 'retro' ? 'pixelated' : 'auto';
    aoMudarProporcao?.(w / h);
  }
  addEventListener('resize', redimensionar);

  return {
    renderer,
    render: (scene, camera) => { renderer.setRenderTarget(null); renderer.render(scene, camera); },
    renderEm: (alvo, scene, camera) => { renderer.setRenderTarget(alvo); renderer.render(scene, camera); renderer.setRenderTarget(null); },
    redimensionar,
    definirQualidade(q) { qualidade = LINHAS[q] ? q : 'alta'; redimensionar(); },
    anisotropiaMaxima: () => renderer.capabilities.getMaxAnisotropy(),
  };
}
