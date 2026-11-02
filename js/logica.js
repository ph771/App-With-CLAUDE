// Funções puras do app: sem acesso à tela, à câmera ou ao navegador.
// Testadas em testes/logica.test.js.
import { codigoValido } from './conexao.js';

export function formatarTempo(segundos) {
  const s = Number.isFinite(segundos) && segundos > 0 ? Math.floor(segundos) : 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

export function nomeVelocidade(v) {
  if (v <= 3) return 'Devagar';
  if (v <= 6) return 'Média';
  return 'Rápida';
}

// Velocidade de 1 a 10 em palavras por minuto. Média (4) = 140, ritmo de fala normal.
export function palavrasPorMinuto(velocidade) {
  return 60 + velocidade * 20;
}

export function contarPalavras(texto) {
  const t = String(texto || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

// Quantos pixels o texto sobe por segundo para manter as palavras por minuto,
// seja com letra grande ou pequena, com o celular em pé ou deitado.
export function pixelsPorSegundo(velocidade, alturaDoTexto, palavras) {
  if (!(alturaDoTexto > 0) || !(palavras > 0)) return 30;
  return (palavrasPorMinuto(velocidade) / 60) * (alturaDoTexto / palavras);
}

const FORMATOS_GRAVACAO = [
  ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
  ['video/mp4;codecs=avc1,mp4a.40.2', 'mp4'],
  ['video/mp4', 'mp4'],
  ['video/webm;codecs=vp9,opus', 'webm'],
  ['video/webm;codecs=vp8,opus', 'webm'],
  ['video/webm', 'webm'],
];

// `suporta` é normalmente MediaRecorder.isTypeSupported.
export function escolherFormatoGravacao(suporta) {
  for (const [mimeType, extensao] of FORMATOS_GRAVACAO) {
    let ok = false;
    try { ok = !!suporta(mimeType); } catch { ok = false; }
    if (ok) return { mimeType, extensao };
  }
  return null;
}

export function restricoesCamera(formato) {
  const vertical = formato === 'vertical';
  return {
    video: {
      facingMode: 'user',
      width: { ideal: vertical ? 1080 : 1920 },
      height: { ideal: vertical ? 1920 : 1080 },
      frameRate: { ideal: 30 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  };
}

export function nomeArquivo(data, extensao) {
  const p = (n) => String(n).padStart(2, '0');
  return 'teleprompter-' + data.getFullYear() + '-' + p(data.getMonth() + 1) + '-' + p(data.getDate()) +
    '-' + p(data.getHours()) + p(data.getMinutes()) + '.' + extensao;
}

// Antes de gravar, celular na posição errada bloqueia a tela com "Gire o celular".
// Durante a gravação, só mostra uma faixa de aviso, para o botão de parar continuar acessível.
export function avisoDeGiro(formato, emPaisagem, gravando) {
  const posicaoCerta = (formato === 'horizontal') === !!emPaisagem;
  if (posicaoCerta) return 'nenhum';
  return gravando ? 'faixa' : 'bloqueio';
}

// Com o celular deitado, a câmera da frente fica na lateral.
// Ângulo 90: celular girado para a esquerda, câmera à esquerda. 270 (ou -90): câmera à direita.
export function ladoDaCamera(anguloTela) {
  return anguloTela === 270 || anguloTela === -90 ? 'direita' : 'esquerda';
}

export const PADROES = Object.freeze({
  texto:
    'Oi! Hoje eu vou te mostrar três jeitos simples de organizar a sua semana.\n\n' +
    'Primeiro: escolha só três tarefas importantes por dia. O resto pode esperar.\n\n' +
    'Segundo: separe um horário fixo para responder mensagens, em vez de olhar o celular toda hora.\n\n' +
    'Terceiro: no domingo à noite, gaste dez minutos planejando os próximos dias.\n\n' +
    'Se esse vídeo te ajudou, salve para ver depois e me conta nos comentários qual dica você vai testar primeiro.',
  formato: 'vertical',
  posicao: 'meio',
  velocidade: 4,
  tamanho: 32,
  espaco: 'grande', // quanto da tela a faixa do texto ocupa: pequeno | medio | grande
  modo: 'gravar', // gravar (no iPhone) | transmitir (para o OBS)
  codigo: '', // código de 4 dígitos da página do OBS
});

export const ESPACOS = Object.freeze(['pequeno', 'medio', 'grande']);

export const LIMITES = Object.freeze({
  velocidade: [1, 10],
  tamanho: [22, 48],
});

const CHAVE = 'teleprompter:prefs';

function noIntervalo(valor, [min, max]) {
  return Number.isFinite(valor) && valor >= min && valor <= max;
}

export function carregarPreferencias(armazenamento) {
  let salvo = null;
  try {
    const bruto = armazenamento && armazenamento.getItem(CHAVE);
    salvo = bruto ? JSON.parse(bruto) : null;
  } catch {
    salvo = null;
  }
  if (!salvo || typeof salvo !== 'object') return { ...PADROES };
  return {
    texto: typeof salvo.texto === 'string' ? salvo.texto : PADROES.texto,
    formato: salvo.formato === 'vertical' || salvo.formato === 'horizontal' ? salvo.formato : PADROES.formato,
    posicao: salvo.posicao === 'meio' || salvo.posicao === 'topo' ? salvo.posicao : PADROES.posicao,
    velocidade: noIntervalo(salvo.velocidade, LIMITES.velocidade) ? salvo.velocidade : PADROES.velocidade,
    tamanho: noIntervalo(salvo.tamanho, LIMITES.tamanho) ? salvo.tamanho : PADROES.tamanho,
    espaco: ESPACOS.includes(salvo.espaco) ? salvo.espaco : PADROES.espaco,
    modo: salvo.modo === 'gravar' || salvo.modo === 'transmitir' ? salvo.modo : PADROES.modo,
    codigo: codigoValido(salvo.codigo) ? salvo.codigo : PADROES.codigo,
  };
}

export function salvarPreferencias(armazenamento, prefs) {
  try {
    if (armazenamento) armazenamento.setItem(CHAVE, JSON.stringify(prefs));
  } catch {
    // Navegação privada ou armazenamento cheio: o app continua funcionando sem salvar.
  }
}
