// Plantão no Banheiro — Episódio 1: A Votação do Banheiro.
// Liga a lógica da noite (tarefas, relatório, Fiscal, visitantes) ao prédio 3D.
import * as THREE from 'three';
import { criarPredio } from './world/predio.js';
import { criarJogador } from './world/jogador.js';
import { criarRenderPS1 } from './world/ps1.js';
import {
  PAREDES, PONTOS, PORTA_CABINE_01, ESCADAS, FERRAMENTAS_LUGAR, LUGAR_VISITANTE, SALAS, ESCONDERIJOS, andarDe,
} from './world/planta.js';
import { temVisao } from './world/fisica.js';
import { criarPersonagem, animarParado, animarAndando, IDS_PERSONAGENS } from './world/personagens.js';
import { criarFerramentaNaMao, criarPagina, criarObjetoFavor } from './world/objetos.js';
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
import { ITENS, VISITANTES } from './data/visitantes.js';
import { DUBLAGEM, VOZES_CACADA } from './data/dublagem.js';
import { FERRAMENTAS, FITAS, DURACAO_PERSEGUICAO } from './data/noite.js';
import { FAVORES } from './data/favores.js';
import { createFavores } from './logic/favores.js';
import { createRespiracao } from './logic/esconderijo.js';
import { createSuspeita } from './logic/suspeita.js';
import { salvarNoite, carregarNoite, apagarNoite } from './logic/salvar.js';
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
const FITA_A_CADA = 45; // segundos entre uma porta interditada e outra
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
  'bench', 'loungeSofa', 'cardboardBoxClosed', 'cardboardBoxOpen', 'coatRackStanding', 'sideTable',
  // Itens (Kenney Survival/Food Kit e Poly Haven, CC0): ver assets/modelos/CREDITOS-itens.txt.
  'item_balde', 'item_desentupidor', 'item_sabonete', 'item_cafe', 'item_caneca', 'item_leite'];
await carregarModelos(MODELOS);
const mundo = criarPredio(scene, { instanciar });
// ?modelos=1: vitrine com todos os modelos virados para +z (para conferir a frente de cada um).
if (params.has('modelos')) MODELOS.forEach((n, i) => { const m = instanciar(n, { x: -6 + (i % 11) * 1.2, z: 2 + Math.floor(i / 11) * 2.2, altura: 0.9 }); if (m) scene.add(m); });
const efeitos = { lanterna: false, cabine01: false, mostrarRota: false, leite: null };
let cabineAberta = false;
// Paredes de agora: cabine 01 trancada (sem a chave) e portas interditadas com fita.
const paredesAtuais = () => [...PAREDES, ...(cabineAberta ? [] : [PORTA_CABINE_01]), ...noite.portasInterditadas().map((p) => FITAS[p].parede)];
const controlesToque = TOQUE ? criarControlesToque(document.getElementById('ui')) : null;
const jogador = criarJogador(camera, canvas, paredesAtuais, PONTOS.inicio, { entrada: controlesToque?.entrada });
const travarMouse = () => { if (!SEM_TRAVA && !TOQUE) jogador.travar(); };
jogador.olharPara({ x: 0, z: 0 });

const lanterna = new THREE.SpotLight(0xfff2d0, 0, 14, 0.45, 0.5, 1.2);
lanterna.position.set(0, -0.1, 0);
lanterna.target.position.set(0, -0.1, -1);
camera.add(lanterna, lanterna.target);
// Luz fraquinha perto de você quando está escondido (senão o lado de dentro da porta fica preto).
const luzEsconderijo = new THREE.PointLight(0xc8d0c0, 0, 2.2, 2);
camera.add(luzEsconderijo);

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
const favores = createFavores();
const respiracao = createRespiracao();
const suspeita = createSuspeita();
// Números da noite para o relatório final (não voltam na derrota).
const stats = { pego: 0, erros: 0, escondido: 0, fugiu: 0, fitas: 0, derrotas: 0, tempo: 0 };
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
let tempoFita = FITA_A_CADA;
let escondido = null; // esconderijo em que você está
let prendendoAr = false; // Espaço (ou botão no celular)
let vozFiscal = null, tempoVozFiscal = 1.5, ultimaVozFiscal = -1;
let perseg = { ativa: false, ultimo: null, busca: null, abrindo: 0, alarme: 0 };
let ligacao = 'mudo'; // qual ligação está tocando
let tempoPista = 6; // próxima pista de som do Fiscal (caneta, assobio)
const perucasCaidas = []; // susto da peruca (somem na virada da hora)
const objetosFavor = new Map(); // id do objeto → mesh
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
const VISITANTES_NOME = { lulao: 'Lulão', mamae_falou: 'Mamãe Falou', renan: 'Renan Santarém', moraez: 'Ministro Moraez', kim: 'Kim Katagiri', nicolas: 'Nicolas Ferrer', jairo: 'Seu Jairo', flavio: 'Flávio "Zero Um"' };
function resumoFavor(id) {
  const f = FAVORES[id];
  if (!favores.podeEntregar(id, { naMao: ferramentas.naMao() })) {
    if (f.tipo === 'pegar') return favores.carregando().includes(f.objeto.id) ? 'leve até ele' : `${f.objeto.nome} (${f.objeto.onde})`;
    if (f.tipo === 'filmar') return `filmar o Fiscal ${Math.floor(favores.fracFilmagem() * f.segundos)}/${f.segundos} s`;
    if (f.tipo === 'mandado') return 'entregar o mandado ao Fiscal';
    return `levar ${FERRAMENTAS[f.ferramenta]} na mão`;
  }
  return 'pronto, volte e fale com ele';
}
const mesmoAndar = (a, b) => andarDe(a) === andarDe(b);
const perto = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) <= r;

