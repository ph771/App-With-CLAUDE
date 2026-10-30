// Roda a lógica de contagem num vídeo gravado e mostra o que ela contou.
// Uso: node test/rodar-video.js caminho/do/video.mp4 [--detalhes]
const { spawn } = require('child_process');
const { criarContador } = require('../counter.js');

const LARGURA = 160, ALTURA = 90, FPS = 10;

function rodarVideo(caminho, { detalhes = false } = {}) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', caminho,
      '-vf', `fps=${FPS},scale=${LARGURA}:${ALTURA}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
    const contador = criarContador();
    const tam = LARGURA * ALTURA;
    let resto = Buffer.alloc(0), quadro = 0;
    const eventos = [];
    ff.stdout.on('data', (pedaco) => {
      resto = Buffer.concat([resto, pedaco]);
      while (resto.length >= tam) {
        const img = new Uint8Array(resto.subarray(0, tam));
        resto = resto.subarray(tam);
        const t = (quadro++ * 1000) / FPS;
        for (const e of contador.processar(img, LARGURA, ALTURA, t)) eventos.push(e);
        if (detalhes) {
          const l = contador.leitura;
          console.log(`${(t / 1000).toFixed(1)}s suporte=${l.movSuporte.toFixed(2)} saida=${l.movSaida.toFixed(2)} sem=${l.semelhanca.toFixed(2)}`);
        }
      }
    });
    ff.on('error', reject);
    ff.on('close', (codigo) => (codigo === 0 ? resolve(eventos) : reject(new Error(`ffmpeg saiu com ${codigo}`))));
  });
}

function resumir(eventos) {
  let certas = 0, erradas = 0;
  for (const e of eventos) {
    if (e.tipo === 'certa') certas++;
    else if (e.tipo === 'certa-desfeita') certas--;
    else if (e.tipo === 'errada') erradas++;
  }
  return { certas, erradas, total: certas + erradas };
}

module.exports = { rodarVideo, resumir };

if (require.main === module) {
  const caminho = process.argv[2];
  if (!caminho) { console.error('Uso: node test/rodar-video.js video.mp4 [--detalhes]'); process.exit(1); }
  rodarVideo(caminho, { detalhes: process.argv.includes('--detalhes') }).then((eventos) => {
    for (const e of eventos) console.log(`${(e.t / 1000).toFixed(1)}s  ${e.tipo}`);
    console.log(resumir(eventos));
  });
}
