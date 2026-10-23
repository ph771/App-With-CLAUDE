// O favor que cada visitante pede antes de dar o voto e o item.
// tipo: 'pegar' (achar um objeto e trazer), 'filmar' (ficar perto do Fiscal olhando para ele),
//       'mandado' (entregar o mandado ao Fiscal), 'ferramenta' (trazer uma ferramenta na mão).
export const FAVORES = {
  lulao: {
    tipo: 'pegar', objeto: { id: 'cafe', nome: 'Pacote de café', ponto: { x: -22.2, z: -3.2 }, onde: 'Almoxarifado' },
    pedido: ['Companheiro, o café acabou. Sem café não tem democracia.', 'Tem um pacote no almoxarifado. Traz pra mim?'],
    obrigado: 'Ah, agora sim. Café de verdade, não de fiscal.',
  },
  mamae_falou: {
    tipo: 'filmar', segundos: 5,
    pedido: ['Preciso de imagem desse fiscal pro canal!', 'Fica perto dele uns 5 segundos, olhando pra ele, que eu filmo daqui. Coragem!'],
    obrigado: 'MAMÃE FALOU! Isso vai bombar!',
  },
  renan: {
    tipo: 'pegar', objeto: { id: 'caneca', nome: 'Caneca do Renan', ponto: { x: 121.6, z: -4.2 }, onde: 'Banheiro dos Parlamentares' },
    pedido: ['Cara, eu joguei minha caneca longe numa live e ela foi parar no banheiro chique.', 'Pega lá pra mim?'],
    obrigado: 'Minha caneca! Toma, usa ela melhor do que eu.',
  },
  moraez: {
    tipo: 'mandado',
    pedido: ['Tenho aqui um mandado para o Fiscal. Entregue em mãos.', 'Chegue perto dele e entregue. Ele vai parar para ler. Todos param.'],
    obrigado: 'Mandado cumprido. Excelente trabalho.',
  },
  kim: {
    tipo: 'pegar', objeto: { id: 'celular', nome: 'Celular do Kim', ponto: { x: 26.2, z: -1.2 }, onde: 'Copa' },
    pedido: ['Perdi meu celular. Tá com a live de 4 horas aberta!', 'Acho que esqueci na copa.'],
    obrigado: 'Valeu! Ainda tava ao vivo. 3 pessoas assistindo.',
  },
  nicolas: {
    tipo: 'pegar', objeto: { id: 'peruca_nicolas', nome: 'Peruca do Nicolas', ponto: { x: 17.2, z: -4.4 }, onde: 'Banheiro feminino · térreo' },
    pedido: ['A peruca reserva sumiu. Vi o Fiscal entrando no banheiro feminino com ela.', 'Dá pra buscar?'],
    obrigado: 'Ufa. Fica com a outra, eu tenho várias.',
  },
  jairo: {
    tipo: 'pegar', objeto: { id: 'leite_condensado', nome: 'Leite condensado', ponto: { x: 24.6, z: -4.6 }, onde: 'Geladeira da copa' },
    pedido: ['Tô sem energia, talkey? Preciso de leite condensado.', 'Tem na geladeira da copa.'],
    obrigado: 'Isso. Toma uma lata pra você também, talkey?',
  },
  flavio: {
    tipo: 'ferramenta', ferramenta: 'rolos',
    pedido: ['O papel do gabinete 01 acabou. O 01 não pode ficar sem papel.', 'Traz os rolos de papel do almoxarifado?'],
    obrigado: 'Valeu. O 01 agradece. O 02 também.',
  },
};