// ---------- Ferramenta na mão ----------
function atualizarMao() {
  if (maoMesh) { camera.remove(maoMesh); descartar(maoMesh); maoMesh = null; }
  const id = ferramentas.naMao();
  const chao = ferramentas.noChao();
  for (const [f, mesh] of Object.entries(mundo.ferramentas)) {
    mesh.userData.prateleira ??= { pos: mesh.position.clone(), rot: mesh.rotation.clone() };
    mesh.visible = f !== id;
    if (chao[f]) { // deitada no chão
      mesh.position.set(chao[f].x, 0.08, chao[f].z);
      mesh.rotation.set(0, (chao[f].x * 7.3) % Math.PI, Math.PI / 2);
    } else {
      mesh.position.copy(mesh.userData.prateleira.pos);
      mesh.rotation.copy(mesh.userData.prateleira.rot);
    }
  }
  if (id) { maoMesh = criarFerramentaNaMao(id); camera.add(maoMesh); }
  controlesToque?.mostrarLargar(Boolean(id));
}

// Q: larga a ferramenta da mão no chão, um pouco à frente (anda mais rápido sem ela).
function largarFerramenta() {
  if (escondido || segurando) return;
  const p = jogador.posicao(), d = jogador.direcao();
  let ponto = { x: p.x + d.x * 0.6, z: p.z + d.z * 0.6 };
  if (!temVisao(p, ponto, paredesAtuais())) ponto = p;
  const id = ferramentas.largar(ponto);
  if (!id) return;
  atualizarMao();
  audio.tocar('papel');
  ui.aviso(`Você largou: ${FERRAMENTAS[id]} (fica no chão; E para pegar de novo)`, 2.5);
}

function pegarDoChao(id) {
  const { largada } = ferramentas.pegarDoChao(id);
  atualizarMao();
  audio.tocar('item');
  ui.aviso(largada ? `Trocou ${FERRAMENTAS[largada]} por ${FERRAMENTAS[id]}` : `Na mão: ${FERRAMENTAS[id]}`, 2);
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
  const id = vis.v.id;
  const f = FAVORES[id];
  const estado = favores.estado(id);
  if (estado === 'novo') {
    vis.estado = 'falando';
    ui.dialogo(vis.v.nome, [...vis.v.falas, ...f.pedido], () => { favores.pedir(id); vis.estado = 'pedido'; sincronizarFavores(); }, dublar);
    return;
  }
  if (!favores.podeEntregar(id, { naMao: ferramentas.naMao() })) {
    ui.dialogo(vis.v.nome, [lembreteFavor(id)], null, dublar);
    return;
  }
  vis.estado = 'falando';
  ui.dialogo(vis.v.nome, [f.obrigado, vis.v.voto], () => {
    favores.concluir(id);
    inventario.adicionar(vis.v.item);
    votos.add(id);
    audio.tocar('item');
    const it = ITENS[vis.v.item];
    ui.aviso(`Voto NÃO registrado (${votos.size}/8) · Você recebeu: ${it.nome} — ${it.dica}`, 4.5);
    vis.estado = 'feito';
    sincronizarFavores();
  }, dublar);
}

// Toca a voz gravada da fala, se houver (null cala).
function dublar(texto) { audio.voz(texto ? DUBLAGEM[texto] : null); }

function lembreteFavor(id) {
  const f = FAVORES[id];
  if (f.tipo === 'pegar') return `Ainda tô esperando: ${f.objeto.nome} (${f.objeto.onde}).`;
  if (f.tipo === 'filmar') return `Fica perto do Fiscal olhando pra ele. Filmado: ${Math.floor(favores.fracFilmagem() * f.segundos)}/${f.segundos} s.`;
  if (f.tipo === 'mandado') return 'Entregue o mandado ao Fiscal: chegue perto dele e aperte E.';
  return `Traga ${FERRAMENTAS[f.ferramenta]} na mão.`;
}

