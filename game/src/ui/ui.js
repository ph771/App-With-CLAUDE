// Interface em HTML por cima do jogo.
export const AVISO_PARODIA = 'Paródia de ficção. Personagens inventados. Qualquer semelhança é piada.';

const el = (tag, classe, html = '') => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  e.innerHTML = html;
  return e;
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function criarUI(root, { toque = false } = {}) {
  const camadas = {
    mira: el('div', 'mira'),
    tarefas: el('div', 'hud-tarefas'),
    relogio: el('div', 'hud-relogio'),
    erros: el('div', 'hud-erros'),
    itens: el('div', 'hud-itens'),
    dica: el('div', 'dica oculto'),
    legenda: el('div', 'legenda oculto'),
    toast: el('div', 'toast oculto'),
    progresso: el('div', 'progresso oculto', '<div class="rotulo"></div><div class="barra"><div></div></div>'),
    carimbo: el('div', 'carimbo oculto'),
    folego: el('div', 'folego oculto', '<div></div>'),
    flash: el('div', 'flash'),
    escuro: el('div', 'escuro'),
  };
  const hud = el('div', 'oculto');
  for (const k of ['mira', 'tarefas', 'relogio', 'erros', 'itens', 'dica', 'legenda', 'progresso', 'folego']) hud.append(camadas[k]);
  root.append(hud, camadas.carimbo, camadas.toast, camadas.flash, camadas.escuro, el('div', 'aviso-girar', 'Deite o celular<br>para jogar'));
  let aoTocarItem = null;
  camadas.itens.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b && aoTocarItem) aoTocarItem(Number(b.dataset.i));
  });

  let modal = null; // diálogo ou pergunta aberta
  let timerToast = null, timerLegenda = null;

  function telaCheia(html, botao, onClick) {
    const t = el('div', 'tela-cheia', `<div class="conteudo">${html}</div>`);
    if (botao) {
      const b = el('button', 'botao', esc(botao));
      b.addEventListener('click', () => { t.remove(); onClick(); });
      t.querySelector('.conteudo').append(b);
      setTimeout(() => b.focus(), 50);
    }
    root.append(t);
    return t;
  }

  return {
    ocupado: () => modal !== null,

    telaInicial(onJogar) {
      telaCheia(`
        <h1>PLANTÃO NO BANHEIRO</h1>
        <h2>Episódio 1 — A Ronda do Fiscal</h2>
        <p class="aviso-parodia">${esc(AVISO_PARODIA)}</p>
        <p>Você é o zelador do turno da noite de um banheiro público 24h.<br>Sobreviva até as 06:00.</p>
        <p class="controles">${toque
          ? 'Analógico à esquerda: andar (até a borda: correr) · Arraste à direita: olhar · Botão amarelo: interagir · Toque nos itens para usar'
          : 'Mouse: olhar · WASD: andar · Shift: correr · E: interagir (segure nas tarefas) · 1–8: usar item · Esc: pausar'}<br>
        Quando o Fiscal perguntar, ${toque ? 'toque na resposta' : 'responda com 1, 2 ou 3'}. <b>Não diga nada com "trans".</b></p>
      `, 'Começar plantão', onJogar);
    },

    mostrarHud(v) { hud.classList.toggle('oculto', !v); },
    onItem(cb) { aoTocarItem = cb; },

    // relatorio: 6 posições (null | 'aprovado' | 'reprovado'); tarefas com { texto, onde, feita, precisa, temFerramenta }.
    hud({ relogio, restante, itens, tarefas, erros, relatorio = [], hora = 0, naMao = null, votos = 0, paginas = 0, extras = [] }) {
      camadas.relogio.innerHTML = `${esc(relogio)}${restante ? `<small>${esc(restante)}</small>` : ''}`;
      const carimbos = relatorio.map((r, i) => `<span class="selo ${r ?? (i === hora ? 'atual' : '')}">${String(i).padStart(2, '0')}${r === 'aprovado' ? '✔' : r === 'reprovado' ? '✖' : ''}</span>`).join('');
      camadas.tarefas.innerHTML = `
        <div class="titulo">RELATÓRIO DE LIMPEZA</div>
        <div class="selos">${carimbos}</div>
        ${tarefas.map((t) => `<div class="tarefa ${t.feita ? 'feita' : ''}">
          <span class="caixinha">${t.feita ? '✔' : ''}</span>
          <span class="txt">${esc(t.texto)}<small>${esc(t.onde ?? '')}${t.precisa ? ` · <b class="${t.temFerramenta ? 'ok' : 'falta'}">${esc(t.precisa)}</b>` : ''}</small></span>
        </div>`).join('')}
        <div class="rodape">Na mão: <b>${esc(naMao ?? 'nada')}</b> · Votos NÃO: <b>${votos}/8</b> · Páginas: <b>${paginas}/8</b></div>
        ${extras.map((x) => `<div class="rodape">${esc(x)}</div>`).join('')}`;
      camadas.erros.innerHTML = [0, 1, 2].map((i) => `<span class="${i < erros ? '' : 'vazio'}">✕</span>`).join('');
      const html = itens.map((it, i) => `<button type="button" class="item" data-i="${i}"><b>${it.tecla}</b> ${esc(it.nome)}</button>`).join('');
      if (camadas.itens.innerHTML !== html) camadas.itens.innerHTML = html;
    },

    dica(texto) {
      camadas.dica.classList.toggle('oculto', !texto);
      if (texto) camadas.dica.innerHTML = `<b>[E]</b> ${esc(texto)}`;
    },

    // Barra de fôlego (some quando está cheia).
    folego(frac, cansado) {
      camadas.folego.classList.toggle('oculto', frac >= 0.999);
      camadas.folego.classList.toggle('cansado', cansado);
      camadas.folego.firstChild.style.width = `${Math.round(frac * 100)}%`;
    },

    // Barra de "segurar" (null esconde).
    progresso(rotulo, frac) {
      camadas.progresso.classList.toggle('oculto', rotulo === null);
      if (rotulo === null) return;
      camadas.progresso.querySelector('.rotulo').textContent = rotulo;
      camadas.progresso.querySelector('.barra div').style.width = `${Math.round(frac * 100)}%`;
    },

    // Carimbo grande no fim de cada hora.
    carimbo(hora, aprovado) {
      camadas.carimbo.className = `carimbo ${aprovado ? 'aprovado' : 'reprovado'}`;
      camadas.carimbo.innerHTML = `<div>HORA ${String(hora).padStart(2, '0')}</div><b>${aprovado ? 'APROVADO' : 'REPROVADO'}</b>`;
      clearTimeout(camadas.carimbo._t);
      camadas.carimbo._t = setTimeout(() => camadas.carimbo.classList.add('oculto'), 2400);
    },

    aviso(texto, segundos = 2.5) {
      camadas.toast.textContent = texto;
      camadas.toast.classList.remove('oculto');
      clearTimeout(timerToast);
      timerToast = setTimeout(() => camadas.toast.classList.add('oculto'), segundos * 1000);
    },

    legenda(nome, texto, segundos = 4) {
      camadas.legenda.innerHTML = nome ? `<b>${esc(nome)}:</b> ${esc(texto)}` : esc(texto);
      camadas.legenda.classList.remove('oculto');
      clearTimeout(timerLegenda);
      timerLegenda = setTimeout(() => camadas.legenda.classList.add('oculto'), segundos * 1000);
    },

    flash() {
      camadas.flash.classList.add('ativo');
      requestAnimationFrame(() => requestAnimationFrame(() => camadas.flash.classList.remove('ativo')));
    },
    escurecer(v) { camadas.escuro.classList.toggle('ativo', v); },

    // Diálogo: avança com E, Espaço ou clique.
    dialogo(nome, falas, onFim) {
      let i = 0;
      const caixa = el('div', 'dialogo', `<div class="nome">${esc(nome)}</div><div class="texto"></div><div class="seguir">${toque ? 'toque para continuar' : '[E] continuar'}</div>`);
      const mostrar = () => { caixa.querySelector('.texto').textContent = falas[i]; };
      const avancar = () => {
        i++;
        if (i < falas.length) { mostrar(); return; }
        caixa.remove(); modal = null; onFim?.();
      };
      modal = { tecla(code) { if (code !== 'KeyE' && code !== 'Space' && code !== 'Enter') return false; avancar(); return true; } };
      caixa.addEventListener('click', avancar);
      caixa.style.pointerEvents = 'auto';
      mostrar();
      hud.append(caixa);
    },

    // Pergunta do Fiscal: teclas 1, 2, 3 (ou clique). Devolve controles da barra de tempo.
    pergunta({ fala, respostas, extra }, onEscolha) {
      const opcoes = extra ? [...respostas, extra] : respostas;
      const caixa = el('div', 'pergunta', `
        <div class="nome">FISCAL PAVONATO</div>
        <div class="fala">${esc(fala)}</div>
        <div class="respostas">${opcoes.map((r, i) => `<button data-i="${i}"><b>${i + 1}.</b> ${esc(r)}</button>`).join('')}</div>
        <div class="barra"><div style="width:100%"></div></div>`);
      const fechar = () => { caixa.remove(); if (modal?.pergunta) modal = null; };
      const escolher = (i) => { fechar(); onEscolha(i); };
      caixa.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => escolher(Number(b.dataset.i))));
      modal = {
        pergunta: true,
        tecla(code) { const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[code]; if (n === undefined || n >= opcoes.length) return false; escolher(n); return true; },
      };
      root.append(caixa);
      return {
        tempo(frac) { caixa.querySelector('.barra div').style.width = `${Math.max(0, frac) * 100}%`; },
        fechar,
      };
    },

    // Devolve true se a janela aberta usou a tecla.
    tecla(code) { return modal ? modal.tecla(code) : false; },

    pausa(mostrar, onContinuar) {
      root.classList.toggle('pausado', mostrar);
      root.querySelector('.tela-pausa')?.remove();
      if (!mostrar) return;
      if (onContinuar) {
        telaCheia('<h1>PAUSADO</h1>', 'Continuar plantão', onContinuar).classList.add('tela-pausa');
        return;
      }
      const t = el('div', 'tela-cheia tela-pausa', '<div class="conteudo"><h1>PAUSADO</h1><p>Clique para continuar o plantão.</p></div>');
      t.style.pointerEvents = 'none';
      root.append(t);
    },

    derrota(hora, onTentar) {
      telaCheia(`<h1 style="color:var(--perigo)">O FISCAL TE PEGOU</h1>
        <p>Três respostas erradas. Ele anotou tudo na prancheta.</p>`, `Voltar para ${hora}`, onTentar);
    },

    // resultado: 'arquivado' (final bom) ou 'aprovado_pl' (final ruim). paginasTodas: achou as 8 páginas.
    vitoria(resultado, paginasTodas, onFim) {
      const bom = resultado === 'arquivado';
      telaCheia(bom ? `<h1>PROJETO ARQUIVADO</h1>
        <p>O painel do plenário pisca: <b>PL 24/2026 — ARQUIVADO</b>.</p>
        <p>O Fiscal grita "Isso é uma TRANSgressão!"... e se desfaz em papelada.</p>
        <p>O sol nasce. A faxineira da manhã chega, olha a papelada no chão e suspira:</p>
        <p><i>"Ah, ele de novo? Vem toda noite. Ninguém sabe quem contratou."</i></p>`
        : `<h1 style="color:var(--perigo)">PROJETO APROVADO</h1>
        <p>O relatório tinha horas REPROVADAS. O painel pisca: <b>PL 24/2026 — APROVADO</b>.</p>
        <p>O Fiscal ajeita a peruca, carimba a própria nomeação e sorri:</p>
        <p><i>"Fica criado o cargo de Fiscal de Banheiro. Vitalício. Com TRANSporte pago."</i></p>
        <p class="controles">Dica: termine as tarefas de todas as horas a tempo para arquivar o projeto.</p>`, 'Ver créditos', () => {
        telaCheia(`<h1>PLANTÃO NO BANHEIRO</h1>
          <p>Episódio 1 — A Votação do Banheiro</p>
          <p class="aviso-parodia">${esc(AVISO_PARODIA)}</p>
          <p class="controles">Fiscal Pavonato · Lulão · Mamãe Falou · Renan Santarém · Ministro Moraez<br>
          Kim Katagiri · Nicolas Ferrer · Seu Jairo · Flávio "Zero Um" · A Faxineira</p>
          ${paginasTodas ? '<p><i>Você achou as 8 páginas da prancheta. Na última, escrito à mão: "Amanhã eu volto. Com um projeto sobre pias."</i></p>' : '<p class="controles">Ainda faltam páginas da prancheta escondidas pelo prédio.</p>'}`, 'Continuar', onFim);
      });
    },

    posCreditos(onFim) {
      const t = telaCheia(`<p class="controles">(o telefone do guichê toca)</p>
        <p><i>"Alô, é do TRANSporte? ... Digo, do banheiro? Preciso fazer uma fiscalização."</i></p>
        <h2 style="margin-top:2em">FIM</h2>`, 'Jogar de novo', onFim);
      return t;
    },
  };
}
