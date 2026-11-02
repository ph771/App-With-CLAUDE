# Teleprompter de Bolso

App para iPhone que grava você com a câmera da frente enquanto o seu texto passa na tela.
**O texto aparece só para você — o vídeo sai só com você.**

👉 **Abrir o app:** https://ph771.github.io/App-With-CLAUDE/

## Instalar no iPhone (uma vez só)

1. Abra o endereço acima no **Safari**.
2. Toque em **Compartilhar** (o quadrado com a seta para cima).
3. Toque em **Adicionar à Tela de Início** e depois em **Adicionar**.

Pronto: o ícone do Teleprompter fica na tela do iPhone, como qualquer app. Depois da
primeira vez, ele abre até sem internet.

## Como usar

1. **Seu texto:** cole ou escreva o que vai falar. Escolha:
   - **Formato:** Vertical (Reels, TikTok, Stories) ou Horizontal (YouTube).
   - **Velocidade:** em palavras por minuto. Média = 140, um ritmo normal de fala.
   - **Tamanho da letra** e **onde o texto aparece** (no meio ou perto da câmera).
2. **Abrir câmera:** na primeira vez, o iPhone pede para usar a câmera e o microfone —
   toque em **Permitir**.
3. Toque no **botão vermelho**. Depois da contagem 3-2-1, a gravação começa e o texto
   anda sozinho.
   - Toque no texto para **pausar/continuar**. Arraste o texto com o dedo para voltar ou
     avançar.
   - **− / +** mudam a velocidade durante a gravação.
4. Toque no botão vermelho de novo para **parar**.
5. **Salvar nas Fotos** → escolha **Salvar Vídeo**.

Tudo fica no seu iPhone. Nenhum vídeo ou texto é enviado para a internet. O texto e os
ajustes ficam guardados para a próxima vez.

## Transmitir ao vivo para o OBS

Em vez de gravar no iPhone, você pode mandar a câmera ao vivo para o OBS no computador,
continuando a ver o texto no celular. **O OBS recebe só você, sem o texto.**

1. No computador, abra **https://ph771.github.io/App-With-CLAUDE/obs/** — aparece um
   **código de 4 números** e um QR code.
2. No OBS (uma vez só): **Fontes › + › Navegador**, cole o endereço que a página mostra
   (ele termina com `?codigo=` e o seu código), largura 1920 e altura 1080 (vertical:
   1080 × 1920) e marque **Controlar áudio via OBS**.
3. No iPhone: aponte a câmera para o QR code, ou abra o app, escolha **Transmitir para o
   OBS** e digite o código. Toque em **Abrir câmera e conectar**.
4. Quando aparecer **● Ao vivo**, a imagem já está no OBS. O botão vermelho só começa o
   texto (contagem 3-2-1 e rolagem); quem grava é o OBS.

- Deixe o Safari aberto e a tela acesa durante a transmissão.
- Se cair ou se o OBS abrir depois, o iPhone reconecta sozinho.
- Quer NDI? Instale no OBS o complemento gratuito **DistroAV**.
- Para os aparelhos se acharem, o app usa o serviço gratuito do PeerJS; o vídeo vai
  direto do iPhone para o computador.

## Dicas

- **Perto da câmera** faz parecer que você olha para quem assiste.
- Para vídeo **horizontal**, desligue a trava de rotação do iPhone (Central de Controle).
- Se a câmera não ligar: no Safari, toque em **aA › Ajustes do Site › Câmera / Microfone ›
  Permitir**.
- Uma ligação ou bloquear a tela durante a gravação para o vídeo; o que já foi gravado
  aparece na tela "Vídeo pronto".

## Limitações

- Precisa de iPhone com iOS 14.3 ou mais novo.
- Qualidade até Full HD (1080p). Para 4K e estabilização, só um app nativo.

---

## Para quem for mexer no código

HTML, CSS e JavaScript puros, sem instalação de pacotes. Publicado pelo GitHub Pages a
partir da raiz do ramo `claude/exciting-volta-93dlxv`.

| Arquivo | O que faz |
|---|---|
| `index.html`, `estilo.css` | As três telas: texto, câmera e vídeo pronto |
| `js/app.js` | Liga as telas, os botões e as preferências |
| `js/prompter.js` | Faz o texto rolar; toque pausa, arrastar move |
| `js/gravador.js` | Liga a câmera e grava só câmera + microfone |
| `js/logica.js` | Contas puras (tempo, velocidade, formatos), com testes |
| `sw.js`, `manifest.webmanifest`, `icones/` | App instalável e uso sem internet |
| `obs/`, `js/transmissor.js`, `js/conexao.js` | Transmissão ao vivo para o OBS |
| `vendor/` | PeerJS e gerador de QR code (licença MIT) |
| `exemplo/` | A tela de exemplo aprovada antes da construção |
| `docs/superpowers/` | Projeto e plano de implementação |

```bash
npm install       # só para os testes (servidor de conexão local)
npm test          # testes (os de ponta a ponta usam Playwright com câmera falsa)
npm run servidor  # abre o app em http://localhost:8080
```

Ao mudar a lista de arquivos do app, aumente a versão em `sw.js` (`teleprompter-v3`).
