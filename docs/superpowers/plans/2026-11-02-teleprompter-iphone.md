# Teleprompter de Bolso — plano de implementação

> **Para agentes:** use superpowers:executing-plans (execução nesta sessão). Passos com `- [ ]`.

**Goal:** App web para iPhone que grava a câmera da frente com um teleprompter visível só na tela.

**Architecture:** Página estática (HTML/CSS/JS em módulos ES, sem compilação) servida pelo GitHub Pages. O `MediaRecorder` grava só o fluxo da câmera + microfone; o teleprompter é uma camada DOM por cima do `<video>` da prévia. Funções puras ficam em `js/logica.js` e são testadas com `node --test`; o fluxo completo é testado com Playwright + Chromium com câmera falsa.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Node 22 `node:test`, Playwright (já instalado na máquina).

**Spec:** `docs/superpowers/specs/2026-11-02-teleprompter-iphone-design.md`

## Global Constraints

- Sem dependências de npm e sem etapa de build; tudo servido como está pelo GitHub Pages.
- Caminhos relativos (o site vive em `/App-With-CLAUDE/`).
- Textos da interface em português do Brasil.
- Cores: fundo `#0e0f12`, painel `#16181d`, destaque `#ffc94a`, gravação `#ff3b30`. Fontes locais em `fontes/`.
- O texto do teleprompter nunca entra na gravação.
- Nada sai do aparelho.

## Review Focus

1. Câmera/microfone negados → mensagem clara em português com como liberar em Ajustes, e "Tentar de novo"; nunca tela preta muda.
2. Celular girado durante a gravação → gravação continua; aparece faixa de aviso, botão de parar acessível.
3. App vai para o fundo (ligação, bloqueio) durante a gravação → para e mostra o que já foi gravado.
4. Texto vazio ou muito longo → câmera abre e grava normalmente; rolagem para no fim sem travar.
5. Navegador sem gravação de vídeo → aviso pedindo para atualizar o iPhone, em vez de erro silencioso.

---

### Task 1: Lógica pura

**Files:**
- Create: `package.json`, `js/logica.js`
- Test: `testes/logica.test.js`

**Interfaces — Produces (`js/logica.js`):**
- `formatarTempo(segundos: number) -> string` — `"MM:SS"`; minutos podem passar de 59 (`"75:03"`); negativo/NaN → `"00:00"`.
- `nomeVelocidade(v: number) -> "Devagar"|"Média"|"Rápida"` — 1–3, 4–6, 7–10.
- `pixelsPorSegundo(velocidade: number, tamanhoLetra: number) -> number` — `(10 + v*7) * (tamanhoLetra/32)`.
- `escolherFormatoGravacao(suporta: (tipo) => boolean) -> {mimeType, extensao} | null` — prefere MP4: `video/mp4;codecs=avc1.640028,mp4a.40.2`, `video/mp4;codecs=avc1,mp4a.40.2`, `video/mp4`, depois `video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`, `video/webm`.
- `restricoesCamera(formato: "vertical"|"horizontal") -> MediaStreamConstraints` — `facingMode: "user"`, 1920×1080 ideal (invertido no vertical), 30 fps ideal, áudio com cancelamento de eco e redução de ruído.
- `nomeArquivo(data: Date, extensao: string) -> string` — `teleprompter-2026-11-02-1830.mp4`.
- `avisoDeGiro(formato, emPaisagem: boolean, gravando: boolean) -> "nenhum"|"bloqueio"|"faixa"`.
- `ladoDaCamera(anguloTela: number) -> "esquerda"|"direita"` — 270 ou -90 → direita, senão esquerda.
- `PADROES` e `carregarPreferencias(armazenamento) -> prefs`, `salvarPreferencias(armazenamento, prefs) -> void` — tolerantes a erro; valores fora da faixa voltam ao padrão.

- [ ] Step 1: escrever `testes/logica.test.js` cobrindo cada função acima (casos de borda: 0, 59, 60, 3605 s; NaN; nenhum tipo suportado → `null`; Safari só com `video/mp4` → mp4; Chromium só com webm → webm; armazenamento que lança erro; JSON inválido; velocidade 99 → padrão).
- [ ] Step 2: rodar `node --test testes/` e ver falhar (módulo não existe).
- [ ] Step 3: implementar `js/logica.js`.
- [ ] Step 4: rodar e ver passar.
- [ ] Step 5: commit.

### Task 2: Telas e visual

**Files:** Create `index.html`, `estilo.css`.

Três `<section>` (`#tela-texto`, `#tela-camera`, `#tela-pronto`) com os mesmos ids e estrutura da tela de exemplo, trocando a pessoa desenhada por `<video id="previa" playsinline muted autoplay>` (espelhado com `scaleX(-1)`) e a prévia final por `<video id="video-pronto" playsinline controls>`. Acrescenta: `#aviso-erro` (mensagem + "Tentar de novo"), `#faixa-giro` (aviso não-bloqueante), dica "Adicionar à Tela de Início" quando não instalado. Fontes via `@font-face` local.

- [ ] Step 1: escrever HTML/CSS a partir de `exemplo/index.html`.
- [ ] Step 2: verificar com captura de tela em 390×844 e 844×390 (verificado no teste da Task 4).
- [ ] Step 3: commit (junto com a Task 3, pois sem JS a tela não funciona).

