# Plantão no Banheiro — Plano de Construção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um episódio jogável de terror e comédia em 1ª pessoa, no navegador, que dura de 15 a 20 minutos e pode ser gravado com o OBS.

**Architecture:** Página estática (HTML e módulos JavaScript), sem etapa de build. A lógica do jogo (relógio, perguntas, Fiscal, itens, agenda da noite) fica em módulos puros, testados com `node --test`. A parte 3D (Three.js) só lê esse estado e desenha. O visual é estilo PS1: o jogo renderiza em 320×240 e amplia sem suavizar.

**Tech Stack:** HTML, JavaScript (ES modules), Three.js 0.160.0 via import map do jsDelivr, Web Audio API para sons sintetizados, `node --test` para testes, Playwright CLI (`../microsoft/playwright-cli`) para verificar no navegador.

**Spec:** `roteiro-plantao-no-banheiro.md`

## Global Constraints

- Todo o jogo fica em `game/`. Abrir `game/index.html` por um servidor local (`npm start`) basta para jogar.
- Sem dependências de npm em tempo de execução. Three.js vem de `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` e os addons de `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/`.
- Nomes de personagens no jogo, exatamente: `Fiscal Pavonato`, `Lulão`, `Mamãe Falou`, `Renan Santarém`, `Ministro Moraez`, `Kim Katagiri`, `Nicolas Ferrer`, `Seu Jairo`, `Flávio "Zero Um"`. Nunca o nome real.
- Sem fotos reais e sem voz clonada. Rostos são texturas desenhadas em canvas a partir da tabela "Aparência dos personagens" do roteiro.
- Tela inicial mostra, antes de jogar: `Paródia de ficção. Personagens inventados. Qualquer semelhança é piada.`
- Duração: 1 hora do jogo = 180 segundos reais (noite de 00:00 a 06:00 = 18 minutos). Parâmetro `?rapido=1` na URL usa 10 segundos por hora, para teste.
- Pergunta do Fiscal: 3 respostas, 5 segundos. Exatamente uma resposta segura, sem a sequência "trans" (sem diferenciar maiúsculas). As outras duas contêm "trans". Tempo esgotado conta como erro. 3 erros na mesma hora = fim de jogo, volta ao início daquela hora.
- Textos do jogo em português do Brasil.

## Review Focus

1. **Esc no meio da pergunta ou do jogo** (o navegador solta o mouse): o jogo pausa, inclusive o relógio e os 5 segundos da pergunta, e mostra "Clique para continuar".
2. **Trocar de aba ou travada longa** (dt enorme): `dt` é limitado a 0,1 s por quadro, então o Fiscal não teleporta e o relógio não pula horas.
3. **Usar item durante a pergunta:** só a Peruca funciona (pula a pergunta). Os outros itens ficam bloqueados e mostram "Agora não!".
4. **Fim de jogo e volta ao início da hora:** o inventário, os eventos já disparados e os visitantes voltam exatamente como estavam no começo da hora. Os erros zeram.
5. **Janela redimensionada ou tela cheia para gravar:** a imagem continua 4:3 com faixas pretas, sem distorcer, e o HUD continua legível.

---

### Task 1: Esqueleto do projeto e relógio da noite

**Files:**
- Create: `package.json`, `game/tools/serve.js`, `game/src/logic/clock.js`
- Test: `game/tests/clock.test.js`

**Interfaces:**
- Produces: `createClock({ segundosPorHora: number }) -> { tick(dt: number): void, minutos(): number, hora(): number, formatar(): string, terminou(): boolean, snapshot(): object, restaurar(s: object): void }`. `minutos()` vai de 0 (00:00) a 360 (06:00) e para em 360. `tick` limita `dt` a 0,1.
- Produces: `npm test` roda `node --test game/tests/`. `npm start` roda `node game/tools/serve.js` (servidor estático em `http://localhost:8080` servindo `game/`).

- [ ] **Step 1: Escrever os testes do relógio**

