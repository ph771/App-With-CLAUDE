// Constrói a Casa Legislativa em 3D a partir da planta.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import {
  ALTURA_PAREDE, SALAS, PORTAS, PORTAS_FECHADAS, CABINES, MOVEIS, PONTOS, FERRAMENTAS_LUGAR, DECORACAO, paredesDaSala,
} from './planta.js';
import * as tex from './texturas.js';
import { criarFerramenta } from './objetos.js';

const lambert = (opts) => new THREE.MeshLambertMaterial({ flatShading: true, ...opts });
const comRepeticao = (t, x, y) => { const c = t.clone(); c.repeat.set(Math.max(1, x), Math.max(1, y)); c.needsUpdate = true; return c; };

function caixa(pai, { minX, maxX, minZ, maxZ }, y0, y1, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, y1 - y0, maxZ - minZ), material);
  m.position.set((minX + maxX) / 2, (y0 + y1) / 2, (minZ + maxZ) / 2);
  pai.add(m);
  return m;
}

function placa(pai, texto, pos, rotY = 0, opts = {}, largura = 1.4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, 0.32), new THREE.MeshBasicMaterial({ map: tex.placa(texto, { aspecto: largura / 0.32, ...opts }) }));
  m.position.set(pos.x, pos.y, pos.z);
  m.rotation.y = rotY;
  pai.add(m);
  return m;
}

const PAREDE_DA_SALA = {
  masc_t: 'azulejo', fem_t: 'azulejo', familia: 'azulejo', banheiro_vip: 'marmore',
  almox: 'concreto', hall_s: 'concreto', maquinas: 'concreto',
};
const PISO = { xadrez: () => tex.pisoXadrez(), granito: () => tex.granito(), concreto: () => tex.concreto(), carpete: () => tex.carpete('#4a1a1a'), marmore: () => tex.marmore() };

