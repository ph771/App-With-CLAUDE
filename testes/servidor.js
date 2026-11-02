// Servidor local simples para testar o app no computador.
// Uso: npm run servidor  →  abre em http://localhost:8080
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export function iniciarServidor(porta = 0) {
  const servidor = http.createServer(async (req, res) => {
    try {
      const caminhoUrl = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let arquivo = path.join(RAIZ, caminhoUrl);
      if (!arquivo.startsWith(RAIZ)) { res.writeHead(403); res.end(); return; }
      const info = await fs.stat(arquivo).catch(() => null);
      if (info && info.isDirectory()) arquivo = path.join(arquivo, 'index.html');
      const corpo = await fs.readFile(arquivo);
      res.writeHead(200, {
        'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(corpo);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Não encontrado');
    }
  });
  return new Promise((resolve) => {
    servidor.listen(porta, '127.0.0.1', () => {
      const { port } = servidor.address();
      resolve({
        url: `http://localhost:${port}/`,
        fechar: () => new Promise((r) => servidor.close(r)),
      });
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { url } = await iniciarServidor(Number(process.env.PORTA) || 8080);
  console.log('App rodando em ' + url);
}
