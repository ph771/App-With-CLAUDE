// A noite (Versão B): cada hora tem tarefas. Feitas a tempo = APROVADO no relatório;
// o tempo da hora acabou com algo pendente = REPROVADO. Às 06:00, entregar o relatório.
import { VISITANTES } from '../data/visitantes.js';
import { HORAS, TAREFA_FINAL, SUSTOS, TELEFONEMAS, FITAS, FITAS_MAX, PERSEGUICOES } from '../data/noite.js';

export { SUSTOS };

const AGENDA = [
  ...VISITANTES.map((v) => ({ chave: `visitante:${v.id}`, minuto: v.minuto, evento: { tipo: 'visitante', visitante: v } })),
  ...SUSTOS.map((s) => ({ chave: `susto:${s.id}`, minuto: s.minuto, evento: { tipo: 'susto', id: s.id } })),
  ...TELEFONEMAS.map((t) => ({ chave: `telefone:${t.id}`, minuto: t.minuto, evento: { tipo: 'telefone', id: t.id } })),
  ...PERSEGUICOES.map((m) => ({ chave: `perseguicao:${m}`, minuto: m, evento: { tipo: 'perseguicao' } })),
].sort((a, b) => a.minuto - b.minuto);

const novaTarefa = (t) => ({ ...t, feita: false, progresso: 0 });

export function createNoite({ clock, fiscal, inventario, quiz }) {
  let disparados = new Set();
  let horaAtual = -1;
  let tarefas = [];
  let relatorio = Array(6).fill(null);
  let fase = 'jogando';
  let checkpoint = null;
  let contadorPoca = 0;

  function prepararHora(h) {
    tarefas = h >= 6 ? [novaTarefa(TAREFA_FINAL)] : HORAS[h].map(novaTarefa);
  }

  function salvarCheckpoint() {
    checkpoint = {
      clock: clock.snapshot(), fiscal: fiscal.snapshot(), inventario: inventario.snapshot(),
      disparados: new Set(disparados), horaAtual, relatorio: [...relatorio],
    };
  }

  const pendente = () => tarefas.some((t) => !t.feita);

  return {
    update() {
      if (fase === 'vitoria') return [];
      if ((fase === 'jogando' || fase === 'final') && quiz.perdeu()) { fase = 'derrota'; return []; }
      if (fase === 'derrota') return [];

      const eventos = [];
      const hora = clock.hora();
      if (hora !== horaAtual) {
        // A hora anterior acabou pelo tempo, com tarefa pendente.
        if (horaAtual >= 0 && horaAtual < 6 && relatorio[horaAtual] === null) {
          relatorio[horaAtual] = 'reprovado';
          eventos.push({ tipo: 'hora_concluida', hora: horaAtual, aprovado: false });
        }
        horaAtual = hora;
        prepararHora(hora);
        quiz.zerarErros();
        salvarCheckpoint();
        eventos.push({ tipo: 'hora', hora });
      }
      const minuto = clock.minutos();
      for (const item of AGENDA) {
        if (item.minuto > minuto + 1e-6) break;
        if (disparados.has(item.chave)) continue;
        disparados.add(item.chave);
        eventos.push(item.evento);
      }
      if (hora < 6 && relatorio[hora] === null && !pendente()) {
        relatorio[hora] = 'aprovado';
        eventos.push({ tipo: 'hora_concluida', hora, aprovado: true });
      }
      if (fase === 'jogando' && clock.terminou()) fase = 'final';
      return eventos;
    },

    // Depois da transição na tela: pula para a próxima hora; o que sobrou desta hora não acontece mais.
    avancarHora() {
      const fim = (horaAtual + 1) * 60;
      for (const item of AGENDA) if (item.minuto < fim) disparados.add(item.chave);
      clock.pularParaProximaHora();
    },

    tarefas: () => tarefas.map((t) => ({ ...t })),
    progredir(id, dt) {
      const t = tarefas.find((x) => x.id === id);
      if (!t || t.feita) return { feita: Boolean(t?.feita), frac: 1 };
      t.progresso = Math.min(t.segundos, t.progresso + dt);
      t.feita = t.progresso >= t.segundos - 1e-9;
      return { feita: t.feita, frac: t.progresso / t.segundos };
    },
    concluirTarefa(id) { const t = tarefas.find((x) => x.id === id); if (t) { t.feita = true; t.progresso = t.segundos; } },

    // O Fiscal interdita portas de banheiro a partir das 02:00 (no máximo FITAS_MAX ao mesmo tempo).
    adicionarFita(porta) {
      if (!FITAS[porta] || horaAtual < 2 || horaAtual >= 6 || relatorio[horaAtual] !== null) return false;
      const abertas = tarefas.filter((t) => t.fita && !t.feita);
      if (abertas.length >= FITAS_MAX || abertas.some((t) => t.porta === porta)) return false;
      contadorPoca++;
      tarefas.push(novaTarefa({
        id: `fita_${porta}_${contadorPoca}`, texto: 'Arrancar a fita "INTERDITADO"', onde: FITAS[porta].nome,
        ferramenta: null, ponto: { ...FITAS[porta].ponto }, segundos: 2, fita: true, porta,
      }));
      return true;
    },
    // Portas interditadas agora (para bloquear a passagem).
    portasInterditadas: () => tarefas.filter((t) => t.fita && !t.feita).map((t) => t.porta),

    relatorio: () => [...relatorio],
    salvarCheckpoint,
    voltarCheckpoint() {
      if (!checkpoint) return;
      clock.restaurar(checkpoint.clock);
      fiscal.restaurar(checkpoint.fiscal);
      inventario.restaurar(checkpoint.inventario);
      disparados = new Set(checkpoint.disparados);
      horaAtual = checkpoint.horaAtual;
      relatorio = [...checkpoint.relatorio];
      prepararHora(horaAtual);
      quiz.pular();
      quiz.zerarErros();
      fase = clock.terminou() ? 'final' : 'jogando';
    },
    // Fim da noite: devolve o resultado da votação.
    vencer() {
      fase = 'vitoria';
      return relatorio.every((r) => r === 'aprovado') ? 'arquivado' : 'aprovado_pl';
    },
    fase: () => fase,
  };
}
