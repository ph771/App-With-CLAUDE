// Rostos caricatos desenhados em canvas (128×128), a partir da tabela de aparência do roteiro.
const PELE = { clara: '#e3b796', media: '#cf9f7c', morena: '#b98463' };

export const ROSTOS = {
  fiscal: { pele: PELE.clara, cabelo: { cor: '#5a3f2a', estilo: 'curto' }, sobrancelha: { cor: '#4a3322', bravo: 0 }, olhos: 'fixo', boca: 'reta', sombraBarba: true },
  lulao: { pele: PELE.media, cabelo: { cor: '#f1f1ee', estilo: 'nenhum' }, barba: { cor: '#f4f4f1', tipo: 'cheia' }, sobrancelha: { cor: '#e8e8e4', bravo: 0 }, olhos: 'apertado', boca: 'sorrisoLargo' },
  mamae_falou: { pele: PELE.media, cabelo: { cor: '#1c1714', estilo: 'topete' }, barba: { cor: '#1c1714', tipo: 'cheia' }, sobrancelha: { cor: '#1c1714', bravo: 0.15, grossa: true }, olhos: 'normal', boca: 'reta' },
  renan: { pele: PELE.clara, cabelo: { cor: '#1c1714', estilo: 'topete' }, barba: { cor: '#8d8a84', tipo: 'cavanhaque' }, sobrancelha: { cor: '#1c1714', bravo: 0 }, olhos: 'normal', boca: 'sorrisoLado' },
  moraez: { pele: PELE.media, cabelo: { cor: null, estilo: 'careca' }, sobrancelha: { cor: '#2a2420', bravo: 0.25, grossa: true }, olhos: 'fixo', boca: 'reta' },
  kim: { pele: '#d9a77d', cabelo: { cor: '#141414', estilo: 'curto' }, barba: { cor: '#2a2220', tipo: 'rala' }, sobrancelha: { cor: '#1a1a1a', bravo: -0.1 }, olhos: 'apertado', boca: 'dentes', oculos: true, bigode: true, bochechas: true },
  nicolas: { pele: PELE.clara, cabelo: { cor: '#5b3b22', estilo: 'ondulado' }, sobrancelha: { cor: '#4a2f1c', bravo: 0 }, olhos: 'normal', boca: 'reta' },
  jairo: { pele: PELE.clara, cabelo: { cor: '#6c6863', estilo: 'penteadoTras' }, sobrancelha: { cor: '#4a4642', bravo: 0.35 }, olhos: 'normal', boca: 'triste', rugas: true },
  flavio: { pele: PELE.clara, cabelo: { cor: '#5a4330', estilo: 'curto' }, sobrancelha: { cor: '#4a3828', bravo: 0 }, olhos: 'normal', boca: 'sorriso' },
};

function cabelo(g, { cor, estilo }) {
  if (!cor || estilo === 'careca' || estilo === 'nenhum') return;
  g.fillStyle = cor;
  if (estilo === 'curto') { g.fillRect(0, 0, 128, 26); g.fillRect(0, 0, 10, 50); g.fillRect(118, 0, 10, 50); }
  if (estilo === 'topete') { g.fillRect(0, 0, 128, 28); g.fillRect(30, 0, 70, 34); g.fillRect(0, 0, 10, 52); g.fillRect(118, 0, 10, 52); }
  if (estilo === 'ondulado') {
    g.fillRect(0, 0, 128, 30); g.fillRect(0, 0, 14, 60); g.fillRect(114, 0, 14, 60);
    for (let x = 8; x < 128; x += 18) g.fillRect(x, 28, 12, 8);
  }
  if (estilo === 'penteadoTras') {
    g.fillRect(0, 0, 128, 22); g.fillRect(0, 0, 8, 48); g.fillRect(120, 0, 8, 48);
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 10; x < 120; x += 14) g.fillRect(x, 4, 2, 16);
  }
}

function sobrancelhas(g, { cor, bravo = 0, grossa = false }) {
  g.fillStyle = cor;
  const h = grossa ? 7 : 4;
  for (const [x, lado] of [[30, 1], [76, -1]]) {
    g.save();
    g.translate(x + 11, 44);
    g.rotate(bravo * lado);
    g.fillRect(-12, -h / 2, 24, h);
    g.restore();
  }
}

