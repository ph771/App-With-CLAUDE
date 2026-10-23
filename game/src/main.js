// Plantão no Banheiro — Episódio 1: A Votação do Banheiro.
// Liga a lógica da noite (tarefas, relatório, Fiscal, visitantes) ao prédio 3D.
import * as THREE from 'three';
import { criarPredio } from './world/predio.js';
import { criarJogador } from './world/jogador.js';
import { criarRenderPS1 } from './world/ps1.js';
import {
  PAREDES, PONTOS, CABINE_01, PORTA_CABINE_01, ESCADAS, FERRAMENTAS_LUGAR, LUGAR_VISITANTE, SALAS, andarDe,
} from './world/planta.js';
import { temVisao } from './world/fisica.js';
import { criarPersonagem, animarParado, animarAndando, IDS_PERSONAGENS } from './world/personagens.js';
import { criarFerramentaNaMao, criarPagina } from './world/objetos.js';
import { criarMarcador, animarMarcador } from './world/marcadores.js';
import { proximoAlvo, regiaoDe } from './world/nav.js';
import { createClock } from './logic/clock.js';
import { createQuiz } from './logic/quiz.js';
import { createFiscal } from './logic/fiscal.js';
import { createInventario } from './logic/inventario.js';
import { createNoite } from './logic/noite.js';
import { createFerramentas } from './logic/ferramentas.js';
import { createFolego, VELOCIDADE_CORRIDA } from './logic/folego.js';
import { PERGUNTAS, PERGUNTA_FINAL } from './data/perguntas.js';
import { ITENS } from './data/visitantes.js';
import { FERRAMENTAS } from './data/noite.js';
import { PAGINAS } from './data/paginas.js';
import { criarUI } from './ui/ui.js';
import { criarAudio } from './audio.js';
import { criarControlesToque } from './ui/toque.js';
import { carregarConfig, salvarConfig, PADRAO as CONFIG_PADRAO } from './logic/config.js';
import { definirAnisotropia } from './world/texturas.js';
import { carregarModelos, instanciar, temModelo } from './world/modelos.js';
import { criarInstalador } from './ui/instalar.js';
import { VERSAO } from './versao.js';

const params = new URLSearchParams(location.search);
const SEM_TRAVA = params.has('semtrava'); // testes automáticos: não pausa sem o mouse travado
// Celular/tablet: controles de toque no lugar de teclado e mouse (?toque=1 força).
const TOQUE = params.has('toque') || matchMedia('(pointer: coarse)').matches;
if (TOQUE) document.body.classList.add('toque');
// Duração máxima de cada hora (segundos reais). ?rapido=1 para testes.
const SEGUNDOS_POR_HORA = Number(params.get('seghora')) || (params.has('rapido') ? 40 : 270);
const POCA_A_CADA = 40; // segundos andando entre uma poça e outra do Fiscal
const SALAS_SEGURAS = ['almox', 'hall_s', 'maquinas']; // o Fiscal não entra antes das 04:00

// ---------- Mundo ----------
const canvas = document.getElementById('tela');
const camera = new THREE.PerspectiveCamera(70, 4 / 3, 0.05, 40);
const ps1 = criarRenderPS1(canvas, {
  aoMudarProporcao: (p) => { camera.aspect = p; camera.updateProjectionMatrix(); },
});
definirAnisotropia(Math.min(8, ps1.anisotropiaMaxima()));
// Configurações guardadas neste navegador (se ele deixar).
let armazenamento = null;
try { armazenamento = window.localStorage; } catch { /* bloqueado */ }
let config = carregarConfig(armazenamento);
ps1.definirQualidade(config.qualidade);

// Vinheta e granulação de filme por cima da imagem.
const efeitosTela = document.createElement('div');
efeitosTela.id = 'efeitos-tela';
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  efeitosTela.innerHTML = `<div class="grao" style="background-image:url(${c.toDataURL()})"></div><div class="vinheta"></div>`;
}
document.getElementById('ui').before(efeitosTela);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 3, 16);
scene.add(camera);

// Móveis prontos (Kenney, CC0). Se algum não carregar, o prédio usa caixas simples.
const MODELOS = ['toilet', 'bathroomSink', 'trashcan', 'chairCushion', 'chairDesk', 'desk', 'computerScreen', 'computerKeyboard',
  'table', 'chair', 'kitchenCabinet', 'kitchenCoffeeMachine', 'kitchenFridge', 'kitchenMicrowave', 'pottedPlant', 'plantSmall1',
  'bench', 'loungeSofa', 'cardboardBoxClosed', 'cardboardBoxOpen', 'coatRackStanding', 'sideTable'];
