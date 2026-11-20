import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');
const chrome = '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome';
let server;
try { await fetch('http://127.0.0.1:8123/'); } catch {
  server = spawn(process.execPath, ['serve.ts', '--port', '8123'], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await fetch('http://127.0.0.1:8123/'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
}
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const definition = JSON.parse(await readFile('shots.json', 'utf8'));
  await mkdir('screenshots', { recursive: true });
  for (const scenario of definition.scenarios) {
    const tab = await browser.newPage(); await tab.setViewport(definition.viewport);
    const faults = []; tab.on('pageerror', error => faults.push(String(error)));
    await tab.goto('http://127.0.0.1:8123/' + scenario.url, { waitUntil: 'networkidle0', timeout: 120000 });
    await tab.waitForFunction(() => window.__shotReady === true || !!window.__shotError, { timeout: 180000 });
    const state = await tab.evaluate(() => ({ error: window.__shotError, frames: window.sunburn.frames, calls: window.sunburn.drawCalls, wanted: window.sunburn.wanted.state.level }));
    if (state.error || faults.length || state.frames < 2) throw Error(JSON.stringify({ scenario, state, faults }));
    await new Promise(resolve => setTimeout(resolve, 600));
    let image;
    for (let quality = 82; quality >= 30; quality -= 4) {
      image = await tab.screenshot({ type: 'jpeg', quality, captureBeyondViewport: false });
      if (image.byteLength <= 262144) break;
    }
    if (image.byteLength > 262144 || image[image.length - 2] !== 255 || image[image.length - 1] !== 217) throw Error('Invalid JPEG: ' + scenario.name);
    await writeFile('screenshots/' + scenario.file, image);
    console.log(JSON.stringify({ scenario: scenario.name, bytes: image.byteLength, ...state }));
    await tab.close();
  }
} finally { await browser.close(); server?.kill(); }
