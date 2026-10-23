#!/usr/bin/env bash
# Publica a versão instalável no repositório público (GitHub Pages).
# Uso: bash game/tools/publicar-pwa.sh "mensagem da versão"
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLICO="${PUBLICO:-$RAIZ/../plantao-no-banheiro}"
REPO_URL="${REPO_URL:-https://github.com/ph771/plantao-no-banheiro.git}"
MENSAGEM="${1:-Nova versão}"

node "$RAIZ/game/tools/build-pwa.mjs"
VERSAO="$(grep -o "VERSAO = '[^']*'" "$RAIZ/dist/src/versao.js" | cut -d"'" -f2)"

if [ ! -d "$PUBLICO/.git" ]; then
  git clone "$REPO_URL" "$PUBLICO"
fi
cd "$PUBLICO"
git checkout -B main
# Troca todo o conteúdo pelo dist/ novo (mantém só o .git).
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$RAIZ/dist/." .
cat > README.md <<LEIAME
# Plantão no Banheiro

Paródia de terror e comédia em 1ª pessoa. **Personagens inventados. Qualquer semelhança é piada.**

Jogue e instale: https://ph771.github.io/plantao-no-banheiro/

- No PC (Chrome/Edge): botão **Instalar jogo** na tela inicial (ou o ícone de instalar na barra de endereço).
- No Android: menu do navegador → **Instalar app**.
- No iPhone: Compartilhar → **Adicionar à Tela de Início**.

O jogo atualiza sozinho: quando sai versão nova, aparece "Nova versão do jogo disponível".

Versão atual: \`$VERSAO\`

Créditos: móveis 3D — Furniture Kit por Kenney (CC0); Three.js (MIT).
LEIAME
git add -A
git commit -q -m "$MENSAGEM ($VERSAO)" || { echo "Nada mudou."; exit 0; }
for espera in 2 4 8 16; do
  git push -u origin main && break
  echo "Falha no envio; tentando de novo em ${espera}s"; sleep "$espera"
done
echo "Publicado: versão $VERSAO"
