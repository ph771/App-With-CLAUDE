#!/usr/bin/env bash
# Baixa o SDK oficial NDI para Android e copia libndi.so para o app.
# Ao rodar este script você aceita a licença do NDI SDK (https://ndi.video/sdk/).
# Se o link mudar, defina NDI_SDK_URL com o novo endereço.
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${NDI_SDK_URL:-https://downloads.ndi.tv/SDK/NDI_SDK_Android/Install_NDI_SDK_v6_Android.tar.gz}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Baixando $URL"
curl -fL --retry 3 -o "$WORK/ndi.tar.gz" "$URL"
tar -xzf "$WORK/ndi.tar.gz" -C "$WORK"

installer="$(find "$WORK" -maxdepth 3 -name 'Install_NDI_SDK*.sh' | head -n1 || true)"
if [ -n "$installer" ]; then
  echo "Extraindo instalador $(basename "$installer")"
  (cd "$(dirname "$installer")" && { yes || true; } | PAGER=cat sh "$(basename "$installer")" >/dev/null)
fi

found=0
for abi in arm64-v8a armeabi-v7a x86_64; do
  lib="$(find "$WORK" -path "*/${abi}/*" -name 'libndi.so' | head -n1 || true)"
  if [ -n "$lib" ]; then
    mkdir -p "app/src/main/jniLibs/$abi"
    cp "$lib" "app/src/main/jniLibs/$abi/libndi.so"
    echo "libndi.so copiada para $abi"
    found=1
  fi
done

if [ "$found" != 1 ]; then
  echo "libndi.so não encontrada no pacote. Conteúdo:" >&2
  find "$WORK" -maxdepth 4 | head -n 60 >&2
  exit 1
fi