// Objetos dos favores no chão (aparecem depois do pedido, somem quando você pega).
function sincronizarFavores() {
  const visiveis = new Map(favores.objetosVisiveis().map((o) => [o.id, o]));
  for (const [id, m] of objetosFavor) if (!visiveis.has(id)) { scene.remove(m); descartar(m); objetosFavor.delete(id); }
  for (const [id, o] of visiveis) {
    if (objetosFavor.has(id)) continue;
    const m = criarObjetoFavor(id);
    const naGeladeira = id === 'leite_condensado';
    m.position.set(o.ponto.x, naGeladeira ? 0.9 : 0, o.ponto.z);
    scene.add(m);
    objetosFavor.set(id, m);
  }
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
    perucasCaidas.splice(0).forEach((m) => { scene.remove(m); descartar(m); });
    if (e.hora >= 1 && e.hora <= 6 && modo === 'jogando') salvarAgora(e.hora);
    segurando = null;
    checkpointExtra = {
      efeitos: { ...efeitos, leite: null },
      cabineAberta,
      ferramenta: ferramentas.snapshot(),
      votos: new Set(votos),
      pendentes: visitantes.map((v) => ({ v: v.v, estado: v.estado === 'falando' ? 'esperando' : v.estado })),
      favores: favores.snapshot(),
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
  if (e.tipo === 'telefone') { ligacao = 'mudo'; telefoneTocando = 20; proximoToque = 0; }
  if (e.tipo === 'susto') comecarSusto(e.id);
  if (e.tipo === 'perseguicao') comecarPerseguicao();
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
    case 'fiscal_monitor': {
      // Ele fica parado olhando direto para a câmera do corredor dos gabinetes.
      const cam = PONTOS.cameraMonitor;
      aparicao.position.set(cam.x - 3, 0, cam.z);
      aparicao.rotation.y = Math.PI / 2;
      aparicao.getObjectByName('peruca').visible = false;
      aparicao.visible = true;
      susto = { aparicaoAte: 9 };
      audio.tocar('prancheta', 0.5);
      ui.legenda('', '(O monitor da portaria... tem alguém olhando direto para a câmera.)', 5);
      break;
    }
    case 'peruca_corredor': {
      // A peruca dele caída bem na sua frente. Ninguém por perto.
      let p = frente(2.4);
      if (!regiaoDe(p)) p = frente(1.2);
      const peruca = criarObjetoFavor('peruca_nicolas');
      peruca.position.set(p.x, 0, p.z);
      scene.add(peruca);
      perucasCaidas.push(peruca);
      audio.tocar('passo_molhado');
      ui.legenda('', '(uma peruca loira... caída bem na sua frente. Ainda quente.)', 4.5);
      break;
    }
    case 'luz_apaga':
      // No escuro, só a caneta clicando em volta de você.
      audio.tocar('interruptor');
      apagao = 5;
      [0.8, 1.7, 2.6, 3.5, 4.2].forEach((t, i) => agendar(t, () => audio.tocar('prancheta', 0.3 + i * 0.15)));
      break;
    case 'telefone_relatorio':
      ligacao = 'relatorio';
      telefoneTocando = 25; proximoToque = 0;
      ui.legenda('', '(o telefone da portaria está tocando)', 4);
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
    if (!l.cor) l.cor = l.luz.color.clone();
    if (perseg.ativa) { l.luz.color.setRGB(1, 0.12, 0.08); l.tubo.material.color.setRGB(1, 0.2, 0.15); }
    else l.luz.color.copy(l.cor);
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
  if (escondido) sairEsconderijo();
  if (!final) { jogador.olharPara(fiscal.posicao()); stats.pego++; }
  suspeita.zerar();
  audio.tocar('passo_molhado');
  // 4 s para responder só às 04:00 e na pergunta final; na última hora volta a 5 s.
  const limite = final || clock.hora() === 4 ? 4 : 5;
  const sorteada = quiz.iniciar(final, limite);
  // Respostas em letra normal: o "trans" não salta mais aos olhos.
  const mostrada = { ...sorteada, respostas: sorteada.respostas.map((r) => r.replace(/TRANS/g, 'trans')) };
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
    stats.erros++;
    audio.tocar('erro'); ui.flash();
    ui.legenda('Fiscal Pavonato', '(sorri e anota alguma coisa na prancheta)', 3);
    fiscal.errou();
  }
  fiscalMesh.getObjectByName('peruca').visible = Math.random() < 0.5;
  if (final && segura === false && !quiz.perdeu()) {
    agendar(1.8, () => { if (!perguntaAberta) abrirPergunta(true); });
    return;
  }
  if (!final) {
    if (perseg.ativa) terminarPerseguicao(false);
    fiscal.voltarParaOrigem(pontoDeRecomeco()); fiscal.pausar(3); fiscal.tregua(25); cacador.cacando = 0;
  }
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
      apagarNoite(armazenamento);
      const min = Math.floor(stats.tempo / 60), seg = Math.round(stats.tempo % 60);
      ui.estatisticas([
        ['Resultado', resultado === 'arquivado' ? 'PL ARQUIVADO' : 'PL APROVADO'],
        ['Horas aprovadas', `${noite.relatorio().filter((r) => r === 'aprovado').length}/6`],
        ['Votos NÃO', `${votos.size}/8`],
        ['Vezes que ele te pegou', String(stats.pego)],
        ['Respostas com "trans"', String(stats.erros)],
        ['Perseguições escapadas', String(stats.fugiu)],
        ['Tempo escondido', `${Math.round(stats.escondido)} s`],
        ['Fitas arrancadas', String(stats.fitas)],
        ['Páginas da prancheta', `${paginasLidas.size}/${PAGINAS.length}`],
        ['Derrotas', String(stats.derrotas)],
        ['Tempo de plantão', `${min}:${String(seg).padStart(2, '0')}`],
      ], () => ui.vitoria(resultado, paginasLidas.size === PAGINAS.length, () => {
        audio.tocar('telefone');
        ui.posCreditos(() => location.reload());
      }));
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
  if (escondido) return { d: 0, texto: `Sair: ${escondido.nome}`, acao: () => sairEsconderijo() };
  for (const o of favores.objetosVisiveis()) add(o.ponto, 1.3, `Pegar: ${o.nome}`, { acao: () => pegarObjetoFavor(o) });
  const fpI = fiscal.posicao();
  if (favores.temMandado() && fiscal.visivel(clock.minutos()) && mesmoAndar(p, fpI)) add(fpI, 2.2, 'Entregar o mandado ao Fiscal', { acao: entregarMandado });
  for (const e of ESCONDERIJOS) {
    if (e.seguro && !cabineAberta) continue;
    add(e.fora, 0.9, `Esconder: ${e.nome}`, { acao: () => entrarEsconderijo(e) });
  }
  for (const vis of visitantes) {
    if (vis.estado === 'esperando' || vis.estado === 'pedido') add({ x: vis.mesh.position.x, z: vis.mesh.position.z }, 1.8, `Falar com ${vis.v.nome}`, { acao: () => falarCom(vis) });
  }
  for (const t of noite.tarefas()) {
    if (t.feita) continue;
    if (ferramentas.podeFazer(t)) add(t.ponto, 1.5, t.texto, { tarefa: t.id });
    else add(t.ponto, 1.5, `${t.texto} (precisa: ${FERRAMENTAS[t.ferramenta]})`, {
      acao: () => ui.aviso(`Precisa de ${FERRAMENTAS[t.ferramenta]}. Pegue no ALMOXARIFADO (térreo).`, 3),
    });
  }
  for (const [id, ponto] of Object.entries(ferramentas.noChao())) add(ponto, 1.1, `Pegar: ${FERRAMENTAS[id]}`, { acao: () => pegarDoChao(id) });
  for (const [id, lugar] of Object.entries(FERRAMENTAS_LUGAR)) {
    if (ferramentas.noChao()[id]) continue; // não está na prateleira
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
    add({ x: -18.8, z: -8.6 }, 0.9, 'Cabine 01 (trancada)', {
      acao: () => ui.aviso(inventario.tem('chave') ? 'Use a chave (tecla do item).' : 'Trancada. Alguém deve ter a chave.', 2.5),
    });
  }
  opcoes.sort((a, b) => a.d - b.d);
  return opcoes[0] ?? null;
}

