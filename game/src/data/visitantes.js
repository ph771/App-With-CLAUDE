// Visitantes da noite (NPCs). Paródia: nomes inventados, piadas com manias públicas.
// `voto`: a fala final, contra o Projeto de Lei do Banheiro Fiscalizado.
export const VISITANTES = [
  {
    id: 'lulao', nome: 'Lulão', minuto: 1, item: 'lanterna', voto: 'Voto NÃO pro projeto. Companheiro, banheiro é direito de todos.',
    falas: [
      'Companheiro, tem café nessa copa? ...Frio. Igual esse projeto de lei.',
      'Nunca antes na história desse país um banheiro foi tão fiscalizado.',
      'Esse rapaz prometeu cuidar do banheiro. Eu prometi picanha. Ninguém entregou.',
      'Toma essa lanterna. A luz daqui não é de confiança.',
    ],
  },
  {
    id: 'mamae_falou', nome: 'Mamãe Falou', minuto: 61, item: 'microfone', voto: 'E o meu voto é NÃO! Ao vivo pra galera!',
    falas: [
      'MAMÃE FALOU! Olha o cara de prancheta parado na porta do banheiro, gente!',
      'Se ele vier pra cima, mete o microfone na cara dele. Ele nunca recusa uma entrevista.',
    ],
  },
  {
    id: 'renan', nome: 'Renan Santarém', minuto: 121, item: 'caneca', voto: 'Voto não. Três milhões de votos pra isso? Não.',
    falas: [
      'Três milhões de votos pra fiscalizar banheiro, cara? É meio louco isso aí.',
      'Fica com a minha caneca. Joga longe que ele vai atrás do barulho. Eu sei do que tô falando.',
    ],
  },
  {
    id: 'moraez', nome: 'Ministro Moraez', minuto: 121, item: 'ordem', voto: 'Voto não. E o projeto está suspenso até segunda ordem.',
    falas: [
      'Este fiscal está sob investigação.',
      'O perfil dele está suspenso. O banheiro também, se precisar.',
      'Aqui está uma ordem de suspensão. Use com moderação.',
    ],
  },
  {
    id: 'kim', nome: 'Kim Katagiri', minuto: 181, item: 'mapa', voto: 'Meu voto é não. Pelo menos alguém aqui vota alguma coisa.',
    falas: [
      '(se olha na tela do celular) ...Parem de me mandar esse meme.',
      'Lá no meu trabalho é sempre assim: ninguém lê, ninguém trabalha, ninguém faz nada.',
      'Vocês ficam fazendo dancinha pra internet e não tem uma proposta pra mudar os banheiros do Brasil! Olha o estado desse plenário!',
      'Toma, fiz um mapa do caminho que ele faz. Ninguém mais ia fazer.',
    ],
  },
  {
    id: 'nicolas', nome: 'Nicolas Ferrer', minuto: 241, item: 'peruca', voto: 'Voto não. Mas devolve a minha peruca.',
    falas: [
      'Ele pegou minha peruca emprestada pra um vídeo e não devolveu.',
      'Fica com a reserva. Com ela ele te confunde com outra pessoa.',
    ],
  },
  {
    id: 'jairo', nome: 'Seu Jairo', minuto: 241, item: 'leite', voto: 'Voto não, talkey? Banheiro não é prioridade.',
    falas: [
      'Esse rapaz aí? Mandei ele cuidar do banheiro pra parar de me ligar, talkey?',
      'Banheiro não é prioridade. Prioridade é pão com leite condensado.',
      'Toma uma lata. Dá energia pra correr.',
    ],
  },
  {
    id: 'flavio', nome: 'Flávio "Zero Um"', minuto: 301, item: 'chave', voto: 'Voto não. O 01 vota primeiro... digo, segundo.',
    falas: [
      'Eu sou o 01 em tudo, mas aqui na fila da cabine eu sou o 02.',
      'Meu pai mandou avisar que esse fiscal não é do partido.',
      'Toma a chave da cabine 01. Lá dentro ele não te acha.',
    ],
  },
];

export const ITENS = {
  lanterna: { nome: 'Lanterna', dica: 'Liga e desliga a luz.' },
  microfone: { nome: 'Microfone', dica: 'O Fiscal para 20 s para dar entrevista.' },
  caneca: { nome: 'Caneca', dica: 'Joga longe: o Fiscal vai atrás do barulho.' },
  ordem: { nome: 'Ordem de suspensão', dica: 'O Fiscal some por 30 s.' },
  mapa: { nome: 'Mapa', dica: 'Mostra o caminho do Fiscal.' },
  peruca: { nome: 'Peruca', dica: 'Durante a pergunta: ele te confunde e vai embora.' },
  leite: { nome: 'Leite condensado', dica: 'Corre mais rápido por 1 minuto.' },
  chave: { nome: 'Chave da cabine 01', dica: 'Abre o único esconderijo seguro.' },
};