await carregarModelos(MODELOS);
const mundo = criarPredio(scene, { instanciar });
// ?modelos=1: vitrine com todos os modelos virados para +z (para conferir a frente de cada um).
if (params.has('modelos')) MODELOS.forEach((n, i) => { const m = instanciar(n, { x: -6 + (i % 11) * 1.2, z: 2 + Math.floor(i / 11) * 2.2, altura: 0.9 }); if (m) scene.add(m); });
const efeitos = { lanterna: false, cabine01: false, mostrarRota: false, leite: null };
let cabineAberta = false;
const paredesAtuais = () => (cabineAberta ? PAREDES : [...PAREDES, PORTA_CABINE_01]);
const controlesToque = TOQUE ? criarControlesToque(document.getElementById('ui')) : null;
const jogador = criarJogador(camera, canvas, paredesAtuais, PONTOS.inicio, { entrada: controlesToque?.entrada });
const travarMouse = () => { if (!SEM_TRAVA && !TOQUE) jogador.travar(); };
jogador.olharPara({ x: 0, z: 0 });

const lanterna = new THREE.SpotLight(0xfff2d0, 0, 14, 0.45, 0.5, 1.2);
lanterna.position.set(0, -0.1, 0);
lanterna.target.position.set(0, -0.1, -1);
camera.add(lanterna, lanterna.target);

const ui = criarUI(document.getElementById('ui'), { toque: TOQUE });
const audio = criarAudio();

function aplicarConfig(c) {
  ps1.definirQualidade(c.qualidade);
  camera.fov = c.fov; camera.updateProjectionMatrix();
  audio.definirVolumes({ geral: c.volumeGeral, efeitos: c.volumeEfeitos, ambiente: c.volumeAmbiente });
  jogador.ajustar({ sensMouse: c.sensMouse, sensToque: c.sensToque, inverterY: c.inverterY });
  efeitosTela.classList.toggle('desligado', !c.efeitosTela);
}
function abrirConfig() {
  ui.configuracoes(config, CONFIG_PADRAO, (c) => { config = c; aplicarConfig(c); salvarConfig(armazenamento, c); });
}
aplicarConfig(config);

// App instalável: botão de instalar e aviso de versão nova (só funciona no endereço próprio do jogo).
const instalador = criarInstalador({
  aoPoderInstalar: () => { if (modo === 'inicio') ui.botaoInstalar(() => instalador.instalar()); },
  aoTerVersaoNova: (atualizar) => ui.versaoNova(atualizar),
});

// ---------- Lógica ----------
const clock = createClock({ segundosPorHora: SEGUNDOS_POR_HORA });
const quiz = createQuiz({ perguntas: PERGUNTAS, final: PERGUNTA_FINAL });
const fiscal = createFiscal({ rota: [], origem: PONTOS.origemFiscal, navegar: proximoAlvo });
const inventario = createInventario();
const noite = createNoite({ clock, fiscal, inventario, quiz });
const ferramentas = createFerramentas();
const folego = createFolego();
const OUVE_CORRIDA = 10; // metros: o Fiscal ouve você correndo

// ---------- Personagens e objetos ----------
const fiscalMesh = criarPersonagem('fiscal');
fiscalMesh.visible = false;
scene.add(fiscalMesh);
const aparicao = criarPersonagem('fiscal'); // para os sustos
aparicao.getObjectByName('peruca').visible = true;
aparicao.visible = false;
scene.add(aparicao);

let maoMesh = null; // ferramenta na frente da câmera
const paginasMesh = PAGINAS.map((pg) => {
  const m = criarPagina();
  m.position.set(pg.ponto.x, 0, pg.ponto.z);
  m.rotation.y = pg.ponto.x * 0.7;
  scene.add(m);
  return m;
});
const paginasLidas = new Set(); // não volta na derrota
const marcadores = new Map(); // id da tarefa → marcador (some quando a tarefa é feita)

let modo = 'inicio'; // inicio | jogando | derrota | fim
let pausado = false;
let perguntaAberta = null; // { final, controles }
let visitantes = []; // { v, mesh, estado: 'esperando' | 'falando' | 'feito' }
let votos = new Set();
let telefoneTocando = 0;
let proximoToque = 0;
let apagao = 0;
let susto = null;
let vendoMonitor = 0;
let tempoPasso = 0;
let tempoPoca = POCA_A_CADA;
let segurando = null; // id da tarefa que está sendo feita (segurar E)
let checkpointExtra = null;
let ultimaPosFiscal = fiscal.posicao();
let agendados = []; // { em: segundos de jogo, fn } — param na pausa e somem na derrota
let nivelMedo = 0;
let shift = false, andouAntes = false, correndo = false, posTeste = null;

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

const nomeSala = (id) => SALAS.find((s) => s.id === id)?.nome ?? '';
const mesmoAndar = (a, b) => andarDe(a) === andarDe(b);
const perto = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) <= r;

// ---------- Ferramenta na mão ----------
function atualizarMao() {
  if (maoMesh) { camera.remove(maoMesh); descartar(maoMesh); maoMesh = null; }
  const id = ferramentas.naMao();
  for (const [f, mesh] of Object.entries(mundo.ferramentas)) mesh.visible = f !== id;
  if (id) { maoMesh = criarFerramentaNaMao(id); camera.add(maoMesh); }
}

