// Planta da Casa Legislativa de Vila Nova do Sul (metros, vista de cima).
// Os andares ficam no mesmo plano, separados em x: térreo perto de 0, 1º andar perto de 100,
// subsolo perto de 200. Escadas levam de um ao outro (teleporte).
export const ALTURA_PAREDE = 3;
const E = 0.1; // meia espessura da parede

export const ANDARES = { terreo: [-40, 50], '1andar': [60, 150], subsolo: [170, 250] };
export function andarDe(p) {
  for (const [nome, [a, b]] of Object.entries(ANDARES)) if (p.x >= a && p.x <= b) return nome;
  return null;
}

// Ordem importa: corredores primeiro (as fronteiras caem neles).
export const SALAS = [
  // Térreo
  { id: 'corredor_t', nome: 'Corredor do térreo', minX: -20, maxX: 20, minZ: -3, maxZ: 0, piso: 'xadrez' },
  { id: 'portaria', nome: 'Portaria', minX: -8, maxX: 8, minZ: 0, maxZ: 10, piso: 'granito' },
  { id: 'masc_t', nome: 'Banheiro masculino (térreo)', minX: -20, maxX: -10, minZ: -11, maxZ: -3, piso: 'xadrez' },
  { id: 'fem_t', nome: 'Banheiro feminino (térreo)', minX: 10, maxX: 20, minZ: -11, maxZ: -3, piso: 'xadrez' },
  { id: 'familia', nome: 'Banheiro família', minX: -4, maxX: 4, minZ: -8, maxZ: -3, piso: 'xadrez', fechada: true },
  { id: 'almox', nome: 'Almoxarifado', minX: -30, maxX: -20, minZ: -9, maxZ: 0, piso: 'concreto' },
  { id: 'copa', nome: 'Copa', minX: 20, maxX: 28, minZ: -6, maxZ: 0, piso: 'granito' },
  // 1º andar
  { id: 'corredor_1', nome: 'Corredor dos gabinetes', minX: 76, maxX: 124, minZ: -3, maxZ: 0, piso: 'carpete' },
  { id: 'hall_1', nome: 'Hall do 1º andar', minX: 92, maxX: 108, minZ: 0, maxZ: 6, piso: 'carpete' },
  { id: 'plenario', nome: 'Plenário', minX: 86, maxX: 114, minZ: -20, maxZ: -3, piso: 'carpete' },
  { id: 'banheiro_vip', nome: 'Banheiro dos Parlamentares', minX: 114, maxX: 124, minZ: -11, maxZ: -3, piso: 'marmore' },
  { id: 'imprensa', nome: 'Sala de imprensa', minX: 76, maxX: 86, minZ: -11, maxZ: -3, piso: 'carpete' },
  // Subsolo
  { id: 'hall_s', nome: 'Escada do subsolo', minX: 196, maxX: 204, minZ: -3, maxZ: 3, piso: 'concreto' },
  { id: 'maquinas', nome: 'Casa de máquinas', minX: 190, maxX: 214, minZ: -15, maxZ: -3, piso: 'concreto' },
];

// Portas abertas (vãos). `z` = porta numa parede horizontal (de x1 a x2); `x` = parede vertical.
export const PORTAS = [
  { x1: -8, x2: 8, z: 0 }, // portaria ↔ corredor (vão largo)
  { x1: -15.5, x2: -14.5, z: -3 }, // masculino
  { x1: 14.5, x2: 15.5, z: -3 }, // feminino
  { x: -20, z1: -2.5, z2: -0.5 }, // almoxarifado
  { x: 20, z1: -2.5, z2: -0.5 }, // copa
  { x1: 92, x2: 108, z: 0 }, // hall ↔ corredor do 1º andar
  { x1: 98.5, x2: 101.5, z: -3 }, // plenário
  { x1: 118.5, x2: 119.5, z: -3 }, // banheiro dos parlamentares
  { x1: 80.5, x2: 81.5, z: -3 }, // imprensa
  { x1: 199, x2: 201, z: -3 }, // casa de máquinas
];

// Portas fechadas só de enfeite (desenhadas, sem vão).
export const PORTAS_FECHADAS = [
  { x1: -0.6, x2: 0.6, z: -3, placa: 'FAMÍLIA' },
  { x1: -0.8, x2: 0.8, z: 10, placa: 'SAÍDA' },
  { x1: 78, x2: 79.4, z: 0, placa: 'GAB. 01' },
  { x1: 84, x2: 85.4, z: 0, placa: 'GAB. 13' },
  { x1: 88, x2: 89.4, z: 0, placa: 'GAB. 22' },
  { x1: 111, x2: 112.4, z: 0, placa: 'GAB. 17' },
  { x1: 116, x2: 117.4, z: 0, placa: 'GAB. 45' },
  { x1: 121, x2: 122.4, z: 0, placa: 'GAB. 69' },
];

