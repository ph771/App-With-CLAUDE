// Servidor estático simples para jogar localmente: npm start → http://localhost:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORT) || 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = normalize(join(RAIZ, caminho === '/' ? 'index.html' : caminho));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    const conteudo = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
}).listen(PORTA, () => console.log(`Plantão no Banheiro em http://localhost:${PORTA}`));