function pegarObjetoFavor(o) {
  favores.pegarObjeto(o.id);
  audio.tocar('item');
  sincronizarFavores();
  ui.aviso(`Você pegou: ${o.nome}. Leve para ${VISITANTES_NOME[o.de]}.`, 3);
}

function entregarMandado() {
  favores.entregarMandado();
  if (perseg.ativa) terminarPerseguicao(false);
  fiscal.pausar(4); fiscal.tregua(14);
  audio.tocar('papel');
  ui.legenda('Fiscal Pavonato', 'Um mandado?! Isso é uma TRANSgressão... calma, deixa eu ler.', 4);
}

// ---------- Esconderijos ----------
// Dentro do armário: esconde o móvel e mostra frestas na tela (você espia por elas).
function mostrarArmario(v, id) {
  const a = mundo.portaArmario(id);
  if (!a) return;
  for (const o of [a.porta, a.corpo, ...a.frestas]) o.visible = v;
}
function entrarEsconderijo(e) {
  acaoFim();
  escondido = e;
  respiracao.zerar();
  // Cabine: fecha a porta, deixando só uma fresta para espiar.
  const porta = e.tipo === 'cabine' ? mundo.portasCabines[`${e.sala}|${e.numero}`] : null;
  if (porta) porta.rotation.y = 0.42;
  luzEsconderijo.intensity = 0.5;
  if (e.tipo === 'armario') mostrarArmario(false, e.id);
  ui.frestas(e.tipo === 'armario');
  jogador.teleportar(e.dentro);
  jogador.definirAltura(e.altura);
  jogador.olharPara(e.olhar);
  audio.tocar(e.tipo === 'cabine' || e.tipo === 'armario' ? 'rangido' : 'pano');
  ui.aviso(`Escondido: ${e.nome}. ${TOQUE ? 'Segure "Prender o ar"' : 'Segure ESPAÇO'} quando ele chegar perto.`, 3.5);
  controlesToque?.mostrarRespirar(true);
}

function sairEsconderijo() {
  if (!escondido) return;
  const e = escondido;
  escondido = null;
  const porta = e.tipo === 'cabine' ? mundo.portasCabines[`${e.sala}|${e.numero}`] : null;
  if (porta) porta.rotation.y = porta.userData.fechada;
  luzEsconderijo.intensity = 0;
  if (e.tipo === 'armario') mostrarArmario(true, e.id);
  ui.frestas(false);
  jogador.definirAltura();
  jogador.teleportar(e.fora);
  jogador.olharPara({ x: e.fora.x + (e.fora.x - e.dentro.x) * 4, z: e.fora.z + (e.fora.z - e.dentro.z) * 4 });
  ui.respiracao(null);
  controlesToque?.mostrarRespirar(false);
}

// Ele te achou no esconderijo: abre a porta e pergunta.
function encontrado() {
  const e = escondido;
  audio.tocar(e.tipo === 'cabine' || e.tipo === 'armario' ? 'rangido' : 'susto');
  ui.flash();
  sairEsconderijo();
  const pj = jogador.posicao();
  fiscal.voltarParaOrigem({ x: pj.x + (e.fora.x - e.dentro.x) * 0.5, z: pj.z + (e.fora.z - e.dentro.z) * 0.5 });
  ui.legenda('Fiscal Pavonato', 'Achei! Escondido no banheiro? Muito suspeito...', 3);
  abrirPergunta(false);
}