// Escadas: `a` e `b` são os pontos de chegada (onde a pessoa aparece); `usarA`/`usarB` onde se aperta E.
export const ESCADAS = [
  {
    id: 'principal', a: { x: 4.4, z: 2.2 }, b: { x: 104.4, z: 4.5 },
    usarA: { x: 5.6, z: 1.6 }, usarB: { x: 105.4, z: 4.5 },
    rotuloA: 'Subir ao 1º andar', rotuloB: 'Descer ao térreo',
  },
  {
    id: 'subsolo', a: { x: -27.4, z: -7.2 }, b: { x: 200.4, z: 1.5 },
    usarA: { x: -28.7, z: -7.7 }, usarB: { x: 201.4, z: 1.5 },
    rotuloA: 'Descer à casa de máquinas', rotuloB: 'Subir ao almoxarifado',
  },
];

// ---------- Paredes geradas a partir das salas e das portas ----------
function cortar([a, b], buracos) {
  let pedacos = [[a, b]];
  for (const [h1, h2] of buracos) {
    pedacos = pedacos.flatMap(([p1, p2]) => {
      if (h2 <= p1 || h1 >= p2) return [[p1, p2]];
      return [[p1, Math.max(p1, h1)], [Math.min(p2, h2), p2]].filter(([x, y]) => y - x > 1e-6);
    });
  }
  return pedacos;
}

export function paredesDaSala(s) {
  const out = [];
  for (const z of [s.minZ, s.maxZ]) {
    const buracos = PORTAS.filter((d) => d.z !== undefined && Math.abs(d.z - z) < 1e-6).map((d) => [d.x1, d.x2]);
    for (const [x1, x2] of cortar([s.minX, s.maxX], buracos)) out.push({ minX: x1, maxX: x2, minZ: z - E, maxZ: z + E });
  }
  for (const x of [s.minX, s.maxX]) {
    const buracos = PORTAS.filter((d) => d.x !== undefined && Math.abs(d.x - x) < 1e-6).map((d) => [d.z1, d.z2]);
    for (const [z1, z2] of cortar([s.minZ, s.maxZ], buracos)) out.push({ minX: x - E, maxX: x + E, minZ: z1, maxZ: z2 });
  }
  return out;
}

export const PAREDES_SALA = SALAS.flatMap(paredesDaSala);

// ---------- Móveis (colidem com o jogador; o Fiscal é fantasma e atravessa) ----------
const caixa = (tipo, minX, maxX, minZ, maxZ, altura, extra = {}) => ({ tipo, minX, maxX, minZ, maxZ, altura, ...extra });

// Cabines: 4 por banheiro do térreo, 2 no banheiro dos parlamentares, encostadas na parede do fundo.
export const CABINES = [
  ...[[-19.6, -18], [-18, -16.4], [-16.4, -14.8], [-14.8, -13.2]].map(([a, b], i) => ({ sala: 'masc_t', x1: a, x2: b, z1: -11, z2: -9.4, numero: i + 1 })),
  ...[[13.2, 14.8], [14.8, 16.4], [16.4, 18], [18, 19.6]].map(([a, b], i) => ({ sala: 'fem_t', x1: a, x2: b, z1: -11, z2: -9.4, numero: i + 1 })),
  ...[[114.4, 116.2], [116.2, 118]].map(([a, b], i) => ({ sala: 'banheiro_vip', x1: a, x2: b, z1: -11, z2: -9.2, numero: i + 1 })),
];
export const CABINE_01 = { minX: -19.6, maxX: -18, minZ: -11, maxZ: -9.4 };
export const PORTA_CABINE_01 = { minX: -19.6, maxX: -18, minZ: -9.4 - E, maxZ: -9.4 + E };

const divisorias = [...new Set(CABINES.map((c) => `${c.sala}|${c.x1}|${c.z1}|${c.z2}`).concat(CABINES.map((c) => `${c.sala}|${c.x2}|${c.z1}|${c.z2}`)))]
  .map((k) => { const [, x, z1, z2] = k.split('|').map(Number); return caixa('divisoria', x - 0.03, x + 0.03, z1, z2, 2.1); });

