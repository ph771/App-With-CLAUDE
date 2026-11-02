# Teleprompter de Bolso — projeto

Data: 2026-11-02 · Aprovado pelo dono do projeto ("ficou perfeito, pode fazer o app"),
a partir da tela de exemplo em `exemplo/index.html`.

## Intenção

O dono quer gravar vídeos de si mesmo com a câmera da frente do iPhone lendo um texto
que passa na tela, como um apresentador. O texto aparece só na tela; **o vídeo final
mostra só a pessoa**, sem nada por cima. Ele não programa e não tem Mac.

## Objetivos

- Gravar vídeo + som com a câmera da frente do iPhone, em **vertical (9:16)** ou
  **horizontal (16:9)**.
- Mostrar o texto rolando sozinho numa faixa por cima da imagem da câmera, com
  velocidade e tamanho de letra ajustáveis, e pausa ao tocar no texto.
- Salvar o vídeo nas Fotos do iPhone.
- Abrir pelo Safari e poder "Adicionar à Tela de Início", funcionando como app.

## Não-objetivos

- Gravar a tela do iPhone (pedido inicial corrigido pelo dono).
- Editar vídeo, legendas, filtros, câmera traseira, nuvem ou contas.
- App nativo da App Store.

## Anti-objetivos (seria um fracasso mesmo funcionando)

- O texto do teleprompter aparecer no vídeo gravado.
- Perder o texto que a pessoa digitou ao fechar o app.
- Enviar o vídeo para qualquer servidor. Tudo fica no aparelho.

## Restrições

- Roda no Safari do iPhone (iOS 14.3 ou mais novo, quando o Safari passou a gravar
  vídeo). Sem etapa de compilação: HTML, CSS e JavaScript puros.
- Hospedado no GitHub Pages do repositório (público), a partir do ramo
  `claude/exciting-volta-93dlxv`, pasta raiz. Endereço:
  `https://ph771.github.io/App-With-CLAUDE/`.
- A câmera só funciona em HTTPS (o GitHub Pages já é).
- Não dá para testar num iPhone de verdade daqui; os testes automáticos usam o
  Chromium com câmera falsa. O dono testa no iPhone.

## Abordagens consideradas

1. **App no Safari (escolhida pelo dono).** Grátis, sem Mac, instalável na Tela de
   Início. Qualidade Full HD, menos ajustes que o app Câmera.
2. App nativo (Swift). Melhor qualidade, mas exige Mac, Xcode e conta paga da Apple.
3. App pronto da App Store. Sem construir nada, mas pago e fora do controle do dono.

### Como gravar sem o texto aparecer

- **Escolhida: gravar direto a imagem da câmera.** O `MediaRecorder` recebe só o
  fluxo da câmera e do microfone; o texto é uma camada da página por cima do vídeo e
  nunca entra na gravação. É o caminho mais simples e o mais estável no iPhone.
- Rejeitada: desenhar a câmera num `canvas` e gravar o canvas. Daria controle exato do
  enquadramento, mas esquenta o celular e tem falhas conhecidas no Safari do iPhone.

## O que foi decidido (pelo dono, na conversa e na tela de exemplo)

- Três telas, como no exemplo: **Seu texto** → **Câmera** → **Vídeo pronto**.
- Formato do vídeo: **Vertical** ou **Horizontal** (pedido do dono). Se o celular
  estiver na posição errada, aparece "Gire o celular…".
- Posição do texto: **No meio** (padrão, como o dono pediu) ou **Perto da câmera**
  (no topo; na horizontal, do lado em que a câmera está).
- Contagem de 3 segundos antes de gravar; cronômetro vermelho durante a gravação.
- Seta amarela marcando a linha que deve ser lida.
- Botões − e + mudam a velocidade durante a gravação; tocar no texto pausa/continua.
- "Salvar nas Fotos" abre o menu de compartilhar do iPhone (opção "Salvar Vídeo").
- Visual escuro do exemplo: amarelo `#ffc94a` de destaque, vermelho `#ff3b30` de
  gravação, fontes Figtree (botões) e Atkinson Hyperlegible (texto do teleprompter).

## Decisões do construtor (podem ser revistas)

- Prévia da câmera **espelhada** (como selfie); o vídeo gravado sai normal.
- O texto, o formato, a velocidade, o tamanho e a posição ficam salvos no aparelho
  (`localStorage`) e voltam ao abrir o app.
- A velocidade acompanha o tamanho da letra, para que letra maior não pareça correr
  mais rápido.
- A tela não apaga durante a câmera (Wake Lock, quando o iPhone permitir).
- Se o celular girar **durante** a gravação, a gravação continua e aparece só uma
  faixa de aviso (não um bloqueio), para o botão de parar continuar acessível.
- Se o app for para o fundo (ligação, bloqueio de tela) durante a gravação, a gravação
  para e o que já foi gravado vai para a tela "Vídeo pronto".
- Se a pessoa negar a câmera/microfone, aparece uma explicação de como liberar em
  Ajustes, com botão "Tentar de novo".
- Arquivo salvo como `teleprompter-AAAA-MM-DD-HHMM.mp4` (ou `.webm` onde não houver MP4).
- Qualidade: alvo 1080p a 30 quadros, cerca de 6 Mbps.
- Funciona sem internet depois da primeira abertura (service worker).

## Fica para o construtor

Detalhes de código, nomes internos, organização dos arquivos e textos de erro, desde
que sigam o visual e o comportamento da tela de exemplo.

## Mudança: mais espaço para o texto (2026-11-02)

Pedido do dono: "o texto pode tomar mais espaço na tela". Roteiros continuam chegando
pelo WhatsApp (copiar e colar); nada muda nisso.

- Nova opção **Espaço do texto na tela: Pequeno / Médio / Grande**. Padrão: **Grande**.
- Em pé: 34% / 48% / 62% da altura da tela. Deitado: 50% / 62% / 74%.
- A faixa nunca cobre os botões (gravar, velocidade, rolar, voltar) — conferido por teste
  no iPhone SE (o menor), num iPhone comum e nos dois deitados.
- Quem já usava o app ganha o espaço Grande; os outros ajustes ficam como estavam.
