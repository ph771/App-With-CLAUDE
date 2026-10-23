// Service worker: guarda o jogo para jogar sem internet e troca de versão quando o jogador aceita.
// VERSAO e ARQUIVOS são preenchidos pelo tools/build-pwa.mjs a cada publicação.
const VERSAO = '__VERSAO__';
const ARQUIVOS = __ARQUIVOS__;
const CACHE = `plantao-${VERSAO}`;
const EXTERNO = 'plantao-externo'; // fontes do Google

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE && n !== EXTERNO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// O jogo pede para trocar de versão quando o jogador clica em "Atualizar".
self.addEventListener('message', (e) => { if (e.data === 'atualizar') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Arquivos do jogo: do cache primeiro (funciona offline).
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Fontes: usa a guardada e atualiza em segundo plano.
    e.respondWith(caches.open(EXTERNO).then(async (c) => {
      const guardada = await c.match(req);
      const rede = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => guardada);
      return guardada || rede;
    }));
  }
});