export const MOVEIS = [
  caixa('guiche', -8, -6.6, 3, 6.5, 1),
  caixa('escada', 6, 8, 0.3, 3, 3, { sobe: 'leste' }),
  caixa('escada', 106, 108, 3, 6, 3, { sobe: 'leste' }),
  caixa('escada', 202, 204, 0, 3, 3, { sobe: 'leste' }),
  caixa('bancada', -10.6, -10, -8.5, -5.5, 0.9, { espelho: 'oeste' }),
  caixa('bancada', 10, 10.6, -8.5, -5.5, 0.9, { espelho: 'leste' }),
  caixa('bancada', 123.4, 124, -9, -5, 0.9, { espelho: 'oeste', ouro: true }),
  caixa('prateleira', -30, -29.2, -6.5, -0.8, 2.2),
  caixa('prateleira', -27, -21, -9, -8.2, 2.2),
  caixa('armario', -20.8, -20.1, -5.4, -4.2, 2.1), // armário de vassouras (esconderijo)
  caixa('mesa', 22.5, 25.5, -4, -2.6, 0.8, { modelo: 'copa' }),
  caixa('balcao', 27.4, 28, -5.5, -0.5, 1),
  caixa('tribuna', 97, 103, -19.2, -17.6, 1.2),
  ...[-14, -11.5, -9, -6.6].flatMap((z) => [caixa('cadeiras', 88, 98, z - 0.3, z + 0.3, 0.9), caixa('cadeiras', 102, 112, z - 0.3, z + 0.3, 0.9)]),
  caixa('mesa', 78, 84, -9.2, -8.2, 0.8, { modelo: 'imprensa' }),
  caixa('caixa_agua', 192, 197, -14, -9, 3),
  caixa('bomba', 206, 209, -14.5, -12.5, 1.2),
  ...divisorias,
];

// Decoração com modelos prontos (Kenney, CC0). `rot`: para onde a frente olha (0 = +z).
// `w`/`d`: caixa de colisão (largura em x, profundidade em z); sem eles, não colide.
const deco = (modelo, x, z, rot, altura, w, d, y = 0) => ({ modelo, x, z, rot, altura, w, d, y });
const NORTE = Math.PI, SUL = 0, LESTE = Math.PI / 2, OESTE = -Math.PI / 2;
export const DECORACAO = [
  // Portaria
  deco('loungeSofa', -4.6, 9.45, NORTE, 0.8, 1.8, 0.8), deco('loungeSofa', -2.2, 9.45, NORTE, 0.8, 1.8, 0.8),
  deco('pottedPlant', -7.5, 0.6, SUL, 1.1, 0.5, 0.5), deco('pottedPlant', 7.4, 9.4, NORTE, 1.1, 0.5, 0.5),
  deco('trashcan', 2.2, 9.6, NORTE, 0.7, 0.4, 0.4),
  // Corredor do térreo
  deco('trashcan', -13.6, -2.6, SUL, 0.7, 0.4, 0.4), deco('trashcan', 13.6, -2.6, SUL, 0.7, 0.4, 0.4),
  deco('pottedPlant', -6, -2.55, SUL, 1.1, 0.5, 0.5), deco('pottedPlant', 6, -2.55, SUL, 1.1, 0.5, 0.5),
  // Banheiros do térreo
  deco('trashcan', -10.5, -3.6, OESTE, 0.7, 0.4, 0.4), deco('trashcan', 10.5, -3.6, LESTE, 0.7, 0.4, 0.4),
  // Copa
  deco('kitchenFridge', 24.6, -5.55, SUL, 1.8, 0.8, 0.7), deco('pottedPlant', 20.6, -5.5, SUL, 1.1, 0.5, 0.5),
  // Almoxarifado e casa de máquinas: caixas
  deco('cardboardBoxClosed', -20.6, -6.6, OESTE, 0.45, 0.6, 0.6), deco('cardboardBoxOpen', -20.6, -7.6, OESTE, 0.45, 0.6, 0.6),
  deco('cardboardBoxClosed', -20.6, -7.6, OESTE, 0.45, 0, 0, 0.45),
  deco('cardboardBoxClosed', 213.2, -14.2, NORTE, 0.5, 0.7, 0.7), deco('cardboardBoxOpen', 212.2, -14.3, NORTE, 0.5, 0.7, 0.7),
  deco('cardboardBoxClosed', 190.7, -14.3, NORTE, 0.5, 0.7, 0.7),
  // Hall e corredor do 1º andar
  deco('loungeSofa', 96, 5.5, NORTE, 0.8, 2.2, 0.9), deco('pottedPlant', 93, 5.5, NORTE, 1.1, 0.5, 0.5),
  deco('coatRackStanding', 107.4, 0.6, SUL, 1.75, 0.4, 0.4), deco('sideTable', 98.4, 5.6, NORTE, 0.55, 0.7, 0.5),
  deco('pottedPlant', 76.5, -2.5, LESTE, 1.1, 0.5, 0.5), deco('pottedPlant', 123.5, -2.5, OESTE, 1.1, 0.5, 0.5),
  deco('trashcan', 102.5, -2.6, SUL, 0.7, 0.4, 0.4),
  // Banheiro dos Parlamentares e imprensa
  deco('pottedPlant', 114.6, -3.6, SUL, 1.1, 0.5, 0.5), deco('trashcan', 120.5, -3.6, SUL, 0.7, 0.4, 0.4),
  deco('pottedPlant', 85.4, -3.6, SUL, 1.1, 0.5, 0.5), deco('chairDesk', 77, -4.5, LESTE, 1.0, 0.6, 0.6),
];

