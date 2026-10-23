// Física 2D (planta vista de cima): colisão do jogador e linha de visão.

function sobrepoe(p, r, w) {
  return p.x + r > w.minX && p.x - r < w.maxX && p.z + r > w.minZ && p.z - r < w.maxZ;
}

// Move em subpassos, eixo por eixo, para deslizar pelas paredes sem atravessá-las.
export function moverComColisao(pos, delta, paredes, raio = 0.3) {
  const passos = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / (raio / 2)));
  let p = { x: pos.x, z: pos.z };
  for (let i = 0; i < passos; i++) {
    p.x += delta.x / passos;
    for (const w of paredes) {
      if (!sobrepoe(p, raio, w)) continue;
      p.x = delta.x > 0 ? w.minX - raio : w.maxX + raio;
    }
    p.z += delta.z / passos;
    for (const w of paredes) {
      if (!sobrepoe(p, raio, w)) continue;
      p.z = delta.z > 0 ? w.minZ - raio : w.maxZ + raio;
    }
  }
  return p;
}

// O segmento a→b cruza a caixa? (teste de "slabs")
function cruza(a, b, w) {
  let t0 = 0, t1 = 1;
  for (const [o, d, min, max] of [[a.x, b.x - a.x, w.minX, w.maxX], [a.z, b.z - a.z, w.minZ, w.maxZ]]) {
    if (Math.abs(d) < 1e-12) { if (o <= min || o >= max) return false; continue; }
    let ta = (min - o) / d, tb = (max - o) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 >= t1) return false;
  }
  return true;
}

export function temVisao(a, b, paredes) {
  return !paredes.some((w) => cruza(a, b, w));
}