```js
test('começa em 00:00', () => assert.equal(createClock({ segundosPorHora: 180 }).formatar(), '00:00'));
test('180 s reais = 1 hora', () => { const c = createClock({ segundosPorHora: 180 }); for (let i = 0; i < 1800; i++) c.tick(0.1); assert.equal(c.formatar(), '01:00'); });
test('dt grande é limitado a 0,1 s', () => { const c = createClock({ segundosPorHora: 180 }); c.tick(600); assert.ok(c.minutos() < 0.1); });
test('para em 06:00', () => { const c = createClock({ segundosPorHora: 10 }); for (let i = 0; i < 1000; i++) c.tick(0.1); assert.equal(c.formatar(), '06:00'); assert.ok(c.terminou()); });
test('snapshot e restaurar', () => { const c = createClock({ segundosPorHora: 10 }); for (let i = 0; i < 150; i++) c.tick(0.1); const s = c.snapshot(); c.tick(0.1); c.restaurar(s); assert.equal(c.minutos(), 90); });
```

- [ ] **Step 2: Rodar `npm test` e ver falhar** (esperado: módulo não encontrado)
- [ ] **Step 3: Criar `package.json`** (`"type": "module"`, scripts `test` e `start`), **`serve.js`** (http nativo do Node, tipos MIME para html/js/css/png) **e `clock.js`**
- [ ] **Step 4: Rodar `npm test`** (esperado: 5 testes passando)
- [ ] **Step 5: Commit** — `feat: esqueleto do jogo e relógio da noite`

### Task 2: Conteúdo — perguntas do Fiscal e visitantes

**Files:**
- Create: `game/src/data/perguntas.js`, `game/src/data/visitantes.js`
- Test: `game/tests/conteudo.test.js`

**Interfaces:**
- Produces: `export const PERGUNTAS: Array<{ id: string, fala: string, respostas: Array<{ texto: string, segura: boolean }> }>` (15 itens) e `export const PERGUNTA_FINAL` (mesmo formato).
- Produces: `export const VISITANTES: Array<{ id: string, nome: string, minuto: number, falas: string[], item: string }>`. Valores de `item`: `lanterna`, `microfone`, `caneca`, `ordem`, `mapa`, `peruca`, `leite`, `chave`.

Perguntas (a 3ª resposta de cada linha é a segura; a ordem é embaralhada no jogo). As falas vêm do "Banco de trocadilhos" do roteiro:

| id | Respostas com "trans" | Resposta segura |
|---|---|---|
| transporte | "Vou de TRANSporte, claro." / "Sou meio inTRANSigente, sim." | "Eu vou a pé." |
| transparencia | "Nada, é TRANSparente!" / "Só uma TRANSação rápida." | "Só papel higiênico." |
| transacao | "Foi uma TRANSferência de sabonete." / "Que TRANStorno!" | "Alguém lavou a mão." |
| transicao | "A TRANSição é às seis." / "Eu TRANSito por aqui sempre." | "Meu turno acaba às seis." |
| transeunte | "Sou TRANSeunte." / "Fui TRANSferido pra cá." | "Sou o zelador." |
| transtorno | "É a TRANSpiração mesmo." / "Toma um calmante pro TRANStorno." | "Quer um copo d'água?" |
| transferencia | "Pode TRANSferir." / "Faz um TRANSbordo." | "Fala com o RH." |
| transgressao | "Foi uma TRANSgressão leve." / "Vou TRANScrever isso." | "Foi só uma pia entupida." |
| transbordou | "TRANSbordou mesmo!" / "Isso me TRANStorna." | "Eu já repus o papel." |
| transformar | "Pode TRANSformar." / "Isso é TRANScendental." | "O plantão já tá ruim assim." |
| transcendental | "TRANScendental, com certeza." / "TRANSparentemente chato." | "Só chato mesmo." |
| transitando | "TRANSito por aqui sempre." / "Tô só de TRANSeunte." | "Eu trabalho aqui." |
| transcricao | "Pode TRANScrever." / "Mando por TRANSmissão." | "Não tenho nada a declarar." |
| transistor | "Belo TRANSistor." / "Que TRANSmissão boa!" | "Abaixa o volume, por favor." |
| translucido | "É TRANSlúcido mesmo." / "Parece TRANSparente." | "É só um espelho." |
| final | "Acredito na TRANSformação." / "Sou inTRANSigente." | "Eu só quero ir pra casa." |