// O Fiscal abre um esconderijo (vasculhando). Range a porta; se você está ali, te acha.
function abrirEsconderijo(e) {
  audio.tocar('rangido');
  const porta = e.tipo === 'cabine' ? mundo.portasCabines[`${e.sala}|${e.numero}`] : null;
  if (porta) { porta.rotation.y = 1.5; agendar(2.5, () => { porta.rotation.y = porta.userData.fechada; }); }
  if (escondido && escondido.id === e.id) encontrado();
}

// ---------- Perseguição ----------
let tentativasPerseg = 0;
function comecarPerseguicao() {
  const pj = jogador.posicao();
  const seguro = clock.minutos() < 240 && SALAS_SEGURAS.includes(regiaoDe(pj));
  if (modo !== 'jogando' || perguntaAberta || ui.ocupado() || seguro) {
    if (tentativasPerseg++ < 8) agendar(4, comecarPerseguicao);
    return;
  }
  tentativasPerseg = 0;
  // Ele surge a uns 18 m de você, no mesmo andar (longe o bastante para dar tempo de fugir).
  const candidatos = [...PONTOS_RONDA, PONTOS.recomecoTerreo, PONTOS.recomeco1andar, PONTOS.origemFiscal]
    .filter((c) => mesmoAndar(c, pj))
    .map((c) => ({ c, d: Math.hypot(c.x - pj.x, c.z - pj.z) }));
  const bons = candidatos.filter((x) => x.d >= 13 && x.d <= 26).sort((a, b) => Math.abs(a.d - 18) - Math.abs(b.d - 18));
  const escolha = (bons[0] ?? candidatos.sort((a, b) => b.d - a.d)[0])?.c ?? PONTOS.origemFiscal;
  fiscal.voltarParaOrigem(escolha);
  fiscal.perseguir(DURACAO_PERSEGUICAO);
  perseg = { ativa: true, ultimo: { ...pj }, busca: null, abrindo: 0, alarme: 0 };
  ui.alerta(true);
  audio.tocar('susto');
  ui.aviso('PERSEGUIÇÃO! Ele está correndo atrás de você. Fuja ou se esconda!', 4);
}

function terminarPerseguicao(sobreviveu) {
  perseg.ativa = false;
  fiscal.pararPerseguicao();
  ui.alerta(false);
  if (sobreviveu) {
    stats.fugiu++;
    fiscal.tregua(12);
    cacador.cacando = 0;
    ui.aviso('Ele desistiu... por enquanto.', 3);
  }
}

// Alvo do Fiscal na perseguição: você (se te vê) → último lugar onde te viu → vasculhar esconderijos perto.
function alvoNaPerseguicao(pj, fp, dt) {
  const seguro = clock.minutos() < 240 && SALAS_SEGURAS.includes(regiaoDe(pj));
  const meVe = !escondido && !seguro && mesmoAndar(fp, pj) && temVisao(fp, pj, PAREDES);
  if (meVe) { perseg.ultimo = { ...pj }; perseg.busca = null; perseg.abrindo = 0; return pj; }
  if (!perseg.busca) {
    if (Math.hypot(fp.x - perseg.ultimo.x, fp.z - perseg.ultimo.z) > 0.8) return perseg.ultimo;
    perseg.busca = ESCONDERIJOS
      .filter((e) => !e.seguro && mesmoAndar(e.fora, perseg.ultimo) && !(seguro && SALAS_SEGURAS.includes(regiaoDe(e.fora))))
      .map((e) => ({ e, d: Math.hypot(e.fora.x - perseg.ultimo.x, e.fora.z - perseg.ultimo.z) }))
      .filter((x) => x.d < 10).sort((a, b) => a.d - b.d).slice(0, 3).map((x) => x.e);
  }
  const alvo = perseg.busca[0];
  if (!alvo) return cacador.ronda;
  if (Math.hypot(fp.x - alvo.fora.x, fp.z - alvo.fora.z) > 0.6) return alvo.fora;
  // Chegou no esconderijo: para, abre, segue para o próximo.
  if (perseg.abrindo <= 0) { perseg.abrindo = 1.5; abrirEsconderijo(alvo); }
  perseg.abrindo -= dt;
  if (perseg.abrindo <= 0) perseg.busca.shift();
  return fp;
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
  if (ligacao === 'relatorio') {
    // Ele lê o SEU relatório da noite.
    const rel = noite.relatorio();
    const aprov = rel.filter((r) => r === 'aprovado').length, reprov = rel.filter((r) => r === 'reprovado').length;
    const falas = [
      'Alô. Aqui é a fiscalização. Estou com o seu relatório na mão.',
      `Horas aprovadas: ${aprov}. Reprovadas: ${reprov}. Interessante...`,
      `Vezes que eu te encontrei: ${stats.pego}. Respostas suspeitas: ${stats.erros}.`,
      stats.escondido > 20 ? `E ${Math.round(stats.escondido)} segundos escondido em cabine. Muito suspeito.` : 'Você não se esconde muito, né? Corajoso. Ou TRANSloucado.',
      '... Estou indo aí. *clique*',
    ];
    falas.forEach((f, i) => agendar(i * 3.2, () => ui.legenda('Telefone', f, 3.4)));
    return;
  }
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
  if (t.fita) stats.fitas++;
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
  if (e.code === 'KeyQ') { if (!ui.ocupado()) largarFerramenta(); return; }
  const m = /^Digit([1-8])$/.exec(e.code);
  if (m) usarItem(Number(m[1]) - 1);
});
addEventListener('keyup', (e) => { if (e.code === 'KeyE') acaoFim(); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false; });
addEventListener('keydown', (e) => { if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true; if (e.code === 'Space' && escondido) { prendendoAr = true; e.preventDefault(); } });
addEventListener('keyup', (e) => { if (e.code === 'Space') prendendoAr = false; });
addEventListener('blur', () => { shift = false; });
canvas.addEventListener('click', () => { if (modo === 'jogando') travarMouse(); });
ui.onItem((i) => { if (modo === 'jogando' && !pausado && !(ui.ocupado() && !perguntaAberta)) usarItem(i); });
if (controlesToque) {
  controlesToque.mostrar(false);
  controlesToque.onAcao(acaoInicio, acaoFim);
  controlesToque.onLargar(() => { if (modo === 'jogando' && !pausado && !ui.ocupado()) largarFerramenta(); });
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
  stats.derrotas++;
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
      checkpointExtra.pendentes.forEach((p) => { entrarVisitante(p.v, true); visitantes[visitantes.length - 1].estado = p.estado; });
    }
    atualizarMao();
    if (checkpointExtra?.favores) favores.restaurar(checkpointExtra.favores);
    escondido = null; jogador.definirAltura(); ui.respiracao(null); controlesToque?.mostrarRespirar(false);
    perseg = { ativa: false, ultimo: null, busca: null, abrindo: 0, alarme: 0 }; ui.alerta(false);
    sincronizarPocas();
    sincronizarFavores();
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
  const vendo = !seguro && !escondido && mesmoAndar(fp, pj) && distancia < 9 && temVisao(fp, pj, PAREDES);
  // Correr faz barulho: ele ouve, mas demora mais para ter certeza.
  const ouvindo = !seguro && correndo && mesmoAndar(fp, pj) && distancia < OUVE_CORRIDA;
  if (cacador.cacando > 0) {
    cacador.cacando = vendo ? 7 : Math.max(0, cacador.cacando - dt);
    if (cacador.cacando > 0) return pj;
    suspeita.zerar();
  } else if (suspeita.update(dt, { minuto, vendo, ouvindo }) === 'cacar') {
    cacador.cacando = 7;
    audio.tocar('prancheta');
    ui.legenda('Fiscal Pavonato', 'Ei! Você aí! Parado!', 2.5);
    return pj;
  }
  // Chegou no ponto de ronda (ou é inalcançável): sorteia outro.
  if (Math.hypot(fp.x - cacador.ronda.x, fp.z - cacador.ronda.z) < 0.8) {
    cacador.ronda = PONTOS_RONDA[Math.floor(Math.random() * PONTOS_RONDA.length)];
  }
  return cacador.ronda;
}

