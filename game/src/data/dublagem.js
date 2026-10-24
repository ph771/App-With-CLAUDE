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
};

export const DUBLAGEM = {};
for (const [id, falas] of Object.entries(FALAS)) {
  falas.forEach((texto, i) => {
    DUBLAGEM[texto] = `assets/vozes/${id}-${i + 1}.mp3`;
  });
}