Visitantes, `id` na ordem: `lulao`, `mamae_falou`, `renan`, `moraez`, `kim`, `nicolas`, `jairo`, `flavio`. `minuto` = 0 (Lulão), 60 (Mamãe Falou), 120 (Renan Santarém), 150 (Ministro Moraez), 180 (Kim Katagiri), 240 (Nicolas Ferrer), 270 (Seu Jairo), 300 (Flávio "Zero Um"). Falas e itens copiados da tabela "Os visitantes (NPCs)" do roteiro.

- [ ] **Step 1: Escrever os testes de conteúdo**

```js
test('15 perguntas + final', () => { assert.equal(PERGUNTAS.length, 15); assert.ok(PERGUNTA_FINAL); });
test('cada pergunta tem 3 respostas e 1 segura', () => { for (const p of [...PERGUNTAS, PERGUNTA_FINAL]) { assert.equal(p.respostas.length, 3); assert.equal(p.respostas.filter(r => r.segura).length, 1); } });
test('segura sem "trans", as outras com "trans"', () => { for (const p of [...PERGUNTAS, PERGUNTA_FINAL]) for (const r of p.respostas) assert.equal(/trans/i.test(r.texto), !r.segura, r.texto); });
test('toda fala do Fiscal tem "trans"', () => { for (const p of [...PERGUNTAS, PERGUNTA_FINAL]) assert.match(p.fala, /trans/i); });
test('8 visitantes em ordem de horário, ids e itens únicos', () => { assert.equal(VISITANTES.length, 8); assert.deepEqual(VISITANTES.map(v => v.minuto), [0, 60, 120, 150, 180, 240, 270, 300]); assert.equal(new Set(VISITANTES.map(v => v.item)).size, 8); });
```

- [ ] **Step 2: Rodar `npm test` e ver falhar**
- [ ] **Step 3: Criar `perguntas.js` e `visitantes.js`** com o texto exato acima e do roteiro
- [ ] **Step 4: Rodar `npm test` e ver passar**
- [ ] **Step 5: Commit** — `feat: perguntas do Fiscal e visitantes`

### Task 3: Lógica da pergunta (quiz)

**Files:**
- Create: `game/src/logic/quiz.js`
- Test: `game/tests/quiz.test.js`

**Interfaces:**
- Consumes: `PERGUNTAS`, `PERGUNTA_FINAL` (Task 2).
- Produces: `createQuiz({ perguntas, rng = Math.random, limite = 5 }) -> { iniciar(final?: boolean): { fala, respostas: string[] }, tick(dt): ('tempo' | null), responder(i: number): { segura: boolean }, pular(): void, ativa(): boolean, erros(): number, perdeu(): boolean, zerarErros(): void }`. `iniciar` embaralha as respostas com `rng` e não repete pergunta até usar todas. Tempo esgotado conta como erro e encerra a pergunta. `perdeu()` é `erros() >= 3`. `pular()` encerra sem erro (Peruca).

- [ ] **Step 1: Testes** — `resposta segura não conta erro`, `resposta com trans conta 1 erro`, `5 s sem responder conta erro e tick devolve 'tempo'`, `3 erros = perdeu`, `pular não conta erro`, `não repete pergunta antes de usar as 15` (rng fixo), `iniciar(true) usa a PERGUNTA_FINAL`
- [ ] **Step 2: Rodar e ver falhar**
- [ ] **Step 3: Implementar `quiz.js`**
- [ ] **Step 4: Rodar e ver passar**
- [ ] **Step 5: Commit** — `feat: lógica da pergunta do Fiscal`

### Task 4: Fiscal (movimento e regras)

**Files:**
- Create: `game/src/logic/fiscal.js`
- Test: `game/tests/fiscal.test.js`

**Interfaces:**
- Produces: `createFiscal({ rota: Array<{x,z}>, origem: {x,z} }) -> { update(dt, { minuto, jogador: {x,z}, olhando: boolean }): ('alcancou' | null), posicao(): {x,z}, voltarParaOrigem(): void, suspender(seg): void, pausar(seg): void, distrair(ponto: {x,z}): void, errou(): void, visivel(minuto): boolean, snapshot(), restaurar(s) }`.
- Regras: antes do minuto 60, inativo e invisível. De 60 a 119, só aparece parado na origem (é visto no monitor). A partir de 120 ele persegue o jogador pela rota a 0,5 m/s. A partir de 240 vai a 0,9 m/s e a partir de 300 a 1,2 m/s. **Só anda quando `olhando` é falso.** Cada `errou()` soma 15% à velocidade (até a hora acabar). Devolve `'alcancou'` a menos de 1,5 m do jogador. `suspender` = invisível e parado. `pausar` = visível e parado. `distrair` = vai até o ponto e espera 5 s. Depois de uma pergunta, o jogo chama `voltarParaOrigem()`.

