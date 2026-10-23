// Plantão no Banheiro — ponto de entrada: liga a lógica da noite ao mundo 3D.
import * as THREE from 'three';
import { criarBanheiro } from './world/banheiro.js';
import { criarJogador } from './world/jogador.js';
import { criarRenderPS1 } from './world/ps1.js';
import { PAREDES, PONTOS, CABINE_01 } from './world/planta.js';
import { temVisao } from './world/fisica.js';
import { criarPersonagem, animarParado, animarAndando, IDS_PERSONAGENS } from './world/personagens.js';
import { proximoAlvo, regiaoDe } from './world/nav.js';
import { createClock } from './logic/clock.js';
import { createQuiz } from './logic/quiz.js';
import { createFiscal } from './logic/fiscal.js';
import { createInventario } from './logic/inventario.js';
import { createNoite } from './logic/noite.js';
import { PERGUNTAS, PERGUNTA_FINAL } from './data/perguntas.js';
import { ITENS } from './data/visitantes.js';
import { criarUI } from './ui/ui.js';
import { criarAudio } from './audio.js';

const params = new URLSearchParams(location.search);
const SEM_TRAVA = params.has('semtrava'); // testes automáticos: não pausa sem o mouse travado

// ---------- Mundo ----------
const canvas = document.getElementById('tela');
const ps1 = criarRenderPS1(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 2, 11);
const camera = new THREE.PerspectiveCamera(70, 4 / 3, 0.05, 40);
scene.add(camera);

const mundo = criarBanheiro(scene);
const efeitos = { lanterna: false, cabine01: false, mostrarRota: false, leite: null };
let cabineAberta = false;
const paredesAtuais = () => (cabineAberta ? PAREDES : [...PAREDES, mundo.paredeCabine01]);
const jogador = criarJogador(camera, canvas, paredesAtuais, PONTOS.inicio);
jogador.olharPara({ x: 0, z: -2 });

const lanterna = new THREE.SpotLight(0xfff2d0, 0, 14, 0.45, 0.5, 1.2);
lanterna.position.set(0, -0.1, 0);
lanterna.target.position.set(0, -0.1, -1);
camera.add(lanterna, lanterna.target);

const ui = criarUI(document.getElementById('ui'));
const audio = criarAudio();

// ---------- Lógica ----------
const clock = createClock({ segundosPorHora: params.has('rapido') ? 10 : 180 });
const quiz = createQuiz({ perguntas: PERGUNTAS, final: PERGUNTA_FINAL });
const fiscal = createFiscal({ rota: [], origem: PONTOS.origemFiscal, navegar: proximoAlvo });
const inventario = createInventario();
const noite = createNoite({ clock, fiscal, inventario, quiz });

// ---------- Personagens ----------
const fiscalMesh = criarPersonagem('fiscal');
fiscalMesh.visible = false;
scene.add(fiscalMesh);
const aparicao = criarPersonagem('fiscal'); // para os sustos
aparicao.getObjectByName('peruca').visible = true;
aparicao.visible = false;
scene.add(aparicao);

let modo = 'inicio'; // inicio | jogando | derrota | fim
let pausado = false;
let perguntaAberta = null; // { final, controles }
let visitantes = []; // { v, mesh, estado, alvo }
let telefoneTocando = 0; // segundos restantes
let proximoToque = 0;
let apagao = 0;
let susto = null; // { tipo, tempo, ... }
let vendoMonitor = 0;
let tempoPasso = 0;
let checkpointExtra = null;
let ultimaPosFiscal = fiscal.posicao();
let agendados = []; // { em: segundos de jogo, fn } — param na pausa e somem na derrota

function agendar(segundos, fn) { agendados.push({ em: segundos, fn }); }
function rodarAgendados(dt) {
  const prontos = [];
  agendados = agendados.filter((a) => { a.em -= dt; if (a.em <= 0) { prontos.push(a.fn); return false; } return true; });
  prontos.forEach((fn) => fn());
}

