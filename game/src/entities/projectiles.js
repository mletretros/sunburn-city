import * as THREE from 'three';
import { makeRng } from '../rng.js';
const MAGAZINE = 12, RANGE = 74, DROP_COUNT = 16;
export function createProjectiles(scene, physics, effects, audio, wanted, pedestrians, police, seed) {
  const ammo = { current: MAGAZINE, reserve: 72, reloading: 0, aiming: false }, origin = new THREE.Vector3(), direction = new THREE.Vector3(), endpoint = new THREE.Vector3(), muzzle = new THREE.Vector3(), point = new THREE.Vector3(), ray = new THREE.Ray(), box = new THREE.Box3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0), pose = new THREE.Object3D(), bundles = new THREE.InstancedMesh(new THREE.BoxGeometry(.29, .085, .2), new THREE.MeshStandardMaterial({ color: 0x80f5a5 }), DROP_COUNT);
  bundles.frustumCulled = false; bundles.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(bundles);
  const drops = Array.from({ length: DROP_COUNT }, () => ({ life: 0, x: 0, y: 0, z: 0, value: 0 }));
  let random, nextDrop = 0, cooldown = 0, closest = RANGE, victim = null, vehicle = null, mission = null;
  function reset() {
    random = makeRng(`${seed}:combat`); nextDrop = cooldown = ammo.reloading = 0; ammo.current = MAGAZINE; ammo.reserve = 72; ammo.aiming = false;
    for (let i = 0; i < DROP_COUNT; i++) { drops[i].life = 0; bundles.setMatrixAt(i, hidden); } bundles.instanceMatrix.needsUpdate = true;
  }
  function drop(position, value) { const item = drops[nextDrop]; nextDrop = (nextDrop + 1) % DROP_COUNT; item.x = position.x; item.y = physics.groundAt(position.x, position.z); item.z = position.z; item.value = value; item.life = 45; }
  function reload() { if (ammo.reloading || ammo.current === MAGAZINE || !ammo.reserve) return; ammo.reloading = 1.16; audio.reload(); }
  function personHit(person, height) {
    if (!person.active || person.health <= 0) return;
    const p = person.position; box.min.set(p.x - .31, p.y + .12, p.z - .31); box.max.set(p.x + .31, p.y + height, p.z + .31); ray.set(origin, direction);
    if (!ray.intersectBox(box, point)) return; const distance = origin.distanceTo(point); if (distance >= closest) return; closest = distance; victim = person; vehicle = null;
  }
  function carHit(car) {
    if (!car.active || car.destroyed) return;
    const { position: p, spec } = car, { c, s, w, l } = car.footprint, dx = origin.x - p.x, dz = origin.z - p.z;
    ray.origin.set(dx * c + dz * s, origin.y - p.y, -dx * s + dz * c); ray.direction.set(direction.x * c + direction.z * s, direction.y, -direction.x * s + direction.z * c);
    box.min.set(-w, .22, -l); box.max.set(w, spec.sill, l); let distance = ray.intersectBox(box, point) ? ray.origin.distanceTo(point) : Infinity;
    box.min.set(-w * .84, spec.sill, spec.offset - l * spec.cabin); box.max.set(w * .84, spec.roof, spec.offset + l * spec.cabin);
    if (ray.intersectBox(box, point)) distance = Math.min(distance, ray.origin.distanceTo(point)); if (distance >= closest) return; closest = distance; vehicle = car; victim = null;
  }
  function shoot(camera, player) {
    if (cooldown || ammo.reloading || player.vehicle) return; if (!ammo.current) { reload(); return; }
    ammo.current--; cooldown = .25; camera.getWorldPosition(origin); camera.getWorldDirection(direction); closest = physics.wallDistance(origin, direction, RANGE); victim = vehicle = null;
    for (let i = 0; i < police.officers.length; i++) personHit(police.officers[i], 1.65);
    if (mission) for (let i = 0; i < mission.enemies.length; i++) personHit(mission.enemies[i], 1.8);
    for (let i = 0; i < pedestrians.walkers.length; i++) { const person = pedestrians.walkers[i]; personHit(person, person.mode === 'down' ? .42 : person.height * 1.66); }
    for (let i = 0; i < physics.vehicles.length; i++) carHit(physics.vehicles[i]);
    endpoint.copy(origin).addScaledVector(direction, closest); const p = player.position, s = Math.sin(player.heading), c = Math.cos(player.heading);
    muzzle.set(p.x + s * .63 + c * .25, p.y + 1.35, p.z - c * .63 + s * .25); direction.subVectors(endpoint, muzzle); const distance = direction.length(); direction.normalize(); const wall = physics.wallDistance(muzzle, direction, distance);
    if (wall < distance - .07) { victim = vehicle = null; endpoint.copy(muzzle).addScaledVector(direction, wall); }
    effects.shot(muzzle, endpoint); if (closest < RANGE || wall < distance) effects.impact(endpoint.x, endpoint.y, endpoint.z); audio.gunshot(); wanted.crime('public-fire', 9, p); pedestrians.hearGunfire(p.x, p.z);
    if (vehicle) { vehicle.health = Math.max(0, vehicle.health - 24); if (vehicle.police) wanted.crime('cruiser-damage', 13, p); }
    else if (victim) {
      const killed = victim.kind === 'serpent' ? mission.hitEnemy(victim, 38) : victim.kind === 'officer' ? police.hit(victim, 36) : pedestrians.hit(victim, 38, p); audio.impact(); if (!killed) return;
      if (victim.kind !== 'serpent') drop(victim.position, victim.kind === 'officer' ? 45 : 18); if (victim.kind === 'officer') wanted.crime('officer-down', 29, p);
    }
  }
  function officerShot(cop, player) {
    const p = player.vehicle?.position ?? player.position, q = cop.position; muzzle.set(q.x + Math.sin(cop.heading) * .43, q.y + 1.3, q.z - Math.cos(cop.heading) * .43);
    const accurate = random.next() < (player.vehicle ? .32 : .56); endpoint.set(p.x + (accurate ? 0 : random.range(-2.5, 2.5)), p.y + (player.vehicle ? .87 : 1.15), p.z + (accurate ? 0 : random.range(-2.5, 2.5)));
    direction.subVectors(endpoint, muzzle); const distance = direction.length(); direction.normalize(); const wall = physics.wallDistance(muzzle, direction, distance);
    if (wall < distance) endpoint.copy(muzzle).addScaledVector(direction, wall); effects.shot(muzzle, endpoint); audio.gunshot(.13);
    if (!accurate || wall < distance - .1) { if (wall < distance) effects.impact(endpoint.x, endpoint.y, endpoint.z); return false; }
    if (player.vehicle) player.vehicle.health = Math.max(0, player.vehicle.health - 6);
    else { const absorbed = Math.min(player.armour, 5); player.armour -= absorbed; player.health = Math.max(0, player.health - 8 + absorbed); }
    effects.impact(endpoint.x, endpoint.y, endpoint.z); return true;
  }
  reset();
  return {
    ammo, reset, reload, shoot, officerShot, drop, setMissionCombat(runtime) { mission = runtime; },
    update(dt, player) {
      cooldown = Math.max(0, cooldown - dt);
      if (ammo.reloading && (ammo.reloading -= dt) <= 0) { const load = Math.min(MAGAZINE - ammo.current, ammo.reserve); ammo.current += load; ammo.reserve -= load; ammo.reloading = 0; }
      let collected = 0, dirty = false;
      for (let i = 0; i < drops.length; i++) {
        const item = drops[i]; if (item.life <= 0) continue; dirty = true; item.life -= dt;
        if (!player.vehicle && Math.hypot(player.position.x - item.x, player.position.z - item.z) < .9) { collected += item.value; item.life = 0; }
        if (item.life <= 0) bundles.setMatrixAt(i, hidden);
        else { pose.position.set(item.x, item.y + .24 + Math.sin(item.life * 4) * .08, item.z); pose.rotation.y = item.life * 2.4; pose.updateMatrix(); bundles.setMatrixAt(i, pose.matrix); }
      }
      if (dirty) bundles.instanceMatrix.needsUpdate = true; player.cash += collected; return collected;
    },
  };
}
