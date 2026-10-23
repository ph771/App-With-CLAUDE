// Matemática dos controles de toque (sem DOM, testável).
const ZONA_MORTA = 0.12;
const PITCH_MAX = Math.PI / 2 - 0.05;

// Deslocamento do dedo (px) → { lado, frente } entre -1 e 1. Arrastar para cima = frente.
export function vetorJoystick(dx, dy, raio) {
  let lado = dx / raio, frente = -dy / raio;
  const n = Math.hypot(lado, frente);
  if (n < ZONA_MORTA) return { lado: 0, frente: 0 };
  if (n > 1) { lado /= n; frente /= n; }
  return { lado: lado + 0, frente: frente + 0 };
}

// Arrastar o dedo gira a câmera. Arrastar para a direita = olhar para a direita.
export function girarOlhar({ yaw, pitch }, dx, dy, sensibilidade) {
  return {
    yaw: yaw - dx * sensibilidade,
    pitch: Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch - dy * sensibilidade)),
  };
}