function descartar(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material ?? [])) { m.map?.dispose(); m.dispose(); }
  });
}

// ---------- Visitantes ----------
// Onde cada visitante espera no hall (sem encostar no guichê nem nas paredes).
const VAGAS = [
  PONTOS.esperaVisitante, { x: -0.4, z: 1.6 }, { x: 2, z: 1.6 }, { x: -1.6, z: 1.6 },
  { x: 3.2, z: 1.6 }, { x: 0.8, z: 2.8 }, { x: 2, z: 2.8 }, { x: 3.2, z: 2.8 },
];
function entrarVisitante(v, direto = false) {
  const mesh = criarPersonagem(v.id);
  const ocupadas = new Set(visitantes.filter((x) => x.estado !== 'saindo').map((x) => x.vaga));
  const vaga = VAGAS.findIndex((_, i) => !ocupadas.has(i));
  const espera = VAGAS[Math.max(vaga, 0)];
  const inicio = direto ? espera : PONTOS.entradaVisitante;
  mesh.position.set(inicio.x, 0, inicio.z);
  scene.add(mesh);
  visitantes.push({ v, mesh, vaga, estado: direto ? 'esperando' : 'entrando', alvo: espera });
  if (!direto) {
    audio.tocar('entrada');
    ui.aviso(`Alguém entrou no banheiro: ${v.nome}`);
  }
}

function falarCom(vis) {
  vis.estado = 'falando';
  ui.dialogo(vis.v.nome, vis.v.falas, () => {
    inventario.adicionar(vis.v.item);
    audio.tocar('item');
    const it = ITENS[vis.v.item];
    ui.aviso(`Você recebeu: ${it.nome} — ${it.dica}`, 4);
    vis.estado = 'saindo';
    vis.alvo = PONTOS.saidaVisitante;
  });
}

function atualizarVisitantes(dt, t) {
  const pj = jogador.posicao();
  for (const vis of visitantes) {
    const p = { x: vis.mesh.position.x, z: vis.mesh.position.z };
    if (vis.estado === 'entrando' || vis.estado === 'saindo') {
      const alvo = vis.estado === 'saindo' ? proximoAlvo(p, vis.alvo) : vis.alvo;
      const dx = alvo.x - p.x, dz = alvo.z - p.z, d = Math.hypot(dx, dz);
      const passo = Math.min(d, 1.3 * dt);
      if (d > 0.01) {
        vis.mesh.position.x += (dx / d) * passo;
        vis.mesh.position.z += (dz / d) * passo;
        vis.mesh.rotation.y = Math.atan2(dx, dz);
        animarAndando(vis.mesh, t);
      }
      if (Math.hypot(vis.alvo.x - vis.mesh.position.x, vis.alvo.z - vis.mesh.position.z) < 0.05) {
        if (vis.estado === 'entrando') vis.estado = 'esperando';
        else { scene.remove(vis.mesh); descartar(vis.mesh); vis.removido = true; audio.tocar('descarga'); }
      }
    } else {
      vis.mesh.rotation.y = Math.atan2(pj.x - p.x, pj.z - p.z);
      animarParado(vis.mesh, t);
    }
  }
  visitantes = visitantes.filter((v) => !v.removido);
}

// ---------- Eventos da noite ----------
function tratarEvento(e) {
  if (e.tipo === 'hora') {
    checkpointExtra = {
      efeitos: { ...efeitos, leite: null },
      cabineAberta,
      pendentes: visitantes.filter((v) => v.estado !== 'saindo').map((v) => v.v),
    };
    if (e.hora > 0 && e.hora < 6) ui.aviso(`${String(e.hora).padStart(2, '0')}:00`, 2);
    if (e.hora === 6) {
      ui.aviso('06:00 — Apague a luz no QUADRO DO DEPÓSITO para terminar o plantão!', 6);
      ui.legenda('', '(o Fiscal não vai deixar barato)', 4);
    }
    return;
  }
  if (e.tipo === 'visitante') entrarVisitante(e.visitante);
  if (e.tipo === 'telefone') { telefoneTocando = 20; proximoToque = 0; }
  if (e.tipo === 'susto') comecarSusto(e.id);
}