function pegarFerramenta(id) {
  const antes = ferramentas.naMao();
  ferramentas.pegar(id);
  atualizarMao();
  audio.tocar('item');
  const agora = ferramentas.naMao();
  if (!agora) ui.aviso(`Você devolveu: ${FERRAMENTAS[id]}`, 2);
  else ui.aviso(antes ? `Trocou ${FERRAMENTAS[antes]} por ${FERRAMENTAS[agora]}` : `Na mão: ${FERRAMENTAS[agora]}`, 2);
}

// ---------- Visitantes ----------
function entrarVisitante(v, direto = false) {
  const lugar = LUGAR_VISITANTE[v.id];
  const mesh = criarPersonagem(v.id);
  mesh.position.set(lugar.x, 0, lugar.z);
  scene.add(mesh);
  visitantes.push({ v, mesh, estado: 'esperando' });
  if (!direto) {
    audio.tocar('entrada');
    ui.aviso(`${v.nome} está esperando você: ${nomeSala(regiaoDe(lugar))}`, 4);
  }
}

function falarCom(vis) {
  vis.estado = 'falando';
  ui.dialogo(vis.v.nome, [...vis.v.falas, vis.v.voto], () => {
    inventario.adicionar(vis.v.item);
    votos.add(vis.v.id);
    audio.tocar('item');
    const it = ITENS[vis.v.item];
    ui.aviso(`Voto NÃO registrado (${votos.size}/8) · Você recebeu: ${it.nome} — ${it.dica}`, 4.5);
    vis.estado = 'feito';
  });
}

function atualizarVisitantes(t) {
  const pj = jogador.posicao();
  for (const vis of visitantes) {
    const p = vis.mesh.position;
    vis.mesh.rotation.y = Math.atan2(pj.x - p.x, pj.z - p.z);
    animarParado(vis.mesh, t);
  }
}

// Na virada da hora, quem já falou com você vai embora.
function dispensarVisitantes() {
  for (const vis of visitantes.filter((v) => v.estado === 'feito')) { scene.remove(vis.mesh); descartar(vis.mesh); }
  visitantes = visitantes.filter((v) => v.estado !== 'feito');
}

// ---------- Marcadores das tarefas (inclui as poças do Fiscal) ----------
function sincronizarTarefas() {
  const pendentes = new Map(noite.tarefas().filter((t) => !t.feita).map((t) => [t.id, t]));
  for (const [id, m] of marcadores) if (!pendentes.has(id)) { scene.remove(m); descartar(m); marcadores.delete(id); }
  for (const [id, t] of pendentes) {
    if (marcadores.has(id)) continue;
    const m = criarMarcador(t);
    scene.add(m);
    marcadores.set(id, m);
  }
}
const sincronizarPocas = sincronizarTarefas;

// ---------- Eventos da noite ----------
function tratarEvento(e) {
  if (e.tipo === 'hora') {
    dispensarVisitantes();
    segurando = null;
    checkpointExtra = {
      efeitos: { ...efeitos, leite: null },
      cabineAberta,
      ferramenta: ferramentas.snapshot(),
      votos: new Set(votos),
      pendentes: visitantes.map((v) => v.v),
    };
    sincronizarPocas();
    if (e.hora > 0 && e.hora < 6) ui.aviso(`${String(e.hora).padStart(2, '0')}:00 — novas tarefas no relatório`, 3);
    if (e.hora === 6) {
      ui.aviso('06:00 — Leve o relatório ao PAINEL DE VOTAÇÃO do plenário (1º andar)!', 6);
      ui.legenda('', '(o Fiscal não vai deixar barato)', 4);
    }
    return;
  }
  if (e.tipo === 'hora_concluida') {
    ui.carimbo(e.hora, e.aprovado);
    audio.tocar(e.aprovado ? 'acerto' : 'erro');
    if (e.aprovado) {
      // Espera conversa ou pergunta fechar antes de virar a hora.
      const virar = () => { if (ui.ocupado() || perguntaAberta) agendar(0.5, virar); else noite.avancarHora(); };
      agendar(2.2, virar);
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
      ui.legenda('', '(uma porta bateu em algum lugar do prédio)', 4);
      break;
    case 'fiscal_monitor':
      audio.tocar('passo_molhado');
      ui.legenda('', '(Tem alguém parado no corredor dos gabinetes, lá em cima. Confira o monitor.)', 5);
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
      susto = { tipo: id, aparicaoAte: 8, assustaAoOlhar: true };
      break;
    }
  }
}

function atualizarSustos(dt) {
  if (!susto || susto.aparicaoAte === undefined) return;
  susto.aparicaoAte -= dt;
  if (susto.assustaAoOlhar && jogador.olhandoPara({ x: aparicao.position.x, z: aparicao.position.z }, paredesAtuais(), 30)) {
    audio.tocar('susto'); ui.flash();
    susto.assustaAoOlhar = false;
    susto.aparicaoAte = Math.min(susto.aparicaoAte, 0.5);
  }
  if (susto.aparicaoAte <= 0) { aparicao.visible = false; susto = null; }
}

