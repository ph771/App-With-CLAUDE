// Render em 320×240 ampliado sem suavizar, com faixas pretas para manter 4:3.
import * as THREE from 'three';

export const LARGURA = 320, ALTURA = 240;

export function criarRenderPS1(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(LARGURA, ALTURA, false);
  canvas.style.imageRendering = 'pixelated';

  function redimensionar() {
    const escala = Math.min(innerWidth / LARGURA, innerHeight / ALTURA);
    canvas.style.width = `${Math.floor(LARGURA * escala)}px`;
    canvas.style.height = `${Math.floor(ALTURA * escala)}px`;
  }
  addEventListener('resize', redimensionar);
  redimensionar();

  return {
    renderer,
    render: (scene, camera) => { renderer.setRenderTarget(null); renderer.render(scene, camera); },
    renderEm: (alvo, scene, camera) => { renderer.setRenderTarget(alvo); renderer.render(scene, camera); renderer.setRenderTarget(null); },
    redimensionar,
  };
}