// Esconderijos: `fora` = onde se aperta E (e onde você sai); `dentro` = onde a câmera fica; `olhar` = para onde olha.
// `altura` = altura dos olhos escondido. `seguro`: o Fiscal nunca procura ali (cabine 01, com a chave).
export const ESCONDERIJOS = [
  ...CABINES.map((c) => {
    const cx = (c.x1 + c.x2) / 2;
    return {
      id: `cabine_${c.sala}_${c.numero}`, nome: `Cabine ${String(c.numero).padStart(2, '0')}`, tipo: 'cabine', sala: c.sala, numero: c.numero,
      fora: { x: cx, z: c.z2 + 0.7 }, dentro: { x: cx, z: c.z2 - 0.35 }, olhar: { x: cx, z: c.z2 + 3 }, altura: 1.5,
      seguro: c.sala === 'masc_t' && c.numero === 1,
    };
  }),
  { id: 'armario_almox', nome: 'Armário de vassouras', tipo: 'armario', fora: { x: -21.4, z: -4.8 }, dentro: { x: -20.45, z: -4.8 }, olhar: { x: -25, z: -4.8 }, altura: 1.55 },
  { id: 'mesa_imprensa', nome: 'Debaixo da mesa', tipo: 'mesa', fora: { x: 81, z: -7.6 }, dentro: { x: 81, z: -8.7 }, olhar: { x: 81, z: -4 }, altura: 0.45 },
  { id: 'tribuna', nome: 'Atrás da tribuna', tipo: 'tribuna', fora: { x: 104, z: -18.4 }, dentro: { x: 100, z: -19.55 }, olhar: { x: 100, z: -10 }, altura: 0.75 },
];

export const PAREDES = [
  ...PAREDES_SALA, ...MOVEIS,
  ...DECORACAO.filter((d) => d.w && d.d).map((d) => ({ minX: d.x - d.w / 2, maxX: d.x + d.w / 2, minZ: d.z - d.d / 2, maxZ: d.z + d.d / 2 })),
];

// ---------- Pontos ----------
export const PONTOS = {
  inicio: { x: 0, z: 7 },
  guiche: { x: -5.9, z: 4.8 },
  monitor: { x: -7.6, z: 5.2 },
  telefone: { x: -7.6, z: 3.6 },
  // O Fiscal começa na ponta oeste do corredor dos gabinetes (longe do banheiro VIP, tarefa das 02:00).
  origemFiscal: { x: 79.5, z: -1.8 },
  quadroGeral: { x: 213, z: -9 },
  painel: { x: 100, z: -16.6 },
  cameraMonitor: { x: 104, y: 2.7, z: -1.5, olharX: 78, olharZ: -1.5 },
  portaAlmox: { x: -18.8, z: -1.5 },
  // Onde o Fiscal recomeça depois de uma pergunta: sempre num andar diferente do seu.
  recomecoTerreo: { x: 18, z: -1.5 },
  recomeco1andar: { x: 79.5, z: -1.8 },
};

// Onde ficam as ferramentas no almoxarifado (pegar com E).
export const FERRAMENTAS_LUGAR = {
  esfregao: { x: -28.5, z: -1.6 },
  rolos: { x: -28.5, z: -3.6 },
  desentupidor: { x: -28.5, z: -5.6 },
  lampada: { x: -25.5, z: -7.6 },
  sabonete: { x: -22.5, z: -7.6 },
};

// Onde cada visitante espera (Versão B).
export const LUGAR_VISITANTE = {
  lulao: { x: 24, z: -1.2 },
  mamae_falou: { x: 3, z: 3.6 },
  renan: { x: 90, z: -1.5 },
  moraez: { x: 110, z: -1.5 },
  kim: { x: 95.5, z: -16 },
  nicolas: { x: 80, z: -6 },
  jairo: { x: 83, z: -6 },
  flavio: { x: 78.7, z: -1.2 },
};
