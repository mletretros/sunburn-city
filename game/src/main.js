import * as THREE from 'three';
import { QUALITY, STEP, WORLD, DRIVE, PLAYER } from './config.js';
import { createCity } from './world/city.js';
import { createBatches } from './world/batch.js';
import { buildTerrain } from './world/terrain.js';
import { buildBuildings } from './world/buildings.js';
import { buildProps } from './world/props.js';
import { buildSky } from './world/sky.js';
import { buildSignals } from './world/signals.js';
import { createPlayer } from './entities/player.js';
import { createTraffic } from './entities/traffic.js';
import { createPedestrians } from './entities/pedestrians.js';
import { createPolice } from './entities/police.js';
import { createProjectiles } from './entities/projectiles.js';
import { createPhysics } from './systems/physics.js';
import { createFollowCamera } from './systems/camera.js';
import { createWanted } from './systems/wanted.js';
import { createMissions } from './systems/missions.js';
import { readSlot, writeSlot } from './systems/save.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createMenus } from './ui/menus.js';
import { createDialogue } from './ui/dialogue.js';
import { createEffects } from './render/effects.js';
import { runShot, SHOT_NAMES } from './shots.js';

const query = new URLSearchParams(location.search), seed = query.get('seed')?.slice(0, 128) || WORLD.seed, shot = query.get('shot');
const initialQuality = Object.hasOwn(QUALITY, query.get('quality')) ? query.get('quality') : 'standard';
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: initialQuality !== 'low', powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.type = THREE.BasicShadowMap;
const scene = new THREE.Scene(), city = createCity(seed), batches = createBatches(scene), sea = buildTerrain(scene, city, batches), signs = buildBuildings(city, batches);
buildProps(city, batches, signs); const signals = buildSignals(scene, city, batches); batches.finish();
const physics = createPhysics(city), player = createPlayer(scene, city, physics), traffic = createTraffic(scene, city, physics), pedestrians = createPedestrians(scene, city, physics);
const sky = buildSky(scene), rig = createFollowCamera(city), showcase = new THREE.PerspectiveCamera(58, 1, .1, 1220);
const audio = createAudio(), input = createInput(canvas), hud = createHud(), map = createMinimap(city), wanted = createWanted(), effects = createEffects(scene, seed);
const police = createPolice(scene, city, physics, wanted, audio), projectiles = createProjectiles(scene, physics, effects, audio, wanted, pedestrians, police, seed), dialogue = createDialogue();
const progress = { mission: 0, seconds: 0, completed: [] };
const missions = createMissions({ scene, city, physics, player, wanted, dialogue, hud, input, projectiles,
  onChange(index, completed) { progress.mission = index; progress.completed = completed; } });
