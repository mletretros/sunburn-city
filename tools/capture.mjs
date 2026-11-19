import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const root = fileURLToPath(new URL('../', import.meta.url));
const shots = JSON.parse(await readFile(new URL('../shots.json', import.meta.url), 'utf8'));
const base = 'http://127.0.0.1:8123';
let server;
try { await fetch(base); } catch {
  server = spawn(process.execPath, ['serve.ts', '--port', '8123'], { cwd: root, stdio: 'ignore' });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
await mkdir(new URL('../screenshots/', import.meta.url), { recursive: true });
await mkdir(new URL('./.cache/', import.meta.url), { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome', headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const results = [];
try {
  for (const shot of shots) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith(`${base}/`) || request.url().startsWith('data:')) request.continue();
      else { external.push(request.url()); request.abort(); }
    });
    await page.goto(base + '/' + shot.query, { waitUntil: 'networkidle0', timeout: 180000 });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 180000 });
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.deepEqual(errors, [], `${shot.name}: browser errors`);
    assert.deepEqual(external, [], `${shot.name}: external requests`);
    const state = await page.evaluate(() => ({ ...window.__shotState, mode: sunburn.mode,
      vehicle: sunburn.player.vehicle?.spec.name ?? null, wanted: sunburn.wanted.state.level,
      mission: sunburn.missions.getHUDInfo().objective, police: sunburn.police.blips.length,
      pedestrians: sunburn.pedestrians.walkers.filter(p => p.active).length, skid: sunburn.player.vehicle?.skid ?? 0, triangles: sunburn.triangles }));
    assert.equal(state.mode, 'play'); assert.ok(state.triangles > 1000);
    if (state.name === 'chase') assert.ok(state.skid > .23, 'Chase must generate smoke and skid marks through driving physics');
    let bytes, quality = 82;
    do {
      bytes = await page.screenshot({ type: 'jpeg', quality, fullPage: false, captureBeyondViewport: false });
      if (bytes.length <= 262144) break;
      quality -= 4;
    } while (quality >= 26);
    assert.ok(bytes.length <= 262144, `${shot.name}: exceeds 256 KiB`);
    assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
    assert.equal(bytes[bytes.length - 2], 0xff); assert.equal(bytes[bytes.length - 1], 0xd9);
    const dimensions = await page.evaluate(async base64 => {
      const image = new Image(); image.src = `data:image/jpeg;base64,${base64}`;
      await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight };
    }, Buffer.from(bytes).toString('base64'));
    assert.deepEqual(dimensions, { width: 1280, height: 720 });
    await writeFile(new URL(`../screenshots/${shot.name}`, import.meta.url), bytes);
    results.push({ name: shot.name, bytes: bytes.length, ...dimensions, quality, eoi: true, state });
    console.log(JSON.stringify(results.at(-1)));
    await page.close();
  }
  for (const old of ['1-start.jpg', '2-play.jpg', '3-end.jpg']) await rm(new URL(`../screenshots/${old}`, import.meta.url), { force: true });
  await writeFile(new URL('./.cache/captures.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally { await browser.close(); server?.kill(); }
