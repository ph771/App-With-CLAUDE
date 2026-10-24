// Salva a noite no navegador a cada hora, para continuar de onde parou.
const CHAVE = 'plantao-noite';
const VERSAO_SAVE = 1;

export function salvarNoite(armazenamento, dados) {
  try { armazenamento?.setItem(CHAVE, JSON.stringify({ ...dados, versao: VERSAO_SAVE })); } catch { /* sem armazenamento: segue sem salvar */ }
}

export function carregarNoite(armazenamento) {
  try {
    const d = JSON.parse(armazenamento?.getItem(CHAVE) ?? 'null');
    if (!d || d.versao !== VERSAO_SAVE || !Number.isInteger(d.hora) || d.hora < 1 || d.hora > 6) return null;
    if (!Array.isArray(d.relatorio) || d.relatorio.length !== 6) return null;
    return d;
  } catch {
    return null;
  }
}

export function apagarNoite(armazenamento) {
  try { armazenamento?.removeItem(CHAVE); } catch { /* nada */ }
}
