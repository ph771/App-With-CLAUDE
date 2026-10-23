// Personagens low-poly: corpo em caixas, cabeça grande (caricatura) com rosto em canvas.
import * as THREE from 'three';
import { desenharRosto, ROSTOS } from './rostos.js';

const lambert = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

const ROUPAS = {
  fiscal: { paleto: 0x5a5448, camisa: 0x111111, gravata: null, calca: 0x2a2826, paletoLargo: true },
  lulao: { paleto: 0x1f2b4a, camisa: 0xdfe6ef, gravata: 0x3a5a9a, calca: 0x1f2b4a },
  mamae_falou: { paleto: 0x151515, camisa: 0xdde3ea, gravata: null, calca: 0x151515 },
  renan: { paleto: 0x1c2638, camisa: 0xf2f2f2, gravata: null, calca: 0x2a2a30 },
  moraez: { paleto: 0x1b1b1e, camisa: 0xaecbe6, gravata: 0x2a3550, calca: 0x1b1b1e },
  kim: { paleto: 0x22252b, camisa: 0xe8e8e8, gravata: 0x7a1d1d, calca: 0x22252b, cabecaLarga: true },
  nicolas: { paleto: 0x111111, camisa: 0xf0f0f0, gravata: 0x0c0c0c, calca: 0x111111 },
  jairo: { paleto: 0x1d1f26, camisa: 0xf2f2f2, gravata: 0x2b3b66, calca: 0x1d1f26 },
  flavio: { paleto: null, camisa: 0xb9d3ee, gravata: null, calca: 0x30343c },
};

function caixa(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function cabeca(id, largura) {
  const r = ROSTOS[id];
  const textura = new THREE.CanvasTexture(desenharRosto(id));
  textura.magFilter = textura.minFilter = THREE.NearestFilter;
  textura.colorSpace = THREE.SRGBColorSpace;
  const pele = lambert(r.pele);
  const topo = r.cabelo.cor && r.cabelo.estilo !== 'careca' && r.cabelo.estilo !== 'nenhum' ? lambert(r.cabelo.cor) : pele;
  const lado = r.cabelo.estilo === 'ondulado' || r.cabelo.estilo === 'topete' ? topo : pele;
  const frente = new THREE.MeshLambertMaterial({ map: textura });
  // Ordem das faces do BoxGeometry: +x, -x, +y, -y, +z (frente), -z (nuca)
  const g = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.5, 0.44), [lado, lado, topo, pele, frente, topo]);
  if (r.cabelo.estilo === 'careca') g.material[2] = new THREE.MeshPhongMaterial({ color: r.pele, shininess: 90, flatShading: true });
  if (r.cabelo.estilo === 'topete' || r.cabelo.estilo === 'ondulado') {
    g.add(caixa(largura * 0.95, 0.1, 0.4, topo, 0, 0.29, 0.01)); // volume em cima
  }
  return g;
}

function acessorios(id, grupo, maoDir, maoEsq) {
  const add = (pai, m) => { pai.add(m); return m; };
  switch (id) {
    case 'fiscal': {
      add(maoEsq, caixa(0.3, 0.4, 0.03, lambert(0x8a6a40), 0, -0.05, 0.12)); // prancheta
      add(maoEsq, caixa(0.24, 0.3, 0.01, lambert(0xf0eee6), 0, -0.07, 0.14));
      add(grupo, caixa(0.1, 0.13, 0.02, lambert(0xf5f5f5), 0.13, 1.3, 0.2)); // crachá
      const peruca = new THREE.Group();
      peruca.add(caixa(0.6, 0.18, 0.5, lambert(0xd9b85c), 0, 0.27, -0.02));
      peruca.add(caixa(0.12, 0.55, 0.45, lambert(0xd9b85c), -0.3, -0.05, -0.04));
      peruca.add(caixa(0.12, 0.55, 0.45, lambert(0xd9b85c), 0.3, -0.05, -0.04));
      peruca.add(caixa(0.58, 0.6, 0.1, lambert(0xd9b85c), 0, -0.02, -0.25));
      peruca.name = 'peruca';
      peruca.visible = false; // aparece em algumas aparições
      grupo.userData.cabeca.add(peruca);
      break;
    }
    case 'lulao': {
      const palha = lambert(0xe2cf96);
      const chapeu = new THREE.Group();
      chapeu.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 10), palha));
      const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.2, 10), palha);
      copa.position.y = 0.11; chapeu.add(copa);
      const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.05, 10), lambert(0x111111));
      faixa.position.y = 0.04; chapeu.add(faixa);
      chapeu.position.y = 0.27;
      grupo.userData.cabeca.add(chapeu);
      add(grupo, caixa(0.04, 0.04, 0.02, lambert(0xc0a040), -0.17, 1.38, 0.2)); // broche
      break;
    }
    case 'mamae_falou':
      maoDir.rotation.x = -1.6; // celular erguido, filmando
      add(maoDir, caixa(0.09, 0.17, 0.02, lambert(0x0a0a0a), 0, -0.1, 0.05));
      break;
    case 'renan': {
      const caneca = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), lambert(0xf2f2f2));
      caneca.position.set(0, -0.08, 0.08);
      maoDir.rotation.x = -0.9;
      add(maoDir, caneca);
      break;
    }
    case 'moraez':
      add(maoEsq, caixa(0.06, 0.32, 0.42, lambert(0x6b4a2a), 0.05, 0.05, 0.05)); // pasta de processos
      break;
    case 'nicolas':
      add(maoDir, caixa(0.2, 0.2, 0.16, lambert(0xd9b85c), 0, -0.12, 0.06)); // peruca na mão
      break;
    case 'jairo': {
      const lata = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), lambert(0x2f6fc0));
      lata.position.set(0, -0.08, 0.08);
      maoDir.rotation.x = -0.9;
      add(maoDir, lata);
      add(grupo, caixa(0.04, 0.04, 0.02, lambert(0x2a9a3a), -0.17, 1.38, 0.2)); // broche verde-amarelo
      add(grupo, caixa(0.02, 0.02, 0.02, lambert(0xe8c020), -0.17, 1.38, 0.212));
      break;
    }
    case 'flavio': {
      const c = document.createElement('canvas'); c.width = 32; c.height = 16;
      const g = c.getContext('2d'); g.fillStyle = '#e8c020'; g.fillRect(0, 0, 32, 16);
      g.fillStyle = '#123'; g.font = 'bold 13px monospace'; g.fillText('01', 7, 13);
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter;
      const broche = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({ map: t }));
      broche.position.set(-0.15, 1.38, 0.181);
      grupo.add(broche);
      break;
    }
  }
}

