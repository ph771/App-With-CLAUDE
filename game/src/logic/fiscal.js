// O Fiscal Pavonato: só anda quando o jogador não está olhando.
// 1,1 m: dá para passar rente à parede de um corredor de 3 m sem ser pego.
export const DISTANCIA_ALCANCE = 1.1;
const ESPERA_DISTRACAO = 5;
// Na perseguição ele corre: mais rápido que você andando, mais lento que você correndo.
export const VELOCIDADE_PERSEGUICAO = 2.9;

export function velocidadeBase(minuto) {
  if (minuto >= 300) return 1.0;
  if (minuto >= 240) return 0.75;
  if (minuto >= 120) return 0.45;
  return 0;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createFiscal({ rota, origem, navegar = (_p, alvo) => alvo }) {
  let s = inicial();

  function inicial() {
    return {
      pos: { ...origem }, indice: 0, mult: 1, horaMult: null,
      suspenso: 0, pausado: 0, tregua: 0, distracao: null, esperaDistracao: 0, perseguindo: 0,
    };
  }

  // Anda até `alvo` gastando até `d` metros; devolve quanto sobrou.
  function andar(alvo, d) {
    if (alvo.teleporte) { s.pos = { x: alvo.x, z: alvo.z }; return d; } // escada
    const falta = dist(s.pos, alvo);
    if (falta <= d) { s.pos = { x: alvo.x, z: alvo.z }; return d - falta; }
    s.pos = { x: s.pos.x + ((alvo.x - s.pos.x) / falta) * d, z: s.pos.z + ((alvo.z - s.pos.z) / falta) * d };
    return 0;
  }

  // Anda rumo a `destino` seguindo a navegação (portas); devolve quanto sobrou.
  function andarAte(destino, d) {
    for (let i = 0; i < 8 && d > 1e-12; i++) {
      const alvo = navegar(s.pos, destino);
      d = andar(alvo, d);
      if (alvo === destino || dist(s.pos, destino) < 1e-9) break;
    }
    return d;
  }

  return {
    // `alvo` (opcional): para onde andar; o alcance é sempre medido até o `jogador`.
    update(dt, { minuto, jogador, olhando, alvo }) {
      dt = Math.min(Math.max(dt, 0), 0.1);
      const hora = Math.floor(minuto / 60);
      // O bônus de velocidade por erro dura até a hora acabar.
      if (s.horaMult === -1) s.horaMult = hora;
      else if (s.horaMult !== null && s.horaMult !== hora) { s.mult = 1; s.horaMult = null; }

      if (s.suspenso > 0) { s.suspenso = Math.max(0, s.suspenso - dt); return null; }
      if (s.perseguindo > 0) {
        // Perseguição: corre, ignora olhar e trégua.
        s.perseguindo = Math.max(0, s.perseguindo - dt);
        if (s.pausado > 0) { s.pausado = Math.max(0, s.pausado - dt); return null; }
        if (dist(s.pos, jogador) < DISTANCIA_ALCANCE) return 'alcancou';
        andarAte(alvo ?? jogador, VELOCIDADE_PERSEGUICAO * dt);
        return dist(s.pos, jogador) < DISTANCIA_ALCANCE ? 'alcancou' : null;
      }
      const vel = velocidadeBase(minuto) * s.mult;
      if (vel === 0) return null;
      if (s.pausado > 0) { s.pausado = Math.max(0, s.pausado - dt); return null; }
      if (s.tregua > 0) s.tregua = Math.max(0, s.tregua - dt);
      const pega = () => s.tregua <= 0 && dist(s.pos, jogador) < DISTANCIA_ALCANCE;
      if (pega()) return 'alcancou';

      if (s.distracao) {
        if (dist(s.pos, s.distracao) > 1e-9) { if (!olhando) andarAte(s.distracao, vel * dt); return null; }
        s.esperaDistracao -= dt;
        if (s.esperaDistracao <= 0) s.distracao = null;
        return null;
      }

      if (olhando) return null;
      let d = vel * dt;
      while (d > 1e-12 && s.indice < rota.length) {
        d = andarAte(rota[s.indice], d);
        if (dist(s.pos, rota[s.indice]) < 1e-9) s.indice++;
      }
      if (d > 1e-12) andarAte(alvo ?? jogador, d);
      return pega() ? 'alcancou' : null;
    },
    posicao: () => ({ ...s.pos }),
    visivel: (minuto) => minuto >= 60 && s.suspenso <= 0,
    // Recomeça a ronda (por padrão na origem; o jogo pode mandar para longe do jogador).
    voltarParaOrigem(ponto = origem) { s.pos = { ...ponto }; s.indice = 0; s.distracao = null; },
    suspender(seg) { s.suspenso = seg; },
    pausar(seg) { s.pausado = seg; },
    perseguir(seg) { s.perseguindo = seg; s.tregua = 0; s.distracao = null; },
    pararPerseguicao() { s.perseguindo = 0; },
    perseguindo: () => s.perseguindo > 0,
    // Trégua: ele anda, mas não te pega (depois de uma pergunta).
    tregua(seg) { s.tregua = seg; },
    distrair(ponto) { s.distracao = { ...ponto }; s.esperaDistracao = ESPERA_DISTRACAO; },
    errou() { s.mult *= 1.15; if (s.horaMult === null) s.horaMult = -1; },
    snapshot: () => structuredClone(s),
    restaurar(snap) { s = structuredClone(snap); },
  };
}
