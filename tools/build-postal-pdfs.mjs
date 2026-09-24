#!/usr/bin/env node
/* --------------------------------------------------------------------------
   Rebuilds the four printable postcards from postal/index.html, headlessly.

     node tools/build-postal-pdfs.mjs

   Why: editing any text on the postcard leaves the exported PDFs behind, and
   the page and the PDFs have to say the same thing. This drives Chromium with
   the same print path a browser uses (postal/index.html builds #print-root,
   @page supplies the sheet size), so the output matches File > Print > Save as
   PDF in Chrome. Two pages per file: front, then back.

   Needs: npm i -D puppeteer-core @sparticuz/chromium
   Output: postal/ruben-rodrigues-postal-{a6,a4}-{pt,en}.pdf
   Option: node tools/build-postal-pdfs.mjs /path/to/other/checkout
   -------------------------------------------------------------------------- */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

/* Optional first argument: another checkout to read from. */
const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));

let chromium, puppeteer;
try {
  chromium = (await import('@sparticuz/chromium')).default;
  puppeteer = (await import('puppeteer-core')).default;
} catch (err) {
  console.error('Missing dependencies. Run:  npm i -D puppeteer-core @sparticuz/chromium');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json'
};

/* A tiny static server: the postcard reads its own assets over http, and the
   print path calls fetch() on the PDF links. */
function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    port: server.address().port,
    close: () => new Promise(done => server.close(done))
  })));
}

/* @sparticuz/chromium ships the NSS/NSPR libraries Chromium needs in a tarball
   next to the binary. Unpack them once and point the loader at them. */
async function libDir(exe) {
  const candidates = [
    path.join(path.dirname(exe), 'al2023.tar.br'),
    path.join(path.dirname(fileURLToPath(import.meta.resolve('@sparticuz/chromium'))), '..', 'bin', 'al2023.tar.br')
  ];
  const tarball = candidates.find(p => fs.existsSync(p));
  if (!tarball) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-libs-'));
  const tar = zlib.brotliDecompressSync(fs.readFileSync(tarball));
  const file = path.join(dir, 'libs.tar');
  fs.writeFileSync(file, tar);
  const { execFileSync } = await import('node:child_process');
  execFileSync('tar', ['xf', file, '-C', dir]);
  return path.join(dir, 'lib');
}

const server = await serve(ROOT);
const exe = await chromium.executablePath();
const libs = await libDir(exe);
const env = { ...process.env };
if (libs) env.LD_LIBRARY_PATH = libs + (env.LD_LIBRARY_PATH ? ':' + env.LD_LIBRARY_PATH : '');

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'shell',
  env,
  args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage']
});

let failed = false;
for (const fmt of ['a6', 'a4']) {
  for (const lang of ['pt', 'en']) {
    const out = path.join(ROOT, 'postal', `ruben-rodrigues-postal-${fmt}-${lang}.pdf`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:${server.port}/postal/index.html?lang=${lang}&fmt=${fmt}&theme=dark`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      /* printBtn runs buildPrint(); stub window.print so the run stays headless. */
      await page.evaluate(() => { window.print = function(){}; });
      await page.click('#printBtn');
      await page.waitForFunction(() => document.querySelectorAll('#print-root .sheet').length === 2);
      await page.evaluate(async () => {
        const imgs = Array.from(document.querySelectorAll('#print-root img'));
        await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
      });
      await new Promise(r => setTimeout(r, 300));   /* let fonts/layout settle */
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      fs.writeFileSync(out, pdf);
      console.log(`${path.basename(out)}  ${(pdf.length / 1024).toFixed(0)} kB`);
      await page.close();
    } catch (err) {
      failed = true;
      console.error(`${path.basename(out)}  FAILED: ${err.message}`);
    }
  }
}

await browser.close();
await server.close();
if (failed) process.exit(1);
console.log('four postcards rebuilt');
