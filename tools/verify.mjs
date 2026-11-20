import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url), puppeteer = require('puppeteer');
async function walk(root) {
  const results = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = root + '/' + item.name;
    results.push({ path, directory: item.isDirectory(), size: item.isFile() ? (await stat(path)).size : 0 });
    if (item.isDirectory()) results.push(...await walk(path));
  }
  return results;
}
const tree = await walk('game'), output = await walk('out');
const total = tree.reduce((sum, item) => sum + item.size, 0);
if (tree.length > 993 || total > 50331648 || output.some(item => item.path.split('/').some(segment => segment.startsWith('.')))) throw Error('Tree cap or dotfile');
if ((await stat('game/index.html')).size > 1048576 || (await stat('out/dossier.json')).size > 1572864) throw Error('HTML/dossier cap');
let syntaxFiles = 0;
for (const item of tree) if (item.path.endsWith('.js')) {
  const result = spawnSync(process.execPath, ['--experimental-default-type=module', '--check', item.path], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr); syntaxFiles++;
}
const browser = await puppeteer.launch({ executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome', headless: true, args: ['--no-sandbox'] });
const screenshots = [];
try {
  const tab = await browser.newPage();
  const names = (await readdir('screenshots')).sort(); if (names.length < 3 || names.length > 4) throw Error('Image count');
  for (const name of names) {
    const bytes = await readFile('screenshots/' + name), eoi = bytes.subarray(-2).toString('hex');
    if (eoi !== 'ffd9' || bytes.length > 262144) throw Error('JPEG bytes');
    const decoded = await tab.evaluate(async base64 => {
      const image = new Image(); image.src = 'data:image/jpeg;base64,' + base64; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 36; const pen = canvas.getContext('2d'); pen.drawImage(image, 0, 0, 64, 36);
      const data = pen.getImageData(0, 0, 64, 36).data; let sum = 0, squares = 0;
      for (let n = 0; n < data.length; n += 4) { const value = (data[n] + data[n + 1] + data[n + 2]) / 3; sum += value; squares += value * value; }
      const count = data.length / 4; return { width: image.naturalWidth, height: image.naturalHeight, variance: squares / count - (sum / count) ** 2 };
    }, bytes.toString('base64'));
    if (decoded.width !== 1280 || decoded.height !== 720 || decoded.variance < 100) throw Error('Blank or wrong dimensions');
    screenshots.push({ name, bytes: bytes.length, eoi, ...decoded });
  }
} finally { await browser.close(); }
const vendor = [];
for (const item of [...tree.filter(item => item.path.startsWith('game/vendor/') && !item.directory), { path: 'vendor/makefun-game.ts' }]) {
  const bytes = await readFile(item.path);
  // The upstream core is larger than spawnSync's default 1 MiB output buffer.
  const original = spawnSync('git', ['show', 'HEAD:' + item.path], { encoding: null, maxBuffer: 16 * 1024 * 1024 });
  if (original.status !== 0 || !bytes.equals(original.stdout)) throw Error('Vendor mismatch: ' + item.path + ' / ' + original.error);
  vendor.push({ path: item.path, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const authored = [], referenceRoot = '/root/projects/bounty/makefun/gta6-01/backup-src/', referenceLines = new Set();
const sourcePaths = tree.filter(item => !item.directory && !item.path.startsWith('game/vendor/')).map(item => item.path);
for (const name of [...sourcePaths, 'main.ts', 'README.md']) {
  try { for (const line of (await readFile(referenceRoot + name, 'utf8')).split('\n')) referenceLines.add(line.trim()); } catch {}
}
let lineCount = 0, different = 0;
for (const name of [...sourcePaths, 'main.ts', 'README.md', '.gitignore', 'shots.json', 'tools/capture.mjs', 'tools/probe.mjs', 'tools/verify.mjs', 'tools/audit-gameplay.mjs']) {
  const lines = (await readFile(name, 'utf8')).split('\n').filter(line => line.trim()), original = lines.filter(line => !referenceLines.has(line.trim())).length;
  lineCount += lines.length; different += original; authored.push({ path: name, nonempty: lines.length, different: original });
}
const report = { syntaxFiles, gameEntries: tree.length, gameBytes: total, indexBytes: (await stat('game/index.html')).size, dossierBytes: (await stat('out/dossier.json')).size, noDotfiles: true, screenshots, unchangedVendor: vendor,
  sourceComparison: { different, nonempty: lineCount, percentage: +(100 * different / lineCount).toFixed(2), note: 'Local exact-line comparison only; sealed-session authorship is evaluated by the submission server.' }, authored };
await writeFile('tools/.cache/verification.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