// Pistas de som: o Fiscal fora da sua vista se denuncia pela caneta e pelo assobio.
function pistasDeSom(dt, pj, fp, minuto) {
  tempoPista -= dt;
  if (tempoPista > 0) return;
  tempoPista = 5 + Math.random() * 5;
  if (!fiscal.visivel(minuto) || minuto < 120 || !mesmoAndar(pj, fp)) return;
  const d = Math.hypot(fp.x - pj.x, fp.z - pj.z);
  if (d > 22 || temVisao(fp, pj, PAREDES)) return;
  audio.tocar(Math.random() < 0.6 ? 'prancheta' : 'assobio', Math.max(0.15, 1 - d / 22));
}

// Voz do Fiscal na caçada: um grito de tempos em tempos, mais alto quanto mais perto ele está.
// Em outro andar não se ouve; atrás de parede fica abafado pela metade.
const ALCANCE_VOZ = 26;
function vozDaCacada(dt, pj, fp) {
  const cacando = perseg.ativa || cacador.cacando > 0;
  if (!cacando) { vozFiscal?.parar(); vozFiscal = null; tempoVozFiscal = 1.5; return; }
  const d = Math.hypot(fp.x - pj.x, fp.z - pj.z);
  const vol = !mesmoAndar(pj, fp) ? 0 : Math.max(0, 1 - d / ALCANCE_VOZ) * (temVisao(fp, pj, PAREDES) ? 1 : 0.5);
  if (vozFiscal && !vozFiscal.acabou) { vozFiscal.volume(vol); return; }
  tempoVozFiscal -= dt;
  if (tempoVozFiscal > 0 || !VOZES_CACADA.length) return;
  tempoVozFiscal = 4 + Math.random() * 4;
  let i = Math.floor(Math.random() * VOZES_CACADA.length);
  if (VOZES_CACADA.length > 1 && i === ultimaVozFiscal) i = (i + 1) % VOZES_CACADA.length;
  ultimaVozFiscal = i;
  vozFiscal = audio.vozDistante(VOZES_CACADA[i].arq, vol);
  // Legenda só quando dá para ouvir bem.
  if (vol > 0.15) ui.legenda('Fiscal Pavonato', VOZES_CACADA[i].texto, 2.5);
}

