// Robô de teste de equilíbrio: joga uma noite inteira como um jogador "médio".
// Roda dentro da página (tools/equilibrio.mjs injeta este arquivo). Não faz parte do jogo.
// Anda com as teclas de verdade (bate em parede, cansa), olha para trás de vez em quando,
// se esconde nas perseguições, faz tarefas e favores e às vezes erra a pergunta.
(async (opts) => {
  const j = window.__jogo;
  const { ESCONDERIJOS, LUGAR_VISITANTE, FERRAMENTAS_LUGAR } = await import('/src/world/planta.js');
  const { FAVORES } = await import('/src/data/favores.js');
  const { temVisao } = await import('/src/world/fisica.js');
  const { PAREDES } = await import('/src/world/planta.js');

  // Sorteio com semente (cada noite diferente, mas repetível).
  let semente = opts.semente >>> 0;
  const rnd = () => { semente = (semente + 0x6d2b79f5) >>> 0; let t = semente; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const log = window.__robo = {
    perfil: opts.perfil, pegos: {}, ondePego: {}, perseguicoes: 0, escondidas: 0, achado: 0,
    travadas: 0, erradas: 0, derrotas: 0, fim: null, relatorio: null, votos: 0, minutoReal: 0,
  };
  const andarDe = (p) => (p.x < 50 ? 't' : p.x < 150 ? '1' : 's');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const teclas = new Set();
  const segurar = (code, sim) => {
    if (sim === teclas.has(code)) return;
    sim ? teclas.add(code) : teclas.delete(code);
    dispatchEvent(new KeyboardEvent(sim ? 'keydown' : 'keyup', { code }));
  };
  const soltarTudo = () => { for (const c of [...teclas]) segurar(c, false); j.correr(false); };

  let tempo = 0, pensando = 0, emPergunta = false, espera = 0, olharFiscal = false, decideOlhar = 0;
  const evitar = new Set();
  let visto = null, escolhido = null, ultimaPos = null, semProgresso = 0, desvio = 0, desvioDir = null, tentativas = 0, andouBem = 0, depoisPerseg = 0, perseguindoAntes = false;

  // Anda até `dest` com W/A/S/D relativas ao olhar (pode recuar olhando para o Fiscal).
  function irPara(dest, dt, correr, parada = 0.45) {
    const p = j.jogador.posicao();
    if (dist(p, dest) < parada) { soltarTudo(); return true; }
    // Escada: usa a interação de verdade.
    if (andarDe(p) !== andarDe(dest) && /^(Subir|Descer)/.test(j.interacao() ?? '')) { soltarTudo(); j.interagir(); espera = 0.8; return false; }
    let alvo = j.proximoAlvo(p, dest);
    // Plenário: as fileiras de cadeiras não estão no mapa de rotas; uma pessoa usa o corredor central (x≈100).
    // Tribuna (x 97–103, z −19,2 a −17,6): atrás dela, sai pela ponta; na lateral, sobe antes de cortar caminho.
    if (j.regiaoDe(p) === 'plenario') {
      const fundo = (q) => q.z < -17.3;
      const lado = p.x < 100 ? 96.2 : 103.8;
      if (fundo(p) && !fundo(dest) && p.x > 96.1 && p.x < 103.9) alvo = { x: lado, z: -19.4 };
      else if (fundo(p) && !fundo(dest)) alvo = { x: p.x, z: -16.9 };
      else if (!fundo(p) && fundo(dest) && dest.x > 96.4 && dest.x < 103.6) alvo = Math.abs(p.x - (dest.x < 100 ? 96.2 : 103.8)) > 0.3 ? { x: dest.x < 100 ? 96.2 : 103.8, z: Math.min(p.z, -16.9) } : { x: p.x, z: -19.4 };
      else if (!fundo(p) && Math.abs(dest.z - p.z) > 1.5 && Math.abs(p.x - 100) > 1.2 && dest.z < -15.5) alvo = { x: 100, z: p.z };
    }
    if (alvo.teleporte) { soltarTudo(); j.teleportar(alvo.x, alvo.z); return false; }
    // Travado num móvel: dá a volta de lado, como uma pessoa faria (e só em último caso "pula").
    if (ultimaPos && dist(ultimaPos, p) < 0.25 * 2.2 * dt) semProgresso += dt; else semProgresso = Math.max(0, semProgresso - dt);
    ultimaPos = p;
    if (desvio > 0) { desvio -= dt; alvo = { x: p.x + desvioDir.x, z: p.z + desvioDir.z }; }
    else if (semProgresso > 0.35) {
      log.travadas++; tentativas++;
      const dx = alvo.x - p.x, dz = alvo.z - p.z, n = Math.hypot(dx, dz) || 1, lado = tentativas % 2 ? 1 : -1;
      desvioDir = { x: (-dz / n) * lado - dx / n * 0.3, z: (dx / n) * lado - dz / n * 0.3 };
      desvio = 0.5; semProgresso = 0;
      if (tentativas > 6) { j.teleportar(p.x + dx / n * 0.6, p.z + dz / n * 0.6); tentativas = 0; log.pulos = (log.pulos || 0) + 1; }
    } else if (semProgresso === 0) { andouBem += dt; if (andouBem > 2) tentativas = 0; }
    if (semProgresso > 0) andouBem = 0;
    const mx = alvo.x - p.x, mz = alvo.z - p.z, n = Math.hypot(mx, mz) || 1;
    // Vira primeiro (para onde vai, ou para o Fiscal) e só então escolhe as teclas pelo olhar atual.
    if (!olharFiscal) j.jogador.olharPara({ x: p.x + mx / n * 10, z: p.z + mz / n * 10 });
    const f = j.jogador.direcao();
    const frente = (mx * f.x + mz * f.z) / n, lado = (mx * -f.z + mz * f.x) / n;
    segurar('KeyW', frente > 0.38); segurar('KeyS', frente < -0.38);
    segurar('KeyD', lado > 0.38); segurar('KeyA', lado < -0.38);
    j.correr(correr);
    return false;
  }

  // Onde o jogador "está olhando": para frente; perto do Fiscal, às vezes encara ele (e ele congela).
  function olhar(dt) {
    const p = j.jogador.posicao(), f = j.fiscal.posicao();
    decideOlhar -= dt;
    const perto = andarDe(p) === andarDe(f) && dist(p, f) < 7 && j.estado().minuto >= 60;
    if (decideOlhar <= 0) { decideOlhar = 1; olharFiscal = perto && rnd() < opts.atencao; }
    if (!perto) olharFiscal = false;
    // A cada ~8 s dá uma olhada para trás.
    if (!olharFiscal && (tempo % 8) < 0.4 && perto) olharFiscal = true;
    if (olharFiscal) j.jogador.olharPara(f);
  }

  // Onde está a ferramenta: no chão (se largou) ou na prateleira.
  function buscarFerramenta(id) {
    const chao = j.ferramentas.noChao()[id];
    return chao ? { ponto: chao, texto: /^Pegar:/ } : { ponto: FERRAMENTAS_LUGAR[id], acao: () => j.pegarFerramenta(id) };
  }

  function usarItem(id) {
    const i = j.inventario.itens().indexOf(id);
    if (i >= 0) j.tecla('Digit' + (i + 1));
  }

  function proximoObjetivo() {
    const e = j.estado(), p = j.jogador.posicao();
    // Favor no caminho (perto): faz antes das tarefas, como uma pessoa faria.
    const fav = objetivoDeFavor(e);
    if (fav && dist(p, fav.ponto) < 10 && andarDe(p) === andarDe(fav.ponto)) return fav;
    // 1) Tarefas da hora.
    const tarefa = j.noite.tarefas().find((t) => !t.feita);
    // Visitante esperando perto: fala antes.
    const esperando = e.visitantes.map((v) => v.split(':')).find(([id, st]) => st === 'esperando' && dist(p, LUGAR_VISITANTE[id]) < 12);
    if (esperando) return { ponto: LUGAR_VISITANTE[esperando[0]], texto: /^Falar com/ };
    if (tarefa) {
      if (tarefa.ferramenta && e.naMao !== tarefa.ferramenta) return buscarFerramenta(tarefa.ferramenta);
      return { ponto: tarefa.ponto, segurar: tarefa.texto };
    }
    return objetivoDeFavor(e);
  }

  function objetivoDeFavor(e) {
    for (const [id, st] of e.visitantes.map((v) => v.split(':'))) {
      if (st === 'esperando') return { ponto: LUGAR_VISITANTE[id], texto: /^Falar com/ };
      if (st !== 'pedido') continue;
      const fav = FAVORES[id];
      if (j.favores.podeEntregar(id, { naMao: e.naMao })) return { ponto: LUGAR_VISITANTE[id], texto: /^Falar com/ };
      if (fav.tipo === 'pegar') {
        const o = j.favores.objetosVisiveis().find((x) => x.de === id);
        if (o) return { ponto: o.ponto, texto: /^Pegar:/ };
      }
      if (fav.tipo === 'ferramenta' && e.naMao !== fav.ferramenta) return buscarFerramenta(fav.ferramenta);
      if (fav.tipo === 'filmar' || fav.tipo === 'mandado') {
        const f = j.fiscal.posicao();
        if (e.minuto >= 60) return { ponto: f, perto: fav.tipo === 'filmar' ? 4 : 1.6, texto: fav.tipo === 'mandado' ? /^Entregar o mandado/ : null, filmar: fav.tipo === 'filmar' };
      }
    }
    return null;
  }

  j.definirAoQuadro((dt) => {
    const e = j.estado();
    if (e.modo === 'fim' || log.fim) {
      if (!log.fim) {
        log.fim = document.querySelector('.tela-cheia h1')?.textContent || 'fim';
        log.relatorio = e.relatorio; log.votos = e.votos; log.stats = { ...j.stats };
        log.minutoReal = Math.round(performance.now() / 600) / 100;
        soltarTudo();
      }
      return;
    }
    if (e.modo === 'derrota') {
      soltarTudo();
      const b = document.querySelector('.tela-cheia .botao');
      if (b && !b.dataset.robo) { b.dataset.robo = 1; log.derrotas++; setTimeout(() => b.click(), 50); }
      return;
    }
    if (e.modo !== 'jogando' || e.pausado) return;
    tempo += dt;
    if (espera > 0) { espera -= dt; return; }

    // Diálogo: avança.
    if (document.querySelector('.dialogo')) { soltarTudo(); j.tecla('KeyE'); espera = 0.3; return; }
    // Pergunta do Fiscal: pensa um pouco e responde (às vezes erra).
    const botoes = [...document.querySelectorAll('.pergunta button')];
    if (botoes.length) {
      soltarTudo();
      if (!emPergunta) {
        emPergunta = true; pensando = opts.pensar[0] + rnd() * (opts.pensar[1] - opts.pensar[0]);
        const h = Math.floor(e.minuto / 60); log.pegos[h] = (log.pegos[h] || 0) + 1;
        const r = j.regiaoDe(j.jogador.posicao()); log.ondePego[r] = (log.ondePego[r] || 0) + 1;
      }
      pensando -= dt;
      if (pensando <= 0) {
        const certas = botoes.map((b, i) => [b, i]).filter(([b]) => !/trans/i.test(b.textContent) && !/peruca/i.test(b.textContent));
        const erradas = botoes.map((b, i) => [b, i]).filter(([b]) => /trans/i.test(b.textContent));
        const errar = rnd() < opts.erro && erradas.length;
        if (errar) log.erradas++;
        const [, i] = errar ? erradas[0] : certas[0];
        j.tecla('Digit' + (i + 1)); emPergunta = false; espera = 0.4;
      }
      return;
    }
    emPergunta = false;
    if (j.inventario.itens().includes('chave')) usarItem('chave');

    // Perseguição: corre para o esconderijo mais perto e se esconde.
    const perseg = j.perseg().ativa;
    if (perseg && !perseguindoAntes) { log.perseguicoes++; if (opts.largar !== false && e.naMao) { j.tecla('KeyQ'); log.largou = (log.largou || 0) + 1; } }
    perseguindoAntes = perseg;
    const esc = j.escondido();
    if (esc) {
      soltarTudo();
      const f = j.fiscal.posicao(), p = j.jogador.posicao();
      j.prenderAr(andarDe(f) === andarDe(p) && dist(f, p) < 4);
      if (!perseg) { depoisPerseg += dt; if (depoisPerseg > 3) { j.prenderAr(false); j.sairEsconderijo(); depoisPerseg = 0; } }
      return;
    }
    if (perseg) {
      olharFiscal = false; // fugindo, olha para onde corre
      // Como uma pessoa: primeiro foge até sair da vista dele, depois se esconde longe de onde ele te viu.
      const p = j.jogador.posicao(), f = j.fiscal.posicao();
      const meVe = andarDe(f) === andarDe(p) && temVisao(f, p, PAREDES);
      if (meVe) visto = { ...p };
      const base = visto ?? p;
      // Sendo visto: corre para um esconderijo do lado oposto ao Fiscal (nunca fica parado esperando).
      // Fora da vista: o mais perto que não seja onde ele te viu por último.
      const opcoes = ESCONDERIJOS.filter((x) => andarDe(x.fora) === andarDe(p) && !x.seguro && !evitar.has(x) && (x === escolhido || !meVe || dist(x.fora, p) > 3))
        .map((x) => ({ x, d: meVe ? dist(x.fora, p) - 2 * (dist(x.fora, f) - dist(x.fora, p)) : dist(x.fora, p) - Math.min(dist(x.fora, base), 8) * 0.5 }))
        .sort((a, b) => a.d - b.d);
      // Decide e mantém o esconderijo escolhido (só troca se o Fiscal ficar no caminho ou um for bem melhor).
      // Chegou no esconderijo mas ele ainda te vê: desiste desse e continua correndo.
      if (meVe && escolhido && dist(p, escolhido.fora) < 1.2) { evitar.add(escolhido); escolhido = null; }
      const atual = opcoes.find((o) => o.x === escolhido);
      if (!atual || dist(f, escolhido.fora) < dist(p, escolhido.fora) - 1 || opcoes[0].d < atual.d - 6) escolhido = opcoes[0]?.x ?? null;
      const alvo = escolhido;
      if (alvo) {
        if (!meVe && dist(p, alvo.fora) < 0.8) { soltarTudo(); j.entrarEsconderijo(alvo); log.escondidas++; visto = null; return; }
        irPara(alvo.fora, dt, true);
        return;
      }
    } else { visto = null; escolhido = null; evitar.clear(); }

    // Segurando E numa tarefa: espera terminar (olhando o Fiscal se ele chegar perto).
    if (e.segurando) { soltarTudo(); olhar(dt); return; }

    const obj = proximoObjetivo();
    if (!obj) { soltarTudo(); olhar(dt); return; }
    const p = j.jogador.posicao();
    const longe = dist(p, obj.ponto) > 12;
    const f = j.fiscal.posicao();
    const fiscalPerto = andarDe(f) === andarDe(p) && dist(f, p) < 6 && e.minuto >= 60;
    olhar(dt);
    if (obj.filmar) { if (dist(p, obj.ponto) < 4) { soltarTudo(); j.jogador.olharPara(obj.ponto); olharFiscal = true; return; } }
    const raio = obj.perto ?? 0.9;
    // Tarefa: só aperta E quando a tela mostra a tarefa (senão chega mais perto dela).
    if (obj.segurar && dist(p, obj.ponto) < 1.4) {
      if (j.interacao() === obj.segurar) { soltarTudo(); j.acaoInicio(); espera = 0.3; return; }
      if (dist(p, obj.ponto) > 0.12) { irPara(obj.ponto, dt, false, 0.1); return; }
    }
    if (dist(p, obj.ponto) < raio) {
      soltarTudo();
      if (obj.acao) obj.acao();
      else if (obj.segurar) j.teleportar(obj.ponto.x + (rnd() - 0.5) * 0.4, obj.ponto.z + (rnd() - 0.5) * 0.4);
      else if (!obj.texto || obj.texto.test(j.interacao() ?? '')) j.interagir();
      espera = 0.3;
      return;
    }
    irPara(obj.ponto, dt, fiscalPerto || (longe && e.folego > 0.6));
  });
  return true;
})