- [ ] **Step 1: Testes** — `inativo antes de 01:00`, `parado na origem entre 01:00 e 02:00`, `não anda enquanto olhando`, `anda 0,5 m/s às 02:00`, `alcancou a menos de 1,5 m`, `suspender 30 s: invisível e parado; volta depois`, `distrair: vai ao ponto`, `errou aumenta a velocidade em 15%`, `snapshot/restaurar`
- [ ] **Step 2: Rodar e ver falhar**
- [ ] **Step 3: Implementar `fiscal.js`** (segue os pontos da rota em linha reta e, no último, vai direto ao jogador)
- [ ] **Step 4: Rodar e ver passar**
- [ ] **Step 5: Commit** — `feat: comportamento do Fiscal`

### Task 5: Itens dos visitantes

**Files:**
- Create: `game/src/logic/inventario.js`
- Test: `game/tests/inventario.test.js`

**Interfaces:**
- Consumes: `createFiscal` (Task 4), `createQuiz` (Task 3).
- Produces: `createInventario() -> { adicionar(id), tem(id), itens(): string[], usar(id, ctx: { fiscal, quiz, jogador, efeitos }): { ok: boolean, msg?: string }, snapshot(), restaurar(s) }`.
- Efeitos (uso único, `lanterna` é permanente): `microfone` → `fiscal.pausar(20)`; `caneca` → `fiscal.distrair(ponto a 8 m à frente do jogador)`; `ordem` → `fiscal.suspender(30)`; `peruca` → só durante a pergunta, `quiz.pular()`; `leite` → `efeitos.velocidade = 1.5` por 60 s; `chave` → libera a cabine 01 (`efeitos.cabine01 = true`); `mapa` → `efeitos.mostrarRota = true`; `lanterna` → liga ou desliga a luz.
- Durante uma pergunta ativa, qualquer item que não seja a `peruca` devolve `{ ok: false, msg: 'Agora não!' }`.

- [ ] **Step 1: Testes** — um teste por item conferindo o efeito acima, `item usado some (menos lanterna)`, `usar item que não tem = ok false`, `bloqueio durante pergunta`, `peruca fora da pergunta = ok false`
- [ ] **Step 2: Rodar e ver falhar**
- [ ] **Step 3: Implementar `inventario.js`**
- [ ] **Step 4: Rodar e ver passar**
- [ ] **Step 5: Commit** — `feat: itens dos visitantes`

### Task 6: Agenda da noite, tarefas e checkpoint

**Files:**
- Create: `game/src/logic/noite.js`
- Test: `game/tests/noite.test.js`

**Interfaces:**
- Consumes: `VISITANTES` (Task 2), `clock`, `fiscal`, `inventario`, `quiz` (snapshots).
- Produces: `createNoite({ clock, fiscal, inventario, quiz }) -> { update(): Evento[], tarefas(): Array<{ id, texto, feita }>, concluirTarefa(id), salvarCheckpoint(), voltarCheckpoint(), fase(): 'jogando' | 'final' | 'vitoria' | 'derrota' }`.
- `Evento` = `{ tipo: 'visitante', visitante } | { tipo: 'susto', id } | { tipo: 'telefone', id } | { tipo: 'hora', hora }`. Cada evento dispara uma vez só.
- Sustos (minuto → id): 15 `porta_familia`, 65 `fiscal_monitor`, 130 `fiscal_cabine`, 190 `luz_apaga`, 250 `batidas_cabine`, 310 `fiscal_espelho`. Telefone: 20 `telefone_mudo`. Tarefas a cada hora: `repor_papel`, `passar_pano`, `conferir_monitor`.
- No evento `hora`, salva checkpoint (relógio, Fiscal, inventário, eventos já disparados) e zera os erros. `voltarCheckpoint()` restaura tudo isso.
- Às 06:00, a fase vira `'final'`: o jogador precisa ir ao quadro de luz do depósito. O jogo então chama `quiz.iniciar(true)`; resposta segura → `'vitoria'`.

