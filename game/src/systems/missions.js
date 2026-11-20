import * as T from 'three';
import { MISSIONS } from './story.js';
import { createCharacter } from '../entities/player.js';
import { createVehicle, VEHICLES } from '../entities/vehicle.js';
export const MISSION_STATE = Object.freeze({ ACTIVE: 'active', OFFERED: 'offered', COMPLETED: 'complete', FAILED: 'failed' });
export function createMissions({ scene, city, physics, player, wanted, dialogue, hud, input, projectiles, onChange }) {
  const completed = [], states = Array(8).fill('offered'), enemies = [], cars = [];
  const marker = new T.Group(), gold = new T.MeshBasicMaterial({ color: 0xffd680, transparent: true, opacity: .85, depthWrite: false });
  const ring = new T.Mesh(new T.TorusGeometry(2.4, .12, 6, 40), gold); ring.rotation.x = Math.PI / 2; marker.add(ring);
  const arrow = new T.Mesh(new T.OctahedronGeometry(.6), gold); arrow.position.y = 4.4; marker.add(arrow);
  const beam = new T.Mesh(new T.CylinderGeometry(.24, .24, 12, 8), new T.MeshBasicMaterial({ color: 0xffdc8c, transparent: true, opacity: .16, depthWrite: false })); beam.position.y = 6; marker.add(beam); scene.add(marker);
  for (let n = 0; n < 4; n++) {
    const doll = createCharacter(scene, 0xb92e58, 0xc59c81); doll.root.visible = false;
    enemies.push({ root: doll.root, position: doll.root.position, health: 100, active: false, cooldown: n * .3 });
  }
  for (const type of [5, 3]) { const car = createVehicle(scene, VEHICLES[type], type === 5 ? 0xeab64f : 0xf0eee1); cars.push(car); physics.vehicles.push(car); }
  let cursor = 0, stage = 0, status = 'offered', remaining = 0, survived = 0, failure = '', elapsed = 0;
  const info = { active: false, name: '', objective: '', marker: null, area: null, step: 0, total: 0, distance: 0, timer: null, counter: '' };
  function current() { return MISSIONS[cursor]?.objectives[stage]; }
  function notify() { onChange?.(cursor, completed.slice()); }
  function refresh() {
    const job = MISSIONS[cursor], objective = current();
    info.active = status === 'active'; info.name = job?.name || 'Sunburn belongs to its people';
    info.objective = status === 'failed' ? failure + ' · P to retry' : info.active ? objective.text : job ? 'Duke is on the radio · accept your next job' : 'All eight deliveries complete · free roam';
    info.step = stage + 1; info.total = job?.objectives.length || 0;
    info.marker = info.active ? objective.target : null; info.area = objective?.area || null;
    info.timer = objective?.time && info.active ? remaining : null;
    info.counter = objective?.duration ? Math.ceil(survived) + ' / ' + objective.duration + ' sec' : '';
    marker.visible = info.active;
    if (objective) marker.position.set(objective.target.x, .25, objective.target.z);
  }
  function hideEncounter() { for (let n = 0; n < enemies.length; n++) { enemies[n].active = false; enemies[n].root.visible = false; } }
  function begin(resume) {
    const target = current(); if (!target) return;
    remaining = resume?.remaining ?? target.time ?? 0; survived = resume?.survived ?? 0;
    hideEncounter();
    if (target.heat && !resume) wanted.crime('mission-alarm', target.heat, player.state.position);
    for (let n = 0; n < (target.enemies || 0); n++) {
      const enemy = enemies[n]; enemy.active = enemy.root.visible = true; enemy.health = resume?.enemyHealth?.[n] ?? 100;
      enemy.position.set(target.target.x + (n % 2 ? -5 : 5), .16, target.target.z + Math.floor(n / 2) * 6); enemy.root.rotation.z = 0;
    }
    if (target.call && !resume) dialogue.show(target.call, null, 'DUKE / ENCRYPTED RADIO');
    refresh();
  }
  function placeMissionCar(saved) {
    for (let n = 0; n < cars.length; n++) { cars[n].active = false; cars[n].animate(0); }
    const objective = MISSIONS[cursor]?.objectives.find(part => part.verb === 'steal');
    if (!objective) return;
    const car = cars[objective.vehicle === 3 ? 1 : 0]; car.active = true;
    car.place(saved?.x ?? objective.target.x, .03, saved?.z ?? objective.target.z, saved?.heading ?? 0);
    car.health = saved?.health ?? 100; car.animate(0);
  }
  function accept() {
    if (cursor >= MISSIONS.length || status === 'active') return false;
    status = states[cursor] = 'active'; stage = 0; failure = ''; placeMissionCar(); begin(); notify(); return true;
  }
  function offer() {
    const job = MISSIONS[cursor]; if (!job || status === 'active') return false;
    if (player.state.reputation < job.unlock.reputation || job.unlock.after && !completed.includes(job.unlock.after)) return false;
    status = states[cursor] = 'offered'; refresh();
    dialogue.show(job.dialogue, accept, 'JOB ' + (cursor + 1) + ' / 8 — ' + job.name + ' — $' + job.rewards.cash); return true;
  }
  function completeObjective(id) {
    if (status !== 'active' || current()?.id !== id) return false;
    hideEncounter(); stage++;
    if (stage < MISSIONS[cursor].objectives.length) { begin(); notify(); return true; }
    const finished = MISSIONS[cursor]; completed.push(finished.id); states[cursor] = 'complete';
    player.addRewards(finished.rewards.cash, finished.rewards.reputation); hud.missionComplete(finished);
    cursor++; stage = 0; status = cursor === 8 ? 'complete' : 'offered';
    refresh(); notify(); dialogue.show(finished.ending, () => { if (cursor < 8) offer(); }, 'DELIVERY COMPLETE'); return true;
  }
  function failMission(reason = 'Job interrupted') {
    if (status !== 'active') return false; status = states[cursor] = 'failed'; failure = reason; hideEncounter(); refresh(); notify(); hud.toast(reason + ' · P → retry job'); return true;
  }
  function reset(data = {}) {
    cursor = Math.max(0, Math.min(8, Math.floor(data.index || 0))); stage = 0;
    completed.length = 0; for (let n = 0; n < cursor; n++) completed.push(MISSIONS[n].id);
    for (let n = 0; n < 8; n++) states[n] = n < cursor ? 'complete' : 'offered';
    status = cursor === 8 ? 'complete' : ['active', 'failed'].includes(data.state) ? data.state : 'offered';
    failure = String(data.failure || ''); hideEncounter();
    if (status === 'active') { stage = Math.min(MISSIONS[cursor].objectives.length - 1, Math.max(0, data.step | 0)); placeMissionCar(data.car); begin(data); }
    else for (const car of cars) { car.active = false; car.animate(0); }
    if (cursor < 8) states[cursor] = status; refresh(); notify();
  }
  const api = { enemies, cars, marker, states, completed, accept, offer, completeObjective, failMission, reset, load: reset, getHUDInfo: () => info,
    get index() { return cursor; }, get step() { return stage; }, get state() { return status; }, get active() { return MISSIONS[cursor] || null; },
    hitEnemy(enemy, damage) { if (!enemy.active) return false; enemy.health = Math.max(0, enemy.health - damage); if (!enemy.health) { enemy.active = false; enemy.root.rotation.z = 1.5; projectiles.drop(enemy.position, 35); } return !enemy.health; },
    save() {
      const car = cars[cursor === 5 ? 1 : 0];
      return { index: cursor, completed: completed.slice(), state: status, step: stage, remaining, survived, failure, enemyHealth: enemies.map(enemy => enemy.health), car: car.active ? { x: car.position.x, z: car.position.z, heading: car.heading, health: car.health } : null };
    },
    update(dt) {
      elapsed += dt; arrow.rotation.y += dt; arrow.position.y = 4 + Math.sin(elapsed * 2) * .3;
      if (status !== 'active') return;
      const objective = current(), p = player.state, distance = Math.hypot(p.position.x - objective.target.x, p.position.z - objective.target.z);
      info.distance = distance;
      if (objective.maxWanted !== undefined && wanted.state.level > objective.maxWanted) { failMission('The contact went dark: too much heat'); return; }
      if (objective.time && (remaining -= dt) <= 0) { failMission('Delivery window closed'); return; }
      if (p.vehicle && p.vehicle.health <= 0) { failMission('The vehicle is wrecked'); return; }
      for (let n = 0; n < enemies.length; n++) {
        const enemy = enemies[n]; if (!enemy.active) continue;
        const dx = p.position.x - enemy.position.x, dz = p.position.z - enemy.position.z;
        enemy.root.rotation.y = -Math.atan2(dx, -dz); enemy.cooldown -= dt;
        if (enemy.cooldown <= 0 && Math.hypot(dx, dz) < 38) { projectiles.enemyShoot(enemy.position, p, 8); enemy.cooldown = 1.8; }
      }
      let done = false;
      switch (objective.verb) {
        case 'steal': done = p.vehicle === cars[objective.vehicle === 3 ? 1 : 0]; break;
        case 'deliver': done = !!p.vehicle && cars.includes(p.vehicle) && distance < objective.radius && p.vehicle.health > 0; break;
        case 'lose': done = wanted.state.level === 0 && distance < objective.radius; break;
        case 'eliminate': done = !enemies.some(enemy => enemy.active); break;
        case 'survive': if (distance < objective.area.radius) survived += dt; done = survived >= objective.duration; break;
        case 'escape': done = distance < objective.radius; break;
        case 'collect': done = distance < objective.radius && (input.pressed('interact') || distance < 1.5); break;
        default: done = distance < objective.radius;
      }
      if (done) completeObjective(objective.id); else refresh();
    },
  };
  reset(); return api;
}
