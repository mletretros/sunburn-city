import { createCharacter } from './player.js';
import { makeRng } from '../rng.js';
export function createPedestrians(scene, city, physics) {
  const random = makeRng(city.seed + '/people'), walkers = [];
  const coats = [0xe9c39a, 0x69b6ae, 0xf28c81, 0x9ba1cd, 0xe5ba62, 0xd9d6bf];
  for (let n = 0; n < 56; n++) {
    const doll = createCharacter(scene, coats[n % coats.length], [0xb67955, 0x87573e, 0xd6a17b][n % 3]);
    walkers.push({ id: n, root: doll.root, limbs: doll.limbs, position: doll.root.position, active: true, health: 100, heading: 0, mode: 'walk', phase: random.range(0, 6), direction: n % 2 ? 1 : -1, speed: random.range(.8, 1.5), flee: 0, home: 0 });
  }
  function reset(focus) {
    for (let n = 0; n < walkers.length; n++) {
      const p = walkers[n]; p.active = p.root.visible = true; p.health = 100; p.mode = 'walk'; p.flee = 0;
      const avenue = n < 24 ? Math.round(focus.x / 58) * 58 : (n % 5) * 58;
      p.home = avenue + (n % 2 ? -10.5 : 10.5);
      p.position.set(p.home, .16, focus.z - 85 + (n * 13 % 170));
      if (n < 7) p.position.set(-11 - n % 2 * 3, .16, focus.z - 4 - n * 4);
    }
  }
  const api = { walkers, people: walkers, reset,
    eject(car, driver, exitPoint) { const p = walkers[walkers.length - 1]; if (exitPoint) p.position.copy(exitPoint); p.flee = 6; },
    hearGunfire(x, z) { for (let n = 0; n < walkers.length; n++) if (Math.hypot(walkers[n].position.x - x, walkers[n].position.z - z) < 35) walkers[n].flee = 6; },
    hit(person, damage, source) { person.health = Math.max(0, person.health - damage); person.flee = 5; if (!person.health) { person.mode = 'down'; person.root.rotation.z = 1.5; } return !person.health; },
    update(dt, focus, camera, car, seconds, heat = 0) {
      let hits = 0;
      for (let n = 0; n < walkers.length; n++) {
        const p = walkers[n]; if (!p.active || !p.health) continue;
        p.flee = Math.max(0, p.flee - dt); const pace = p.speed * (p.flee || heat > 2 ? 2.7 : 1);
        p.position.z += dt * pace * p.direction; p.heading = p.direction > 0 ? Math.PI : 0; p.root.rotation.y = -p.heading;
        if (p.position.z < city.bounds.north + 10 || p.position.z > city.bounds.south - 10) p.direction *= -1;
        if (Math.abs(p.position.z - focus.z) > 150) p.position.z = focus.z - p.direction * 110;
        p.phase += pace * dt * 3;
        for (let k = 0; k < 4; k++) p.limbs[k].rotation.x = Math.sin(p.phase + (k % 2 ? Math.PI : 0)) * .4 * (k < 2 ? 1 : -1);
        if (car && Math.abs(car.speed) > 5 && Math.hypot(p.position.x - car.position.x, p.position.z - car.position.z) < 1.5) { api.hit(p, 100, car.position); hits++; }
      }
      return hits;
    },
    render() {},
  };
  reset(city.spawnPoints[0]); return api;
}
