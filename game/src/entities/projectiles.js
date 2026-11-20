import * as T from 'three';
export function createProjectiles(scene, physics, effects, audio, wanted, pedestrians, police, seed) {
  const ammo = { current: 12, reserve: 120, aiming: false, reloading: false }, drops = [];
  const direction = new T.Vector3(), origin = new T.Vector3(), hitPoint = new T.Vector3();
  const lootGeometry = new T.OctahedronGeometry(.22), lootMaterial = new T.MeshBasicMaterial({ color: 0xffdf8b });
  for (let n = 0; n < 16; n++) { const root = new T.Mesh(lootGeometry, lootMaterial); root.visible = false; scene.add(root); drops.push({ root, position: root.position, active: false, amount: 0 }); }
  let cooldown = 0, reloadClock = 0, nextDrop = 0, mission = null;
  const api = { ammo, drops,
    setMissionCombat(value) { mission = value; },
    reset() { ammo.current = 12; ammo.reserve = 120; ammo.reloading = false; cooldown = reloadClock = 0; for (let n = 0; n < drops.length; n++) drops[n].active = drops[n].root.visible = false; },
    reload() { if (ammo.current < 12 && ammo.reserve && !ammo.reloading) { ammo.reloading = true; reloadClock = 1.2; audio.reload(); } },
    drop(position, amount) { const item = drops[nextDrop++ % drops.length]; item.position.copy(position); item.position.y += .4; item.amount = amount; item.active = item.root.visible = true; },
    shoot(camera, player) {
      if (cooldown || ammo.reloading || player.vehicle) return false;
      if (!ammo.current) { api.reload(); return false; }
      ammo.current--; cooldown = .2; audio.gunshot(); origin.copy(player.position); origin.y += 1.5; camera.getWorldDirection(direction);
      let distance = physics.wallDistance(origin, direction, 90), victim = null, kind = 0;
      function scan(pool, category) {
        for (let n = 0; n < pool.length; n++) {
          const actor = pool[n]; if (!actor.active || actor.health <= 0) continue;
          const dx = actor.position.x - origin.x, dy = actor.position.y + 1 - origin.y, dz = actor.position.z - origin.z;
          const along = dx * direction.x + dy * direction.y + dz * direction.z;
          if (along > 0 && along < distance && dx * dx + dy * dy + dz * dz - along * along < .85) { distance = along; victim = actor; kind = category; }
        }
      }
      scan(pedestrians.walkers, 1); scan(police.cruisers, 2); if (mission) scan(mission.enemies, 3);
      if (victim) {
        if (kind === 1) { if (pedestrians.hit(victim, 40, origin)) api.drop(victim.position, 15); }
        else if (kind === 2) police.hit(victim, 28); else mission.hitEnemy(victim, 40);
      }
      hitPoint.copy(direction).multiplyScalar(distance).add(origin); effects.shot(origin, hitPoint); effects.impact(hitPoint.x, hitPoint.y, hitPoint.z);
      pedestrians.hearGunfire(origin.x, origin.z); wanted.crime('gunfire', kind === 2 ? 22 : 6, player.position); return true;
    },
    enemyShoot(from, player, damage = 7) {
      if (player.health <= 0) return;
      const gap = Math.max(.01, from.distanceTo ? from.distanceTo(player.position) : Math.hypot(from.x - player.position.x, from.z - player.position.z));
      direction.set((player.position.x - from.x) / gap, (player.position.y + .8 - from.y) / gap, (player.position.z - from.z) / gap);
      if (physics.wallDistance(from, direction, gap) < gap - 1) return;
      effects.shot(from, player.position); const absorbed = Math.min(player.armour, damage); player.armour -= absorbed; player.health = Math.max(0, player.health - damage + absorbed);
    },
    officerShot(cop, player) { api.enemyShoot(cop.position, player, 7); return true; },
    update(dt, player) {
      cooldown = Math.max(0, cooldown - dt);
      if (ammo.reloading && (reloadClock -= dt) <= 0) { const count = Math.min(12 - ammo.current, ammo.reserve); ammo.current += count; ammo.reserve -= count; ammo.reloading = false; }
      let reward = 0;
      for (let n = 0; n < drops.length; n++) { const item = drops[n]; if (!item.active) continue; item.root.rotation.y += dt * 2; if (!player.vehicle && item.position.distanceToSquared(player.position) < 5) { reward += item.amount; item.active = item.root.visible = false; } }
      player.cash += reward; return reward;
    },
  };
  return api;
}
