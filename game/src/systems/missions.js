import * as THREE from 'three';
import { MISSIONS } from './story.js';
import { VEHICLES, createVehicle } from '../entities/vehicle.js';

export const MISSION_STATE = Object.freeze({ OFFERED: 'offered', ACTIVE: 'active', FAILED: 'failed', COMPLETED: 'complete' });

export function createMissions({ scene, city, physics, player, wanted, dialogue, hud, input, projectiles, onChange }) {
  let index = 0, step = 0, state = MISSION_STATE.OFFERED, remaining = 0, survived = 0, clock = 0, failure = '';
  const completed = [], states = MISSIONS.map(() => 'locked');
  const info = { active: false, name: '', objective: '', step: 0, total: 0, timer: null, counter: '', marker: null, area: null, distance: 0 };
  const marker = new THREE.Group(), markerPoint = { x: 0, z: 0 };
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.65, 40), new THREE.MeshBasicMaterial({ color: 0xffd18c, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .18;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(.65, 1.5, 24, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd18c, transparent: true, opacity: .27, side: THREE.DoubleSide, depthWrite: false }));
  column.position.y = 12; marker.add(ring, column); marker.visible = false; scene.add(marker);
  const packageMesh = new THREE.Mesh(new THREE.BoxGeometry(.65, .45, .5), new THREE.MeshStandardMaterial({ color: 0x70efd0, emissive: 0x124536 }));
  scene.add(packageMesh); packageMesh.visible = false;
  // One persistent car per required model; four reusable opponents for every encounter.
  const cars = [createVehicle(scene, VEHICLES[5], 0xe2ad45), createVehicle(scene, VEHICLES[3], 0xeee4cb)];
  for (const car of cars) { car.missionVehicle = true; physics.vehicles.push(car); }
  const enemies = [], bodyGeo = new THREE.BoxGeometry(), headGeo = new THREE.IcosahedronGeometry(.16, 1);
  const red = new THREE.MeshStandardMaterial({ color: 0xaa3550 }), dark = new THREE.MeshStandardMaterial({ color: 0x293541 }), silver = new THREE.MeshStandardMaterial({ color: 0xbccacc });
  for (let i = 0; i < 4; i++) {
    const root = new THREE.Group(); scene.add(root); root.visible = false;
    const part = (geo, mat, x, y, z, w, h, d) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); root.add(mesh); };
    part(bodyGeo, red, 0, 1.15, 0, .47, .56, .29);
    part(headGeo, silver, 0, 1.62, 0, 1, 1.1, 1);
    part(bodyGeo, dark, -.13, .45, 0, .18, .9, .22); part(bodyGeo, dark, .13, .45, 0, .18, .9, .22);
    part(bodyGeo, dark, .26, 1.24, -.25, .13, .14, .55);
    enemies.push({ root, position: root.position, kind: 'serpent', active: false, health: 100, heading: 0, timer: 0 });
  }
  function current() { return MISSIONS[index]?.objectives[step]; }
  function missionCar() { return MISSIONS[index]?.objectives[0].vehicle === 5 ? cars[0] : cars[1]; }
  function clearEncounter() { for (const enemy of enemies) { enemy.active = enemy.root.visible = false; } }
  function notify() { onChange?.(index, completed); }
  function placeCar(saved) {
    const first = MISSIONS[index]?.objectives[0];
    if (first?.verb !== 'steal') return;
    const car = missionCar(); car.active = true; car.driver = null;
    car.place(saved?.x ?? first.target.x, 0, saved?.z ?? first.target.z, saved?.heading ?? 0);
    if (saved) { car.health = saved.health; if (!car.health) car.destroy(); }
  }
  function beginStep(restoring = false, saved = null) {
    const objective = current(); clearEncounter();
    if (!objective) return;
    remaining = saved?.remaining ?? objective.time ?? 0; survived = saved?.survived ?? 0;
    if (objective.enemies) {
      for (let i = 0; i < objective.enemies; i++) {
        const enemy = enemies[i], offset = objective.enemies === 1 ? 0 : i * 6 - 9;
        enemy.position.set(objective.target.x + offset, 0, objective.target.z - (i % 2) * 6);
        enemy.position.y = physics.groundAt(enemy.position.x, enemy.position.z);
        enemy.health = saved?.enemyHealth?.[i] ?? 100; enemy.active = enemy.health > 0; enemy.root.visible = enemy.active;
        enemy.root.rotation.set(0, 0, 0); enemy.timer = 1.8 + i * .5;
      }
    }
    if (!restoring && objective.heat) wanted.crime('heist-alarm', objective.heat, player.state.position);
    if (!restoring && objective.call) showDialogue(objective.call, null, 'Crew radio');
    refresh();
  }
  function showDialogue(lines, callback, title) {
    input.release(); dialogue.show(lines, () => {
      input.clear(); callback?.();
      if (!dialogue.active) document.getElementById('view').focus({ preventScroll: true });
    }, title);
  }
  function refresh() {
    const objective = current(), p = player.state.position;
    info.active = state === MISSION_STATE.ACTIVE && !!objective;
    marker.visible = info.active; packageMesh.visible = info.active && objective.verb === 'collect';
    info.name = MISSIONS[index]?.name || 'Sunburn belongs to you';
    info.step = step + 1; info.total = MISSIONS[index]?.objectives.length || 0;
    if (info.active) info.objective = objective.text;
    else if (state !== 'failed') info.objective = index >= MISSIONS.length ? 'Story complete · Explore Sunburn City' : 'Next job available · P → Jobs';
    info.marker = info.active ? markerPoint : null; info.area = info.active ? objective.area || null : null;
    info.timer = info.active && objective.time ? remaining : null;
    if (info.active && objective.verb === 'survive') {
      const count = Math.ceil(survived);
      if (info.survivalCount !== count) { info.survivalCount = count; info.counter = `${count} / ${objective.duration}s`; }
    } else { info.counter = ''; info.survivalCount = -1; }
    if (info.active) {
      const target = objective.verb === 'steal' ? missionCar().position : objective.target;
      markerPoint.x = target.x; markerPoint.z = target.z;
      marker.position.set(target.x, physics.groundAt(target.x, target.z), target.z);
      packageMesh.position.set(target.x, marker.position.y + .65, target.z);
      info.distance = Math.hypot(target.x - p.x, target.z - p.z);
    }
  }
  function offer() {
    if (index >= MISSIONS.length) { refresh(); return false; }
    const job = MISSIONS[index];
    if (job.unlock.after && !completed.includes(job.unlock.after) || player.state.reputation < job.unlock.reputation) return false;
    state = states[index] = 'offered'; refresh();
    showDialogue(job.dialogue, accept, `Job ${index + 1} / ${MISSIONS.length} · ${job.name} · $${job.rewards.cash}`);
    return true;
  }
  function accept() {
    if (state !== 'offered' || index >= MISSIONS.length) return false;
    state = states[index] = 'active'; step = 0; failure = ''; placeCar(); beginStep(); notify(); return true;
  }
  function failMission(reason) {
    if (state !== 'active') return false;
    state = states[index] = 'failed'; failure = reason; clearEncounter(); refresh();
    info.objective = `${failure} · P → Jobs to retry`;
    hud.toast(`Job failed · ${reason} · Retry from pause → Jobs`); notify(); return true;
  }
  function completeObjective(id = current()?.id) {
    if (state !== 'active' || id !== current()?.id) return false;
    if (++step < MISSIONS[index].objectives.length) { beginStep(); return true; }
    const job = MISSIONS[index]; state = states[index] = 'complete'; clearEncounter();
    completed.push(job.id); player.addRewards(job.rewards.cash, job.rewards.reputation);
    // Each completed job also makes the next job viable without a separate shopping trip.
    player.state.health = 100; player.state.armour = Math.min(100, player.state.armour + 20);
    projectiles.ammo.reserve = Math.min(144, projectiles.ammo.reserve + 24);
    hud.missionComplete(job); index++; if (index < states.length) states[index] = 'offered';
    refresh(); notify();
    showDialogue(job.ending, () => { if (index < MISSIONS.length) offer(); }, 'Job complete · Crew debrief');
    return true;
  }
  function update(dt) {
    clock += dt; ring.scale.setScalar(1 + Math.sin(clock * 3) * .08); packageMesh.rotation.y += dt;
    if (state !== 'active' || dialogue.active) { refresh(); return; }
    const p = player.state, objective = current(), car = missionCar();
    if (p.health <= 0) { failMission('Mars is down'); return; }
    if ((objective.verb === 'steal' || objective.verb === 'deliver') && (!car.active || car.health <= 0)) { failMission('The heist vehicle was destroyed'); return; }
    if (objective.maxWanted !== undefined && wanted.state.level > objective.maxWanted) { failMission('Too much heat for a quiet pickup'); return; }
    if (objective.time && (remaining -= dt) <= 0) { failMission('Time ran out'); return; }
    const distance = Math.hypot(p.position.x - objective.target.x, p.position.z - objective.target.z);
    let alive = 0;
    for (const enemy of enemies) {
      if (!enemy.active || enemy.health <= 0) continue;
      alive++;
      const d = Math.hypot(p.position.x - enemy.position.x, p.position.z - enemy.position.z);
      enemy.heading = Math.atan2(p.position.x - enemy.position.x, enemy.position.z - p.position.z);
      enemy.root.rotation.y = -enemy.heading; enemy.timer -= dt;
      if (d < 46 && enemy.timer <= 0) { enemy.timer = 2.6; projectiles.officerShot(enemy, p); }
      if (p.vehicle && Math.abs(p.vehicle.speed) > 5 && d < 2.4) hitEnemy(enemy, 100);
    }
    if (p.health <= 0) { failMission('Mars is down'); return; }
    let reached = false;
    switch (objective.verb) {
      case 'go': reached = distance < objective.radius; break;
      case 'collect': reached = !p.vehicle && distance < objective.radius; break;
      case 'steal': reached = p.vehicle === car; break;
      case 'deliver': reached = p.vehicle === car && distance < objective.radius && Math.abs(car.speed) < 3.2; break;
      case 'lose': reached = wanted.state.level === 0 && distance < objective.radius; break;
      case 'eliminate': reached = alive === 0; break;
      case 'escape': reached = city.districtAt(p.position.x, p.position.z) !== objective.district && distance < objective.radius; break;
      case 'survive':
        if (distance > objective.area.radius) { failMission('You abandoned the relay'); return; }
        survived += dt; reached = survived >= objective.duration; break;
    }
    if (reached) completeObjective();
    refresh();
  }
  function hitEnemy(enemy, damage) {
    if (!enemy.active || enemy.health <= 0) return false;
    enemy.health = Math.max(0, enemy.health - damage);
    if (!enemy.health) { enemy.active = false; enemy.root.rotation.z = Math.PI / 2; projectiles.drop(enemy.position, 35); return true; }
    return false;
  }
  function save() {
    const car = missionCar();
    return { index, completed: completed.slice(), state, step, remaining, survived, failure,
      enemyHealth: enemies.map(enemy => enemy.health),
      car: car.active ? { x: car.position.x, z: car.position.z, heading: car.heading, health: car.health } : null };
  }
  function reset(data = null) {
    dialogue.hide(); clearEncounter();
    for (const car of cars) { car.active = false; car.animate(0); }
    completed.length = 0; states.fill('locked');
    // Only a contiguous chain can unlock the following job.
    const requested = Math.min(MISSIONS.length, Math.max(0, Math.floor(data?.index || 0)));
    for (let i = 0; i < requested; i++) { completed.push(MISSIONS[i].id); states[i] = 'complete'; }
    index = requested; step = 0; remaining = survived = 0; failure = data?.failure || '';
    state = index === MISSIONS.length ? 'complete' : ['active', 'failed'].includes(data?.state) ? data.state : 'offered';
    if (state === 'failed') info.objective = `${failure || 'Job interrupted'} · P → Jobs to retry`;
    if (index < MISSIONS.length) states[index] = state;
    if (state === 'active') {
      step = Math.min(MISSIONS[index].objectives.length - 1, Math.max(0, Math.floor(data.step || 0)));
      placeCar(data.car); beginStep(true, data);
    }
    refresh(); notify();
  }
  return { update, reset, load: reset, offer, accept, completeObjective, failMission, save, hitEnemy, enemies, cars, marker,
    states, completed, getHUDInfo: () => info,
    get index() { return index; }, get step() { return step; }, get state() { return state; }, get active() { return MISSIONS[index] || null; } };
}