// ---------- Luzes, espelhos e som ----------
function atualizarLuzes(dt) {
  if (apagao > 0) apagao -= dt;
  const pj = jogador.posicao();
  const andar = andarDe(pj);
  const sala = regiaoDe(pj);
  for (const l of mundo.luzes) {
    const doAndar = andarDe(l.luz.position) === andar;
    const tremor = Math.random() < 0.015 ? Math.random() * 0.6 : 1;
    const fraca = noite.fase() === 'final' ? 0.6 : 1;
    const ligada = doAndar && !(apagao > 0);
    const queimada = l.sala === 'fem_t' && noite.tarefas().some((x) => x.id === 'lampada_fem' && !x.feita);
    l.luz.intensity = ligada ? l.base * (queimada ? (Math.random() < 0.08 ? 0.5 : 0.04) : tremor) * fraca : 0;
    l.tubo.material.color.setScalar(ligada ? 0.95 * tremor : 0.05);
  }
  // Espelho só reflete quando você está na mesma sala (economiza o celular).
  for (const e of mundo.espelhos) e.espelho.visible = regiaoDe(e.ponto) === sala;
  lanterna.intensity = efeitos.lanterna ? 12 : 0;
}

function atualizarSom(dt) {
  const pj = jogador.posicao(), fp = fiscal.posicao();
  const alvo = fiscal.visivel(clock.minutos()) && clock.minutos() >= 120 && mesmoAndar(pj, fp)
    ? Math.max(0, 1 - Math.hypot(pj.x - fp.x, pj.z - fp.z) / 16) : 0;
  nivelMedo += (alvo - nivelMedo) * Math.min(1, dt * 2);
  audio.nivelAmbiente(nivelMedo, dt);
}

// ---------- Pergunta do Fiscal ----------
function abrirPergunta(final = false) {
  segurando = null;
  ui.progresso(null);
  if (!final) jogador.olharPara(fiscal.posicao());
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
  fiscalMesh.getObjectByName('peruca').visible = Math.random() < 0.5;
  if (final && segura === false && !quiz.perdeu()) {
    agendar(1.8, () => { if (!perguntaAberta) abrirPergunta(true); });
    return;
  }
  if (!final) { fiscal.voltarParaOrigem(pontoDeRecomeco()); fiscal.pausar(3); fiscal.tregua(25); cacador.cacando = 0; }
}

// Depois de uma pergunta o Fiscal recomeça em outro andar (precisa da escada para te achar).
function pontoDeRecomeco() {
  return andarDe(jogador.posicao()) === '1andar' ? PONTOS.recomecoTerreo : PONTOS.recomeco1andar;
}

function terminarNoite() {
  const resultado = noite.vencer();
  modo = 'fim';
  aparicao.visible = false;
  fiscalMesh.visible = false;
  mundo.escreverPainel(resultado === 'arquivado'
    ? ['PL 24/2026', 'BANHEIRO FISCALIZADO', 'ARQUIVADO'] : ['PL 24/2026', 'BANHEIRO FISCALIZADO', 'APROVADO'],
  resultado === 'arquivado' ? '#5aff7a' : '#ff3a2a');
  jogador.olharPara({ x: 100, z: -20 });
  ui.mostrarHud(false);
  controlesToque?.mostrar(false);
  document.exitPointerLock?.();
  audio.tocar(resultado === 'arquivado' ? 'acerto' : 'erro');
  setTimeout(() => {
    ui.escurecer(true);
    setTimeout(() => {
      ui.escurecer(false);
      ui.vitoria(resultado, paginasLidas.size === PAGINAS.length, () => {
        audio.tocar('telefone');
        ui.posCreditos(() => location.reload());
      });
    }, 1600);
  }, 2600);
}

function comecarFinal() {
  // O Fiscal aparece bem atrás de você, no plenário.
  const p = jogador.posicao(), d = jogador.direcao();
  fiscal.voltarParaOrigem();
  fiscal.suspender(9999);
  mostrarAparicao({ x: p.x - d.x * 1.1, z: p.z - d.z * 1.1 }, 9999, true);
  audio.tocar('susto');
  abrirPergunta(true);
}

// ---------- Itens dos visitantes ----------
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
    chave: 'A chave da cabine 01 (masculino do térreo) agora é sua.',
    mapa: 'Mapa aberto: o relatório mostra onde o Fiscal está.',
  };
  if (id === 'caneca') audio.tocar('porta_bate');
  if (id === 'chave') { cabineAberta = true; mundo.portaCabine01.rotation.y = 1.3; }
  ui.aviso(textos[id] ?? 'Item usado.', 2.5);
}