function frente(dist) {
  const p = jogador.posicao(), d = jogador.direcao();
  return { x: p.x + d.x * dist, z: p.z + d.z * dist };
}

function mostrarAparicao(pos, segundos, comPeruca = true) {
  aparicao.position.set(pos.x, 0, pos.z);
  const pj = jogador.posicao();
  aparicao.rotation.y = Math.atan2(pj.x - pos.x, pj.z - pos.z);
  aparicao.getObjectByName('peruca').visible = comPeruca;
  aparicao.visible = true;
  susto = { ...(susto || {}), aparicaoAte: segundos };
}

function comecarSusto(id) {
  switch (id) {
    case 'porta_familia':
      audio.tocar('porta_bate');
      susto = { tipo: id, tempo: 0.8 };
      break;
    case 'fiscal_monitor':
      audio.tocar('passo_molhado');
      ui.legenda('', '(Tem alguém parado na frente do banheiro feminino. Confira o monitor.)', 5);
      break;
    case 'fiscal_cabine':
      audio.tocar('susto'); ui.flash();
      mostrarAparicao(frente(1.6), 0.9);
      break;
    case 'luz_apaga':
      audio.tocar('interruptor');
      apagao = 4;
      agendar(3, () => { mostrarAparicao(frente(2), 0.7); audio.tocar('susto'); });
      break;
    case 'batidas_cabine':
      audio.tocar('batida');
      ui.legenda('', '(batidas numa das cabines...)', 4);
      break;
    case 'fiscal_espelho': {
      const p = jogador.posicao(), d = jogador.direcao();
      audio.tocar('passo_molhado');
      ui.legenda('', '(tem alguém atrás de você)', 4);
      mostrarAparicao({ x: p.x - d.x * 1.3, z: p.z - d.z * 1.3 }, 8, false);
      susto = { tipo: id, tempo: 8, aparicaoAte: 8, assustaAoOlhar: true };
      break;
    }
  }
}

function atualizarSustos(dt) {
  if (!susto) return;
  if (susto.tipo === 'porta_familia') {
    susto.tempo -= dt;
    mundo.portaFamilia.position.x = susto.tempo > 0 ? Math.sin(susto.tempo * 60) * 0.03 : 0;
  }
  if (susto.aparicaoAte !== undefined) {
    susto.aparicaoAte -= dt;
    if (susto.assustaAoOlhar && jogador.olhandoPara({ x: aparicao.position.x, z: aparicao.position.z }, paredesAtuais(), 30)) {
      audio.tocar('susto'); ui.flash();
      susto.assustaAoOlhar = false;
      susto.aparicaoAte = Math.min(susto.aparicaoAte, 0.5);
    }
    if (susto.aparicaoAte <= 0) { aparicao.visible = false; susto = null; }
  } else if (susto.tipo === 'porta_familia' && susto.tempo <= 0) susto = null;
}

// ---------- Luzes ----------
function atualizarLuzes(dt, t) {
  if (apagao > 0) apagao -= dt;
  const apagado = apagao > 0;
  for (const l of mundo.luzes) {
    const tremor = Math.random() < 0.015 ? Math.random() * 0.6 : 1;
    const fraca = noite.fase() === 'final' ? 0.6 : 1;
    l.luz.intensity = apagado ? 0 : l.base * tremor * fraca;
    l.tubo.material.color.setScalar(apagado ? 0.05 : 0.95 * tremor);
  }
  audio.volumeZumbido(apagado ? 0 : 1);
  lanterna.intensity = efeitos.lanterna ? 12 : 0;
}

