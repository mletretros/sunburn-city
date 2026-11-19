import * as THREE from 'three';
import { makeRng } from '../rng.js';

const CAPACITY = 12;
export function createProjectiles(scene, physics, effects, audio, wanted, pedestrians, police, seed) {
  const rng = makeRng(`${seed}:combat`);
  const ammo = { current: CAPACITY, reserve: 72, reloading: 0, aiming: false };
  const origin = new THREE.Vector3(), direction = new THREE.Vector3(), end = new THREE.Vector3(), muzzle = new THREE.Vector3();
  const ray = new THREE.Ray(), box = new THREE.Box3(), point = new THREE.Vector3(), local = new THREE.Vector3();
  const cash = new THREE.InstancedMesh(new THREE.BoxGeometry(.29, .085, .20), new THREE.MeshStandardMaterial({ color: 0x80f5a5 }), 16);
  const pose = new THREE.Object3D(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const drops = Array.from({ length: cash.count }, () => ({ life: 0, x: 0, y: 0, z: 0, value: 0 }));
  let nextDrop = 0, cooldown = 0, best, target, hitCar;
  let missionCombat = null;
  cash.frustumCulled = false; scene.add(cash);
  function reset() {
    ammo.current = CAPACITY; ammo.reserve = 72; ammo.reloading = cooldown = 0; ammo.aiming = false;
    for (let i = 0; i < drops.length; i++) { drops[i].life = 0; cash.setMatrixAt(i, hidden); }
    cash.instanceMatrix.needsUpdate = true;
  }
  reset();
  function drop(position, value) {
    const d = drops[nextDrop++ % drops.length];
    d.x = position.x; d.y = physics.groundAt(position.x, position.z); d.z = position.z; d.value = value; d.life = 45;
  }
  function reload() {
    if (!ammo.reloading && ammo.current < CAPACITY && ammo.reserve) { ammo.reloading = 1.16; audio.reload(); }
  }
  function checkPerson(person, height) {
    if (!person.active || person.health <= 0) return;
    const p = person.position, r = .31;
    box.min.set(p.x - r, p.y + .12, p.z - r); box.max.set(p.x + r, p.y + height, p.z + r);
    ray.set(origin, direction);
    if (ray.intersectBox(box, point) && point.distanceTo(origin) < best) { best = point.distanceTo(origin); target = person; hitCar = null; }
  }
  function checkCar(car) {
    if (!car.active || car.destroyed) return;
    const p = car.position, { c, s, w, l } = car.footprint;
    const dx = origin.x - p.x, dz = origin.z - p.z;
    ray.origin.set(dx * c + dz * s, origin.y - p.y, -dx * s + dz * c);
    local.set(direction.x * c + direction.z * s, direction.y, -direction.x * s + direction.z * c);
    ray.direction.copy(local);
    box.min.set(-w, .22, -l); box.max.set(w, car.spec.sill, l);
    let distance = ray.intersectBox(box, point) ? point.distanceTo(ray.origin) : Infinity;
    box.min.set(-w * .84, car.spec.sill, car.spec.offset - l * car.spec.cabin);
    box.max.set(w * .84, car.spec.roof, car.spec.offset + l * car.spec.cabin);
    if (ray.intersectBox(box, point)) distance = Math.min(distance, point.distanceTo(ray.origin));
    if (distance < best) { best = distance; target = null; hitCar = car; }
  }
  function shoot(camera, player) {
    if (cooldown || ammo.reloading || player.vehicle) return;
    if (!ammo.current) { reload(); return; }
    ammo.current--; cooldown = .25;
    camera.getWorldPosition(origin); camera.getWorldDirection(direction);
    best = physics.wallDistance(origin, direction, 74); target = hitCar = null;
    for (const cop of police.officers) checkPerson(cop, 1.65);
    if (missionCombat) for (const enemy of missionCombat.enemies) checkPerson(enemy, 1.8);
    for (const person of pedestrians.walkers) checkPerson(person, person.mode === 'down' ? .42 : person.height * 1.66);
    for (const car of physics.vehicles) checkCar(car);
    end.copy(origin).addScaledVector(direction, best);
    const p = player.position, s = Math.sin(player.heading), c = Math.cos(player.heading);
    muzzle.set(p.x + s * .63 + c * .25, p.y + 1.35, p.z - c * .63 + s * .25);
    direction.subVectors(end, muzzle);
    const length = direction.length(); direction.normalize();
    const wall = physics.wallDistance(muzzle, direction, length);
    if (wall < length - .07) { target = hitCar = null; end.copy(muzzle).addScaledVector(direction, wall); }
    effects.shot(muzzle, end); if (best < 74 || wall < length) effects.impact(end.x, end.y, end.z);
    audio.gunshot(); wanted.crime('public-fire', 9, p); pedestrians.hearGunfire(p.x, p.z);
    if (hitCar) {
      hitCar.health = Math.max(0, hitCar.health - 24);
      if (hitCar.police) wanted.crime('cruiser-damage', 13, p);
    } else if (target) {
      const killed = target.kind === 'serpent' ? missionCombat.hitEnemy(target, 38) : target.kind === 'officer' ? police.hit(target, 36) : pedestrians.hit(target, 38, p);
      audio.impact();
      if (killed) {
        if (target.kind !== 'serpent') drop(target.position, target.kind === 'officer' ? 45 : 18);
        if (target.kind === 'officer') wanted.crime('officer-down', 29, p);
      }
    }
  }
  function officerShot(cop, player) {
    const p = player.vehicle?.position ?? player.position, q = cop.position;
    muzzle.set(q.x + Math.sin(cop.heading) * .43, q.y + 1.30, q.z - Math.cos(cop.heading) * .43);
    const accurate = rng.next() < (player.vehicle ? .32 : .56);
    end.set(p.x + (accurate ? 0 : rng.range(-2.5, 2.5)), p.y + (player.vehicle ? .87 : 1.15), p.z + (accurate ? 0 : rng.range(-2.5, 2.5)));
    direction.subVectors(end, muzzle); const distance = direction.length(); direction.normalize();
    const wall = physics.wallDistance(muzzle, direction, distance);
    if (wall < distance) end.copy(muzzle).addScaledVector(direction, wall);
    effects.shot(muzzle, end); audio.gunshot(.13);
    if (!accurate || wall < distance - .1) { if (wall < distance) effects.impact(end.x, end.y, end.z); return false; }
    if (player.vehicle) player.vehicle.health = Math.max(0, player.vehicle.health - 6);
    else {
      const absorbed = Math.min(player.armour, 5); player.armour -= absorbed; player.health = Math.max(0, player.health - (8 - absorbed));
    }
    effects.impact(end.x, end.y, end.z); return true;
  }
  return {
    ammo, reset, reload, shoot, officerShot, drop,
    setMissionCombat(value) { missionCombat = value; },
    update(dt, player) {
      cooldown = Math.max(0, cooldown - dt);
      if (ammo.reloading && (ammo.reloading -= dt) <= 0) {
        const n = Math.min(CAPACITY - ammo.current, ammo.reserve); ammo.current += n; ammo.reserve -= n; ammo.reloading = 0;
      }
      let collected = 0, dirty = false;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]; if (d.life <= 0) continue;
        d.life -= dt; dirty = true;
        if (!player.vehicle && Math.hypot(player.position.x - d.x, player.position.z - d.z) < .9) { collected += d.value; d.life = 0; }
        if (d.life <= 0) { cash.setMatrixAt(i, hidden); continue; }
        pose.position.set(d.x, d.y + .24 + Math.sin(d.life * 4) * .08, d.z); pose.rotation.y = d.life * 2.4; pose.updateMatrix(); cash.setMatrixAt(i, pose.matrix);
      }
      if (dirty) cash.instanceMatrix.needsUpdate = true;
      player.cash += collected; return collected;
    },
  };
}