// ---------- Interação (E) ----------
function interacaoAtual() {
  const p = jogador.posicao();
  const opcoes = [];
  const add = (ponto, raio, texto, extra) => {
    if (perto(p, ponto, raio)) opcoes.push({ d: Math.hypot(p.x - ponto.x, p.z - ponto.z), texto, ...extra });
  };
  for (const vis of visitantes) {
    if (vis.estado === 'esperando') add({ x: vis.mesh.position.x, z: vis.mesh.position.z }, 1.8, `Falar com ${vis.v.nome}`, { acao: () => falarCom(vis) });
  }
  for (const t of noite.tarefas()) {
    if (t.feita) continue;
    if (ferramentas.podeFazer(t)) add(t.ponto, 1.5, t.texto, { tarefa: t.id });
    else add(t.ponto, 1.5, `${t.texto} (precisa: ${FERRAMENTAS[t.ferramenta]})`, {
      acao: () => ui.aviso(`Precisa de ${FERRAMENTAS[t.ferramenta]}. Pegue no ALMOXARIFADO (térreo).`, 3),
    });
  }
  for (const [id, lugar] of Object.entries(FERRAMENTAS_LUGAR)) {
    const naMao = ferramentas.naMao() === id;
    add(lugar, 1.1, naMao ? `Devolver: ${FERRAMENTAS[id]}` : `Pegar: ${FERRAMENTAS[id]}`, { acao: () => pegarFerramenta(id) });
  }
  for (const e of ESCADAS) {
    add(e.usarA, 1.2, e.rotuloA, { acao: () => usarEscada(e.b, e.usarB) });
    add(e.usarB, 1.2, e.rotuloB, { acao: () => usarEscada(e.a, e.usarA) });
  }
  PAGINAS.forEach((pg, i) => {
    if (!paginasLidas.has(i)) add(pg.ponto, 1.2, 'Ler página da prancheta', { acao: () => lerPagina(i) });
  });
  if (telefoneTocando > 0) add(PONTOS.guiche, 1.4, 'Atender o telefone', { acao: atenderTelefone });
  if (!cabineAberta) {
    add({ x: -18.8, z: -8.8 }, 1, 'Cabine 01 (trancada)', {
      acao: () => ui.aviso(inventario.tem('chave') ? 'Use a chave (tecla do item).' : 'Trancada. Alguém deve ter a chave.', 2.5),
    });
  }
  opcoes.sort((a, b) => a.d - b.d);
  return opcoes[0] ?? null;
}

function usarEscada(chegada, de) {
  segurando = null;
  ui.escurecer(true);
  audio.tocar('passo_molhado');
  agendar(0.45, () => {
    jogador.teleportar(chegada);
    // Olha para longe da escada.
    const dx = chegada.x - de.x, dz = chegada.z - de.z, n = Math.hypot(dx, dz) || 1;
    jogador.olharPara({ x: chegada.x + (dx / n) * 5, z: chegada.z + (dz / n) * 5 });
    ui.escurecer(false);
    ui.aviso(nomeSala(regiaoDe(chegada)), 1.8);
  });
}

function lerPagina(i) {
  paginasLidas.add(i);
  scene.remove(paginasMesh[i]);
  audio.tocar('papel');
  ui.dialogo(`Página da prancheta (${paginasLidas.size}/${PAGINAS.length})`, [PAGINAS[i].texto]);
}

function atenderTelefone() {
  telefoneTocando = 0;
  ui.legenda('Telefone', '(silêncio... só uma respiração do outro lado)', 3.5);
  agendar(3.5, () => ui.legenda('Telefone', 'Alôôôô? ... É da limpeza? Tô indo aí fiscalizar.', 4.5));
}

// Apertar E / botão de ação: tarefas são de segurar; o resto é na hora.
function acaoInicio() {
  if (modo !== 'jogando' || pausado) return;
  if (ui.ocupado()) { if (!perguntaAberta) ui.tecla('KeyE'); return; }
  const it = interacaoAtual();
  if (!it) return;
  if (it.tarefa) { segurando = it.tarefa; return; }
  it.acao();
}
function acaoFim() { segurando = null; ui.progresso(null); }

function atualizarSegurando(dt) {
  if (!segurando) return;
  const it = interacaoAtual();
  if (!it || it.tarefa !== segurando || ui.ocupado()) { acaoFim(); return; }
  const t = noite.tarefas().find((x) => x.id === segurando);
  if (t.id === 'monitor') { if (vendoMonitor <= 0) jogador.olharPara(PONTOS.monitor); vendoMonitor = 0.3; }
  const r = noite.progredir(segurando, dt);
  ui.progresso(t.texto, r.frac);
  if (!r.feita) return;
  audio.tocar(t.ferramenta === 'esfregao' ? 'pano' : t.ferramenta === 'rolos' ? 'papel' : 'acerto');
  acaoFim();
  sincronizarPocas();
  if (t.id === 'painel') { comecarFinal(); return; }
  const faltam = noite.tarefas().filter((x) => !x.feita).length;
  ui.aviso(faltam ? `✔ ${t.texto} — faltam ${faltam}` : '✔ Tudo feito nesta hora!', 2);
}