// ---------- Pergunta do Fiscal ----------
function abrirPergunta(final = false) {
  if (!final) jogador.olharPara(fiscal.posicao()); // na final ele já está atrás de você
  audio.tocar('passo_molhado');
  const mostrada = quiz.iniciar(final);
  const extra = inventario.tem('peruca') ? '(Usar a peruca)' : null;
  perguntaAberta = { final };
  perguntaAberta.controles = ui.pergunta({ ...mostrada, extra }, (i) => {
    if (i === 3) { usarPeruca(); return; }
    fecharPergunta(quiz.responder(i).segura);
  });
}

function fecharPergunta(segura) {
  const final = perguntaAberta?.final;
  perguntaAberta?.controles.fechar();
  perguntaAberta = null;
  if (segura === true) {
    audio.tocar('acerto');
    if (final) { terminarNoite(); return; }
    ui.legenda('Fiscal Pavonato', 'Tá, tá... pode ir.', 3);
  } else if (segura === false) {
    audio.tocar('erro'); ui.flash();
    ui.legenda('Fiscal Pavonato', '(sorri e anota alguma coisa na prancheta)', 3);
    fiscal.errou();
  }
  fiscalMesh.getObjectByName('peruca').visible = Math.random() < 0.5; // troca de peruca entre aparições
  if (final && segura === false && !quiz.perdeu()) {
    agendar(1.8, () => { if (!perguntaAberta) abrirPergunta(true); });
    return;
  }
  if (!final) { fiscal.voltarParaOrigem(); fiscal.pausar(3); }
}

function terminarNoite() {
  noite.vencer();
  modo = 'fim';
  fiscalMesh.visible = false;
  aparicao.visible = false;
  ui.escurecer(true);
  ui.mostrarHud(false);
  document.exitPointerLock?.();
  setTimeout(() => {
    ui.escurecer(false);
    ui.vitoria(() => {
      audio.tocar('telefone');
      ui.posCreditos(() => location.reload());
    });
  }, 1600);
}

// ---------- Itens ----------
// A caneca voa até a primeira parede (ou até onde há chão).
function limitarArremesso(de, para) {
  const d = Math.hypot(para.x - de.x, para.z - de.z);
  let ultimo = de;
  for (let s = 0.25; s <= d; s += 0.25) {
    const p = { x: de.x + ((para.x - de.x) * s) / d, z: de.z + ((para.z - de.z) * s) / d };
    if (!regiaoDe(p) || !temVisao(de, p, paredesAtuais())) break;
    ultimo = p;
  }
  return ultimo;
}
function ctxItens() {
  const p = jogador.posicao();
  return { fiscal, quiz, jogador: { ...p, direcao: jogador.direcao() }, efeitos, limitarArremesso };
}

function usarPeruca() {
  inventario.usar('peruca', ctxItens());
  ui.legenda('Fiscal Pavonato', 'Opa... desculpa, achei que era outra pessoa.', 4);
  fecharPergunta(null);
}

function usarItem(indice) {
  const id = inventario.itens()[indice];
  if (!id) return;
  if (id === 'peruca' && perguntaAberta) { usarPeruca(); return; }
  const r = inventario.usar(id, ctxItens());
  if (!r.ok) { if (r.msg) ui.aviso(r.msg, 1.5); return; }
  audio.tocar('item');
  const textos = {
    lanterna: efeitos.lanterna ? 'Lanterna ligada.' : 'Lanterna desligada.',
    microfone: 'Mamãe Falou, ao vivo: o Fiscal parou para dar entrevista!',
    caneca: 'Você jogou a caneca longe. CLANK!',
    ordem: 'Ordem de suspensão: o Fiscal sumiu por 30 segundos.',
    leite: 'Leite condensado: energia! Você corre mais rápido.',
    chave: 'A chave da cabine 01 agora é sua.',
    mapa: 'Mapa aberto: você sabe onde o Fiscal está.',
  };
  if (id === 'caneca') audio.tocar('porta_bate');
  if (id === 'chave') { cabineAberta = true; mundo.portaCabine01.rotation.y = 1.3; }
  ui.aviso(textos[id] ?? 'Item usado.', 2.5);
}

// ---------- Interação (E) ----------
const perto = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) <= r;

