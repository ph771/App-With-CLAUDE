#!/bin/bash
# Clona e instala as dependências dos repositórios externos descritos no CLAUDE.md.
# Roda só em sessões na nuvem. Uma falha em um repositório não interrompe os outros.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Os repositórios ficam ao lado deste projeto: <pasta-pai>/<owner>/<repo>
BASE_DIR="$(dirname "${CLAUDE_PROJECT_DIR:-$(pwd)}")"

# repositório|comando de instalação
REPOS=(
  "googleworkspace/cli|pnpm install"
  "every-app/open-seo|pnpm install"
  "morluto/rea|npm install"
  "obra/superpowers|npm install"
  "microsoft/playwright-cli|npm install"
  "heygen-com/hyperframes|bun install"
)

failed=()

for entry in "${REPOS[@]}"; do
  repo="${entry%%|*}"
  install_cmd="${entry#*|}"
  dest="$BASE_DIR/$repo"

  echo "==> $repo" >&2

  if [ ! -d "$dest/.git" ]; then
    mkdir -p "$(dirname "$dest")"
    if ! GIT_LFS_SKIP_SMUDGE=1 git clone --quiet --depth 1 "https://github.com/$repo" "$dest" >&2; then
      echo "    falha ao clonar $repo" >&2
      failed+=("$repo")
      continue
    fi
  fi

  if ! (cd "$dest" && $install_cmd) >&2; then
    echo "    falha ao instalar dependências de $repo" >&2
    failed+=("$repo")
  fi
done

if [ ${#failed[@]} -gt 0 ]; then
  echo "Repositórios com falha: ${failed[*]}" >&2
fi

exit 0
