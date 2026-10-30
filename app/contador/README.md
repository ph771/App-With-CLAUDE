# Contador de Cangas

App de navegador que conta cangas pela câmera: **certa** quando é pendurada no suporte,
**errada** quando é jogada para a saída. Projeto e regras: `docs/contador-cangas/design.md`.

- `index.html` — tela do app (câmera ao vivo ou vídeo da galeria, áreas ajustáveis, placar).
- `counter.js` — lógica de contagem, sem dependências; a mesma roda no celular e nos testes.
- `test/` — testes: `node --test test/contador.test.js`.
  Para testar com vídeos reais (precisa de `ffmpeg`), cada um com 1 certa e 1 errada:
  `VIDEOS="a.mp4,b.mp4" node --test test/contador.test.js`.
  Para ver o que um vídeo conta: `node test/rodar-video.js video.mp4 [--detalhes]`.

A câmera só funciona em endereço `https://` (ou `localhost`).
