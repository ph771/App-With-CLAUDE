// A pergunta do Fiscal: 3 respostas, tempo limite, 3 erros = derrota.
export const ERROS_PARA_PERDER = 3;

function embaralhar(lista, rng) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createQuiz({ perguntas, final, rng = Math.random, limite = 5 }) {
  let fila = [];
  let atual = null; // { pergunta, respostas: [{texto, segura}] }
  let restante = 0;
  let erros = 0;

  const encerrar = () => { atual = null; };

  return {
    iniciar(ehFinal = false) {
      let pergunta;
      if (ehFinal) pergunta = final;
      else {
        if (fila.length === 0) fila = embaralhar(perguntas, rng);
        pergunta = fila.pop();
      }
      atual = { pergunta, respostas: embaralhar(pergunta.respostas, rng) };
      restante = limite;
      return { fala: pergunta.fala, respostas: atual.respostas.map((r) => r.texto) };
    },
    tick(dt) {
      if (!atual) return null;
      restante -= Math.min(Math.max(dt, 0), 0.1);
      if (restante > 1e-9) return null;
      erros++;
      encerrar();
      return 'tempo';
    },
    responder(i) {
      if (!atual) return { segura: false };
      const segura = Boolean(atual.respostas[i]?.segura);
      if (!segura) erros++;
      encerrar();
      return { segura };
    },
    pular: encerrar,
    ativa: () => atual !== null,
    restante: () => Math.max(restante, 0),
    erros: () => erros,
    perdeu: () => erros >= ERROS_PARA_PERDER,
    zerarErros() { erros = 0; },
  };
}
