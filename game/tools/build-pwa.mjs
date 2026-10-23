// Monta a versão instalável do jogo em dist/ (para o repositório público / GitHub Pages).
// Uso: node game/tools/build-pwa.mjs  → gera dist/ com versão, lista offline e service worker.
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const JOGO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(JOGO, '..', 'dist');
const INCLUIR = ['index.html', 'manifest.webmanifest', 'sw.js', 'icones', 'vendor', 'assets', 'src'];

async function listar(dir) {
  const out = [];
  for (const nome of await readdir(dir)) {
    const p = join(dir, nome);
    if ((await stat(p)).isDirectory()) out.push(...await listar(p));
    else out.push(p);
  }
  return out;
}

const agora = new Date();
const dois = (n) => String(n).padStart(2, '0');
let hash = '';
try { hash = execSync('git rev-parse --short HEAD', { cwd: JOGO }).toString().trim(); } catch { /* sem git */ }
const VERSAO = `${agora.getFullYear()}.${dois(agora.getMonth() + 1)}.${dois(agora.getDate())}-${dois(agora.getHours())}${dois(agora.getMinutes())}${hash ? `-${hash}` : ''}`;

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (const item of INCLUIR) await cp(join(JOGO, item), join(DIST, item), { recursive: true });
await writeFile(join(DIST, 'src', 'versao.js'), `// Gerado na publicação.\nexport const VERSAO = '${VERSAO}';\n`);

const arquivos = (await listar(DIST)).map((p) => `./${relative(DIST, p).split('\\').join('/')}`)
  .filter((p) => p !== './sw.js').sort();
arquivos.unshift('./');
const sw = (await readFile(join(DIST, 'sw.js'), 'utf8'))
  .replace("'__VERSAO__'", JSON.stringify(VERSAO))
  .replace('__ARQUIVOS__', JSON.stringify(arquivos));
await writeFile(join(DIST, 'sw.js'), sw);
await writeFile(join(DIST, '.nojekyll'), ''); // GitHub Pages: servir arquivos como estão
console.log(`dist/ pronto — versão ${VERSAO}, ${arquivos.length} arquivos no modo offline`);
