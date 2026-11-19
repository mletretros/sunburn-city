const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/root/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome', headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  try {
    for (const name of ['cover', 'foot', 'chase', 'brief']) {
      const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:8123/?shot=${name}&seed=97`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => window.__shotReady, { timeout: 180000 });
      const result = await page.evaluate(async () => {
        const THREE = await import('three'); const g = window.sunburn, camera = g.camera.camera;
        function project(position, height = 1) {
          const q = new THREE.Vector3(position.x, position.y + height, position.z).project(camera);
          const delta = new THREE.Vector3(position.x, position.y + height, position.z).sub(camera.position);
          let occluded = false;
          for (const box of g.city.colliders) {
            let lo = 0, hi = 1;
            for (const axis of ['x','y','z']) {
              const cap = axis.toUpperCase(), start = camera.position[axis], d = delta[axis];
              if (Math.abs(d) < 1e-8) { if (start < box['min'+cap] || start > box['max'+cap]) { hi = -1; break; } }
              else { const a = (box['min'+cap]-start)/d, b = (box['max'+cap]-start)/d; lo = Math.max(lo, Math.min(a,b)); hi = Math.min(hi, Math.max(a,b)); }
            }
            if (hi > lo && lo < .995 && hi > 0) occluded = true;
          }
          return { x: Math.round((q.x+1)*640), y: Math.round((1-q.y)*360), visible: Math.abs(q.x)<.97 && Math.abs(q.y)<.95 && q.z<1 && q.z>0 && !occluded, occluded };
        }
        const text = id => document.getElementById(id).textContent;
        const rect = id => { const r = document.getElementById(id).getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom }; };
        const peds = g.pedestrians.walkers.filter(p=>p.active).map(p=>project(p.position));
        const traffic = g.traffic.fleet.filter(c=>c.active && c!==g.player.vehicle && !c.police).map(c=>project(c.position,.8));
        const cops = g.police.cruisers.filter(u=>u.active).map(u=>project(u.car.position,1.5));
        return { name:g.shot, car: g.player.vehicle ? project(g.player.vehicle.position,.7) : null, player:project(g.player.position),
          visiblePedestrians:peds.filter(p=>p.visible), visibleTraffic:traffic.filter(p=>p.visible), visiblePolice:cops.filter(p=>p.visible),
          prompt:document.getElementById('interact').hidden ? null : text('interact'), objective:text('objective'),
          dialogue:g.dialogue.active ? text('dialogue-name')+': '+text('dialogue-text') : null,
          marker:project(g.missions.marker.position,6), objectiveBox:rect('objective-panel'), vitalsBox:document.querySelector('.vitals').getBoundingClientRect().x,
          camera:camera.position.toArray(), position:g.player.position.toArray(), wanted:g.wanted.state.level };
      });
      console.log(JSON.stringify(result));
      assert.ok(result.objectiveBox.right < result.vitalsBox);
      if (name === 'cover') { assert.ok(result.car.visible); assert.ok(result.visibleTraffic.length >= 2); assert.ok(result.visiblePedestrians.length >= 2); }
      if (name === 'foot') { assert.ok(result.player.visible); assert.ok(result.prompt?.includes('Enter')); assert.ok(result.visiblePedestrians.length >= 3); }
      if (name === 'chase') { assert.ok(result.car.visible); assert.ok(result.visiblePolice.length >= 2); assert.equal(result.wanted,4); }
      if (name === 'brief') { assert.ok(result.dialogue?.startsWith('Duke:')); assert.ok(result.marker.visible); }
      await page.setViewport({ width:768,height:480,deviceScaleFactor:1 });
      const layout = await page.evaluate(() => { const a=document.querySelector('#objective-panel').getBoundingClientRect(), b=document.querySelector('.vitals').getBoundingClientRect();return a.right<b.x && a.bottom<160; });
      assert.ok(layout, `${name}: compact HUD`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
