import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  codigoValido, gerarCodigo, idDoReceptor, opcoesDoSinal, enderecoDoObs, enderecoDoCelular,
} from '../js/conexao.js';

test('codigoValido aceita só 4 dígitos', () => {
  assert.equal(codigoValido('1234'), true);
  assert.equal(codigoValido('0007'), true);
  assert.equal(codigoValido('123'), false);
  assert.equal(codigoValido('12345'), false);
  assert.equal(codigoValido('12a4'), false);
  assert.equal(codigoValido(' 1234'), false);
  assert.equal(codigoValido(undefined), false);
});

test('gerarCodigo sempre dá 4 dígitos', () => {
  assert.equal(gerarCodigo(() => 0), '0000');
  assert.equal(gerarCodigo(() => 0.99999), '9999');
  assert.equal(gerarCodigo(() => 0.0421), '0421');
  for (let i = 0; i < 50; i++) assert.ok(codigoValido(gerarCodigo()));
});

test('idDoReceptor é único do app e muda com o código', () => {
  assert.equal(idDoReceptor('1234'), 'teleprompter-de-bolso-ph771-1234');
  assert.notEqual(idDoReceptor('1234'), idDoReceptor('4321'));
});

test('opcoesDoSinal usa o serviço público por padrão', () => {
  assert.deepEqual(opcoesDoSinal(new URL('https://ph771.github.io/App-With-CLAUDE/')), {});
});

test('opcoesDoSinal só aceita servidor de teste local', () => {
  assert.deepEqual(opcoesDoSinal(new URL('http://localhost:8080/?sinal=localhost:9000')), {
    host: 'localhost', port: 9000, path: '/', secure: false,
  });
  // Um link de fora não pode desviar a câmera para outro servidor.
  assert.deepEqual(opcoesDoSinal(new URL('https://ph771.github.io/App-With-CLAUDE/?sinal=localhost:9000')), {});
  assert.deepEqual(opcoesDoSinal(new URL('http://localhost:8080/?sinal=malicioso.com:9000')), {});
});

test('enderecoDoObs e enderecoDoCelular montam os links certos', () => {
  const base = new URL('https://ph771.github.io/App-With-CLAUDE/obs/');
  assert.equal(enderecoDoObs(base, '1234'), 'https://ph771.github.io/App-With-CLAUDE/obs/?codigo=1234');
  assert.equal(enderecoDoCelular(base, '1234'), 'https://ph771.github.io/App-With-CLAUDE/?conectar=1234');
  const teste = new URL('http://localhost:5000/obs/?codigo=1234&sinal=localhost:9000');
  assert.equal(enderecoDoCelular(teste, '1234'), 'http://localhost:5000/?conectar=1234&sinal=localhost%3A9000');
});
