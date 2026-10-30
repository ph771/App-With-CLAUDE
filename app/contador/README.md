# Contador de Cangas

App de navegador que conta, pela câmera, as cangas **penduradas no suporte** (peças certas).
Antes de contar, o operador marca o suporte na imagem (ajuste guiado com teste). Projeto e regras: `docs/contador-cangas/design.md`.

- `index.html` — tela do app (câmera ao vivo, ajuste do suporte, placar).
- `counter.js` — lógica de contagem, sem dependências; a mesma roda no celular e nos testes.
- `test/` — testes: `node --test test/contador.test.js`.
  Para testar com vídeos reais (precisa de `ffmpeg`), cada um com 1 peça pendurada no suporte:
  `VIDEOS="a.mp4,b.mp4" node --test test/contador.test.js`.
  Para ver o que um vídeo conta: `node test/rodar-video.js video.mp4 [--detalhes]`.

A câmera só funciona em endereço `https://` (ou `localhost`).

## Publicação

O app fica hospedado no GitHub Pages do repositório `ph771/Contador-de-tecidos-`.
Para atualizar, copie `counter.js` e gere o `index.html` completo:

```sh
{ printf '<!doctype html>\n<html lang="pt-BR">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head>\n<body>\n'
  cat app/contador/index.html; printf '</body>\n</html>\n'; } > ../contador-de-tecidos-/index.html
cp app/contador/counter.js ../contador-de-tecidos-/
```
