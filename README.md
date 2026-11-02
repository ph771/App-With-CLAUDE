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
| `exemplo/` | A tela de exemplo aprovada antes da construção |
| `docs/superpowers/` | Projeto e plano de implementação |

```bash
npm test          # testes (os de ponta a ponta usam Playwright com câmera falsa)
npm run servidor  # abre o app em http://localhost:8080
```

Ao mudar a lista de arquivos do app, aumente a versão em `sw.js` (`teleprompter-v1`).
