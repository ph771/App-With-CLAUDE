// Navegação do Fiscal: de região em região, passando pelo meio das portas.
import { REGIOES } from './planta.js';

// Cada passagem tem um ponto de cada lado da porta.
const PASSAGENS = [
  ['hall', 'corredor', { x: 0, z: 0.6 }, { x: 0, z: -0.8 }],
  ['corredor', 'masculino', { x: -8.5, z: -1.2 }, { x: -8.5, z: -2.8 }],
  ['corredor', 'feminino', { x: 8.5, z: -1.2 }, { x: 8.5, z: -2.8 }],
  ['corredor', 'deposito', { x: 11.4, z: -1 }, { x: 12.6, z: -1 }],
];

const dentro = (p, r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ;

export function regiaoDe(p) {
  // Corredor primeiro, para a fronteira z=0 e z=-2 cair nele.
  for (const nome of ['corredor', 'hall', 'masculino', 'feminino', 'deposito']) {
    if (dentro(p, REGIOES[nome])) return nome;
  }
  return null;
}

function vizinhos(r) {
  return PASSAGENS.flatMap(([a, b, pa, pb]) => (a === r ? [[b, pa, pb]] : b === r ? [[a, pb, pa]] : []));
}

function proximaRegiao(de, para) {
  if (de === para) return null;
  const passagem = proximaPassagem(de, para);
  return passagem ? passagem.para : null;
}

function proximaPassagem(de, para) {
  const vindo = new Map([[de, null]]);
  const fila = [de];
  while (fila.length) {
    const r = fila.shift();
    if (r === para) break;
    for (const [v, pa, pb] of vizinhos(r)) {
      if (vindo.has(v)) continue;
      vindo.set(v, { r, pa, pb, para: v });
      fila.push(v);
    }
  }
  if (!vindo.has(para)) return null;
  let atual = para;
  while (vindo.get(atual).r !== de) atual = vindo.get(atual).r;
  return vindo.get(atual);
}

function progresso(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  return ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz);
}

function distSegmento(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

// Para onde o Fiscal deve andar agora para chegar em `alvo`.
export function proximoAlvo(p, alvo) {
  const para = regiaoDe(alvo);
  // Atravessando uma porta: termina de passar antes de mudar de direção.
  for (const [a, b, pa, pb] of PASSAGENS) {
    if (!para || distSegmento(p, pa, pb) >= 0.2) continue;
    const t = progresso(p, pa, pb); // 0 = lado de a, 1 = lado de b
    if (proximaRegiao(a, para) === b && t < 0.98) return pb;
    if (proximaRegiao(b, para) === a && t > 0.02) return pa;
  }
  const de = regiaoDe(p);
  if (!de || !para || de === para) return alvo;
  const passagem = proximaPassagem(de, para);
  if (!passagem) return alvo;
  return distSegmento(p, passagem.pa, passagem.pb) < 0.2 ? passagem.pb : passagem.pa;
}