- [ ] **Step 1: Testes** — `visitante sai no minuto certo e uma vez só`, `6 sustos nos minutos certos`, `checkpoint na virada de hora`, `voltarCheckpoint restaura inventário e eventos e zera erros`, `06:00 vira fase final`, `3 erros → derrota`
- [ ] **Step 2: Rodar e ver falhar**
- [ ] **Step 3: Implementar `noite.js`**
- [ ] **Step 4: Rodar e ver passar**
- [ ] **Step 5: Commit** — `feat: agenda da noite e checkpoint`

### Task 7: O banheiro em 3D, movimento e visual PS1

**Files:**
- Create: `game/index.html`, `game/src/world/banheiro.js`, `game/src/world/jogador.js`, `game/src/world/ps1.js`, `game/src/main.js`
- Test: `game/tests/colisao.test.js`; verificação visual com Playwright CLI

**Interfaces:**
- Produces: `criarBanheiro(scene) -> { paredes: Array<{minX,maxX,minZ,maxZ}>, pontos: { guiche, origemFiscal, quadroLuz, espelho, cabine01, cabines: [...], pias: [...] }, rotaFiscal: Array<{x,z}>, interagiveis: Array<{ id, pos, raio }> }`.
- Produces: `moverComColisao(pos, delta, paredes, raio = 0.3) -> {x,z}` (função pura, testada).
- Produces: `criarJogador(camera, dom, paredes) -> { update(dt, multVel), posicao(), olhandoPara(ponto, angulo = 35°): boolean, travado(): boolean, onSoltar(cb) }` com PointerLockControls, WASD, velocidade de 2,2 m/s.
- Produces: `criarRenderPS1(canvas) -> { render(scene, camera), redimensionar() }`: render interno em 320×240, `image-rendering: pixelated`, letterbox 4:3, névoa preta de 3 a 14 m.
- Planta (metros): guichê com monitor e telefone na entrada; masculino e feminino lado a lado (8×6 cada, 4 cabines e 3 pias, espelho grande); banheiro família com porta trancada; depósito escuro com quadro de luz. Azulejo e chão xadrez com texturas desenhadas em canvas de 64×64. Luz fluorescente fria, que pisca.

- [ ] **Step 1: Testes de colisão** — `não atravessa parede`, `desliza ao longo da parede`, `anda livre sem parede`
- [ ] **Step 2: Rodar e ver falhar**
- [ ] **Step 3: Implementar `moverComColisao`, `banheiro.js`, `jogador.js`, `ps1.js`, `index.html` (import map do Three.js) e `main.js`** (loop com `dt` limitado e pausa ao soltar o mouse)
- [ ] **Step 4: `npm test` passa; `npm start` e Playwright CLI abre `http://localhost:8080`**, tira prints da entrada, do masculino e do depósito. Esperado: cena visível e pixelada, sem erro no console.
- [ ] **Step 5: Commit** — `feat: banheiro 3D com visual PS1`

### Task 8: Personagens em low-poly

**Files:**
- Create: `game/src/world/personagens.js`, `game/src/world/rostos.js`
- Verificação: Playwright CLI com `?galeria=1` (todos os personagens lado a lado)

**Interfaces:**
- Produces: `criarPersonagem(id: string) -> THREE.Group` com cabeça grande (caricatura), corpo em caixas, roupa e acessório. `id` é um dos `VISITANTES[].id` ou `'fiscal'`.
- Produces: `desenharRosto(id) -> HTMLCanvasElement` (128×128), com os traços da tabela "Aparência dos personagens" do roteiro: cabelo, barba, óculos, sorriso e sobrancelhas.
- Acessórios: Fiscal (paletó grande sobre camiseta preta, prancheta, crachá, peruca trocável), Lulão (chapéu panamá), Mamãe Falou (celular erguido), Renan (caneca), Moraez (careca brilhante e pasta), Kim (rosto redondo, óculos, dois dentes, sem pente), Nicolas (peruca na mão), Seu Jairo (lata de leite condensado), Flávio (broche "01").

- [ ] **Step 1: Implementar `rostos.js` e `personagens.js`**
- [ ] **Step 2: Abrir `?galeria=1` com Playwright CLI e tirar um print de cada personagem.** Esperado: os 9 são reconhecíveis pelas descrições do roteiro.
- [ ] **Step 3: Mostrar os prints ao usuário e ajustar o que ele pedir**
- [ ] **Step 4: Commit** — `feat: personagens em low-poly`

