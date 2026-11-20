import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url), puppeteer = require('puppeteer');
const server = spawn(process.execPath, ['serve.ts', '--port', '8123'], { stdio: 'ignore' });
let browser;
try {
  for (let n = 0; n < 100; n++) { try { await fetch('http://127.0.0.1:8123'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  browser = await puppeteer.launch({ headless: true, executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:8123/?shot=chase&seed=1997', { waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.__shotReady);
  const chase = await page.evaluate(() => {
    const g = window.sunburn, data = { ...window.__shotState, health: g.player.health, carHealth: g.player.vehicle.health };
    if (data.traveled < 1) throw Error('Chase vehicle did not move');
    return data;
  });
  const simulation = await page.evaluate(async () => {
    const g = window.sunburn, cityFactory = (await import('./src/world/city.js')).createCity;
    const a = cityFactory('repeatable'), b = cityFactory('repeatable'), c = cityFactory('different');
    const sameSeed = JSON.stringify(a.lots) === JSON.stringify(b.lots), changedSeed = JSON.stringify(a.lots) !== JSON.stringify(c.lots);
    g.dialogue.hide(); g.wanted.reset(); g.police.reset(); g.playerController.reset({ x: -13, z: 45, heading: 0 }); g.missions.reset(); g.missions.accept();
    g.simulate(1 / 60, g.neutral); const proximityAdvanced = g.missions.step === 1;
    g.dialogue.hide(); g.player.position.set(-13, .16, 15); g.simulate(1 / 60, g.neutral); const collected = g.missions.step === 2;
    g.dialogue.hide(); g.player.position.set(-12, .16, 78); g.simulate(1 / 60, g.neutral); const reward = g.player.cash;
    g.dialogue.hide(); g.missions.accept(); const car = g.missions.cars[0]; g.playerController.enter(car); g.simulate(1 / 60, g.neutral);
    const stole = g.missions.step === 1; car.position.set(-5, .03, 87); car.animate(0); g.simulate(1 / 60, g.neutral); const delivered = g.missions.index === 2;
    g.dialogue.hide(); g.playerController.reset({ x: -13, z: 64, heading: 0 }); g.missions.reset({ index: 4, state: 'active', step: 1 });
    g.player.position.set(174, .16, -295); g.camera.camera.position.set(174, 1.66, -294); g.camera.camera.lookAt(g.missions.enemies[0].position.x, 1.16, g.missions.enemies[0].position.z);
    const beforeAmmo = g.projectiles.ammo.current; g.projectiles.shoot(g.camera.camera, g.player); const fired = g.projectiles.ammo.current === beforeAmmo - 1;
    for (const enemy of g.missions.enemies) if (enemy.active) g.missions.hitEnemy(enemy, 100);
    g.missions.update(1 / 60); const eliminated = g.missions.step === 2;
    g.wanted.reset(); g.wanted.crime('audit', 73, g.player.position); const fourStars = g.wanted.state.level === 4;
    for (let n = 0; n < 3600; n++) g.wanted.update(1 / 60, false, g.player.position);
    const escaped = g.wanted.state.level === 0;
    return { sameSeed, changedSeed, proximityAdvanced, collected, reward, stole, delivered, fired, eliminated, fourStars, escaped };
  });
  if (Object.entries(simulation).some(([key, value]) => key !== 'reward' && value !== true) || simulation.reward !== 590) throw Error(JSON.stringify(simulation));
  await writeFile('tools/.cache/gameplay-audit.json', JSON.stringify({ chase, simulation }, null, 2)); console.log(JSON.stringify({ chase, simulation }, null, 2));
} finally { await browser?.close(); server.kill(); }
