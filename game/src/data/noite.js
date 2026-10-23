// A noite da Versão B: tarefas de cada hora, sustos e telefone.
// `ferramenta`: o que precisa estar na mão (pegar no almoxarifado). `segundos`: tempo segurando E.
const t = (id, texto, onde, ferramenta, ponto, segundos) => ({ id, texto, onde, ferramenta, ponto, segundos });

export const HORAS = [
  [
    t('papel_masc_t', 'Repor papel', 'Banheiro masculino · térreo', 'rolos', { x: -16, z: -8.6 }, 2),
    t('papel_fem_t', 'Repor papel', 'Banheiro feminino · térreo', 'rolos', { x: 16, z: -8.6 }, 2),
    t('pano_portaria', 'Limpar as pegadas molhadas', 'Portaria', 'esfregao', { x: 2, z: 4 }, 3),
  ],
  [
    t('desentupir_masc', 'Desentupir a privada 04', 'Banheiro masculino · térreo', 'desentupidor', { x: -14, z: -8.8 }, 4),
    t('monitor', 'Conferir as câmeras', 'Portaria (guichê)', null, { x: -5.9, z: 4.8 }, 2),
  ],
  [
    t('pano_vip', 'Passar pano no mármore', 'Banheiro dos Parlamentares · 1º andar', 'esfregao', { x: 120, z: -6 }, 3),
    t('papel_vip', 'Repor papel', 'Banheiro dos Parlamentares · 1º andar', 'rolos', { x: 116.2, z: -8.4 }, 2),
  ],
  [
    t('lampada_fem', 'Trocar a lâmpada queimada', 'Banheiro feminino · térreo', 'lampada', { x: 15, z: -6 }, 4),
    t('quadro_geral', 'Conferir o quadro de luz geral', 'Casa de máquinas · subsolo', null, { x: 213, z: -9 }, 2),
  ],
  [
    t('sabonete_masc_t', 'Repor sabonete', 'Banheiro masculino · térreo', 'sabonete', { x: -11, z: -7 }, 2),
    t('sabonete_vip', 'Repor sabonete', 'Banheiro dos Parlamentares · 1º andar', 'sabonete', { x: 122.8, z: -7 }, 2),
  ],
  [
    t('tribuna', 'Limpar a tribuna', 'Plenário · 1º andar', 'esfregao', { x: 100, z: -17 }, 3),
    t('papel_fem_t2', 'Repor papel de novo', 'Banheiro feminino · térreo', 'rolos', { x: 17.6, z: -8.6 }, 2),
  ],
];

export const TAREFA_FINAL = t('painel', 'Entregar o relatório no painel de votação', 'Plenário · 1º andar', null, { x: 100, z: -16.6 }, 2);

// Minuto da noite (0 = 00:00) em que cada coisa acontece.
export const SUSTOS = [
  { minuto: 20, id: 'porta_familia' },
  { minuto: 65, id: 'fiscal_monitor' },
  { minuto: 145, id: 'fiscal_cabine' },
  { minuto: 195, id: 'luz_apaga' },
  { minuto: 260, id: 'batidas_cabine' },
  { minuto: 320, id: 'fiscal_espelho' },
];
export const TELEFONEMAS = [{ minuto: 30, id: 'telefone_mudo' }];

export const FERRAMENTAS = {
  esfregao: 'Esfregão e balde',
  rolos: 'Rolos de papel',
  desentupidor: 'Desentupidor',
  lampada: 'Lâmpada e escada',
  sabonete: 'Refil de sabonete',
};

export const POCAS_MAX = 3;
