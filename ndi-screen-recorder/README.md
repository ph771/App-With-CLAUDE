# Tela NDI — gravação e transmissão da tela do Android

App Android que captura a tela do celular e, ao mesmo tempo:

- **transmite via NDI** para a rede local (OBS, vMix, NDI Studio Monitor, Resolume…);
- **grava em MP4** no celular, com vídeo **H.264** ou **H.265 (HEVC)**;
- captura **áudio interno** (som dos apps) e **microfone**, mixados juntos — o áudio vai
  para o NDI e para o arquivo gravado (AAC).

Requer **Android 10 ou mais novo** (exigência do Android para capturar o áudio interno).

## Como instalar

1. No GitHub, abra a aba **Actions** → **Tela NDI - APK Android** → a execução mais recente.
2. Em **Artifacts**, baixe **TelaNDI-APK** (é um .zip; dentro está o `.apk`).
   - `TelaNDI-com-NDI.apk`: versão completa.
   - `TelaNDI-SEM-NDI.apk`: o download do SDK NDI falhou nessa execução; só a gravação funciona.
3. Copie o `.apk` para o celular e abra. O Android vai pedir para permitir
   "instalar apps desconhecidos" — permita para o app de arquivos/navegador.

## Como usar

1. Conecte o celular **na mesma rede Wi‑Fi** do computador que vai receber o NDI.
2. Abra o **Tela NDI**, escolha:
   - **Transmitir via NDI** e o nome da fonte (aparece assim no OBS/vMix);
   - **Gravar vídeo**, o codec (H.264 = compatível com tudo; H.265 = arquivo menor);
   - resolução, quadros por segundo e qualidade;
   - **Áudio interno** e/ou **Microfone**.
3. Toque em **Iniciar** e aceite o aviso do Android de captura de tela.
4. Para parar: botão **Parar** no app ou na notificação.
5. Os vídeos ficam na galeria, pasta **Filmes/TelaNDI**.

No computador: no OBS use a fonte **NDI Source** (plugin DistroAV), no vMix **Add Input → NDI**.

## Dicas e limitações

- **NDI pesa na rede e no processador.** Para transmissões longas use 720p/30 fps e um Wi‑Fi 5 GHz.
- **Áudio interno**: o Android só deixa capturar apps que permitem (vídeos, música, jogos).
  Chamadas, alguns apps de streaming com DRM e apps que bloqueiam captura ficam mudos.
- Se girar o celular durante a captura, o vídeo mantém o formato do início (com bordas pretas).
- O tamanho final é ajustado automaticamente ao que o codificador do seu aparelho aceita.

## Sobre o NDI

NDI® é marca registrada da Vizrt NDI AB. Este app usa a biblioteca oficial do
**NDI SDK para Android**, que não pode ficar no repositório: o build no GitHub baixa o SDK
automaticamente (`scripts/fetch-ndi-sdk.sh`), o que implica aceitar a
[licença do NDI SDK](https://ndi.video/sdk/). Para distribuir o app a terceiros, siga as
regras dessa licença.

Se o link de download mudar, cadastre o novo link em
**Settings → Secrets and variables → Actions → Variables** com o nome `NDI_SDK_URL`.

Para compilar no computador: instale o Android Studio, rode `./scripts/fetch-ndi-sdk.sh`
(ou copie `libndi.so` do SDK para `app/src/main/jniLibs/arm64-v8a/`) e depois
`./gradlew assembleRelease`.

## Como funciona (técnico)

```
MediaProjection → VirtualDisplay → SurfaceTexture (OpenGL)
                                     ├─► MediaCodec H.264/H.265 ─┐
                                     └─► ImageReader RGBA → NDI  │
AudioPlaybackCapture + Microfone → mixagem PCM 48 kHz            │
                                     ├─► MediaCodec AAC ─────────┤
                                     └─► NDI (float planar)      └─► MediaMuxer MP4
```

- `ndi/` — ponte JNI (`src/main/cpp/ndi_bridge.cpp`) que carrega `libndi.so` em tempo de execução.
- `gl/` — distribui cada quadro da tela para várias saídas.
- `media/` — codificadores, captura de áudio e arquivo MP4.
- `CaptureSession.kt` — liga tudo; `CaptureService.kt` — serviço em primeiro plano.