projectiles.setMissionCombat(missions); map.markers.police = police.blips; map.markers.mission = missions.getHUDInfo();
wanted.subscribe(level => { hud.toast(level ? `Civic Guard alert · ${level} / 5` : 'Heat cleared'); if (level) audio.wanted(); });
let mode = 'start', accumulator = 0, lastFrame = 0, worldTime = 0, streetTime = 0, frames = 0;
let displayedCar = null, doorPrompt = null, damage = 0, damageAngle = 0, exhaust = 0, recovery = 0;
function onHit(source) { const p = player.state.position; damage = 1; damageAngle = Math.atan2(source.x - p.x, p.z - source.z) - rig.yaw; }
function resetStreetLife(position) {
  streetTime = 0; displayedCar = doorPrompt = null; damage = exhaust = recovery = 0;
  wanted.reset(); police.reset(); projectiles.reset(); effects.reset(); traffic.reset(position); pedestrians.reset(position); signals(0);
}
function updateStreetLife(dt, camera) {
  streetTime += dt; const { position, vehicle } = player.state;
  traffic.update(dt, position, camera, streetTime, vehicle, audio);
  const hits = pedestrians.update(dt, position, camera, vehicle, streetTime, wanted.state.level);
  if (hits) wanted.crime('vehicle-hit', 23 * hits, position);
  if (mode === 'play') wanted.update(dt, police.update(dt, player.state, projectiles, onHit), position);
}
function updateVehicleEffects(dt) {
  const p = player.state; exhaust -= dt;
  for (let i = 0; i < physics.vehicles.length; i++) {
    const car = physics.vehicles[i]; if (!car.active) continue; const { x, y, z } = car.position;
    if (car.impact) {
      if (car === p.vehicle || Math.hypot(x - p.position.x, z - p.position.z) < 22) { effects.impact(x, y + .58, z); audio.crash(); }
      if (car === p.vehicle && car.impact.police) wanted.crime('cruiser-damage', 13, p.position); car.impact = null;
    }
    if (!car.health && !car.destroyed) {
      if (car === p.vehicle) { car.speed = 0; p.health = player.exit() ? Math.max(0, p.health - 24) : 0; }
      effects.explosion(x, y + .73, z); audio.explosion(); car.destroy(); continue;
    }
    if (exhaust > 0) continue; const { c, s } = car.footprint;
    if (car.health < 48) effects.smoke(x + s * car.spec.length * .32, y + car.spec.sill, z - c * car.spec.length * .32, true);
    if (car === p.vehicle && car.skid > .23) {
      const back = car.spec.length * .3, track = car.spec.width * .41;
      effects.smoke(x - s * back, y + .24, z + c * back, false);
      effects.skid(x - s * back + c * track, y, z + c * back + s * track, car.heading); effects.skid(x - s * back - c * track, y, z + c * back - s * track, car.heading);
    }
  }
  if (exhaust <= 0) { exhaust = .105; if (p.onFoot && p.grounded && p.velocity.lengthSq() > 35 && !city.isOnRoad(p.position.x, p.position.z)) effects.dust(p.position.x, p.position.y + .05, p.position.z); }
}
function updatePlayer(dt, controls) {
  const p = player.state;
  if (p.health <= 0) {
    if (!recovery) { missions.failMission('Mars is down'); hud.toast('Down · Returning to Palma street clinic'); player.setDown(true); }
    recovery += dt;
    if (recovery > 2.5) { const fee = Math.min(60, p.cash); player.respawn(); resetStreetLife(p.position); rig.reset(p.heading); hud.toast(`Palma street clinic · Hospital fee $${fee} · Heat cleared`); }
    return;
  }
  const fire = controls.pressed('fire') || controls.active('fire'); projectiles.ammo.aiming = !p.vehicle && controls.active('aim');
  if (p.vehicle) {
    if (controls.pressed('horn')) audio.horn();
    if (controls.pressed('exit')) { if (player.exit()) audio.door(); else hud.toast(Math.abs(p.vehicle.speed) > DRIVE.exitSpeed ? 'Slow down to get out' : 'No room to get out'); }
  } else if (controls.pressed('interact')) {
    const car = traffic.nearestDoor(p.position.x, p.position.z);
    if (car) { const prior = player.enter(car); traffic.claim(car); if (prior?.kind === 'ambient') { wanted.crime('car-theft', 16, p.position); pedestrians.eject(car, prior, player.findExit()); } audio.door(); }
  }
  player.update(dt, controls, rig.yaw, audio, projectiles.ammo.aiming || fire);
  if (fire) projectiles.shoot(rig.camera, p); if (controls.pressed('reload')) projectiles.reload();
  const cash = projectiles.update(dt, p); if (cash) hud.toast(`Cash recovered · $${cash}`);
}
function simulate(dt, controls = input) {
  updatePlayer(dt, controls); updateStreetLife(dt, rig.camera); updateVehicleEffects(dt); effects.update(dt); damage = Math.max(0, damage - dt * 2.65); missions.update(dt); progress.seconds += dt;
}
function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight || 1; renderer.setSize(width, height, false); rig.camera.aspect = showcase.aspect = width / height; rig.camera.updateProjectionMatrix(); showcase.updateProjectionMatrix();
}
function quality(name) { const preset = QUALITY[name]; renderer.shadowMap.enabled = !!preset.shadow; renderer.setPixelRatio(Math.min(devicePixelRatio, preset.ratio)); sky.quality(preset.shadow); resize(); }
function setMode(next) {
  mode = next; accumulator = 0; input.clear(); if (mode !== 'play') { input.release(); audio.update(null, false); audio.siren(null); }
  hud.visible(mode === 'play'); menus.show(mode, mode === 'play' ? null : readSlot()); if (mode === 'pause') menus.missionLog(missions, player.state); if (mode === 'play') canvas.focus({ preventScroll: true });
}
function restart(sound) {
  progress.mission = progress.seconds = 0; player.reset(); rig.reset(player.state.heading); resetStreetLife(player.state.position); missions.reset(); setMode('play'); if (sound) audio.unlock(); missions.offer();
}
function load() {
  const saved = readSlot(); if (!saved) { menus.slot(null); menus.message('No readable save was found.'); return; }
  if (saved.seed !== seed) { const url = new URL(location.href); url.searchParams.set('seed', saved.seed); url.searchParams.set('shot', 'continue'); location.assign(url); return; }
  const { x, z } = saved, { bounds } = city;
  if (x < bounds.west || x > bounds.east || z < bounds.north || z > bounds.south || physics.circleBlocked(x, physics.groundAt(x, z), z, PLAYER.radius, 1.65, null, false)) { menus.message('The save location is outside the playable city.'); return; }
  player.reset(saved); resetStreetLife(player.state.position); if (physics.circleBlocked(x, player.state.position.y, z, PLAYER.radius)) player.reset();
  const p = player.state; p.cash = saved.cash; p.reputation = saved.reputation; p.health = saved.health; p.armour = saved.armour; missions.load(saved.story);
  if (saved.wanted?.heat > 0) wanted.crime('restored-pursuit', saved.wanted.heat, saved.wanted);
  if (saved.ammo) { projectiles.ammo.current = saved.ammo.current; projectiles.ammo.reserve = saved.ammo.reserve; }
  progress.mission = saved.mission; progress.seconds = saved.seconds; rig.reset(saved.heading); setMode('play'); hud.toast('Local save loaded'); if (missions.state === 'offered') missions.offer();
}
const menus = createMenus({
  newGame: () => restart(true), restart: () => restart(true), resume() { setMode('play'); input.capture(); audio.unlock(); },
  save() {
    const p = player.state, position = p.vehicle ? player.findExit() ?? city.spawnPoints[0] : p.position;
    const saved = writeSlot(city, p, progress, position, missions.save(), wanted.state, projectiles.ammo); menus.slot(readSlot()); menus.message(saved ? 'Saved on this browser.' : 'Local storage is unavailable.');
  },
  load() { audio.unlock(); load(); }, quality, sensitivity(value) { rig.sensitivity = value; }, mute: audio.mute,
  jobs() { menus.missionLog(missions, player.state); }, startMission() { setMode('play'); audio.unlock(); if (missions.state !== 'active') missions.offer(); },
}, initialQuality);
function doorInteraction() {
  const p = player.state; if (p.vehicle) { hud.interaction(Math.abs(p.vehicle.speed) <= DRIVE.exitSpeed ? 'E  ·  Exit vehicle' : null); return; }
  const car = traffic.nearestDoor(p.position.x, p.position.z);
  if (car !== displayedCar) { displayedCar = car; doorPrompt = car ? `E  ·  ${car.driver ? 'Take' : 'Enter'} ${car.spec.name}` : null; } hud.interaction(doorPrompt);
}
function present(now) {
  const p = player.state; hud.mission(missions.getHUDInfo(), now);
  if (dialogue.active) { hud.interaction(null); audio.update(null, false); } else { doorInteraction(); audio.update(p.vehicle); }
  police.updateAudio(); hud.wanted(wanted.state.level); hud.searching(wanted.state); hud.damageDirection(damage, damageAngle); hud.ammo(projectiles.ammo, !!p.vehicle);
  hud.update(p, city.districtAt(p.position.x, p.position.z)); hud.lockHint(input.locked()); map.draw(p, now, traffic, wanted.state);
}
function draw(camera, time) { sea(time); sky.update(camera, player.state.position); renderer.render(scene, camera); frames++; }
function frame(now) {
  requestAnimationFrame(frame); const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : STEP; lastFrame = now; worldTime += dt;
  if (input.pressed('pause') && !dialogue.active) { if (mode === 'play') setMode('pause'); else if (mode === 'pause') setMode('play'); }
  if (mode === 'start') {
    const drift = Math.sin(worldTime * .17); showcase.position.set(-35 + drift * 3.3, 15.6 + drift, 99 - drift * 5.2); showcase.lookAt(12, 9, -5); accumulator += dt;
    while (accumulator >= STEP) { updateStreetLife(STEP, showcase); accumulator -= STEP; } pedestrians.render(); signals(streetTime); draw(showcase, worldTime); return;
  }
  if (mode === 'play') {
    dialogue.update(dt); if (!dialogue.active) rig.read(input); if (input.pressed('map')) map.toggle(); accumulator += dt; let ticked = false;
    while (accumulator >= STEP) { if (dialogue.active) { accumulator = 0; input.clear(); break; } simulate(STEP); accumulator -= STEP; ticked = true; input.endStep(); }
    if (ticked) { pedestrians.render(); signals(streetTime); } present(now);
  }
  rig.update(dt, player.state.vehicle?.seat ?? player.state.position, player.state.vehicle, projectiles.ammo.aiming); draw(rig.camera, worldTime);
}
window.addEventListener('resize', resize); canvas.addEventListener('click', () => { if (mode === 'play' && !dialogue.active) { input.capture(); audio.unlock(); } });
hud.wanted(0); hud.interaction(null); quality(initialQuality); resetStreetLife(player.state.position); setMode('start');
window.sunburn = Object.freeze({
  seed, shot, city, player: player.state, camera: rig, map, progress, hud, traffic, pedestrians, police, wanted, projectiles, missions, dialogue,
  get mode() { return mode; }, get frames() { return frames; }, get drawCalls() { return renderer.info.render.calls; }, get triangles() { return renderer.info.render.triangles; },
  start: () => restart(false), setTime: sky.setTime, spawn(index) { const point = city.spawnPoints[index]; if (point) { player.reset(point); rig.reset(point.heading); } },
});
if (shot === 'continue') { const url = new URL(location.href); url.searchParams.delete('shot'); history.replaceState(null, '', url); if (readSlot()?.seed === seed) load(); } else if (shot === 'play') restart(false);
if (SHOT_NAMES.includes(shot)) {
  void runShot(shot, { city, player, traffic, pedestrians, police, wanted, missions, dialogue, rig, sky, simulate, resetStreetLife,
    start() { player.reset(); resetStreetLife(player.state.position); missions.reset(); setMode('play'); },
    render(time) { pedestrians.render(); signals(streetTime); present(time * 1000); draw(rig.camera, time); },
  }).catch(error => { console.error(error); window.__shotError = error.message; });
} else requestAnimationFrame(frame);