function interacaoAtual() {
  const p = jogador.posicao();
  const opcoes = [];
  for (const vis of visitantes) {
    if (vis.estado !== 'esperando') continue;
    const vp = { x: vis.mesh.position.x, z: vis.mesh.position.z };
    if (perto(p, vp, 1.8)) opcoes.push({ d: Math.hypot(p.x - vp.x, p.z - vp.z), texto: `Falar com ${vis.v.nome}`, acao: () => falarCom(vis) });
  }
  const tarefa = (id) => noite.tarefas().find((t) => t.id === id);
  for (const it of mundo.interagiveis) {
    if (!perto(p, it.pos, it.raio)) continue;
    const d = Math.hypot(p.x - it.pos.x, p.z - it.pos.z);
    const add = (texto, acao) => opcoes.push({ d, texto, acao });
    if (it.id === 'telefone' && telefoneTocando > 0) add('Atender o telefone', atenderTelefone);
    if (it.id === 'monitor') add('Conferir o monitor', () => {
      vendoMonitor = 3; jogador.olharPara(PONTOS.monitor);
      noite.concluirTarefa('conferir_monitor');
    });
    if (it.id === 'poca' && !tarefa('passar_pano').feita) add('Passar pano', () => { audio.tocar('pano'); noite.concluirTarefa('passar_pano'); });
    if ((it.id === 'papel_masc' || it.id === 'papel_fem') && !tarefa('repor_papel').feita) add('Repor o papel', () => { audio.tocar('papel'); noite.concluirTarefa('repor_papel'); });
    if (it.id === 'quadro') {
      if (noite.fase() === 'final') add('Apagar a luz', () => {
        audio.tocar('interruptor');
        mostrarAparicaoFinal();
        abrirPergunta(true);
      });
      else add('Quadro de luz', () => ui.aviso('Ainda não. Só às 06:00.', 2));
    }
    if (it.id === 'cabine01') {
      if (!cabineAberta) add('Cabine 01 (trancada)', () => ui.aviso(inventario.tem('chave') ? 'Use a chave (tecla do item).' : 'Trancada. Alguém deve ter a chave.', 2.5));
    }
  }
  opcoes.sort((a, b) => a.d - b.d);
  return opcoes[0] ?? null;
}

function mostrarAparicaoFinal() {
  // O Fiscal aparece bem atrás de você no depósito.
  const p = jogador.posicao(), d = jogador.direcao();
  fiscal.voltarParaOrigem();
  fiscal.suspender(9999);
  mostrarAparicao({ x: p.x - d.x * 1.1, z: p.z - d.z * 1.1 }, 9999, true);
  jogador.olharPara({ x: p.x - d.x, z: p.z - d.z });
  audio.tocar('susto');
}

function atenderTelefone() {
  telefoneTocando = 0;
  ui.legenda('Telefone', '(silêncio... só uma respiração do outro lado)', 3.5);
  agendar(3.5, () => ui.legenda('Telefone', 'Alôôôô? ... É do banheiro? Tô indo aí fiscalizar.', 4.5));
}

// ---------- Teclado e mouse ----------
addEventListener('keydown', (e) => {
  if (modo !== 'jogando' || pausado || e.repeat) return;
  if (ui.tecla(e.code)) { e.preventDefault(); return; }
  if (ui.ocupado() && !perguntaAberta) return; // durante a conversa, só E avança
  if (e.code === 'KeyE') { interacaoAtual()?.acao(); return; }
  const m = /^Digit([1-8])$/.exec(e.code);
  if (m) usarItem(Number(m[1]) - 1);
});
canvas.addEventListener('click', () => { if (modo === 'jogando') jogador.travar(); });
jogador.onSoltar(() => { if (modo === 'jogando' && !SEM_TRAVA) { pausado = true; ui.pausa(true); } });
jogador.onTravar(() => { pausado = false; ui.pausa(false); });
document.addEventListener('pointerlockerror', () => { if (modo === 'jogando' && !SEM_TRAVA) { pausado = true; ui.pausa(true); } });