// ---------- Teclado, mouse e toque ----------
addEventListener('keydown', (e) => {
  if (modo !== 'jogando' || pausado || e.repeat) return;
  if (ui.tecla(e.code)) { e.preventDefault(); return; }
  if (ui.ocupado() && !perguntaAberta) return;
  if (e.code === 'KeyE') { acaoInicio(); return; }
  const m = /^Digit([1-8])$/.exec(e.code);
  if (m) usarItem(Number(m[1]) - 1);
});
addEventListener('keyup', (e) => { if (e.code === 'KeyE') acaoFim(); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false; });
addEventListener('keydown', (e) => { if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true; });
addEventListener('blur', () => { shift = false; });
canvas.addEventListener('click', () => { if (modo === 'jogando') travarMouse(); });
ui.onItem((i) => { if (modo === 'jogando' && !pausado && !(ui.ocupado() && !perguntaAberta)) usarItem(i); });
if (controlesToque) {
  controlesToque.mostrar(false);
  controlesToque.onAcao(acaoInicio, acaoFim);
  controlesToque.onPausa(() => {
    if (modo !== 'jogando') return;
    pausado = true;
    acaoFim();
    controlesToque.zerar();
    ui.pausa(true, () => { pausado = false; ui.pausa(false); }, abrirConfig);
  });
}
// No computador, Esc solta o mouse e pausa; "Continuar" trava o mouse de novo.
jogador.onSoltar(() => { if (modo === 'jogando' && !SEM_TRAVA && !TOQUE) { pausado = true; acaoFim(); ui.pausa(true, travarMouse, abrirConfig); } });
jogador.onTravar(() => { pausado = false; ui.pausa(false); });
document.addEventListener('pointerlockerror', () => { if (modo === 'jogando' && !SEM_TRAVA && !TOQUE) { pausado = true; ui.pausa(true, travarMouse, abrirConfig); } });

// ---------- Derrota e checkpoint ----------
function perder() {
  modo = 'derrota';
  agendados = [];
  acaoFim();
  if (perguntaAberta) { perguntaAberta.controles.fechar(); perguntaAberta = null; }
  audio.tocar('susto'); ui.flash();
  document.exitPointerLock?.();
  ui.mostrarHud(false);
  controlesToque?.mostrar(false);
  ui.derrota(`${String(clock.hora()).padStart(2, '0')}:00`, () => {
    noite.voltarCheckpoint();
    visitantes.forEach((v) => { scene.remove(v.mesh); descartar(v.mesh); });
    visitantes = [];
    if (checkpointExtra) {
      Object.assign(efeitos, checkpointExtra.efeitos);
      cabineAberta = checkpointExtra.cabineAberta;
      mundo.portaCabine01.rotation.y = cabineAberta ? 1.3 : 0;
      ferramentas.restaurar(checkpointExtra.ferramenta);
      votos = new Set(checkpointExtra.votos);
      checkpointExtra.pendentes.forEach((v) => entrarVisitante(v, true));
    }
    atualizarMao();
    sincronizarPocas();
    folego.restaurar({ valor: 5, cansado: false });
    aparicao.visible = false; susto = null; apagao = 0; telefoneTocando = 0;
    jogador.teleportar(PONTOS.inicio);
    jogador.olharPara({ x: 0, z: 0 });
    modo = 'jogando';
    ui.mostrarHud(true);
    controlesToque?.zerar();
    controlesToque?.mostrar(true);
    travarMouse();
  });
}

// ---------- Loop ----------
let anterior = performance.now();
let quadro = 0;
let tempoHud = 0;

// Ronda: o Fiscal anda de sala em sala. Caça: quando te enxerga (até 9 m), vem atrás por 7 s.
// A ronda passa por dentro das salas, nunca pelos patamares de escada nem pelos corredores.
const PONTOS_RONDA = SALAS.filter((s) => !s.fechada && !SALAS_SEGURAS.includes(s.id) && !/corredor|hall|portaria/.test(s.id))
  .map((s) => ({ x: (s.minX + s.maxX) / 2, z: (s.minZ + s.maxZ) / 2 }));
const cacador = { cacando: 0, ronda: PONTOS_RONDA[0] };

function alvoDoFiscal(pj, minuto, dt) {
  const fp = fiscal.posicao();
  const seguro = minuto < 240 && SALAS_SEGURAS.includes(regiaoDe(pj));
  const distancia = Math.hypot(fp.x - pj.x, fp.z - pj.z);
  const meVe = !seguro && mesmoAndar(fp, pj) && distancia < 9 && temVisao(fp, pj, PAREDES);
  // Correr faz barulho: ele ouve e vem, mesmo sem te ver.
  const meOuve = !seguro && correndo && mesmoAndar(fp, pj) && distancia < OUVE_CORRIDA;
  if (meVe) cacador.cacando = 7;
  else if (meOuve) cacador.cacando = Math.max(cacador.cacando, 5);
  else cacador.cacando = Math.max(0, cacador.cacando - dt);
  if (cacador.cacando > 0) return pj;
  // Chegou no ponto de ronda (ou é inalcançável): sorteia outro.
  if (Math.hypot(fp.x - cacador.ronda.x, fp.z - cacador.ronda.z) < 0.8) {
    cacador.ronda = PONTOS_RONDA[Math.floor(Math.random() * PONTOS_RONDA.length)];
  }
  return cacador.ronda;
}

