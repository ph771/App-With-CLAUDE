# Casa Legislativa (Versão B) — Plano de Construção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Trocar o banheiro único pelo prédio da Casa Legislativa (térreo, 1º andar, subsolo) com a história "A Votação do Banheiro": tarefas com ferramentas do almoxarifado, hora que termina quando as tarefas acabam, relatório com carimbo por hora, dois finais, páginas da prancheta e ambiente sonoro de terror.

**Architecture:** Os andares ficam no mesmo plano 2D, separados por deslocamento em x (térreo perto de x=0, 1º andar perto de x=100, subsolo perto de x=200). Escadas são passagens com teleporte. Assim a física 2D, a linha de visão e a navegação continuam as mesmas. As paredes e as passagens são geradas a partir de uma lista de salas e portas.

**Tech Stack:** a mesma do jogo atual (Three.js 0.160, módulos ES, `node --test`, Playwright CLI).

**Spec:** `docs/historia-versoes.md` (Versão B + "O prédio" + "Balanceamento" + "Páginas da prancheta"), aprovada pelo usuário.

## Global Constraints

- Mantém nomes de paródia, trocadilhos com TRANS e o aviso "Paródia de ficção. Personagens inventados. Qualquer semelhança é piada."
- 1 hora do jogo dura no máximo 240 s reais (`?rapido=1`: 10 s). A hora termina antes se todas as tarefas da hora estiverem feitas.
- Hora concluída a tempo = carimbo APROVADO. Hora que estoura o tempo com tarefa pendente = REPROVADO.
- Final: relatório todo APROVADO + resposta segura = "PROJETO ARQUIVADO". Algum REPROVADO + resposta segura = "PROJETO APROVADO" (final ruim e engraçado). 3 erros = derrota, volta ao início da hora.
- Ferramenta: uma por vez, pega no almoxarifado. Com ferramenta: velocidade × 0,85.
- Tarefas de segurar: 2 a 4 s. Progresso não zera se interrompido.
- O Fiscal não entra no almoxarifado nem no subsolo antes das 04:00.
- O Fiscal deixa poças (a partir das 02:00, no máximo 3 abertas) que viram tarefa da hora.
- Funciona no computador e no celular (botão de ação também segura).

## Review Focus

1. Pegar ferramenta trocando outra: a antiga volta para a prateleira, nunca some.
2. Derrota no meio da hora: tarefas, poças, ferramenta na mão e relatório voltam ao estado do início da hora.
3. Fiscal e escadas: ele sobe e desce sem atravessar paredes e sem ficar preso no patamar.
4. Hora concluída durante uma pergunta ou conversa: a transição espera a janela fechar.
5. Equilíbrio: jogador automático que não olha para trás é pego de 1 a 2 vezes por hora, nunca 3 seguidas sem pausa.

---

### Task 1: Planta da Casa Legislativa (dados, paredes e navegação)
**Files:** rewrite `game/src/world/planta.js`, `game/src/world/nav.js`; tests `game/tests/colisao.test.js`
- [ ] Testes: regiões de cada sala; caminho do Fiscal do 1º andar até o almoxarifado e o subsolo sem atravessar parede (teleporte só na escada); portas geradas viram buracos nas paredes.
- [ ] `SALAS`, `PORTAS`, `ESCADAS`, `PAREDES` (gerado), `PONTOS`; `proximoAlvo(p, alvo)` devolve `{x, z, teleporte?: true}`.
- [ ] Commit.

### Task 2: Fiscal com teleporte, alvo separado e poças
**Files:** `game/src/logic/fiscal.js`, tests
- [ ] Testes: escada teleporta; `update(dt, { ..., alvo })` anda até `alvo` mas alcança pelo `jogador`.
- [ ] Commit.

### Task 3: Relógio com pulo de hora; noite por tarefas; relatório
**Files:** `game/src/logic/clock.js`, `game/src/logic/noite.js`, `game/src/data/noite.js`, tests
- [ ] Testes: `clock.pularParaProximaHora()`; hora termina com tarefas feitas (APROVADO) ou tempo (REPROVADO); eventos da hora pulada não disparam todos juntos (só visitantes); poças dinâmicas entram nas tarefas; checkpoint guarda tarefas, poças, relatório e ferramenta; final escolhe ARQUIVADO/APROVADO.
- [ ] Commit.

### Task 4: Ferramentas e tarefas de segurar
**Files:** `game/src/logic/ferramentas.js`, tests
- [ ] Testes: pegar troca e devolve; tarefa exige ferramenta certa; progresso acumula e não zera.
- [ ] Commit.

### Task 5: Prédio 3D
**Files:** `game/src/world/predio.js` (substitui `banheiro.js`), texturas novas (mármore, carpete, madeira do plenário)
- [ ] Gera chão, teto e paredes das salas; móveis por sala; luzes por sala; monitor no 1º andar; prints de cada sala com Playwright.
- [ ] Commit.

### Task 6: Integração (main), HUD do relatório, ferramenta na mão, páginas, som
**Files:** `game/src/main.js`, `game/src/ui/ui.js`, `game/src/ui/ui.css`, `game/src/audio.js`, `game/src/data/paginas.js`, `game/src/data/visitantes.js`
- [ ] Visitantes nos lugares da Versão B, com o voto no fim da fala; escadas; segurar E / botão; relatório com carimbos; transição de hora; páginas; ambiente sonoro que cresce com a proximidade do Fiscal (sem zumbido alto); dois finais.
- [ ] Jogador automático mede capturas por hora (Review Focus 5); ajustar velocidade se sair da meta.
- [ ] Commit, publicar no mesmo link.
