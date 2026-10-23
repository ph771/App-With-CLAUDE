// Planta do banheiro público (metros). x = leste/oeste, z = norte(-)/sul(+).
// Só dados: usada pela física, pela navegação do Fiscal e pela construção 3D.
export const ALTURA_PAREDE = 3;
const E = 0.1; // meia espessura da parede

// Parede ao longo de x (z fixo) ou de z (x fixo), em caixas (AABB).
const px = (z, x1, x2) => ({ minX: x1, maxX: x2, minZ: z - E, maxZ: z + E });
const pz = (x, z1, z2) => ({ minX: x - E, maxX: x + E, minZ: z1, maxZ: z2 });

export const REGIOES = {
  hall: { minX: -4, maxX: 4, minZ: 0, maxZ: 6 },
  corredor: { minX: -12, maxX: 12, minZ: -2, maxZ: 0 },
  masculino: { minX: -12, maxX: -4, minZ: -8, maxZ: -2 },
  feminino: { minX: 4, maxX: 12, minZ: -8, maxZ: -2 },
  deposito: { minX: 12, maxX: 16, minZ: -4, maxZ: 1 },
};

export const PORTAS = {
  masculino: { minX: -9, maxX: -8, z: -2 },
  familia: { minX: -0.6, maxX: 0.6, z: -2 }, // trancada
  feminino: { minX: 8, maxX: 9, z: -2 },
  deposito: { x: 12, minZ: -1.6, maxZ: -0.4 },
  entrada: { minX: -0.8, maxX: 0.8, z: 6 }, // por onde entram os visitantes
};

// Cabines: 4 em cada banheiro, encostadas na parede do fundo (z -8 a -6.4).
const CAB_Z = [-8, -6.4];
export const CABINES = {
  masculino: [[-11.6, -10], [-10, -8.4], [-8.4, -6.8], [-6.8, -5.2]],
  feminino: [[5.2, 6.8], [6.8, 8.4], [8.4, 10], [10, 11.6]],
};
export const CABINE_01 = { minX: -11.6, maxX: -10, minZ: CAB_Z[0], maxZ: CAB_Z[1] };
// Porta da cabine 01: parede extra enquanto o jogador não tem a chave.
export const PORTA_CABINE_01 = px(CAB_Z[1], -11.6, -10);

const divisorias = Object.values(CABINES).flatMap((lista) => {
  const xs = [...new Set(lista.flat())];
  return xs.map((x) => pz(x, CAB_Z[0], CAB_Z[1]));
});

// Bancadas de pia (colidem) e espelhos.
export const BANCADAS = {
  masculino: { minX: -4.6, maxX: -4, minZ: -5.5, maxZ: -2.6 },
  feminino: { minX: 4, maxX: 4.6, minZ: -5.5, maxZ: -2.6 },
};
export const GUICHE = { minX: -4, maxX: -2.8, minZ: 2, maxZ: 4.5 };

export const PAREDES_SALA = [
  // hall
  pz(-4, 0, 6), pz(4, 0, 6), px(6, -4, 4),
  // corredor: parede norte com as portas dos banheiros (a do banheiro família é trancada)
  px(-2, -12, -9), px(-2, -8, 8), px(-2, 9, 12),
  px(0, -12, -4), px(0, 4, 12), pz(-12, -2, 0),
  // fim do corredor / entrada do depósito
  pz(12, -4, -1.6), pz(12, -0.4, 1),
  // masculino
  pz(-12, -8, -2), pz(-4, -8, -2), px(-8, -12, -4),
  // feminino
  pz(4, -8, -2), pz(12, -8, -2), px(-8, 4, 12),
  // banheiro família (fechado)
  pz(-2, -6, -2), pz(2, -6, -2), px(-6, -2, 2),
  // depósito
  pz(16, -4, 1), px(-4, 12, 16), px(1, 12, 16),
];
export const DIVISORIAS = divisorias;

// Tudo que colide com o jogador.
export const PAREDES = [...PAREDES_SALA, ...DIVISORIAS, BANCADAS.masculino, BANCADAS.feminino, GUICHE];

export const PONTOS = {
  inicio: { x: 0, z: 3.5 },
  guiche: { x: -2.3, z: 3.2 },
  monitor: { x: -3.4, z: 3.2 },
  telefone: { x: -3.4, z: 2.4 },
  poca: { x: 1.8, z: 1.4 },
  origemFiscal: { x: 8.5, z: -1 },
  quadroLuz: { x: 15.7, z: -2.5 },
  espelhoMasc: { x: -4.1, z: -4 },
  espelhoFem: { x: 4.1, z: -4 },
  entradaVisitante: { x: 0, z: 5.5 },
  esperaVisitante: { x: 0.8, z: 1.6 },
  saidaVisitante: { x: -8.5, z: -3 },
  cameraMonitor: { x: 0, y: 2.7, z: -1.6 },
};
