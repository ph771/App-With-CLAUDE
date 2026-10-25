// Teste de equilíbrio: um robô joga várias noites completas e mede quantas vezes o Fiscal pega.
// Uso: node game/tools/equilibrio.mjs [--noites 4] [--paralelo 2] [--acelerar 8] [--perfil medio|bom] [--minuto 0]
// --minuto N começa a noite mais tarde (para testar só as últimas horas).
// Precisa do Chromium do Playwright (já instalado na nuvem).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AQUI = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)));
const NOITES = Number(args.noites ?? 4);
const PARALELO = Number(args.paralelo ?? 2);
const ACELERAR = Number(args.acelerar ?? 8);
const PERFIS = {
  // atencao: chance de encarar o Fiscal quando ele está perto; erro: chance de responder "trans".
  bom: { atencao: 0.8, erro: 0.05, pensar: [1, 2] },
  medio: { atencao: 0.5, erro: 0.15, pensar: [1.5, 3] },
  distraido: { atencao: 0.25, erro: 0.25, pensar: [2, 3.8] },
};
const perfil = args.perfil ?? 'medio';
const PORTA = 8093;
const MINUTO = Number(args.minuto ?? 0);

const servidor = spawn(process.execPath, [join(AQUI, 'serve.js')], { env: { ...process.env, PORT: String(PORTA) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const robo = await readFile(join(AQUI, 'robo.js'), 'utf8');
const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

async function jogarNoite(n) {
  const pagina = await navegador.newPage({ viewport: { width: 640, height: 400 } });
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.addInitScript(() => {
    localStorage.setItem('plantao-config', JSON.stringify({ qualidade: 'retro', volumeGeral: 0 }));
    localStorage.removeItem('plantao-noite');
  });
  await pagina.goto(`http://localhost:${PORTA}/index.html?semtrava=1&acelerar=${ACELERAR}${MINUTO ? `&minuto=${MINUTO}` : ''}`);
  await pagina.waitForFunction(() => window.__jogo, null, { timeout: 60000 });
  await pagina.evaluate(`${robo}(${JSON.stringify({ ...PERFIS[perfil], perfil, semente: 1000 + n * 7919 })})`);
  await pagina.locator('button', { hasText: 'Começar' }).first().click();
  const inicio = Date.now();
  let r = null;
  while (Date.now() - inicio < 40 * 60 * 1000) {
    await pagina.waitForTimeout(5000);
    r = await pagina.evaluate(() => ({ ...window.__robo, minuto: window.__jogo.estado().minuto }));
    if (r.fim) break;
  }
  r.segundosReais = Math.round((Date.now() - inicio) / 1000);
  r.errosPagina = erros.slice(0, 3);
  await pagina.close();
  process.stdout.write(`noite ${n + 1}: ${r.fim ?? 'não terminou (minuto ' + Math.round(r.minuto) + ')'} em ${r.segundosReais}s\n`);
  return r;
}

const resultados = [];
for (let i = 0; i < NOITES; i += PARALELO) {
  const lote = [];
  for (let k = i; k < Math.min(NOITES, i + PARALELO); k++) lote.push(jogarNoite(k));
  resultados.push(...await Promise.all(lote));
}
await navegador.close();
servidor.kill();

// Resumo.
const soma = (f) => resultados.reduce((s, r) => s + f(r), 0);
const media = (f) => (soma(f) / resultados.length).toFixed(1);
const pegosHora = [0, 1, 2, 3, 4, 5].map((h) => media((r) => r.pegos?.[h] ?? 0));
const aprovadas = [0, 1, 2, 3, 4, 5].map((h) => resultados.filter((r) => r.relatorio?.[h] === 'aprovado').length);
const onde = {};
for (const r of resultados) for (const [k, v] of Object.entries(r.ondePego ?? {})) onde[k] = (onde[k] ?? 0) + v;
const resumo = {
  perfil, noites: resultados.length,
  terminou: resultados.filter((r) => r.fim).length,
  arquivado: resultados.filter((r) => /ARQUIVADO/i.test(r.fim ?? '') || r.relatorio?.every((x) => x === 'aprovado')).length,
  pegosPorNoite: media((r) => Object.values(r.pegos ?? {}).reduce((a, b) => a + b, 0)),
  pegosPorHora: pegosHora,
  horasAprovadas: aprovadas.map((a) => `${a}/${resultados.length}`),
  perseguicoesPorNoite: media((r) => r.perseguicoes), escondidasPorNoite: media((r) => r.escondidas),
  derrotasPorNoite: media((r) => r.derrotas), votosPorNoite: media((r) => r.votos ?? 0),
  travadasPorNoite: media((r) => r.travadas), ondeMaisPega: Object.entries(onde).sort((a, b) => b[1] - a[1]).slice(0, 5),
};
console.log(JSON.stringify(resumo, null, 2));
await writeFile(args.saida ?? join(process.env.TMPDIR ?? '/tmp', `equilibrio-${perfil}.json`), JSON.stringify({ resumo, resultados }, null, 2));