function olhos(g, tipo) {
  for (const x of [41, 87]) {
    if (tipo === 'apertado') { g.fillStyle = '#2a1d16'; g.fillRect(x - 9, 56, 18, 3); continue; }
    g.fillStyle = '#f2eee6'; g.fillRect(x - 9, 52, 18, 10);
    g.fillStyle = '#2a1d16';
    if (tipo === 'fixo') g.fillRect(x - 2, 54, 4, 5); // pupila pequena: olhar parado
    else g.fillRect(x - 4, 53, 8, 8);
  }
}

function boca(g, tipo) {
  g.fillStyle = '#6e2f2a';
  if (tipo === 'reta') g.fillRect(46, 96, 36, 4);
  if (tipo === 'triste') { g.fillRect(46, 96, 36, 4); g.fillRect(42, 99, 6, 4); g.fillRect(80, 99, 6, 4); }
  if (tipo === 'sorriso') { g.fillRect(44, 94, 40, 4); g.fillRect(40, 90, 6, 5); g.fillRect(82, 90, 6, 5); }
  if (tipo === 'sorrisoLado') { g.fillRect(48, 96, 30, 4); g.fillRect(76, 91, 8, 5); }
  if (tipo === 'sorrisoLargo') {
    g.fillRect(36, 88, 56, 14);
    g.fillStyle = '#f5f2ea'; g.fillRect(40, 89, 48, 6);
  }
  if (tipo === 'dentes') {
    g.fillRect(44, 92, 40, 6);
    g.fillStyle = '#f5f2ea'; g.fillRect(55, 96, 8, 10); g.fillRect(65, 96, 8, 10); // os dois dentes do meme
  }
}

function barba(g, { cor, tipo }) {
  g.fillStyle = cor;
  if (tipo === 'cheia') {
    g.fillRect(0, 70, 14, 58); g.fillRect(114, 70, 14, 58); g.fillRect(0, 104, 128, 24);
    g.fillRect(34, 84, 60, 8); // bigode
    g.fillRect(14, 100, 30, 28); g.fillRect(84, 100, 30, 28);
  }
  if (tipo === 'cavanhaque') { g.fillRect(40, 86, 48, 6); g.fillRect(52, 102, 24, 22); g.fillRect(40, 102, 12, 8); g.fillRect(76, 102, 12, 8); }
  if (tipo === 'rala') {
    g.globalAlpha = 0.85;
    g.fillRect(0, 80, 8, 48); g.fillRect(120, 80, 8, 48); g.fillRect(8, 112, 112, 16);
    g.fillRect(50, 108, 28, 8);
    g.globalAlpha = 1;
  }
}

export function desenharRosto(id) {
  const r = ROSTOS[id];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = r.pele; g.fillRect(0, 0, 128, 128);
  if (r.bochechas) { g.fillStyle = 'rgba(200,110,90,0.35)'; g.fillRect(14, 70, 26, 18); g.fillRect(88, 70, 26, 18); }
  if (r.sombraBarba) { g.fillStyle = 'rgba(60,45,35,0.07)'; g.fillRect(10, 86, 108, 42); }
  if (r.rugas) { g.fillStyle = 'rgba(90,60,45,0.5)'; g.fillRect(36, 30, 56, 2); g.fillRect(40, 36, 48, 2); g.fillRect(30, 84, 3, 16); g.fillRect(95, 84, 3, 16); }
  if (r.cabelo.estilo === 'careca') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(40, 4, 40, 10); } // brilho da careca
  cabelo(g, r.cabelo);
  sobrancelhas(g, r.sobrancelha);
  olhos(g, r.olhos);
  // nariz
  g.fillStyle = 'rgba(120,70,50,0.45)'; g.fillRect(60, 62, 8, 20); g.fillRect(56, 80, 16, 4);
  if (r.barba) barba(g, r.barba);
  if (r.bigode) { g.fillStyle = '#2a2220'; g.fillRect(50, 86, 28, 4); }
  boca(g, r.boca);
  if (r.oculos) {
    g.strokeStyle = '#c9c4b8'; g.lineWidth = 2;
    g.strokeRect(28, 48, 26, 18); g.strokeRect(74, 48, 26, 18); g.beginPath(); g.moveTo(54, 56); g.lineTo(74, 56); g.stroke();
  }
  return c;
}