function atualizar(dt, t) {
  rodarAgendados(dt);
  if (modo !== 'jogando') return;
  const ocupado = ui.ocupado();
  if (efeitos.leite) { efeitos.leite.segundos -= dt; if (efeitos.leite.segundos <= 0) efeitos.leite = null; }
  if (vendoMonitor > 0) vendoMonitor -= dt;
  const podeMexer = !ocupado && vendoMonitor <= 0;
  if (controlesToque) { const o = controlesToque.consumirOlhar(); if (podeMexer) jogador.girar(o.dx, o.dy); }
  const analogico = controlesToque?.entrada();
  const querCorrer = (shift || (analogico && Math.hypot(analogico.lado, analogico.frente) > 0.95)) && !segurando && podeMexer;
  correndo = folego.update(dt, querCorrer, andouAntes);
  const vel = (efeitos.leite ? efeitos.leite.velocidade : 1) * ferramentas.multVelocidade() * (correndo ? VELOCIDADE_CORRIDA : 1);
  const antes = jogador.posicao();
  jogador.update(dt, vel, podeMexer);
  const depois = jogador.posicao();
  // "Andando" = a posição mudou neste quadro (vale para teclado, toque e testes).
  andouAntes = Math.hypot(depois.x - antes.x, depois.z - antes.z) > 1e-4 || (posTeste && Math.hypot(depois.x - posTeste.x, depois.z - posTeste.z) > 1e-4);
  posTeste = depois;
  ui.folego(folego.frac(), folego.cansado());
  atualizarSegurando(dt);

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
    const pelaCamera = vendoMonitor > 0 && ['corredor_1', 'hall_1'].includes(regiaoDe(fp));
    const olhando = pelaCamera || (mesmoAndar(pj, fp) && jogador.olhandoPara(fp, paredesAtuais()));
    const r = fiscal.update(dt, { minuto, jogador: pj, alvo: alvoDoFiscal(pj, minuto, dt), olhando });
    if (r === 'alcancou' && fiscal.visivel(minuto)) abrirPergunta(false);
  }
  const fp = fiscal.posicao();
  fiscalMesh.visible = fiscal.visivel(minuto) && !aparicao.visible;
  fiscalMesh.position.set(fp.x, 0, fp.z);
  fiscalMesh.rotation.y = Math.atan2(pj.x - fp.x, pj.z - fp.z);
  const andou = Math.hypot(fp.x - ultimaPosFiscal.x, fp.z - ultimaPosFiscal.z);
  ultimaPosFiscal = fp;
  if (andou > 1e-4 && andou < 5) {
    animarAndando(fiscalMesh, t);
    tempoPasso -= dt;
    if (tempoPasso <= 0 && mesmoAndar(fp, pj) && Math.hypot(fp.x - pj.x, fp.z - pj.z) < 9) { audio.tocar('passo_molhado'); tempoPasso = 0.7; }
    // Ele deixa poças pelo caminho.
    tempoPoca -= dt;
    if (tempoPoca <= 0 && regiaoDe(fp)) { if (noite.adicionarPoca(fp)) sincronizarPocas(); tempoPoca = POCA_A_CADA; }
  } else animarParado(fiscalMesh, t);

  if (telefoneTocando > 0) {
    telefoneTocando -= dt; proximoToque -= dt;
    if (proximoToque <= 0 && mesmoAndar(pj, PONTOS.guiche)) { audio.tocar('telefone'); proximoToque = 2.5; }
  }

  atualizarVisitantes(t);
  atualizarSustos(dt);
  atualizarLuzes(dt);
  atualizarSom(dt);
  for (const m of marcadores.values()) animarMarcador(m, t);
  paginasMesh.forEach((m, i) => { if (!paginasLidas.has(i)) m.position.y = 0.02 + Math.sin(t * 2 + i) * 0.015; });

  tempoHud -= dt;
  if (tempoHud <= 0) {
    tempoHud = 0.25;
    const it = !ocupado && !perguntaAberta && !segurando ? interacaoAtual() : null;
    ui.dica(segurando ? null : it?.texto ? `${it.texto}${it.tarefa ? ' (segure)' : ''}` : null);
    controlesToque?.rotuloAcao(ui.ocupado() && !perguntaAberta ? 'Continuar' : it?.texto ?? null);
    const itens = inventario.itens().map((id, i) => ({ tecla: i + 1, nome: ITENS[id].nome }));
    const tarefas = noite.tarefas().map((x) => ({
      ...x, precisa: x.ferramenta ? FERRAMENTAS[x.ferramenta] : null, temFerramenta: ferramentas.podeFazer(x),
    }));
    const hora = clock.hora();
    const segRestantes = hora < 6 && noite.relatorio()[hora] === null
      ? Math.ceil((60 - (clock.minutos() % 60)) * (SEGUNDOS_POR_HORA / 60)) : 0;
    const extras = efeitos.mostrarRota ? [`Mapa: Fiscal em ${nomeSala(regiaoDe(fp)) || '???'}`] : [];
    ui.hud({
      relogio: clock.formatar(),
      restante: segRestantes ? `fim da hora em ${Math.floor(segRestantes / 60)}:${String(segRestantes % 60).padStart(2, '0')}` : '',
      itens, tarefas, erros: quiz.erros(), relatorio: noite.relatorio(), hora,
      naMao: ferramentas.naMao() ? FERRAMENTAS[ferramentas.naMao()] : null,
      votos: votos.size, paginas: paginasLidas.size, extras,
    });
  }
}