function atualizar(dt, t) {
  rodarAgendados(dt);
  if (modo !== 'jogando') return;
  const ocupado = ui.ocupado();
  if (efeitos.leite) { efeitos.leite.segundos -= dt; if (efeitos.leite.segundos <= 0) efeitos.leite = null; }
  if (vendoMonitor > 0) vendoMonitor -= dt;
  const podeOlhar = !ocupado && vendoMonitor <= 0;
  const podeMexer = podeOlhar && !escondido;
  if (controlesToque) { const o = controlesToque.consumirOlhar(); if (podeOlhar) jogador.girar(o.dx, o.dy); }
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
    perguntaAberta?.controles.tempo(quiz.restante() / quiz.limite());
    if (r === 'tempo') fecharPergunta(false);
  } else if (!ocupado) {
    clock.tick(dt);
  }

  noite.update().forEach(tratarEvento);
  if (noite.fase() === 'derrota') { perder(); return; }

  // Fiscal
  const pj = jogador.posicao();
  const minuto = clock.minutos();
  const fpAntes = fiscal.posicao();
  if (!ocupado && noite.fase() !== 'vitoria') {
    const pelaCamera = vendoMonitor > 0 && ['corredor_1', 'hall_1'].includes(regiaoDe(fpAntes));
    const olhando = !escondido && (pelaCamera || (mesmoAndar(pj, fpAntes) && jogador.olhandoPara(fpAntes, paredesAtuais())));
    const alvo = perseg.ativa ? alvoNaPerseguicao(pj, fpAntes, dt) : (escondido ? cacador.ronda : alvoDoFiscal(pj, minuto, dt));
    // Escondido, ele não te alcança andando: só te acha vasculhando ou ouvindo sua respiração.
    const r = fiscal.update(dt, { minuto, jogador: escondido ? { x: 1e6, z: 1e6 } : pj, alvo, olhando });
    if (r === 'alcancou' && fiscal.visivel(minuto)) abrirPergunta(false);
    if (perseg.ativa && !fiscal.perseguindo() && !perguntaAberta) terminarPerseguicao(true);
    pistasDeSom(dt, pj, fiscal.posicao(), minuto);
    vozDaCacada(dt, pj, fiscal.posicao());
  }
  ui.suspeita(suspeita.frac(), cacador.cacando > 0 || perseg.ativa);
  stats.tempo += dt;
  if (escondido) stats.escondido += dt;
  if (perseg.ativa) { perseg.alarme -= dt; if (perseg.alarme <= 0) { audio.tocar('alarme'); perseg.alarme = 1.2; } }

  // Respiração no esconderijo.
  if (escondido && !perguntaAberta) {
    const fq = fiscal.posicao();
    const pertoDele = !escondido.seguro && fiscal.visivel(minuto) && mesmoAndar(fq, pj) && Math.hypot(fq.x - pj.x, fq.z - pj.z) < 4;
    const segurandoAr = prendendoAr || (controlesToque?.prendendoAr() ?? false);
    const r = respiracao.update(dt, { escondido: true, fiscalPerto: pertoDele, segurando: segurandoAr });
    if (respiracao.precisaSegurar()) ui.respiracao(segurandoAr ? 'Segurando o ar...' : `Ele está perto! ${TOQUE ? 'Segure "Prender o ar"' : 'Segure ESPAÇO'}`, respiracao.frac(), !segurandoAr);
    else ui.respiracao(`Escondido · ${TOQUE ? 'botão de ação' : 'E'} para sair`, respiracao.frac(), false);
    if (r === 'achou') { audio.tocar('suspiro'); encontrado(); }
  }

  // Favor da Mamãe Falou: filmar o Fiscal de perto.
  if (favores.estado('mamae_falou') === 'pedido' && !favores.podeEntregar('mamae_falou', {}) && !escondido) {
    const fq = fiscal.posicao();
    if (fiscal.visivel(minuto) && mesmoAndar(fq, pj) && Math.hypot(fq.x - pj.x, fq.z - pj.z) <= 6 && jogador.olhandoPara(fq, paredesAtuais())) {
      favores.filmar(dt);
      if (!segurando) ui.progresso('Filmando o Fiscal pra Mamãe Falou', favores.fracFilmagem());
      if (favores.podeEntregar('mamae_falou', {})) { ui.progresso(null); ui.aviso('Filmagem pronta! Volte para a Mamãe Falou.', 3); }
    } else if (!segurando) ui.progresso(null);
  }

  const fp = fiscal.posicao();
  fiscalMesh.visible = fiscal.visivel(minuto) && !aparicao.visible;
  fiscalMesh.position.set(fp.x, 0, fp.z);
  fiscalMesh.rotation.y = Math.atan2(pj.x - fp.x, pj.z - fp.z);
  const andou = Math.hypot(fp.x - ultimaPosFiscal.x, fp.z - ultimaPosFiscal.z);
  ultimaPosFiscal = fp;
  if (andou > 1e-4 && andou < 5) {
    animarAndando(fiscalMesh, perseg.ativa ? t * 1.8 : t);
    tempoPasso -= dt;
    if (tempoPasso <= 0 && mesmoAndar(fp, pj) && Math.hypot(fp.x - pj.x, fp.z - pj.z) < 9) { audio.tocar('passo_molhado'); tempoPasso = 0.7; }
    // Passando por uma porta de banheiro, ele interdita com fita.
    tempoFita -= dt;
    if (tempoFita <= 0 && !perseg.ativa) {
      for (const [porta, f] of Object.entries(FITAS)) {
        if (Math.hypot(fp.x - f.ponto.x, fp.z - f.ponto.z) < 2.5 && noite.adicionarFita(porta)) {
          sincronizarPocas(); tempoFita = FITA_A_CADA;
          if (mesmoAndar(fp, pj) && Math.hypot(fp.x - pj.x, fp.z - pj.z) < 14) audio.tocar('fita');
          break;
        }
      }
    }
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
    sincronizarTarefas(); // fitas e problemas novos aparecem sempre
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
    if (perseg.ativa) extras.unshift(`PERSEGUIÇÃO! Ele está atrás de você.`);
    for (const v of visitantes) if (favores.estado(v.v.id) === 'pedido') extras.push(`Favor — ${v.v.nome}: ${resumoFavor(v.v.id)}`);
    const levando = favores.carregando().map((id) => Object.values(FAVORES).find((f) => f.objeto?.id === id)?.objeto.nome).filter(Boolean);
    if (levando.length) extras.push(`Levando: ${levando.join(', ')}`);
    ui.hud({
      relogio: clock.formatar(),
      restante: segRestantes ? `fim da hora em ${Math.floor(segRestantes / 60)}:${String(segRestantes % 60).padStart(2, '0')}` : '',
      itens, tarefas, erros: quiz.erros(), relatorio: noite.relatorio(), hora,
      naMao: ferramentas.naMao() ? FERRAMENTAS[ferramentas.naMao()] : null,
      votos: votos.size, paginas: paginasLidas.size, extras,
    });
  }
}

