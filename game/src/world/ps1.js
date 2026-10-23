// Render em baixa resolução (240 linhas) ampliado sem suavizar.
// Computador: 4:3 com faixas pretas. Celular (`preencher`): ocupa a tela toda, na proporção dela.
import * as THREE from 'three';

export const LARGURA = 320, ALTURA = 240;

export function criarRenderPS1(canvas, { preencher = false, aoMudarProporcao } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(LARGURA, ALTURA, false);
  canvas.style.imageRendering = 'pixelated';

  function redimensionar() {
    if (preencher) {
      const proporcao = Math.min(Math.max(innerWidth / innerHeight, 4 / 3), 21 / 9);
      renderer.setSize(Math.round(ALTURA * proporcao), ALTURA, false);
      aoMudarProporcao?.(proporcao);
      const escala = Math.min(innerWidth / (ALTURA * proporcao), innerHeight / ALTURA);
      canvas.style.width = `${Math.floor(ALTURA * proporcao * escala)}px`;
      canvas.style.height = `${Math.floor(ALTURA * escala)}px`;
      return;
    }
    const escala = Math.min(innerWidth / LARGURA, innerHeight / ALTURA);
    canvas.style.width = `${Math.floor(LARGURA * escala)}px`;
    canvas.style.height = `${Math.floor(ALTURA * escala)}px`;
  }
  addEventListener('resize', redimensionar);

  return {
    renderer,
    render: (scene, camera) => { renderer.setRenderTarget(null); renderer.render(scene, camera); },
    renderEm: (alvo, scene, camera) => { renderer.setRenderTarget(alvo); renderer.render(scene, camera); renderer.setRenderTarget(null); },
    redimensionar,
  };
}