export function criarPersonagem(id) {
  const roupa = ROUPAS[id];
  const grupo = new THREE.Group();
  grupo.name = id;
  const calca = lambert(roupa.calca), sapato = lambert(0x0d0d0d);
  const tronco = lambert(roupa.paleto ?? roupa.camisa);
  const pele = lambert(ROSTOS[id].pele);
  const largo = roupa.paletoLargo ? 1.18 : 1;

  // Pernas
  grupo.add(caixa(0.16, 0.85, 0.18, calca, -0.1, 0.43, 0));
  grupo.add(caixa(0.16, 0.85, 0.18, calca, 0.1, 0.43, 0));
  grupo.add(caixa(0.17, 0.08, 0.26, sapato, -0.1, 0.04, 0.04));
  grupo.add(caixa(0.17, 0.08, 0.26, sapato, 0.1, 0.04, 0.04));
  // Tronco, camisa e gravata
  grupo.add(caixa(0.46 * largo, 0.62, 0.26 * largo, tronco, 0, 1.17, 0));
  if (roupa.paleto) grupo.add(caixa(0.14, 0.5, 0.01, lambert(roupa.camisa), 0, 1.22, 0.13 * largo + 0.005));
  if (roupa.gravata) grupo.add(caixa(0.05, 0.42, 0.01, lambert(roupa.gravata), 0, 1.2, 0.13 * largo + 0.012));
  // Braços (com pivô no ombro)
  const braco = (x) => {
    const pivo = new THREE.Group();
    pivo.position.set(x, 1.44, 0);
    pivo.add(caixa(0.13 * largo, 0.6 * (roupa.paletoLargo ? 1.1 : 1), 0.14, tronco, 0, -0.3, 0));
    const mao = new THREE.Group();
    mao.position.set(0, -0.62, 0);
    mao.add(caixa(0.1, 0.1, 0.1, pele, 0, 0, 0));
    pivo.add(mao);
    grupo.add(pivo);
    return { pivo, mao };
  };
  const dir = braco(0.3 * largo), esq = braco(-0.3 * largo);
  // Pescoço e cabeça grande (caricatura)
  grupo.add(caixa(0.14, 0.1, 0.14, pele, 0, 1.52, 0));
  const cab = cabeca(id, roupa.cabecaLarga ? 0.6 : 0.46);
  cab.position.set(0, 1.82, 0.02);
  grupo.add(cab);
  grupo.userData = { cabeca: cab, bracoDir: dir.pivo, bracoEsq: esq.pivo };

  acessorios(id, grupo, dir.mao, esq.mao);
  return grupo;
}

// Balanço parado: respira e mexe a cabeça de leve.
export function animarParado(p, t) {
  p.userData.cabeca.rotation.y = Math.sin(t * 0.7 + p.id) * 0.08;
  p.userData.cabeca.position.y = 1.82 + Math.sin(t * 1.6 + p.id) * 0.008;
}

// Caminhada: balança braços.
export function animarAndando(p, t) {
  const a = Math.sin(t * 7) * 0.5;
  if (p.name !== 'mamae_falou') p.userData.bracoDir.rotation.x = a;
  p.userData.bracoEsq.rotation.x = -a;
}

export const IDS_PERSONAGENS = ['fiscal', 'lulao', 'mamae_falou', 'renan', 'moraez', 'kim', 'nicolas', 'jairo', 'flavio'];