// ?acelerar=N (testes de equilíbrio): simula N passos por quadro, com as mesmas regras.
const ACELERAR = Math.max(1, Math.min(20, Number(params.get('acelerar')) || 1));
let aoQuadro = null; // robô de teste: roda antes de cada passo
function loop(agora) {
  const dt = Math.min((agora - anterior) / 1000, 0.1);
  anterior = agora;
  for (let i = 0; i < ACELERAR; i++) {
    const t = agora / 1000 + i * dt;
    aoQuadro?.(dt);
    if (modo === 'jogando' && !pausado) atualizar(dt, t);
  }
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

// ---------- Salvar e continuar ----------
function salvarAgora(hora) {
  salvarNoite(armazenamento, {
    hora, relatorio: noite.relatorio(), itens: inventario.itens(), votos: [...votos], favores: favores.snapshot(),
    ferramenta: ferramentas.snapshot(), cabineAberta, paginas: [...paginasLidas], stats: { ...stats },
    visitantes: visitantes.filter((v) => v.estado !== 'feito').map((v) => ({ id: v.v.id, estado: v.estado === 'falando' ? 'esperando' : v.estado })),
  });
}

function carregarSalvo(d) {
  noite.carregar(d);
  inventario.restaurar(d.itens);
  votos = new Set(d.votos);
  favores.restaurar(d.favores);
  ferramentas.restaurar(d.ferramenta);
  cabineAberta = d.cabineAberta;
  mundo.portaCabine01.rotation.y = cabineAberta ? 1.3 : 0;
  for (const i of d.paginas) { paginasLidas.add(i); scene.remove(paginasMesh[i]); }
  Object.assign(stats, d.stats);
  for (const v of d.visitantes) {
    const dados = VISITANTES.find((x) => x.id === v.id);
    if (!dados || visitantes.some((x) => x.v.id === v.id)) continue;
    entrarVisitante(dados, true);
    visitantes[visitantes.length - 1].estado = v.estado;
  }
  atualizarMao();
  sincronizarFavores();
}

// ---------- Início ----------
function comecar(salvo = null) {
  if (salvo) carregarSalvo(salvo);
  audio.iniciar();
  audio.ambiente(true);
  modo = 'jogando';
  ui.mostrarHud(true);
  noite.update().forEach(tratarEvento);
  if (salvo) ui.aviso(`Plantão retomado às ${String(salvo.hora).padStart(2, '0')}:00.`, 3);
  else ui.legenda('', 'Às 06:00 vota-se o PL do Banheiro Fiscalizado. Deixe o relatório de limpeza perfeito para arquivar o projeto.', 7);
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
  const salvo = carregarNoite(armazenamento);
  ui.telaInicial(() => { apagarNoite(armazenamento); comecar(); }, abrirConfig, {
    versao: VERSAO, dicaIOS: instalador.dicaIOS(),
    continuar: salvo ? { rotulo: `Continuar (${String(salvo.hora).padStart(2, '0')}:00)`, acao: () => comecar(salvo) } : null,
  });
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
  definirAoQuadro: (fn) => { aoQuadro = fn; }, ACELERAR, cena: scene,
  largarFerramenta, comecar, terminarNoite, abrirPergunta, pegarFerramenta, acaoInicio, acaoFim, lerPagina,
  favores, comecarPerseguicao, vozesCacada: VOZES_CACADA, stats, suspeita, salvarAgora, comecarSusto, entrarEsconderijo, sairEsconderijo, perseg: () => perseg, escondido: () => escondido?.id ?? null,
  prenderAr: (v) => { prendendoAr = v; },
  correr: (v) => { shift = v; },
  proximoAlvo, regiaoDe,
  interagir: () => { const it = interacaoAtual(); if (it?.acao) it.acao(); return it?.texto ?? null; },
  interacao: () => interacaoAtual()?.texto ?? null,
  teleportar: (x, z) => jogador.teleportar({ x, z }),
  tecla: (code) => dispatchEvent(new KeyboardEvent('keydown', { code })),
};
