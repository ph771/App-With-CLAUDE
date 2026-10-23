// Instalação como app (PWA) e aviso de versão nova.
// Fora de um endereço próprio (por exemplo, dentro do artifact) nada disso existe e o jogo segue normal.
export function criarInstalador({ aoTerVersaoNova, aoPoderInstalar } = {}) {
  let pedidoInstalacao = null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const instalado = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedidoInstalacao = e;
    aoPoderInstalar?.();
  });

  async function registrar() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const avisar = (worker) => { if (worker && navigator.serviceWorker.controller) aoTerVersaoNova?.(() => worker.postMessage('atualizar')); };
      if (reg.waiting) avisar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const novo = reg.installing;
        novo?.addEventListener('statechange', () => { if (novo.state === 'installed') avisar(novo); });
      });
      // Procura versão nova ao abrir e a cada 30 minutos.
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
      let recarregando = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recarregando) { recarregando = true; location.reload(); } });
    } catch { /* sem service worker aqui (moldura protegida, http, etc.) */ }
  }
  registrar();

  return {
    podeInstalar: () => Boolean(pedidoInstalacao),
    async instalar() {
      if (!pedidoInstalacao) return false;
      pedidoInstalacao.prompt();
      const r = await pedidoInstalacao.userChoice.catch(() => null);
      pedidoInstalacao = null;
      return r?.outcome === 'accepted';
    },
    // No iPhone não existe botão automático: mostra a dica do "Adicionar à Tela de Início".
    dicaIOS: () => ios && !instalado,
    instalado: () => instalado,
  };
}