// ---------- Derrota e checkpoint ----------
function perder() {
  modo = 'derrota';
  agendados = [];
  if (perguntaAberta) { perguntaAberta.controles.fechar(); perguntaAberta = null; }
  audio.tocar('susto'); ui.flash();
  document.exitPointerLock?.();
  ui.mostrarHud(false);
  ui.derrota(`${String(clock.hora()).padStart(2, '0')}:00`, () => {
    noite.voltarCheckpoint();
    visitantes.forEach((v) => { scene.remove(v.mesh); descartar(v.mesh); });
    visitantes = [];
    if (checkpointExtra) {
      Object.assign(efeitos, checkpointExtra.efeitos);
      cabineAberta = checkpointExtra.cabineAberta;
      mundo.portaCabine01.rotation.y = cabineAberta ? 1.3 : 0;
      checkpointExtra.pendentes.forEach((v) => entrarVisitante(v, true));
    }
    aparicao.visible = false; susto = null; apagao = 0; telefoneTocando = 0;
    jogador.teleportar(PONTOS.inicio);
    jogador.olharPara({ x: 0, z: -2 });
    modo = 'jogando';
    ui.mostrarHud(true);
    if (!SEM_TRAVA) jogador.travar();
  });
}

// ---------- Loop ----------
let anterior = performance.now();
let quadro = 0;
let tempoHud = 0;

function atualizar(dt, t) {
  rodarAgendados(dt);
  if (modo !== 'jogando') return;
  const ocupado = ui.ocupado();
  if (efeitos.leite) { efeitos.leite.segundos -= dt; if (efeitos.leite.segundos <= 0) efeitos.leite = null; }
  if (vendoMonitor > 0) vendoMonitor -= dt;
  jogador.update(dt, efeitos.leite ? efeitos.leite.velocidade : 1, !ocupado && vendoMonitor <= 0);

  if (perguntaAberta) {
    const r = quiz.tick(dt);
    perguntaAberta?.controles.tempo(quiz.restante() / 5);
    if (r === 'tempo') fecharPergunta(false);
  } else if (!ocupado) {
    clock.tick(dt);
  }

  noite.update().forEach(tratarEvento);
  if (noite.fase() === 'derrota') { perder(); return; }

  // Fiscal
  const pj = jogador.posicao();
  const minuto = clock.minutos();
  const escondido = cabineAberta && pj.x > CABINE_01.minX && pj.x < CABINE_01.maxX && pj.z > CABINE_01.minZ && pj.z < CABINE_01.maxZ;
  if (!ocupado && !escondido && noite.fase() !== 'vitoria') {
    const fp = fiscal.posicao();
    const pelaCamera = vendoMonitor > 0 && ['corredor', 'hall'].includes(regiaoDe(fp));
    const olhando = pelaCamera || jogador.olhandoPara(fp, paredesAtuais());
    if (fiscal.update(dt, { minuto, jogador: pj, olhando }) === 'alcancou' && fiscal.visivel(minuto)) abrirPergunta(false);
  }
  const fp = fiscal.posicao();
  fiscalMesh.visible = fiscal.visivel(minuto) && !aparicao.visible;
  fiscalMesh.position.set(fp.x, 0, fp.z);
  fiscalMesh.rotation.y = Math.atan2(pj.x - fp.x, pj.z - fp.z);
  const andou = Math.hypot(fp.x - ultimaPosFiscal.x, fp.z - ultimaPosFiscal.z);
  ultimaPosFiscal = fp;
  if (andou > 1e-4) {
    animarAndando(fiscalMesh, t);
    tempoPasso -= dt;
    if (tempoPasso <= 0 && Math.hypot(fp.x - pj.x, fp.z - pj.z) < 9) { audio.tocar('passo_molhado'); tempoPasso = 0.7; }
  } else animarParado(fiscalMesh, t);

  // Telefone
  if (telefoneTocando > 0) {
    telefoneTocando -= dt; proximoToque -= dt;
    if (proximoToque <= 0) { audio.tocar('telefone'); proximoToque = 2.5; }
  }

  atualizarVisitantes(dt, t);
  atualizarSustos(dt);
  atualizarLuzes(dt, t);

  // Dica de interação e HUD (4 vezes por segundo)
  tempoHud -= dt;
  if (tempoHud <= 0) {
    tempoHud = 0.25;
    const it = !ocupado && !perguntaAberta ? interacaoAtual() : null;
    ui.dica(it?.texto ?? null);
    const itens = inventario.itens().map((id, i) => ({ tecla: i + 1, nome: ITENS[id].nome }));
    const tarefas = noite.fase() === 'final'
      ? [{ texto: 'Apagar a luz no quadro do depósito', feita: false }]
      : noite.tarefas();
    if (efeitos.mostrarRota) tarefas.push({ texto: `Mapa: Fiscal no ${(regiaoDe(fp) ?? '???').toUpperCase()}`, feita: false });
    ui.hud({ relogio: clock.formatar(), itens, tarefas, erros: quiz.erros() });
  }
}

