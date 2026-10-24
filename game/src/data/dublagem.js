// Falas dubladas: o texto exato que aparece na tela → arquivo de áudio em assets/vozes/.
// Vozes de caricatura feitas no ElevenLabs (não imitam as pessoas reais).
// Para trocar por uma gravação sua, basta substituir o .mp3 com o mesmo nome.
const FALAS = {
  mamae_falou: [
    'MAMÃE FALOU! Olha o cara de prancheta parado na porta do banheiro, gente!',
    'Posso falar? Os banheiros são fáceis... porque são inanimados.',
    'Se ele vier pra cima, mete o microfone na cara dele. Ele nunca recusa uma entrevista.',
    'Preciso de imagem desse fiscal pro canal!',
    'Fica perto dele uns 5 segundos, olhando pra ele, que eu filmo daqui. Coragem!',
    'MAMÃE FALOU! Isso vai bombar!',
    'E o meu voto é NÃO! Ao vivo pra galera!',
  ],
  renan: [
    'Três milhões de votos pra fiscalizar banheiro, cara? É meio louco isso aí.',
    'VAMO DEBATER? VAMO DEBATER, CARA! QUER DEBATER?',
    'Fica com a minha caneca. Joga longe que ele vai atrás do barulho. Eu sei do que tô falando.',
    'Cara, eu joguei minha caneca longe numa live e ela foi parar no banheiro chique.',
    'Pega lá pra mim?',
    'Minha caneca! Toma, usa ela melhor do que eu.',
    'Voto não. Três milhões de votos pra isso? Não.',
  ],
  kim: [
    '(se olha na tela do celular) ...Parem de me mandar esse meme.',
    'Ficam me chamando de FONÃO. Vou criar uma lei para instituir pena de morte...',
    'Lá no meu trabalho é sempre assim: ninguém lê, ninguém trabalha, ninguém faz nada.',
    'Vocês ficam fazendo dancinha pra internet e não tem uma proposta pra mudar os banheiros do Brasil! Olha o estado desse plenário!',
    'Toma, fiz um mapa do caminho que ele faz. Ninguém mais ia fazer.',
    'Perdi meu celular. Tá com a live de 4 horas aberta!',
    'Acho que esqueci na copa.',
    'Valeu! Ainda tava ao vivo. 3 pessoas assistindo.',
    'Meu voto é não. Pelo menos alguém aqui vota alguma coisa.',
  ],
  moraez: [
    'Este fiscal está sob investigação.',
    'O perfil dele está suspenso. O banheiro também, se precisar.',
    'Aqui está uma ordem de suspensão. Use com moderação.',
    'Tenho aqui um mandado para o Fiscal. Entregue em mãos.',
    'Chegue perto dele e entregue. Ele vai parar para ler. Todos param.',
    'Mandado cumprido. Excelente trabalho.',
    'Voto não. E o projeto está suspenso até segunda ordem.',
  ],
  nicolas: [
    'Ele pegou minha peruca emprestada pra um vídeo e não devolveu.',
    'Fica com a reserva. Com ela ele te confunde com outra pessoa.',
    'A peruca reserva sumiu. Vi o Fiscal entrando no banheiro feminino com ela.',
    'Dá pra buscar?',
    'Ufa. Fica com a outra, eu tenho várias.',
    'Voto não. Mas devolve a minha peruca.',
  ],
  jairo: [
    'Esse rapaz aí? Mandei ele cuidar do banheiro pra parar de me ligar, talkey?',
    'Banheiro não é prioridade. Prioridade é pão com leite condensado.',
    'Toma uma lata. Dá energia pra correr.',
    'Tô sem energia, talkey? Preciso de leite condensado.',
    'Tem na geladeira da copa.',
    'Isso. Toma uma lata pra você também, talkey?',
    'Voto não, talkey? Banheiro não é prioridade.',
  ],
  flavio: [
    'Eu sou o 01 em tudo, mas aqui na fila da cabine eu sou o 02.',
    'Meu pai mandou avisar que esse fiscal não é do partido.',
    'Toma a chave da cabine 01. Lá dentro ele não te acha.',
    'O papel do gabinete 01 acabou. O 01 não pode ficar sem papel.',
    'Traz os rolos de papel do almoxarifado?',
    'Valeu. O 01 agradece. O 02 também.',
    'Voto não. O 01 vota primeiro... digo, segundo.',
  ],
};

export const DUBLAGEM = {};
for (const [id, falas] of Object.entries(FALAS)) {
  falas.forEach((texto, i) => {
    DUBLAGEM[texto] = `assets/vozes/${id}-${i + 1}.mp3`;
  });
}
