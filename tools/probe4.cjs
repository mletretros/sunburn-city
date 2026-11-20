const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome', headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 768, height: 480, deviceScaleFactor: 1 });
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:8123/') && !request.url().startsWith('data:')) network.push(request.url()); });
  try {
    await page.goto('http://127.0.0.1:8123/', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.sunburn?.frames > 2);
    await page.click('#new');
    await page.waitForFunction(() => !document.querySelector('#dialogue-root').hidden);
    assert.equal(await page.$eval('#dialogue-name', el => el.textContent), 'Duke');
    await page.waitForFunction(() => document.querySelector('#dialogue-text').textContent.length > 10);
    const firstBrief = await page.$eval('#dialogue-label', el => el.textContent);
    await page.click('#dialogue-skip');
    await page.waitForFunction(() => window.sunburn.missions.state === 'active' && document.querySelector('#objective').textContent.includes('boardwalk'));
    const active = await page.evaluate(() => ({ banner: document.querySelector('#objective').textContent,
      marker: sunburn.missions.marker.visible, columnHeight: sunburn.missions.marker.children[1].geometry.parameters.height,
      minimap: sunburn.map.markers.mission.marker, cash: sunburn.player.cash, index: sunburn.missions.index }));
    assert.equal(active.marker, true); assert.equal(active.columnHeight, 24); assert.ok(active.minimap);
    const layout = await page.evaluate(async () => {
      const { Vector3 } = await import('three');
      const camera = sunburn.camera.camera, p = sunburn.missions.marker.position;
      const projected = new Vector3(p.x, p.y + 2, p.z).project(camera);
      const bounds = id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
      const canvas = document.getElementById('minimap'), context = canvas.getContext('2d');
      const dx = p.x - sunburn.player.position.x, dz = p.z - sunburn.player.position.z;
      const blip = context.getImageData(Math.round(128 + dx * 128 / 74), Math.round(128 + dz * 128 / 74), 1, 1).data;
      return { objective: bounds('objective-panel'), vitals: document.querySelector('.vitals').getBoundingClientRect().x, map: bounds('minimap'),
        minimapBlipPixel: Array.from(blip), markerInView: Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && projected.z < 1 };
    });
    assert.ok(layout.objective.right < layout.vitals); assert.ok(layout.objective.bottom < 150); assert.ok(layout.markerInView);
    assert.deepEqual(layout.minimapBlipPixel, [255, 209, 140, 255]);
    await page.screenshot({ path: 'tools/.cache/probe.png' });
    // Advance the actual sequential runtime API; the fixed-step loop updates all presentation.
    assert.equal(await page.evaluate(() => sunburn.missions.completeObjective('meet')), true);
    await page.click('#dialogue-skip');
    await page.waitForFunction(() => document.querySelector('#objective').textContent.includes('salt-stained'));
    const secondStep = await page.$eval('#objective', el => el.textContent);
    // Walking into the pickup volume also exercises natural objective progression.
    await page.evaluate(() => { sunburn.player.position.set(-13, .14, 15); sunburn.player.velocity.set(0, 0, 0); });
    await page.waitForFunction(() => sunburn.missions.step === 2);
    assert.equal(await page.evaluate(() => sunburn.missions.completeObjective('office')), true);
    const reward = await page.evaluate(() => ({ cash: sunburn.player.cash, rep: sunburn.player.reputation, index: sunburn.missions.index, completed: [...sunburn.missions.completed] }));
    assert.equal(reward.cash, active.cash + 350); assert.equal(reward.rep, 10); assert.equal(reward.index, 1);
    await page.click('#dialogue-skip'); await page.click('#dialogue-skip');
    await page.waitForFunction(() => sunburn.missions.state === 'active' && sunburn.missions.index === 1);
    await page.keyboard.press('KeyP'); await page.waitForFunction(() => sunburn.mode === 'pause');
    await page.click('#jobs'); assert.match(await page.$eval('#story-progress', el => el.textContent), /1 \/ 8/);
    await page.click('#save');
    const slot = await page.evaluate(() => JSON.parse(localStorage.getItem('sunburn-city.slot.v1')));
    assert.equal(slot.version, 2); assert.equal(slot.mission, 1); assert.equal(slot.cash, reward.cash);
    await page.reload({ waitUntil: 'networkidle0' }); await page.waitForFunction(() => window.sunburn?.frames > 2);
    await page.click('#continue');
    await page.waitForFunction(() => sunburn.mode === 'play' && sunburn.missions.state === 'active');
    const restored = await page.evaluate(() => ({ index: sunburn.missions.index, cash: sunburn.player.cash, reputation: sunburn.player.reputation, step: sunburn.missions.step }));
    assert.equal(restored.index, 1); assert.equal(restored.cash, reward.cash); assert.equal(restored.reputation, 10);
    // The specific car must be entered; merely standing near it never counts.
    await page.evaluate(() => { sunburn.player.position.set(-3.6, 0, -29); sunburn.player.velocity.set(0, 0, 0); });
    await page.keyboard.press('KeyE'); await page.waitForFunction(() => sunburn.player.vehicle?.spec.name === 'Sirocco RS');
    await page.waitForFunction(() => sunburn.missions.step === 1);
    const theft = await page.evaluate(() => ({ step: sunburn.missions.step, timer: sunburn.missions.getHUDInfo().timer, car: sunburn.player.vehicle.spec.name }));
    await page.click('#dialogue-skip');
    // Destroyed mission car, retry, timeout and stealth failures use runtime checks.
    await page.evaluate(() => { sunburn.missions.cars[0].health = 0; });
    await page.waitForFunction(() => sunburn.missions.state === 'failed');
    const destroyed = await page.evaluate(() => sunburn.missions.getHUDInfo().objective);
    const additional = await page.evaluate(async () => {
      const { MISSIONS } = await import('./src/systems/story.js');
      const results = [];
      const dismiss = () => { for (let i = 0; i < 3 && sunburn.dialogue.active; i++) sunburn.dialogue.skip(); };
      // Reset via New Game before focused runtime cases to exit any destroyed car.
      sunburn.start(); dismiss();
      sunburn.missions.load({ index: 1, state: 'active', step: 1, remaining: .001 }); sunburn.missions.update(.02);
      results.push(['timeout', sunburn.missions.state]);
      sunburn.missions.load({ index: 2, state: 'active', step: 0 });
      sunburn.wanted.crime('probe', 50, sunburn.player.position); sunburn.missions.update(.02);
      results.push(['stealth', sunburn.missions.state]); sunburn.wanted.reset();
      sunburn.missions.load({ index: 4, state: 'active', step: 1 });
      for (const enemy of sunburn.missions.enemies) if (enemy.active) sunburn.missions.hitEnemy(enemy, 100);
      sunburn.missions.update(.02); results.push(['combat-step', sunburn.missions.step]);
      sunburn.missions.load({ index: 6, state: 'active', step: 1, survived: 29.99 });
      sunburn.player.position.set(232, 0, -116); sunburn.missions.update(.02); results.push(['survive-step', sunburn.missions.step]); dismiss();
      const targetChecks = [];
      for (const job of MISSIONS) for (const objective of job.objectives) {
        const { x, z } = objective.target;
        if (sunburn.city.blocked(x, 0, z, .4)) targetChecks.push(`${job.name}/${objective.id}`);
      }
      sunburn.missions.load({ index: 1, state: 'active', step: 0 });
      sunburn.player.cash = 590; sunburn.player.reputation = 10; sunburn.player.position.set(-9.1, .14, 64);
      return { results, targetChecks };
    });
    assert.deepEqual(additional.results, [['timeout', 'failed'], ['stealth', 'failed'], ['combat-step', 2], ['survive-step', 2]]);
    assert.deepEqual(additional.targetChecks, []);
    const fullChain = await page.evaluate(async () => {
      const { MISSIONS } = await import('./src/systems/story.js');
      const { readSlot, SLOT } = await import('./src/systems/save.js');
      const dismiss = () => { for (let i = 0; i < 4 && sunburn.dialogue.active; i++) sunburn.dialogue.skip(); };
      sunburn.start(); dismiss();
      const results = [];
      for (let index = 0; index < MISSIONS.length; index++) {
        const job = MISSIONS[index];
        for (let step = 0; step < job.objectives.length; step++) {
          const objective = job.objectives[step]; dismiss(); sunburn.wanted.reset(); sunburn.player.health = 100;
          if (sunburn.player.vehicle) {
            sunburn.player.vehicle.exit(); sunburn.player.vehicle = null; sunburn.player.onFoot = true; sunburn.player.inVehicle = false;
          }
          sunburn.player.position.set(objective.target.x, 0, objective.target.z); sunburn.player.velocity.set(0, 0, 0);
          if (objective.verb === 'steal' || objective.verb === 'deliver') {
            const car = sunburn.missions.cars[job.objectives[0].vehicle === 5 ? 0 : 1];
            car.place(objective.target.x, 0, objective.target.z, 0); car.driver = sunburn.player;
            sunburn.player.vehicle = car; sunburn.player.onFoot = false; sunburn.player.inVehicle = true;
          }
          if (objective.verb === 'eliminate') {
            // Fire the normal projectile ray at a real mission actor.
            const enemy = sunburn.missions.enemies[0], camera = sunburn.camera.camera;
            camera.position.set(enemy.position.x, 1.45, enemy.position.z + 6);
            camera.lookAt(enemy.position.x, 1.25, enemy.position.z); camera.updateMatrixWorld(true);
            sunburn.player.position.set(enemy.position.x, 0, enemy.position.z + 5); sunburn.player.heading = 0;
            sunburn.projectiles.ammo.current = 12;
            for (let shot = 0; shot < 3; shot++) { sunburn.projectiles.update(.26, sunburn.player); sunburn.projectiles.shoot(camera, sunburn.player); }
            if (enemy.health > 0) throw new Error(`Projectile missed mission target: ${enemy.health}`);
            sunburn.wanted.reset();
          }
          if (objective.verb === 'survive') {
            for (let tick = 0; tick < 1801 && sunburn.missions.index === index && sunburn.missions.step === step; tick++) sunburn.missions.update(1 / 60);
          } else sunburn.missions.update(1 / 60);
          if (sunburn.missions.index === index && sunburn.missions.step === step) throw new Error(`Stuck: ${job.name}/${objective.id}`);
        }
        results.push({ name: job.name, index: sunburn.missions.index, cash: sunburn.player.cash, rep: sunburn.player.reputation }); dismiss();
      }
      const cash = sunburn.player.cash;
      if (sunburn.missions.completeObjective() || sunburn.player.cash !== cash) throw new Error('Duplicate reward');
      const original = localStorage.getItem(SLOT);
      localStorage.setItem(SLOT, JSON.stringify({ version: 1, seed: sunburn.seed, x: -9.1, z: 64, heading: 0, mission: 1, cash: 590, health: 100, armour: 0, seconds: 20, district: 'palma' }));
      const legacy = readSlot(); localStorage.setItem(SLOT, '{bad'); const malformed = readSlot(); localStorage.setItem(SLOT, original);
      if (legacy.mission !== 1 || legacy.reputation !== 10 || malformed !== null) throw new Error('Migration failed');
      sunburn.start(); dismiss(); sunburn.player.cash = 590; sunburn.player.reputation = 10; sunburn.player.health = 0;
      return { results, legacy: { index: legacy.mission, reputation: legacy.reputation }, malformed };
    });
    await page.waitForFunction(() => sunburn.player.health === 100 && sunburn.player.cash === 530, { timeout: 60000 });
    const respawn = await page.evaluate(() => ({ cash: sunburn.player.cash, reputation: sunburn.player.reputation, wanted: sunburn.wanted.state.level, state: sunburn.missions.state }));
    assert.equal(respawn.reputation, 10); assert.equal(respawn.wanted, 0); assert.equal(respawn.state, 'failed');
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    const evidence = { firstBrief, active, layout, secondStep, reward, restored, theft, destroyed, additional, fullChain, respawn,
      probe: { path: 'tools/.cache/probe.png', bytes: fs.statSync('tools/.cache/probe.png').size, width: 768, height: 480 }, errors, externalRequests: network };
    fs.writeFileSync('tools/.cache/probe4.json', JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  } catch (error) {
    console.error({ errors, state: await page.evaluate(() => ({ mode: window.sunburn?.mode, state: window.sunburn?.missions.state, cash: window.sunburn?.player.cash, health: window.sunburn?.player.health, objective: document.querySelector('#objective')?.textContent, dialogue: document.querySelector('#dialogue-root')?.hidden })) });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