function loop(agora) {
  const dt = Math.min((agora - anterior) / 1000, 0.1);
  anterior = agora;
  const t = agora / 1000;
  if (modo === 'jogando' && !pausado) atualizar(dt, t);
  if (modo === 'inicio') { animarParado(fiscalMesh, t); }
  if (quadro++ % 3 === 0) ps1.renderEm(mundo.monitor.alvo, scene, mundo.monitor.camera);
  ps1.render(scene, camera);
  requestAnimationFrame(loop);
}

// ?minuto=N começa a noite mais tarde (para testes).
if (params.has('minuto')) {
  const alvo = Math.min(Number(params.get('minuto')) || 0, 360);
  while (clock.minutos() < alvo) { clock.tick(0.1); noite.update().forEach(tratarEvento); }
}

// ---------- Início ----------
function comecar() {
  audio.iniciar();
  audio.zumbidoLuz(true);
  modo = 'jogando';
  ui.mostrarHud(true);
  noite.update().forEach(tratarEvento);
  if (!SEM_TRAVA) jogador.travar();
}

// ?galeria=1 mostra todos os personagens lado a lado (para conferir a aparência).
if (params.has('galeria')) {
  fiscalMesh.visible = false;
  IDS_PERSONAGENS.forEach((id, i) => {
    const p = criarPersonagem(id);
    p.position.set(-3.6 + i * 0.9, 0, 1.2);
    scene.add(p);
  });
  const luz = new THREE.PointLight(0xffffff, 8, 10, 1.2);
  luz.position.set(0, 2.6, 4);
  scene.add(luz);
  jogador.teleportar({ x: 0, z: 5.6 });
  jogador.olharPara({ x: 0, z: 0 });
  modo = 'galeria';
} else {
  ui.telaInicial(comecar);
}
// ?ver=x,z,alvoX,alvoZ posiciona a câmera (para prints de teste).
if (params.has('ver')) {
  const [x, z, ax, az] = params.get('ver').split(',').map(Number);
  jogador.teleportar({ x, z });
  jogador.olharPara({ x: ax, z: az });
}
requestAnimationFrame(loop);

// Ganchos para testes automáticos.
window.__jogo = {
  clock, quiz, fiscal, inventario, noite, jogador, ui,
  estado: () => ({ modo, pausado, fase: noite.fase(), minuto: clock.minutos(), perguntaAberta: !!perguntaAberta, visitantes: visitantes.map((v) => `${v.v.id}:${v.estado}`), itens: inventario.itens(), erros: quiz.erros() }),
  comecar,
  abrirPergunta,
  interagir: () => interacaoAtual()?.acao(),
  interacao: () => interacaoAtual()?.texto ?? null,
  teleportar: (x, z) => jogador.teleportar({ x, z }),
  tecla: (code) => dispatchEvent(new KeyboardEvent('keydown', { code })),
};
