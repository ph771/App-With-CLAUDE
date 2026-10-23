// Perguntas do Fiscal Pavonato. Regra: a resposta segura nunca contém "trans".
const p = (id, fala, armadilhas, segura) => ({
  id,
  fala,
  respostas: [
    { texto: armadilhas[0], segura: false },
    { texto: armadilhas[1], segura: false },
    { texto: segura, segura: true },
  ],
});

export const PERGUNTAS = [
  p('transporte', 'Oi, amigo. Você usa TRANSporte público? Ou é inTRANSigente com a ideia?',
    ['Vou de TRANSporte, claro.', 'Sou meio inTRANSigente, sim.'], 'Eu vou a pé.'),
  p('transparencia', 'Esse banheiro precisa de TRANSparência. O que você está escondendo na cabine 3?',
    ['Nada, é TRANSparente!', 'Só uma TRANSação rápida.'], 'Só papel higiênico.'),
  p('transacao', 'Houve uma TRANSação suspeita na pia 2.',
    ['Foi uma TRANSferência de sabonete.', 'Que TRANStorno!'], 'Alguém lavou a mão.'),
  p('transicao', 'Vai ter TRANSição de turno e eu quero ordem.',
    ['A TRANSição é às seis.', 'Eu TRANSito por aqui sempre.'], 'Meu turno acaba às seis.'),
  p('transeunte', 'Você é TRANSeunte ou funcionário?',
    ['Sou TRANSeunte.', 'Fui TRANSferido pra cá.'], 'Sou o zelador.'),
  p('transtorno', 'Estou com um TRANStorno. A culpa é da TRANSpiração aqui dentro.',
    ['É a TRANSpiração mesmo.', 'Toma um calmante pro TRANStorno.'], 'Quer um copo d\'água?'),
  p('transferencia', 'Preciso fazer uma TRANSferência de fiscal. Digo, de fiscalização.',
    ['Pode TRANSferir.', 'Faz um TRANSbordo.'], 'Fala com o RH.'),
  p('transgressao', 'Isso é uma TRANSgressão! Digo... uma infração sanitária.',
    ['Foi uma TRANSgressão leve.', 'Vou TRANScrever isso.'], 'Foi só uma pia entupida.'),
  p('transbordou', 'O papel higiênico TRANSbordou. Isso é um sinal.',
    ['TRANSbordou mesmo!', 'Isso me TRANStorna.'], 'Eu já repus o papel.'),
  p('transformar', 'Vou TRANSformar o seu plantão num inferno.',
    ['Pode TRANSformar.', 'Isso é TRANScendental.'], 'O plantão já tá ruim assim.'),
  p('transcendental', 'Você é TRANScendental ou só chato?',
    ['TRANScendental, com certeza.', 'TRANSparentemente chato.'], 'Só chato mesmo.'),
  p('transitando', 'TRANSitando por aqui à noite? Muito suspeito.',
    ['TRANSito por aqui sempre.', 'Tô só de TRANSeunte.'], 'Eu trabalho aqui.'),
  p('transcricao', 'Preciso da TRANScrição do seu depoimento.',
    ['Pode TRANScrever.', 'Mando por TRANSmissão.'], 'Não tenho nada a declarar.'),
  p('transistor', 'Aqui no meu rádio TRANSistor eu ouço até a descarga.',
    ['Belo TRANSistor.', 'Que TRANSmissão boa!'], 'Abaixa o volume, por favor.'),
  p('translucido', 'Esse espelho é TRANSlúcido demais pro meu gosto.',
    ['É TRANSlúcido mesmo.', 'Parece TRANSparente.'], 'É só um espelho.'),
];

export const PERGUNTA_FINAL = p('final', 'Você acredita na TRANSformação... ou é um inTRANSigente?',
  ['Acredito na TRANSformação.', 'Sou inTRANSigente.'], 'Eu só quero ir pra casa.');
