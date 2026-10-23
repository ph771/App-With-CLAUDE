// Agenda da noite: visitantes, sustos, telefone, tarefas e salvamento a cada hora.
import { VISITANTES } from '../data/visitantes.js';

export const SUSTOS = [
  { minuto: 15, id: 'porta_familia' },
  { minuto: 65, id: 'fiscal_monitor' },
  { minuto: 130, id: 'fiscal_cabine' },
  { minuto: 190, id: 'luz_apaga' },
  { minuto: 250, id: 'batidas_cabine' },
  { minuto: 310, id: 'fiscal_espelho' },
];
export const TELEFONEMAS = [{ minuto: 20, id: 'telefone_mudo' }];
export const TAREFAS = [
  { id: 'repor_papel', texto: 'Repor o papel das cabines' },
  { id: 'passar_pano', texto: 'Passar pano no chão molhado' },
  { id: 'conferir_monitor', texto: 'Conferir o monitor do guichê' },
];

const AGENDA = [
  ...VISITANTES.map((v) => ({ chave: `visitante:${v.id}`, minuto: v.minuto, evento: { tipo: 'visitante', visitante: v } })),
  ...SUSTOS.map((s) => ({ chave: `susto:${s.id}`, minuto: s.minuto, evento: { tipo: 'susto', id: s.id } })),
  ...TELEFONEMAS.map((t) => ({ chave: `telefone:${t.id}`, minuto: t.minuto, evento: { tipo: 'telefone', id: t.id } })),
].sort((a, b) => a.minuto - b.minuto);

const tarefasNovas = () => TAREFAS.map((t) => ({ ...t, feita: false }));

export function createNoite({ clock, fiscal, inventario, quiz }) {
  let disparados = new Set();
  let ultimaHora = -1;
  let tarefas = tarefasNovas();
  let fase = 'jogando';
  let checkpoint = null;

  function salvarCheckpoint() {
    checkpoint = {
      clock: clock.snapshot(), fiscal: fiscal.snapshot(), inventario: inventario.snapshot(),
      disparados: new Set(disparados), ultimaHora,
    };
  }

  return {
    update() {
      if (fase === 'vitoria') return [];
      if ((fase === 'jogando' || fase === 'final') && quiz.perdeu()) { fase = 'derrota'; return []; }
      if (fase === 'derrota') return [];

      const eventos = [];
      const hora = clock.hora();
      if (hora !== ultimaHora) {
        ultimaHora = hora;
        tarefas = tarefasNovas();
        quiz.zerarErros();
        eventos.push({ tipo: 'hora', hora });
      }
      const minuto = clock.minutos();
      for (const item of AGENDA) {
        if (item.minuto > minuto + 1e-6) break;
        if (disparados.has(item.chave)) continue;
        disparados.add(item.chave);
        eventos.push(item.evento);
      }
      // O checkpoint é salvo depois dos eventos do minuto exato da virada,
      // então quem entra às XX:00 entra de novo ao voltar.
      if (eventos.some((e) => e.tipo === 'hora')) {
        const daVirada = eventos.filter((e) => e.tipo !== 'hora').map((e) => AGENDA.find((a) => a.evento === e).chave);
        salvarCheckpoint();
        daVirada.forEach((k) => checkpoint.disparados.delete(k));
      }
      if (fase === 'jogando' && clock.terminou()) fase = 'final';
      return eventos;
    },
    tarefas: () => tarefas.map((t) => ({ ...t })),
    concluirTarefa(id) { const t = tarefas.find((x) => x.id === id); if (t) t.feita = true; },
    salvarCheckpoint,
    voltarCheckpoint() {
      if (!checkpoint) return;
      clock.restaurar(checkpoint.clock);
      fiscal.restaurar(checkpoint.fiscal);
      inventario.restaurar(checkpoint.inventario);
      disparados = new Set(checkpoint.disparados);
      ultimaHora = checkpoint.ultimaHora;
      tarefas = tarefasNovas();
      quiz.pular();
      quiz.zerarErros();
      fase = clock.terminou() ? 'final' : 'jogando';
    },
    vencer() { fase = 'vitoria'; },
    fase: () => fase,
  };
}
