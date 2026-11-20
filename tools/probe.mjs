import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url), puppeteer = require('puppeteer');
const server = spawn(process.execPath, ['serve.ts', '--port', '8123'], { stdio: 'ignore' });
let browser;
try {
  for (let n = 0; n < 100; n++) { try { await fetch('http://127.0.0.1:8123'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  browser = await puppeteer.launch({ executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], headless: true });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [], remote = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:8123') && !request.url().startsWith('data:')) remote.push(request.url()); });
  await page.goto('http://127.0.0.1:8123/?seed=1997', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !!window.sunburn); await page.click('#new-game');
  await page.waitForFunction(() => window.sunburn.dialogue.active);
  const brief = await page.$eval('#dialogue-name', node => node.textContent);
  if (brief !== 'Duke') throw Error('New Game did not open Duke');
  await page.click('#dialogue-skip');
  await page.waitForFunction(() => window.sunburn.missions.state === 'active' && document.querySelector('#objective').textContent.includes('boardwalk'));
  const objective = await page.evaluate(() => ({ banner: document.querySelector('#objective').textContent, marker: window.sunburn.missions.marker.visible, blip: !!window.sunburn.map.markers.mission.marker }));
  if (!objective.marker || !objective.blip) throw Error('Missing objective ' + JSON.stringify(objective));
  const reward = await page.evaluate(() => {
    const g = window.sunburn, before = g.player.cash;
    for (let n = 0; n < 3; n++) { const part = g.missions.active.objectives[g.missions.step]; if (!g.missions.completeObjective(part.id)) throw Error('Current objective rejected'); g.dialogue.hide(); }
    return { before, after: g.player.cash, index: g.missions.index, reputation: g.player.reputation };
  });
  if (reward.after - reward.before !== 350 || reward.index !== 1 || reward.reputation !== 10) throw Error('Reward ' + JSON.stringify(reward));
  await page.evaluate(() => { window.sunburn.missions.offer(); window.sunburn.dialogue.skip(); });
  const saved = await page.evaluate(() => { const g = window.sunburn; g.save(); return { index: g.missions.index, cash: g.player.cash, step: g.missions.step, state: g.missions.state }; });
  await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => !!window.sunburn); await page.click('#continue-game');
  const restored = await page.evaluate(() => { const g = window.sunburn; return { index: g.missions.index, cash: g.player.cash, step: g.missions.step, state: g.missions.state }; });
  if (JSON.stringify(saved) !== JSON.stringify(restored)) throw Error('Save mismatch ' + JSON.stringify({ saved, restored }));
  const death = await page.evaluate(() => {
    const g = window.sunburn; g.dialogue.hide(); const before = g.player.cash; g.player.health = 0; g.wanted.crime('probe', 65, g.player.position);
    for (let n = 0; n < 160; n++) g.simulate(1 / 60, g.neutral);
    return { health: g.player.health, cash: g.player.cash, before, wanted: g.wanted.state.level, x: g.player.position.x, z: g.player.position.z };
  });
  if (death.health !== 100 || death.before - death.cash !== 60 || death.wanted !== 0) throw Error('Respawn ' + JSON.stringify(death));
  const chain = await page.evaluate(() => {
    const g = window.sunburn, report = []; g.missions.reset(); g.player.cash = 240; g.player.reputation = 0;
    for (let n = 0; n < 8; n++) {
      g.missions.offer(); g.dialogue.skip(); const job = g.missions.active, before = g.player.cash;
      if (g.missions.state !== 'active') throw Error('Chain locked at ' + n);
      for (const target of job.objectives) { g.dialogue.hide(); if (!g.missions.completeObjective(target.id)) throw Error('Cannot finish ' + target.id); }
      g.dialogue.hide(); report.push({ name: job.name, reward: g.player.cash - before, index: g.missions.index });
    }
    return report;
  });
  const physical = await page.evaluate(() => {
    const g = window.sunburn, c = g.playerController, car = g.traffic.starter;
    for (const vehicle of g.physics.vehicles) if (vehicle !== car) { vehicle.active = false; vehicle.animate(0); }
    c.reset({ x: -7.4, z: 64, heading: 0 }); car.active = true; car.place(-5, .03, 64, 0); c.enter(car);
    const start = car.position.z, drive = { throttle: true, brake: false, steer: 0, handbrake: false }, move = { x: 0, z: 0 };
    const controls = { active: () => false, pressed: () => false, movement: () => move, driving: () => drive };
    for (let n = 0; n < 60; n++) c.update(1 / 60, controls, 0, null);
    const moved = Math.abs(car.position.z - start); car.speed = 0; const exited = c.exit(), y = g.player.position.y; let first = true;
    const jump = { active: () => false, pressed: action => { if (action === 'jump' && first) { first = false; return true; } return false; }, movement: () => move };
    c.update(1 / 60, jump, 0, null);
    const wall = g.city.colliders[0];
    return { moved, exited, jumped: g.player.position.y > y, blocked: g.physics.circleBlocked((wall.minX + wall.maxX) / 2, 0, (wall.minZ + wall.maxZ) / 2, .4) };
  });
  if (physical.moved < 1 || !physical.exited || !physical.jumped || !physical.blocked) throw Error('Physical ' + JSON.stringify(physical));
  await mkdir('tools/.cache', { recursive: true }); await page.screenshot({ path: 'tools/.cache/probe.png' });
  const scenarios768 = [];
  for (const name of ['cover', 'foot', 'chase', 'brief']) {
    await page.setViewport({ width: 768, height: 480, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:8123/?shot=' + name + '&seed=1997', { waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.__shotReady === true);
    scenarios768.push(await page.evaluate(name => {
      const g = window.sunburn, card = document.querySelector('#mission-card').getBoundingClientRect();
      const gl = document.querySelector('#view').getContext('webgl2'), pixel = new Uint8Array(4), samples = new Set();
      for (let y = 40; y < 400; y += 40) for (let x = 40; x < 700; x += 40) { gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); samples.add(pixel[0] + ',' + pixel[1] + ',' + pixel[2]); }
      return { name, frames: g.frames, wanted: g.wanted.state.level, objective: g.missions.getHUDInfo().objective, marker: g.missions.marker.visible,
        cruisers: g.police.cruisers.filter(car => car.active).length, prompt: document.querySelector('#interact').textContent, promptVisible: !document.querySelector('#interact').hidden,
        dialogue: g.dialogue.active, objectiveFits: card.right <= innerWidth && card.bottom <= innerHeight, distinctWorldSamples: samples.size };
    }, name));
  }
  if (scenarios768[0].wanted !== 1 || scenarios768[2].wanted !== 4 || scenarios768[2].cruisers < 2 || !scenarios768[1].promptVisible || !scenarios768[3].dialogue || scenarios768.some(result => !result.objectiveFits || result.distinctWorldSamples < 20)) throw Error('Scenarios ' + JSON.stringify(scenarios768));
  if (errors.length || remote.length) throw Error(JSON.stringify({ errors, remote }));
  const result = { brief, objective, reward, saved, restored, death, chain, physical, scenarios768, errors, externalRequests: remote };
  await writeFile('tools/.cache/probe.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} finally { await browser?.close(); server.kill(); }
