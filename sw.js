// Guarda os arquivos do app no iPhone para ele abrir mesmo sem internet.
// Com internet, sempre busca a versão mais nova primeiro.
// Ao mudar a lista de arquivos, aumente o número da versão.
const CACHE = 'teleprompter-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'estilo.css',
  'js/app.js',
  'js/logica.js',
  'js/prompter.js',
  'js/gravador.js',
  'manifest.webmanifest',
  'fontes/figtree-variavel.woff2',
  'fontes/atkinson-hyperlegible-700.woff2',
  'icones/icone-180.png',
  'icones/icone-192.png',
  'icones/icone-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((c) => c.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
  );
});
