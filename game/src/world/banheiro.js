// Constrói o banheiro em 3D a partir da planta.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import {
  ALTURA_PAREDE, REGIOES, PORTAS, CABINES, PORTA_CABINE_01, BANCADAS, GUICHE,
  PAREDES_SALA, DIVISORIAS, PONTOS,
} from './planta.js';
import * as tex from './texturas.js';

const comRepeticao = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
const lambert = (opts) => new THREE.MeshLambertMaterial({ flatShading: true, ...opts });

function caixa(scene, { minX, maxX, minZ, maxZ }, y0, y1, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, y1 - y0, maxZ - minZ), material);
  m.position.set((minX + maxX) / 2, (y0 + y1) / 2, (minZ + maxZ) / 2);
  scene.add(m);
  return m;
}

function placaEm(scene, texto, pos, rotY = 0, opts) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: tex.placa(texto, opts) }));
  m.position.set(pos.x, pos.y, pos.z);
  m.rotation.y = rotY;
  scene.add(m);
  return m;
}

export function criarBanheiro(scene) {
  const azulejo = tex.azulejo(), piso = tex.pisoXadrez(), forro = tex.teto();

  // Chão e teto de cada região.
  for (const r of Object.values(REGIOES)) {
    const w = r.maxX - r.minX, d = r.maxZ - r.minZ;
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lambert({ map: comRepeticao(piso, w / 2, d / 2) }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.set(r.minX + w / 2, 0, r.minZ + d / 2);
    scene.add(chao);
    const cima = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lambert({ map: comRepeticao(forro, w / 1.5, d / 1.5) }));
    cima.rotation.x = Math.PI / 2;
    cima.position.set(r.minX + w / 2, ALTURA_PAREDE, r.minZ + d / 2);
    scene.add(cima);
  }

  // Paredes de azulejo.
  for (const p of PAREDES_SALA) {
    const comprimento = Math.max(p.maxX - p.minX, p.maxZ - p.minZ);
    caixa(scene, p, 0, ALTURA_PAREDE, lambert({ map: comRepeticao(azulejo, Math.round(comprimento / 1.5), 2) }));
  }

  // Cabines: divisórias com vão embaixo, portas entreabertas e vasos.
  const verdeCabine = lambert({ map: tex.portaCabine() });
  for (const d of DIVISORIAS) caixa(scene, d, 0.15, 2.1, verdeCabine);
  const loucas = lambert({ color: 0xe8e6de });
  let portaCabine01 = null;
  for (const [nome, lista] of Object.entries(CABINES)) {
    lista.forEach(([x1, x2], i) => {
      const largura = x2 - x1 - 0.06;
      const pivo = new THREE.Group();
      pivo.position.set(x1 + 0.03, 0, -6.4);
      const porta = new THREE.Mesh(new THREE.BoxGeometry(largura, 1.95, 0.04), verdeCabine);
      porta.position.set(largura / 2, 0.15 + 0.975, 0);
      pivo.add(porta);
      const ehCabine01 = nome === 'masculino' && i === 0;
      pivo.rotation.y = ehCabine01 ? 0 : 0.5 + 0.25 * i; // entreabertas
      scene.add(pivo);
      if (ehCabine01) portaCabine01 = pivo;
      const cx = (x1 + x2) / 2;
      caixa(scene, { minX: cx - 0.2, maxX: cx + 0.2, minZ: -7.75, maxZ: -7.2 }, 0, 0.42, loucas);
      caixa(scene, { minX: cx - 0.25, maxX: cx + 0.25, minZ: -7.98, maxZ: -7.78 }, 0.42, 0.85, loucas);
      placaEm(scene, String(i + 1).padStart(2, '0'), { x: cx, y: 2.25, z: -6.38 }, 0, { largura: 64, altura: 32, fundo: '#222' })
        .scale.set(0.3, 0.8, 1);
    });
  }

  // Pias e espelhos de verdade (refletem o Fiscal).
  const bancada = lambert({ color: 0x8a8578 });
  const espelhos = [];
  for (const [nome, b] of Object.entries(BANCADAS)) {
    caixa(scene, b, 0, 0.9, bancada);
    for (const z of [-5, -4.05, -3.1]) {
      const x = (b.minX + b.maxX) / 2;
      caixa(scene, { minX: x - 0.18, maxX: x + 0.18, minZ: z - 0.25, maxZ: z + 0.25 }, 0.9, 0.95, loucas);
    }
    const espelho = new Reflector(new THREE.PlaneGeometry(2.8, 1.1), {
      textureWidth: 160, textureHeight: 64, color: 0x8a9090,
    });
    const ehMasc = nome === 'masculino';
    espelho.position.set(ehMasc ? -4.11 : 4.11, 1.75, -4.05);
    espelho.rotation.y = ehMasc ? -Math.PI / 2 : Math.PI / 2;
    scene.add(espelho);
    espelhos.push(espelho);
  }

  // Portas fechadas: banheiro família (trancada) e entrada da rua.
  const madeira = lambert({ color: 0x5b4632 });
  const portaFamilia = caixa(scene, { minX: PORTAS.familia.minX, maxX: PORTAS.familia.maxX, minZ: -1.9, maxZ: -1.8 }, 0, 2.2, madeira);
  placaEm(scene, 'FAMÍLIA', { x: 0, y: 2.45, z: -1.88 }, 0, { fundo: '#444' });
  caixa(scene, { minX: PORTAS.entrada.minX, maxX: PORTAS.entrada.maxX, minZ: 5.84, maxZ: 5.9 }, 0, 2.3, lambert({ color: 0x1e2a30 }));
  placaEm(scene, 'ENTRADA', { x: 0, y: 2.55, z: 5.83 }, Math.PI, { fundo: '#1c5130' });
  placaEm(scene, 'MASCULINO', { x: -8.5, y: 2.5, z: -1.88 });
  placaEm(scene, 'FEMININO', { x: 8.5, y: 2.5, z: -1.88 }, 0, { fundo: '#6b1d4a' });
  placaEm(scene, 'DEPÓSITO', { x: 11.88, y: 2.5, z: -1 }, -Math.PI / 2, { fundo: '#5a4a1a' });
  placaEm(scene, 'BANHEIRO 24H', { x: 0, y: 2.6, z: 0.12 }, 0, { fundo: '#7a1010' });

  // Guichê do zelador, telefone e monitor da câmera do corredor.
  caixa(scene, GUICHE, 0, 1, lambert({ color: 0x6d5a40 }));
  const telefone = caixa(scene, { minX: -3.6, maxX: -3.3, minZ: 2.3, maxZ: 2.55 }, 1, 1.1, lambert({ color: 0x202020 }));
  caixa(scene, { minX: -3.9, maxX: -3.4, minZ: 2.85, maxZ: 3.55 }, 1, 1.5, lambert({ color: 0x2a2a2a }));
  const alvoMonitor = new THREE.WebGLRenderTarget(128, 96, { magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter });
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: alvoMonitor.texture }));
  tela.position.set(-3.39, 1.25, 3.2);
  tela.rotation.y = Math.PI / 2;
  scene.add(tela);
  const cameraMonitor = new THREE.PerspectiveCamera(70, 4 / 3, 0.1, 30);
  cameraMonitor.position.set(PONTOS.cameraMonitor.x, PONTOS.cameraMonitor.y, PONTOS.cameraMonitor.z);
  cameraMonitor.lookAt(9, 1.1, -1);

  // Poça para passar pano.
  const poca = new THREE.Mesh(new THREE.CircleGeometry(0.7, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a8aa0, transparent: true, opacity: 0.55 }));
  poca.rotation.x = -Math.PI / 2;
  poca.position.set(PONTOS.poca.x, 0.01, PONTOS.poca.z);
  scene.add(poca);

  // Depósito: prateleiras, balde e o quadro de luz.
  const metal = lambert({ color: 0x55585a });
  caixa(scene, { minX: 12.3, maxX: 13.5, minZ: -3.9, maxZ: -3.4 }, 0, 2.2, metal);
  caixa(scene, { minX: 14, maxX: 14.5, minZ: 0.2, maxZ: 0.7 }, 0, 0.5, lambert({ color: 0xc8a020 }));
  const quadro = caixa(scene, { minX: 15.8, maxX: 15.9, minZ: -2.8, maxZ: -2.2 }, 1.2, 2, lambert({ color: 0x777a70 }));
  placaEm(scene, 'QUADRO DE LUZ', { x: 15.78, y: 2.15, z: -2.5 }, -Math.PI / 2, { fundo: '#7a5a00' }).scale.set(0.6, 0.6, 1);

  // Luzes fluorescentes (uma por região) — piscam no main.
  scene.add(new THREE.AmbientLight(0x606878, 0.12));
  const luzes = [];
  const lampada = new THREE.MeshBasicMaterial({ color: 0xeef4ff });
  for (const [nome, r] of Object.entries(REGIOES)) {
    const x = (r.minX + r.maxX) / 2, z = (r.minZ + r.maxZ) / 2;
    const intensidade = nome === 'deposito' ? 1.5 : 6;
    const luz = new THREE.PointLight(0xcfe0d8, intensidade, 12, 1.6);
    luz.position.set(x, ALTURA_PAREDE - 0.3, z);
    scene.add(luz);
    const tubo = caixa(scene, { minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.08, maxZ: z + 0.08 }, ALTURA_PAREDE - 0.06, ALTURA_PAREDE - 0.01, lampada.clone());
    luzes.push({ regiao: nome, luz, tubo, base: intensidade });
  }

  const interagiveis = [
    { id: 'monitor', pos: PONTOS.guiche, raio: 1.3, texto: 'Conferir o monitor' },
    { id: 'telefone', pos: PONTOS.guiche, raio: 1.3, texto: 'Atender o telefone' },
    { id: 'poca', pos: PONTOS.poca, raio: 1.2, texto: 'Passar pano' },
    { id: 'papel_masc', pos: { x: -8, z: -5.6 }, raio: 1.6, texto: 'Repor o papel' },
    { id: 'papel_fem', pos: { x: 8, z: -5.6 }, raio: 1.6, texto: 'Repor o papel' },
    { id: 'quadro', pos: { x: 15.2, z: -2.5 }, raio: 1.2, texto: 'Apagar a luz' },
    { id: 'cabine01', pos: { x: -10.8, z: -5.9 }, raio: 1, texto: 'Abrir a cabine 01' },
  ];

  return {
    luzes, espelhos, portaFamilia, portaCabine01, telefone, quadro,
    monitor: { alvo: alvoMonitor, camera: cameraMonitor, tela },
    paredeCabine01: PORTA_CABINE_01, interagiveis,
  };
}
