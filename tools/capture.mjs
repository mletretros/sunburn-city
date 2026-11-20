import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
const { launch } = createRequire(import.meta.url)('puppeteer');
const root = new URL('../', import.meta.url), base = 'http://127.0.0.1:8123', timeout = 180000;
const viewport = { width: 1280, height: 720, deviceScaleFactor: 1 }, cap = 262144;
const shots = JSON.parse(await readFile(new URL('shots.json', root), 'utf8'));
assert.deepEqual(shots.map(shot => shot.name), ['1-cover.jpg', '2-foot.jpg', '3-chase.jpg', '4-brief.jpg']);
async function serverReady() {
  try { return (await fetch(base, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
}
async function capture(browser, shot) {
  const page = await browser.newPage(), failures = [];
  try {
    await page.setViewport(viewport);
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith(`${base}/`) || request.url().startsWith('data:')) void request.continue();
      else { failures.push(`External request: ${request.url()}`); void request.abort(); }
    });
    await page.goto(`${base}/${shot.query}`, { waitUntil: 'networkidle0', timeout });
    await page.waitForFunction(() => window.__shotReady === true || window.__shotError, { timeout });
    const state = await page.evaluate(async () => {
      await document.fonts.ready;
      if (window.__shotError) throw new Error(window.__shotError);
      const game = window.sunburn, prompt = document.getElementById('interact');
      return { ...window.__shotState, frames: game.frames, triangles: game.triangles, car: game.player.vehicle?.spec.name, skid: game.player.vehicle?.skid,
        walkers: game.pedestrians.walkers.filter(person => person.active).length,
        cruisers: game.police.cruisers.filter(unit => unit.active && unit.car.active).length,
        prompt: prompt.hidden ? '' : prompt.textContent, dialogue: game.dialogue.active, objective: game.missions.getHUDInfo().objective };
    });
    await delay(1200); assert.deepEqual(failures, [], shot.name);
    assert.ok(state.frozen && state.frames >= 2 && state.triangles > 1000 && state.markerVisible && state.walkers);
    if (shot.scenario === 'cover') { assert.equal(state.car, 'Sirocco RS'); assert.equal(state.wanted, 1); assert.equal(state.objectiveStep, 1); }
    if (shot.scenario === 'foot') assert.match(state.prompt, /Enter/);
    if (shot.scenario === 'chase') { assert.equal(state.wanted, 4); assert.ok(state.cruisers >= 2 && state.police >= 2 && state.skid > .23); }
    if (shot.scenario === 'brief') { assert.ok(state.dialogue); assert.match(state.objective, /envelope/i); }
    for (let quality = 82; quality >= 2; quality -= 4) {
      const jpeg = Buffer.from(await page.screenshot({ type: 'jpeg', quality, captureBeyondViewport: false }));
      if (jpeg.length > cap) continue;
      assert.equal(jpeg.readUInt16BE(0), 0xffd8); assert.equal(jpeg.readUInt16BE(jpeg.length - 2), 0xffd9);
      const decoded = await page.evaluate(async encoded => {
        const image = new Image(); image.src = `data:image/jpeg;base64,${encoded}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 18;
        const pen = canvas.getContext('2d'); pen.drawImage(image, 0, 0, 32, 18);
        const pixels = pen.getImageData(0, 0, 32, 18).data; let low = 255, high = 0;
        for (let i = 0; i < pixels.length; i += 4) { const value = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; low = Math.min(low, value); high = Math.max(high, value); }
        return { width: image.naturalWidth, height: image.naturalHeight, contrast: high - low };
      }, jpeg.toString('base64'));
      assert.equal(decoded.width, 1280); assert.equal(decoded.height, 720); assert.ok(decoded.contrast > 35, `${shot.name} is blank`);
      return { jpeg, quality, state, decoded };
    }
    throw new Error(`Cannot fit ${shot.name} within ${cap} bytes`);
  } finally { await page.close(); }
}
let server, browser;
try {
  if (!(await serverReady())) {
    server = spawn(process.execPath, ['serve.ts', '--port', '8123'], { cwd: root, stdio: 'inherit' });
    for (let attempt = 0; attempt < 100 && !(await serverReady()); attempt++) await delay(100);
  }
  assert.ok(await serverReady(), 'Server did not become ready');
  browser = await launch({ headless: true, executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  await mkdir(new URL('screenshots/', root), { recursive: true });
  const results = [];
  for (const shot of shots) {
    const { jpeg, quality, state, decoded } = await capture(browser, shot);
    await writeFile(new URL(`screenshots/${shot.name}`, root), jpeg);
    const result = { name: shot.name, bytes: jpeg.length, quality, state, decoded }; results.push(result); console.log(JSON.stringify(result));
  }
  await mkdir(new URL('tools/.cache/', root), { recursive: true });
  await writeFile(new URL('tools/.cache/captures.json', root), JSON.stringify(results, null, 2));
} finally { await browser?.close(); server?.kill(); }
