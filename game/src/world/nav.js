// Navegação do Fiscal: de sala em sala, pelo meio das portas; escadas são teleporte.
import { SALAS, PORTAS, ESCADAS } from './planta.js';

const SALAS_ABERTAS = SALAS.filter((s) => !s.fechada);
const dentro = (p, r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ;

export function regiaoDe(p) {
  for (const s of SALAS_ABERTAS) if (dentro(p, s)) return s.id;
  return null;
}

// Cada passagem: [salaA, salaB, pontoA, pontoB, teleporte?]
const PASSAGENS = [
  ...PORTAS.map((d) => {
    const horizontal = d.z !== undefined;
    const c = horizontal ? { x: (d.x1 + d.x2) / 2, z: d.z } : { x: d.x, z: (d.z1 + d.z2) / 2 };
    const pa = horizontal ? { x: c.x, z: c.z - 0.8 } : { x: c.x - 0.8, z: c.z };
    const pb = horizontal ? { x: c.x, z: c.z + 0.8 } : { x: c.x + 0.8, z: c.z };
    return [regiaoDe(pa), regiaoDe(pb), pa, pb, false];
  }),
  ...ESCADAS.map((e) => [regiaoDe(e.a), regiaoDe(e.b), e.a, e.b, true]),
].filter(([a, b]) => a && b);

function vizinhos(r) {
  return PASSAGENS.flatMap(([a, b, pa, pb, tp]) => (a === r ? [[b, pa, pb, tp]] : b === r ? [[a, pb, pa, tp]] : []));
}

function proximaPassagem(de, para) {
  const vindo = new Map([[de, null]]);
  const fila = [de];
  while (fila.length) {
    const r = fila.shift();
    if (r === para) break;
    for (const [v, pa, pb, tp] of vizinhos(r)) {
      if (vindo.has(v)) continue;
      vindo.set(v, { r, pa, pb, tp, para: v });
      fila.push(v);
    }
  }
  if (!vindo.has(para) || de === para) return null;
  let atual = para;
  while (vindo.get(atual).r !== de) atual = vindo.get(atual).r;
  return vindo.get(atual);
}

const proximaRegiao = (de, para) => proximaPassagem(de, para)?.para ?? null;

function progresso(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  return ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz);
}

function distSegmento(p, a, b) {
  const t = Math.max(0, Math.min(1, progresso(p, a, b)));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.z - (a.z + t * (b.z - a.z)));
}

// Para onde o Fiscal deve andar agora para chegar em `alvo`.
// Devolve { x, z } ou, na escada, { x, z, teleporte: true }.
export function proximoAlvo(p, alvo) {
  const para = regiaoDe(alvo);
  // Atravessando uma porta: termina de passar antes de mudar de direção.
  for (const [a, b, pa, pb, tp] of PASSAGENS) {
    if (tp || !para || distSegmento(p, pa, pb) >= 0.2) continue;
    const t = progresso(p, pa, pb); // 0 = lado de a, 1 = lado de b
    if (proximaRegiao(a, para) === b && t < 0.98) return pb;
    if (proximaRegiao(b, para) === a && t > 0.02) return pa;
  }
  const de = regiaoDe(p);
  if (!de || !para || de === para) return alvo;
  const passagem = proximaPassagem(de, para);
  if (!passagem) return alvo;
  if (passagem.tp) {
    return Math.hypot(p.x - passagem.pa.x, p.z - passagem.pa.z) < 0.3 ? { ...passagem.pb, teleporte: true } : passagem.pa;
  }
  return distSegmento(p, passagem.pa, passagem.pb) < 0.2 ? passagem.pb : passagem.pa;
}
