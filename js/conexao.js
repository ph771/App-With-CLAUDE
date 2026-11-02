// Contas da transmissão para o OBS (sem acesso à tela nem à rede). Testadas em testes/conexao.test.js.

export function codigoValido(c) {
  return typeof c === 'string' && /^\d{4}$/.test(c);
}

export function gerarCodigo(aleatorio = Math.random) {
  return String(Math.min(9999, Math.floor(aleatorio() * 10000))).padStart(4, '0');
}

// Nome com que a página do OBS se anuncia no serviço de conexão.
export function idDoReceptor(codigo) {
  return 'teleprompter-de-bolso-ph771-' + codigo;
}

// Por padrão usa o serviço público e gratuito do PeerJS. Só nos testes, rodando no próprio
// computador, aceita um servidor local (?sinal=localhost:PORTA); um link de fora nunca muda isso.
export function opcoesDoSinal(endereco) {
  const local = (h) => h === 'localhost' || h === '127.0.0.1';
  const sinal = endereco.searchParams.get('sinal');
  if (!sinal || !local(endereco.hostname)) return {};
  const [host, porta] = sinal.split(':');
  const port = Number(porta);
  if (!local(host) || !Number.isInteger(port) || port <= 0) return {};
  return { host, port, path: '/', secure: false };
}

function comSinal(destino, origem) {
  const sinal = origem.searchParams.get('sinal');
  if (sinal) destino.searchParams.set('sinal', sinal);
  return destino.toString();
}

// Endereço para colar no OBS (Fonte de Navegador). `paginaObs` é o endereço da página /obs/.
export function enderecoDoObs(paginaObs, codigo) {
  const u = new URL('./', paginaObs);
  u.searchParams.set('codigo', codigo);
  return comSinal(u, paginaObs);
}

// Endereço que o QR code abre no iPhone: o app já no modo transmitir, com o código.
export function enderecoDoCelular(paginaObs, codigo) {
  const u = new URL('../', new URL('./', paginaObs));
  u.searchParams.set('conectar', codigo);
  return comSinal(u, paginaObs);
}