### Task 3: Câmera, teleprompter e gravação

**Files:** Create `js/prompter.js`, `js/gravador.js`, `js/app.js`.

**Interfaces:**
- `js/prompter.js`: `class Prompter { constructor(faixaEl, textoEl, {velocidade: () => number}); definirTexto(t); medir(); iniciar(); pausar(); alternar(); voltarAoInicio(); get rolando; onMudou(cb) }`.
- `js/gravador.js`: `abrirCamera(formato) -> Promise<MediaStream>` (lança `Error` com `.codigo` em `"negado"|"sem-camera"|"inseguro"|"outro"`); `class Gravador { constructor(stream, formatoGravacao); iniciar(); parar() -> Promise<Blob>; get gravando }`; `fecharCamera(stream)`.
- `js/app.js`: liga telas, preferências (`carregarPreferencias`/`salvarPreferencias` em `localStorage`), contagem 3-2-1, cronômetro, Wake Lock, `visibilitychange`, giro, salvar com `navigator.share({files})` e alternativa de download.

- [ ] Step 1: implementar os três módulos.
- [ ] Step 2: rodar o teste ponta a ponta da Task 4 e ver passar.
- [ ] Step 3: commit.

### Task 4: Teste ponta a ponta

**Files:** Create `testes/servidor.js` (servidor estático em `localhost`), `testes/app.e2e.test.js`.

Testes (Chromium com `--use-fake-device-for-media-stream`):
- `grava e mostra o vídeo pronto`: digita texto, abre câmera, grava ~3 s, para; espera `#tela-pronto` visível, `#video-pronto` com `duration > 1` e tamanho do arquivo > 10 KB.
- `o texto não entra na gravação`: confirma que o `MediaRecorder` recebeu as trilhas do `getUserMedia` (faixa de vídeo com mesmo `id` da prévia) e nenhuma trilha de canvas/captura de tela.
- `câmera negada mostra ajuda`: contexto sem permissão → `#aviso-erro` visível com "Ajustes".
- `texto e ajustes voltam ao reabrir`: muda texto/velocidade, recarrega, confere.
- `horizontal com celular em pé pede para girar`: 390×844, formato horizontal → bloqueio visível; 844×390 → some.
- Capturas em 390×844 e 844×390 para conferência visual.

- [ ] Step 1: escrever os testes. Step 2: rodar e corrigir até passar. Step 3: commit.

### Task 5: App instalável e offline

**Files:** Create `manifest.webmanifest`, `sw.js`, `icones/icone-180.png`, `icones/icone-192.png`, `icones/icone-512.png`, `README.md`.

- `sw.js`: rede primeiro, cache como reserva; cache versionado `teleprompter-v1`; lista de arquivos do app.
- `index.html`: `<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-capable`, `theme-color`.
- README em português: endereço, como instalar, como usar, limitações.
- Teste: `manifest e service worker carregam` (e2e) — manifest com `display: standalone` e SW registrado.

- [ ] Step 1: teste falhando. Step 2: implementar. Step 3: rodar todos os testes. Step 4: commit e push.

---

## Registro de execução (2026-11-02)

Todas as tarefas concluídas; `npm test`: 28 testes passando (19 de lógica, 9 de ponta a ponta).

- Ruling: velocidade medida em palavras por minuto (`palavrasPorMinuto(v) = 60 + 20v`, Média = 140) em vez de `(10 + 7v) × tamanho/32` px/s — a fórmula antiga dava ~190 palavras/min em pé e quase o dobro deitado — se errado, o dono só ajusta o controle.
- Ruling: prévia da câmera com `object-fit: contain` — o que aparece na tela é exatamente o enquadramento gravado — custo: faixas pretas quando a proporção da tela difere da do vídeo.
- Ruling: toque no texto travado durante a contagem 3-2-1 — evita o texto começar antes da gravação — teste dedicado.
- Ruling: "Gravar de novo"/"Editar texto" pedem confirmação se o vídeo ainda não foi salvo — evita perder uma gravação sem querer.
- Ruling: arrastar o texto com o dedo para voltar/avançar — ajuda quando a pessoa se perde na leitura — custo pequeno, mesmo gesto do toque.
- Ruling: fontes copiadas para `fontes/` (licença OFL incluída) — o app funciona sem internet.
- Não testado aqui: Safari do iPhone real (câmera, MP4, "Salvar Vídeo", giro). Testado no Chromium com câmera falsa; o dono testa no iPhone.

## Registro: transmitir para o OBS (2026-11-02)

`npm test`: 40 testes passando (inclui 4 de ponta a ponta da transmissão, com servidor de conexão local).

- Ruling: durante a transmissão com o texto rodando, o botão "Texto: no meio/perto da câmera" some para caber "Ao vivo" + cronômetro — a posição continua mudando na primeira tela.
- Ruling: `?sinal=` (servidor de conexão de teste) só vale quando o app roda em localhost — um link de fora não consegue desviar a câmera para outro servidor.
- Ruling: código do OBS guardado na página e fixável no endereço (`?codigo=`) — configurar o OBS uma vez só.
- Não testado aqui: Safari do iPhone real e o OBS de verdade (o serviço público do PeerJS é bloqueado nesta máquina).
