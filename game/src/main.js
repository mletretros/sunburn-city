import * as T from 'three';
import { STEP, WORLD, QUALITY } from './config.js';
import { createCity } from './world/city.js';
import { createBatches } from './world/batch.js';
import { buildTerrain } from './world/terrain.js';
import { buildBuildings } from './world/buildings.js';
import { buildProps } from './world/props.js';
import { buildSignals } from './world/signals.js';
import { buildSky } from './world/sky.js';
import { createPhysics } from './systems/physics.js';
import { createFollowCamera } from './systems/camera.js';
import { createWanted } from './systems/wanted.js';
import { createMissions } from './systems/missions.js';
import { readSlot, writeSlot } from './systems/save.js';
import { createPlayer } from './entities/player.js';
import { createTraffic } from './entities/traffic.js';
import { createPedestrians } from './entities/pedestrians.js';
import { createPolice } from './entities/police.js';
import { createProjectiles } from './entities/projectiles.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createEffects } from './render/effects.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createMenus } from './ui/menus.js';
import { createDialogue } from './ui/dialogue.js';
import { SHOT_NAMES, runShot } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = (params.get('seed') || WORLD.seed).slice(0, 128), shot = params.get('shot');
const canvas = document.querySelector('#view');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene(), city = createCity(seed), batch = createBatches(scene);
const sea = buildTerrain(scene, city, batch), signs = buildBuildings(city, batch); buildProps(city, batch, signs);
for (let n = 0; n < signs.length; n++) scene.add(signs[n].mesh);
const signals = buildSignals(scene, city, batch); batch.finish();
const sky = buildSky(scene), physics = createPhysics(city), player = createPlayer(scene, city, physics);
const traffic = createTraffic(scene, city, physics), pedestrians = createPedestrians(scene, city, physics);
const audio = createAudio(), effects = createEffects(scene, seed), wanted = createWanted();
const police = createPolice(scene, city, physics, wanted, audio), projectiles = createProjectiles(scene, physics, effects, audio, wanted, pedestrians, police, seed);
const rig = createFollowCamera(city), input = createInput(canvas), hud = createHud(), map = createMinimap(city), dialogue = createDialogue();
const progress = { mission: 0, seconds: 0, completed: [] };
const missions = createMissions({ scene, city, physics, player, wanted, dialogue, hud, input, projectiles,
  onChange(index, list) { progress.mission = index; progress.completed = list; },
});
projectiles.setMissionCombat(missions); map.markers.police = police.blips; map.markers.mission = missions.getHUDInfo();
let mode = 'start', frames = 0, elapsed = 0, previous = 0, backlog = 0, downTime = 0, smokeClock = 0;
const quietMove = { x: 0, z: 0 }, quietDrive = { throttle: false, brake: false, handbrake: false, steer: 0 };
const neutral = { active: () => false, pressed: () => false, movement: () => quietMove, driving: () => quietDrive };
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); rig.camera.aspect = innerWidth / innerHeight; rig.camera.updateProjectionMatrix();
}
function quality(name) { const preset = QUALITY[name] || QUALITY.standard; renderer.setPixelRatio(Math.min(devicePixelRatio, preset.ratio)); renderer.shadowMap.enabled = preset.shadow; sky.quality(preset.shadow); resize(); }
function setMode(value) {
  mode = value; backlog = 0; input.clear();
  hud.visible(value === 'play'); menus.show(value, value === 'play' ? null : readSlot());
  if (value !== 'play') { input.release(); audio.update(null, false); } else canvas.focus({ preventScroll: true });
}
function resetStreetLife(focus) {
  wanted.reset(); police.reset(); projectiles.reset(); effects.reset(); traffic.reset(focus); pedestrians.reset(focus); downTime = 0;
}
function start(openBrief = true) {
  dialogue.hide(); player.reset(); resetStreetLife(player.state.position); missions.reset(); progress.seconds = 0;
  rig.reset(0); setMode('play'); if (openBrief) missions.offer();
}
function save() {
  const p = player.state, pose = p.vehicle ? player.findExit() || city.spawnPoints[0] : p.position;
  const result = writeSlot(city, p, progress, pose, missions.save(), wanted.state, projectiles.ammo);
  menus.slot(readSlot()); menus.message(result ? 'Saved in this browser.' : 'Save unavailable in this browser.'); return result;
}
function load() {
  const record = readSlot(); if (!record) { menus.message('No valid save in this browser.'); return false; }
  if (record.seed !== seed) { location.href = '?seed=' + encodeURIComponent(record.seed) + '&shot=continue'; return true; }
  player.reset(record); resetStreetLife(player.state.position);
  const p = player.state; p.cash = record.cash; p.reputation = record.reputation; p.health = record.health; p.armour = record.armour;
  missions.load(record.story); progress.seconds = record.seconds;
  if (record.wanted?.heat) wanted.crime('saved-heat', record.wanted.heat, record.wanted);
  if (record.ammo) { projectiles.ammo.current = Math.min(12, Math.max(0, record.ammo.current | 0)); projectiles.ammo.reserve = Math.max(0, record.ammo.reserve | 0); }
  rig.reset(record.heading); setMode('play'); if (missions.state === 'offered') missions.offer(); return true;
}
const menus = createMenus({ newGame() { audio.unlock(); start(); }, restart: () => start(), resume: () => setMode('play'), save, load,
  quality, sensitivity(value) { rig.sensitivity = value; }, mute: audio.mute,
  jobs() { menus.missionLog(missions, player.state); }, startMission() { setMode('play'); missions.offer(); },
}, 'standard');
function simulate(dt, controls = input) {
  elapsed += dt; progress.seconds += dt;
  const p = player.state;
  if (p.health <= 0) {
    if (!downTime) { missions.failMission('Mars is down'); player.setDown(true); hud.toast('Returning to the Palma street clinic'); }
    downTime += dt;
    if (downTime > 2.5) { player.respawn(); resetStreetLife(p.position); rig.reset(0); hud.toast('Palma clinic · $60 fee · heat cleared'); }
  } else {
    if (p.vehicle && !p.vehicle.health) { effects.explosion(p.position.x, p.position.y + .5, p.position.z); p.vehicle.speed = 0; player.exit(); p.health = Math.max(0, p.health - 40); }
    if (controls.pressed('interact')) {
      if (p.vehicle) { if (player.exit()) audio.door(); }
      else {
        const car = traffic.nearestDoor(p.position.x, p.position.z);
        if (car) { const prior = player.enter(car); traffic.claim(car); audio.door(); if (prior || car === traffic.starter) wanted.crime('vehicle-theft', 16, p.position); }
      }
    }
    if (controls.pressed('horn')) audio.horn();
    projectiles.ammo.aiming = !p.vehicle && controls.active('aim');
    player.update(dt, controls, rig.yaw, audio, projectiles.ammo.aiming);
    if (controls.active('fire') || controls.pressed('fire')) projectiles.shoot(rig.camera, p);
    if (controls.pressed('reload')) projectiles.reload();
    projectiles.update(dt, p); missions.update(dt);
  }
  traffic.update(dt, p.position, rig.camera, elapsed, p.vehicle, audio);
  const hits = pedestrians.update(dt, p.position, rig.camera, p.vehicle, elapsed, wanted.state.level);
  if (hits) wanted.crime('reckless-driving', hits * 23, p.position);
  const seen = police.update(dt, p, projectiles); wanted.update(dt, seen, p.position);
  smokeClock -= dt;
  for (let n = 0; n < physics.vehicles.length; n++) {
    const car = physics.vehicles[n]; if (!car.active) continue;
    if (car.impact) { effects.impact(car.position.x, car.position.y + .5, car.position.z); car.impact = null; audio.crash(); }
    if (smokeClock <= 0 && car === p.vehicle && car.skid > .12) {
      const x = car.position.x - Math.sin(car.heading) * 1.5, z = car.position.z + Math.cos(car.heading) * 1.5;
      effects.smoke(x - .7, .4, z, false); effects.smoke(x + .7, .4, z, false); effects.skid(x, .1, z, car.heading);
    }
    if (smokeClock <= 0 && car.health < 35) effects.smoke(car.position.x, 1, car.position.z, true);
  }
  if (smokeClock <= 0) smokeClock = .055;
  effects.update(dt); signals(elapsed);
}
function present(time) {
  const p = player.state;
  hud.update(p, city.districtAt(p.position.x, p.position.z)); hud.mission(missions.getHUDInfo(), time * 1000);
  hud.wanted(wanted.state.level); hud.searching(wanted.state); hud.ammo(projectiles.ammo, !!p.vehicle); hud.lockHint(input.locked());
  let prompt = null;
  if (!dialogue.active) {
    if (p.vehicle) prompt = Math.abs(p.vehicle.speed) < 4 ? 'E / EXIT VEHICLE' : null;
    else { const nearby = traffic.nearestDoor(p.position.x, p.position.z); if (nearby) prompt = 'E / ' + (nearby.driver ? 'TAKE ' : 'ENTER ') + nearby.spec.name.toUpperCase(); }
  }
  hud.interaction(prompt); map.draw(p, time * 1000, traffic, wanted.state);
}
function render(time) { present(time); sea(time); sky.update(rig.camera, player.state.position); renderer.render(scene, rig.camera); frames++; }
function frame(timestamp) {
  requestAnimationFrame(frame); const dt = previous ? Math.min(.1, (timestamp - previous) / 1000) : STEP; previous = timestamp;
  if (input.pressed('pause') && !dialogue.active) setMode(mode === 'play' ? 'pause' : 'play');
  if (mode === 'play') {
    dialogue.update(dt); if (!dialogue.active) {
      rig.read(input); if (input.pressed('map')) map.toggle(); backlog += dt;
      while (backlog >= STEP) { simulate(STEP); input.endStep(); backlog -= STEP; if (dialogue.active) { backlog = 0; break; } }
    }
    rig.update(dt, player.state.position, player.state.vehicle, projectiles.ammo.aiming);
  } else if (mode === 'start') {
    elapsed += dt; traffic.update(dt, player.state.position, rig.camera, elapsed, null, audio); pedestrians.update(dt, player.state.position, rig.camera, null, elapsed);
    rig.camera.position.set(-39, 17, 101); rig.camera.lookAt(10, 9, -30);
  }
  audio.update(mode === 'play' ? player.state.vehicle : null); police.updateAudio(); render(elapsed);
}
addEventListener('resize', resize); canvas.addEventListener('click', () => { if (mode === 'play' && !dialogue.active) { input.capture(); audio.unlock(); } });
quality(params.get('quality') || 'standard'); setMode('start'); resetStreetLife(player.state.position);
window.sunburn = Object.freeze({ seed, shot, city, player: player.state, playerController: player, physics, camera: rig, map, progress, hud, traffic, pedestrians, police, wanted, projectiles, missions, dialogue,
  get mode() { return mode; }, get frames() { return frames; }, get drawCalls() { return renderer.info.render.calls; }, get triangles() { return renderer.info.render.triangles; },
  start: () => start(), save, load, simulate, render, neutral, setTime: sky.setTime,
  spawn(index) { const point = city.spawnPoints[index]; if (point) { player.reset(point); rig.reset(point.heading); } },
});
if (SHOT_NAMES.includes(shot)) {
  runShot(shot, { scene, city, player, traffic, pedestrians, police, wanted, missions, dialogue, effects, rig, sky, simulate, resetStreetLife, neutral,
    start() { start(false); }, render,
  }).catch(error => { window.__shotError = String(error); console.error(error); });
} else {
  if (shot === 'continue') load(); else if (shot === 'play') start();
  requestAnimationFrame(frame);
}