function loop(agora) {
  const dt = Math.min((agora - anterior) / 1000, 0.1);
  anterior = agora;
  const t = agora / 1000;
  if (modo === 'jogando' && !pausado) atualizar(dt, t);
  // O monitor só é desenhado quando você está na portaria.
  if (quadro++ % 3 === 0 && regiaoDe(jogador.posicao()) === 'portaria') ps1.renderEm(mundo.monitor.alvo, scene, mundo.monitor.camera);
  ps1.render(scene, camera);
  requestAnimationFrame(loop);
}

// ?minuto=N começa a noite mais tarde (para testes).
if (params.has('minuto')) {
  const alvo = Math.min(Number(params.get('minuto')) || 0, 360);
  while (clock.minutos() < alvo) { clock.tick(0.1); noite.update().filter((e) => e.tipo !== 'hora_concluida').forEach(tratarEvento); }
}

// ---------- Início ----------
function comecar() {
  audio.iniciar();
  audio.ambiente(true);
  modo = 'jogando';
  ui.mostrarHud(true);
  noite.update().forEach(tratarEvento);
  ui.legenda('', 'Às 06:00 vota-se o PL do Banheiro Fiscalizado. Deixe o relatório de limpeza perfeito para arquivar o projeto.', 7);
  if (controlesToque) {
    controlesToque.mostrar(true);
    document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }
  travarMouse();
}

// ?galeria=1 mostra todos os personagens lado a lado (para conferir a aparência).
if (params.has('galeria')) {
  IDS_PERSONAGENS.forEach((id, i) => {
    const p = criarPersonagem(id);
    p.position.set(-3.6 + i * 0.9, 0, 3);
    scene.add(p);
  });
  const luz = new THREE.PointLight(0xffffff, 8, 10, 1.2);
  luz.position.set(0, 2.6, 6);
  scene.add(luz);
  jogador.teleportar({ x: 0, z: 7.4 });
  jogador.olharPara({ x: 0, z: 0 });
  modo = 'galeria';
} else {
  ui.telaInicial(comecar, abrirConfig, { versao: VERSAO, dicaIOS: instalador.dicaIOS() });
  if (instalador.podeInstalar()) ui.botaoInstalar(() => instalador.instalar());
}
// ?ver=x,z,alvoX,alvoZ posiciona a câmera (para prints de teste).
if (params.has('ver')) {
  const [x, z, ax, az] = params.get('ver').split(',').map(Number);
  jogador.teleportar({ x, z });
  jogador.olharPara({ x: ax, z: az });
  for (const l of mundo.luzes) l.luz.intensity = andarDe(l.luz.position) === andarDe({ x, z }) ? l.base : 0;
}
requestAnimationFrame(loop);

// Ganchos para testes automáticos.
window.__jogo = {
  clock, quiz, fiscal, inventario, noite, jogador, ui, ferramentas, abrirConfig, config: () => config,
  estado: () => ({
    modo, pausado, fase: noite.fase(), minuto: clock.minutos(), perguntaAberta: !!perguntaAberta,
    visitantes: visitantes.map((v) => `${v.v.id}:${v.estado}`), itens: inventario.itens(), erros: quiz.erros(),
    relatorio: noite.relatorio(), naMao: ferramentas.naMao(), votos: votos.size, paginas: paginasLidas.size,
    tarefas: noite.tarefas().map((x) => `${x.id}:${x.feita ? 1 : 0}`), segurando, correndo, folego: folego.frac(),
  }),
  comecar, abrirPergunta, pegarFerramenta, acaoInicio, acaoFim, lerPagina,
  correr: (v) => { shift = v; },
  proximoAlvo, regiaoDe,
  interagir: () => { const it = interacaoAtual(); if (it?.acao) it.acao(); return it?.texto ?? null; },
  interacao: () => interacaoAtual()?.texto ?? null,
  teleportar: (x, z) => jogador.teleportar({ x, z }),
  tecla: (code) => dispatchEvent(new KeyboardEvent('keydown', { code })),
};
