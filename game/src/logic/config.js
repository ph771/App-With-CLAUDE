// Configurações do jogador (áudio, controles, imagem), guardadas no navegador.
const CHAVE = 'plantao-config';

export const PADRAO = {
  volumeGeral: 0.8,
  volumeEfeitos: 0.8,
  volumeAmbiente: 0.6,
  sensMouse: 1,
  sensToque: 1,
  inverterY: false,
  fov: 70,
  qualidade: 'alta',
  efeitosTela: true, // vinheta e granulação
};

const faixa = (v, min, max, padrao) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao);

export function normalizar(c = {}) {
  return {
    volumeGeral: faixa(c.volumeGeral, 0, 1, PADRAO.volumeGeral),
    volumeEfeitos: faixa(c.volumeEfeitos, 0, 1, PADRAO.volumeEfeitos),
    volumeAmbiente: faixa(c.volumeAmbiente, 0, 1, PADRAO.volumeAmbiente),
    sensMouse: faixa(c.sensMouse, 0.2, 3, PADRAO.sensMouse),
    sensToque: faixa(c.sensToque, 0.2, 3, PADRAO.sensToque),
    inverterY: c.inverterY === true,
    fov: faixa(c.fov, 55, 95, PADRAO.fov),
    qualidade: ['alta', 'media', 'retro'].includes(c.qualidade) ? c.qualidade : PADRAO.qualidade,
    efeitosTela: c.efeitosTela !== false,
  };
}

export function carregarConfig(armazenamento) {
  try {
    const bruto = armazenamento?.getItem(CHAVE);
    return bruto ? normalizar(JSON.parse(bruto)) : { ...PADRAO };
  } catch {
    return { ...PADRAO };
  }
}

export function salvarConfig(armazenamento, config) {
  try { armazenamento?.setItem(CHAVE, JSON.stringify(normalizar(config))); } catch { /* navegador bloqueou: segue sem salvar */ }
}