export function criarPredio(scene, { instanciar = () => null } = {}) {
  // Põe um modelo pronto na cena; devolve false se ele não carregou (aí usa a caixa).
  const por = (nome, opts) => { const m = instanciar(nome, opts); if (m) scene.add(m); return Boolean(m); };
  const texParede = { azulejo: tex.azulejo(), marmore: tex.marmore(), concreto: tex.concreto(), oficial: tex.paredeOficial() };
  const texPiso = Object.fromEntries(Object.entries(PISO).map(([k, f]) => [k, f()]));
  const forro = tex.teto();

  // Chão, teto e "pele" das paredes de cada sala (por dentro, para não brigar com a sala vizinha).
  for (const s of SALAS) {
    const w = s.maxX - s.minX, d = s.maxZ - s.minZ, cx = (s.minX + s.maxX) / 2, cz = (s.minZ + s.maxZ) / 2;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lambert({ map: comRepeticao(texPiso[s.piso], w / 2, d / 2) }));
    chao.rotation.x = -Math.PI / 2; chao.position.set(cx, 0, cz); scene.add(chao);
    const teto = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lambert({ map: comRepeticao(forro, w / 1.5, d / 1.5) }));
    teto.rotation.x = Math.PI / 2; teto.position.set(cx, ALTURA_PAREDE, cz); scene.add(teto);

    const base = texParede[PAREDE_DA_SALA[s.id] ?? 'oficial'];
    for (const p of paredesDaSala(s)) {
      const horizontal = p.maxX - p.minX > p.maxZ - p.minZ;
      const comp = horizontal ? p.maxX - p.minX : p.maxZ - p.minZ;
      const meio = horizontal ? (p.minZ + p.maxZ) / 2 : (p.minX + p.maxX) / 2;
      // A pele fica do lado de dentro da sala.
      let r;
      if (horizontal) r = Math.abs(meio - s.minZ) < 0.2 ? { minX: p.minX, maxX: p.maxX, minZ: meio, maxZ: meio + 0.1 } : { minX: p.minX, maxX: p.maxX, minZ: meio - 0.1, maxZ: meio };
      else r = Math.abs(meio - s.minX) < 0.2 ? { minX: meio, maxX: meio + 0.1, minZ: p.minZ, maxZ: p.maxZ } : { minX: meio - 0.1, maxX: meio, minZ: p.minZ, maxZ: p.maxZ };
      const repV = PAREDE_DA_SALA[s.id] ? 2 : 1; // a parede de repartição tem um lambri só
      caixa(scene, r, 0, ALTURA_PAREDE, lambert({ map: comRepeticao(base, Math.round(comp / (repV === 1 ? 3 : 1.5)), repV) }));
    }
  }
  // Vergas em cima das portas.
  const verga = lambert({ color: 0x3a3028 });
  for (const d of PORTAS) {
    const r = d.z !== undefined ? { minX: d.x1, maxX: d.x2, minZ: d.z - 0.1, maxZ: d.z + 0.1 } : { minX: d.x - 0.1, maxX: d.x + 0.1, minZ: d.z1, maxZ: d.z2 };
    caixa(scene, r, 2.4, ALTURA_PAREDE, verga);
  }

  // Portas fechadas com plaquinha.
  const madeira = lambert({ map: tex.madeira() });
  for (const d of PORTAS_FECHADAS) {
    // Fica do lado do corredor/portaria (z maior para portas na parede norte do corredor).
    // Lado de onde a porta é vista: a portaria (saída) e o corredor dos gabinetes ficam do lado -z.
    const lado = d.z === 10 || d.z === 0 ? -1 : 1;
    caixa(scene, { minX: d.x1, maxX: d.x2, minZ: d.z + lado * 0.1, maxZ: d.z + lado * 0.18 }, 0, 2.2, madeira);
    placa(scene, d.placa, { x: (d.x1 + d.x2) / 2, y: 2.4, z: d.z + lado * 0.2 }, lado > 0 ? 0 : Math.PI, { fundo: '#2a2a2a' }, 1);
  }
  // Placas dos cômodos em cima das portas abertas.
  const PLACAS = [
    ['MASCULINO', -15, -3, 0, '#1d3d6b'], ['FEMININO', 15, -3, 0, '#6b1d4a'], ['PLENÁRIO', 100, -3, 0, '#1c5130'],
    ['BANHEIRO DOS PARLAMENTARES', 119, -3, 0, '#7a5a10'], ['IMPRENSA', 81, -3, 0, '#333'], ['CASA DE MÁQUINAS', 200, -3, 0, '#5a4a1a'],
  ];
  for (const [t, x, z, , cor] of PLACAS) placa(scene, t, { x, y: 2.68, z: z + 0.13 }, 0, { fundo: cor }, t.length > 12 ? 2.6 : 1.5);
  placa(scene, 'ALMOXARIFADO', { x: -19.87, y: 2.68, z: -1.5 }, Math.PI / 2, { fundo: '#5a4a1a' }, 1.7);
  placa(scene, 'COPA', { x: 19.87, y: 2.68, z: -1.5 }, -Math.PI / 2, { fundo: '#333' }, 1);
  placa(scene, 'CASA LEGISLATIVA DE VILA NOVA DO SUL', { x: 0, y: 2.6, z: 9.85 }, Math.PI, { fundo: '#1c3a2a' }, 4);

  // Cabines: divisórias, portas entreabertas e vasos.
  const verdeCabine = lambert({ map: tex.portaCabine() });
  const loucas = lambert({ color: 0xe8e6de });
  let portaCabine01 = null;
  const portasCabines = {}; // `${sala}|${numero}` → pivô da porta (o Fiscal abre ao vasculhar)
  for (const c of CABINES) {
    const largura = c.x2 - c.x1 - 0.06;
    const pivo = new THREE.Group();
    pivo.position.set(c.x1 + 0.03, 0, c.z2);
    const porta = new THREE.Mesh(new THREE.BoxGeometry(largura, 1.95, 0.04), c.sala === 'banheiro_vip' ? madeira : verdeCabine);
    porta.position.set(largura / 2, 1.125, 0);
    pivo.add(porta);
    const eh01 = c.sala === 'masc_t' && c.numero === 1;
    pivo.rotation.y = eh01 ? 0 : 0.5 + 0.25 * c.numero;
    scene.add(pivo);
    portasCabines[`${c.sala}|${c.numero}`] = pivo;
    pivo.userData.fechada = pivo.rotation.y;
    if (eh01) portaCabine01 = pivo;
    const cx = (c.x1 + c.x2) / 2;
    if (!por('toilet', { x: cx, z: c.z1 + 0.45, rot: 0, altura: 0.8 })) {
      caixa(scene, { minX: cx - 0.2, maxX: cx + 0.2, minZ: c.z1 + 0.25, maxZ: c.z1 + 0.8 }, 0, 0.42, c.sala === 'banheiro_vip' ? lambert({ color: 0xf0e6c8 }) : loucas);
      caixa(scene, { minX: cx - 0.25, maxX: cx + 0.25, minZ: c.z1 + 0.02, maxZ: c.z1 + 0.22 }, 0.42, 0.85, loucas);
    }
    placa(scene, String(c.numero).padStart(2, '0'), { x: cx, y: 2.3, z: c.z2 + 0.03 }, 0, { fundo: '#222' }, 0.45);
  }

  // Móveis.
  const espelhos = [];
  let portaArmario = null;
  const madeiraClara = lambert({ color: 0x7a5530 });
  for (const m of MOVEIS) {
    switch (m.tipo) {
      case 'divisoria': caixa(scene, m, 0.15, m.altura, verdeCabine); break;
      case 'guiche': caixa(scene, m, 0, m.altura, madeiraClara); break;
      case 'mesa':
        if (m.modelo === 'copa' && por('table', { x: (m.minX + m.maxX) / 2, z: (m.minZ + m.maxZ) / 2, rot: 0, altura: 0.76 })) {
          por('chair', { x: m.minX + 0.8, z: m.maxZ + 0.45, rot: 0, altura: 0.95 });
          por('chair', { x: m.maxX - 0.8, z: m.minZ - 0.45, rot: Math.PI, altura: 0.95 });
          break;
        }
        if (m.modelo === 'imprensa' && por('desk', { x: 79.5, z: -8.7, rot: 0, altura: 0.76 })) {
          por('desk', { x: 82.5, z: -8.7, rot: 0, altura: 0.76 });
          por('computerScreen', { x: 79.5, z: -8.95, y: 0.76, rot: 0, altura: 0.42 });
          por('computerKeyboard', { x: 79.5, z: -8.5, y: 0.76, rot: 0, altura: 0.03 });
          por('computerScreen', { x: 82.5, z: -8.95, y: 0.76, rot: 0, altura: 0.42 });
          por('chairDesk', { x: 79.5, z: -7.7, rot: Math.PI, altura: 1.0 });
          por('chairDesk', { x: 82.5, z: -7.6, rot: Math.PI + 0.4, altura: 1.0 });
          break;
        }
        caixa(scene, m, 0.7, m.altura, madeiraClara); caixa(scene, { minX: m.minX + 0.1, maxX: m.minX + 0.2, minZ: m.minZ + 0.1, maxZ: m.minZ + 0.2 }, 0, 0.7, madeiraClara); caixa(scene, { minX: m.maxX - 0.2, maxX: m.maxX - 0.1, minZ: m.maxZ - 0.2, maxZ: m.maxZ - 0.1 }, 0, 0.7, madeiraClara); break;
      case 'armario': {
        const corpo = caixa(scene, m, 0, m.altura, lambert({ color: 0x5a6466 }));
        // Porta com frestas, virada para dentro do almoxarifado (lado oeste).
        const porta = caixa(scene, { minX: m.minX - 0.03, maxX: m.minX, minZ: m.minZ + 0.05, maxZ: m.maxZ - 0.05 }, 0.05, m.altura - 0.05, lambert({ color: 0x6f7a7c }));
        for (let y = 1.5; y < 1.9; y += 0.08) caixa(scene, { minX: m.minX - 0.04, maxX: m.minX - 0.03, minZ: m.minZ + 0.25, maxZ: m.maxZ - 0.25 }, y, y + 0.02, lambert({ color: 0x111111 }));
        portaArmario = { porta, corpo, frestas: [] };
        scene.children.slice(-6).forEach((o) => { if (o !== porta && o !== corpo) portaArmario.frestas.push(o); });
        break;
      }
      case 'balcao': {
        const x = (m.minX + m.maxX) / 2;
        let ok = true;
        for (let z = m.minZ + 0.45; z < m.maxZ; z += 0.9) ok = por('kitchenCabinet', { x, z, rot: -Math.PI / 2, altura: 0.9 }) && ok;
        if (!ok) { caixa(scene, m, 0, m.altura, lambert({ color: 0x6a6a64 })); break; }
        por('kitchenCoffeeMachine', { x, z: m.minZ + 1.35, y: 0.9, rot: -Math.PI / 2, altura: 0.35 });
        por('kitchenMicrowave', { x, z: m.minZ + 3.15, y: 0.9, rot: -Math.PI / 2, altura: 0.3 });
        break;
      }
      case 'tribuna': caixa(scene, m, 0, m.altura, madeira); break;
      case 'prateleira': {
        const metal = lambert({ color: 0x55585a });
        for (const y of [0.05, 0.75, 1.45, 2.15]) caixa(scene, m, y, y + 0.05, metal);
        for (const [x, z] of [[m.minX, m.minZ], [m.maxX, m.minZ], [m.minX, m.maxZ], [m.maxX, m.maxZ]]) caixa(scene, { minX: x - 0.03, maxX: x + 0.03, minZ: z - 0.03, maxZ: z + 0.03 }, 0, m.altura, metal);
        break;
      }
      case 'cadeiras': {
        const estofado = lambert({ color: 0x2a3a5a });
        for (let x = m.minX + 0.35; x < m.maxX; x += 0.7) {
          // Cadeira estofada virada para a tribuna (norte).
          // (o modelo da cadeira olha para -z de fábrica)
          if (por('chairCushion', { x, z: (m.minZ + m.maxZ) / 2, rot: 0, altura: 0.95 })) continue;
          caixa(scene, { minX: x - 0.28, maxX: x + 0.28, minZ: m.minZ, maxZ: m.maxZ }, 0.4, 0.5, estofado);
          caixa(scene, { minX: x - 0.28, maxX: x + 0.28, minZ: m.maxZ - 0.08, maxZ: m.maxZ }, 0.5, 1.0, estofado);
        }
        break;
      }
      case 'caixa_agua': {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.8, 10), lambert({ color: 0x2f5a8a }));
        c.position.set((m.minX + m.maxX) / 2, 1.4, (m.minZ + m.maxZ) / 2); scene.add(c);
        break;
      }
      case 'bomba': caixa(scene, m, 0, m.altura, lambert({ color: 0x5a6a3a })); break;
      case 'bancada': {
        const x = (m.minX + m.maxX) / 2;
        const viradaPara = m.espelho === 'oeste' ? -Math.PI / 2 : Math.PI / 2; // as pias olham para dentro do banheiro
        let pias = !m.ouro;
        if (pias) for (let z = m.minZ + 0.5; z < m.maxZ - 0.2; z += 1) pias = por('bathroomSink', { x, z, rot: viradaPara, altura: 0.95 }) && pias;
        if (!pias) {
          caixa(scene, m, 0, m.altura, m.ouro ? lambert({ map: tex.marmore() }) : lambert({ color: 0x8a8578 }));
          for (let z = m.minZ + 0.6; z < m.maxZ - 0.3; z += 1) caixa(scene, { minX: x - 0.18, maxX: x + 0.18, minZ: z - 0.22, maxZ: z + 0.22 }, m.altura, m.altura + 0.05, loucas);
        }
        if (m.ouro) for (let z = m.minZ + 0.6; z < m.maxZ - 0.3; z += 1) caixa(scene, { minX: m.maxX - 0.12, maxX: m.maxX - 0.04, minZ: z - 0.03, maxZ: z + 0.03 }, m.altura, m.altura + 0.25, lambert({ color: 0xd4a017 }));
        const oeste = m.espelho === 'oeste';
        const espelho = new Reflector(new THREE.PlaneGeometry(m.maxZ - m.minZ - 0.2, 1.1), { textureWidth: 768, textureHeight: 288, color: 0x9aa0a0 });
        espelho.position.set(oeste ? m.maxX - 0.01 : m.minX + 0.01, 1.75, (m.minZ + m.maxZ) / 2);
        espelho.rotation.y = oeste ? -Math.PI / 2 : Math.PI / 2;
        scene.add(espelho);
        espelhos.push({ espelho, ponto: { x: (m.minX + m.maxX) / 2, z: (m.minZ + m.maxZ) / 2 } });
        break;
      }
      case 'escada': {
        const degrau = lambert({ map: tex.granito() });
        for (let i = 0; i < 8; i++) {
          const y = (i + 1) * (ALTURA_PAREDE / 8);
          caixa(scene, { minX: m.minX + (i * (m.maxX - m.minX)) / 8, maxX: m.maxX, minZ: m.minZ, maxZ: m.maxZ }, 0, y, degrau);
        }
        break;
      }
    }
  }

  // Decoração (só aparece se o modelo carregou).
  for (const d of DECORACAO) por(d.modelo, { x: d.x, z: d.z, y: d.y, rot: d.rot, altura: d.altura });

  // Ferramentas na prateleira.
  const ferramentas = {};
  for (const [id, p] of Object.entries(FERRAMENTAS_LUGAR)) {
    const f = criarFerramenta(id);
    f.position.set(p.x + (p.x < -28 ? -0.85 : 0), p.x < -28 ? 0.8 : 0.8, p.z + (p.x < -28 ? 0 : -0.85));
    scene.add(f);
    ferramentas[id] = f;
  }
  placa(scene, 'FERRAMENTAS', { x: -29.15, y: 2.5, z: -3.6 }, Math.PI / 2, { fundo: '#7a1010' });

  // Guichê: telefone e monitor da câmera do corredor dos gabinetes.
  const telefone = caixa(scene, { minX: -7.8, maxX: -7.5, minZ: 3.5, maxZ: 3.75 }, 1, 1.1, lambert({ color: 0x202020 }));
  caixa(scene, { minX: -7.95, maxX: -7.45, minZ: 4.85, maxZ: 5.55 }, 1, 1.5, lambert({ color: 0x2a2a2a }));
  const alvoMonitor = new THREE.WebGLRenderTarget(320, 240);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: alvoMonitor.texture }));
  tela.position.set(-7.44, 1.25, 5.2); tela.rotation.y = Math.PI / 2; scene.add(tela);
  const cam = PONTOS.cameraMonitor;
  const cameraMonitor = new THREE.PerspectiveCamera(70, 4 / 3, 0.1, 30);
  cameraMonitor.position.set(cam.x, cam.y, cam.z);
  cameraMonitor.lookAt(cam.olharX, 1.1, cam.olharZ);

  // Painel de votação do plenário (texto muda no final).
  const cvPainel = document.createElement('canvas'); cvPainel.width = 256; cvPainel.height = 96;
  const texPainel = new THREE.CanvasTexture(cvPainel); texPainel.magFilter = THREE.NearestFilter;
  const painel = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.25), new THREE.MeshBasicMaterial({ map: texPainel }));
  painel.position.set(100, 1.95, -19.88); scene.add(painel);
  function escreverPainel(linhas, cor = '#ff5a2a') {
    const g = cvPainel.getContext('2d');
    g.fillStyle = '#080808'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = cor; g.font = 'bold 15px monospace'; g.textAlign = 'center';
    linhas.forEach((l, i) => g.fillText(l, 128, 24 + i * 22));
    texPainel.needsUpdate = true;
  }
  escreverPainel(['PL 24/2026', 'BANHEIRO FISCALIZADO', 'VOTAÇÃO ÀS 06:00']);

  // Quadro de luz geral no subsolo.
  caixa(scene, { minX: 213.8, maxX: 213.9, minZ: -9.4, maxZ: -8.6 }, 1.1, 2, lambert({ color: 0x777a70 }));
  placa(scene, 'QUADRO GERAL', { x: 213.78, y: 2.2, z: -9 }, -Math.PI / 2, { fundo: '#7a5a00' }, 1.2);

  // Luzes: uma por sala (as salas grandes ganham duas).
  scene.add(new THREE.AmbientLight(0x606878, 0.2));
  const luzes = [];
  const lampada = new THREE.MeshBasicMaterial({ color: 0xeef4ff });
  for (const s of SALAS) {
    // Uma lâmpada a cada ~9 m.
    const w = s.maxX - s.minX, d = s.maxZ - s.minZ;
    const nx = Math.max(1, Math.round(w / 9)), nz = Math.max(1, Math.round(d / 9));
    const fraca = ['almox', 'maquinas', 'hall_s'].includes(s.id);
    const pontos = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) pontos.push([s.minX + (w * (i + 0.5)) / nx, s.minZ + (d * (j + 0.5)) / nz]);
    for (const [x, z] of pontos) {
      const intensidade = fraca ? 3.5 : 7;
      const luz = new THREE.PointLight(s.id === 'banheiro_vip' ? 0xffe2b0 : 0xcfe0d8, intensidade, 14, 1.5);
      luz.position.set(x, ALTURA_PAREDE - 0.3, z);
      scene.add(luz);
      const tubo = caixa(scene, { minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.08, maxZ: z + 0.08 }, ALTURA_PAREDE - 0.06, ALTURA_PAREDE - 0.01, lampada.clone());
      luzes.push({ sala: s.id, luz, tubo, base: intensidade });
    }
  }

  return {
    luzes, espelhos, portaCabine01, portasCabines, telefone, ferramentas,
    portaArmario: () => portaArmario,
    monitor: { alvo: alvoMonitor, camera: cameraMonitor, tela },
    escreverPainel,
  };
}