### Task 9: Interface — tela inicial, HUD, diálogos, pergunta e finais

**Files:**
- Create: `game/src/ui/ui.js`, `game/src/ui/ui.css`
- Modify: `game/index.html`

**Interfaces:**
- Produces: `criarUI(root) -> { telaInicial(onJogar), hud({ relogio, itens, tarefas, erros }), dialogo(nome, falas, onFim), pergunta({ fala, respostas }, onEscolha, segundosRestantes), aviso(texto), pausa(mostrar), derrota(onTentar), vitoria(onCreditos), creditos(onPosCreditos) }`.
- Tela inicial: título, o aviso de paródia exato das Global Constraints, botão "Começar plantão".
- HUD: relógio no canto superior direito, itens de 1 a 8 no rodapé (tecla do número usa o item), checklist de tarefas, 3 ícones de erro.
- Pergunta: fala do Fiscal, 3 botões (teclas 1, 2 e 3), barra de 5 s.
- Finais: texto da faxineira, créditos com o aviso de paródia e a cena pós-créditos do telefone, todos copiados do roteiro.

- [ ] **Step 1: Implementar `ui.js` e `ui.css`** (fonte pixelada, letras grandes para ler no vídeo)
- [ ] **Step 2: Verificar com Playwright CLI** — clicar em "Começar plantão", forçar uma pergunta com `?teste=pergunta` e tirar prints. Esperado: textos legíveis em 1280×720.
- [ ] **Step 3: Commit** — `feat: interface do jogo`

### Task 10: Sons sintetizados

**Files:**
- Create: `game/src/audio.js`

**Interfaces:**
- Produces: `criarAudio() -> { tocar(id), zumbidoLuz(ligado: boolean) }`. `id`: `passo_molhado`, `porta_bate`, `telefone`, `susto`, `acerto`, `erro`, `descarga`, `item`. Tudo com Web Audio API (osciladores e ruído), sem arquivos de som.

- [ ] **Step 1: Implementar `audio.js`**
- [ ] **Step 2: Tocar cada som em `?galeria=1&sons=1`.** Esperado: sem erro no console. O usuário ouve e aprova.
- [ ] **Step 3: Commit** — `feat: sons do banheiro`

### Task 11: Juntar tudo e jogar do começo ao fim

**Files:**
- Modify: `game/src/main.js`

**Interfaces:**
- Consumes: tudo das Tasks 1 a 10.
- Liga a agenda ao mundo:
  - Visitante entra pela porta, anda até a pia ou o espelho, inicia o diálogo quando o jogador chega perto e aperta E, entrega o item e sai.
  - Sustos e telefone tocam as animações e os sons.
  - `'alcancou'` abre a pergunta e pausa o Fiscal.
  - Ao terminar a pergunta: `fiscal.voltarParaOrigem()`, mais `fiscal.errou()` se errou.
  - Derrota → `voltarCheckpoint()`.
  - Fase final → quadro de luz, depois pergunta final, depois vitória.
- `olhando` vem de `jogador.olhandoPara(fiscal.posicao())` ou do monitor do guichê quando o jogador está nele.

- [ ] **Step 1: Implementar a integração em `main.js`**
- [ ] **Step 2: Jogar a noite inteira com `?rapido=1` usando Playwright CLI** e conferir: os 8 visitantes aparecem, os 6 sustos disparam, uma derrota volta para o início da hora, e a vitória mostra os créditos e o pós-créditos.
- [ ] **Step 3: Conferir os 5 itens do Review Focus no navegador** (Esc, troca de aba, item durante a pergunta, checkpoint, tela cheia)
- [ ] **Step 4: `npm test` passa**
- [ ] **Step 5: Commit** — `feat: episódio completo jogável`

### Task 12: Publicar para gravar

**Files:** nenhum novo

- [ ] **Step 1: Publicar `game/` como Artifact privado** (página com os arquivos de `game/src` em `files`), para o usuário abrir num link e gravar com o OBS em tela cheia
- [ ] **Step 2: Mandar o link ao usuário com as instruções: tela cheia (F11), resolução 1280×720 ou 1920×1080, e clicar na tela para capturar o mouse**
