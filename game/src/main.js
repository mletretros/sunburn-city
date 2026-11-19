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
import { createPhysics } from './systems/physics.js';
import { createFollowCamera } from './systems/camera.js';
import { readSlot, writeSlot } from './systems/save.js';
import { createInput } from './input.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createMenus } from './ui/menus.js';
import { createDialogue } from './ui/dialogue.js';
import { createAudio } from './audio.js';
import { createWanted } from './systems/wanted.js';
import { createMissions } from './systems/missions.js';
import { createEffects } from './render/effects.js';
import { createProjectiles } from './entities/projectiles.js';
import { createPolice } from './entities/police.js';
import { runShot, SHOT_NAMES } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = params.get('seed')?.slice(0, 128) || WORLD.seed;
const shot = params.get('shot');
const requested = params.get('quality');
const initialQuality = Object.hasOwn(QUALITY, requested) ? requested : 'standard';
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: initialQuality !== 'low', powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.BasicShadowMap;

const city = createCity(seed), scene = new THREE.Scene(), batches = createBatches(scene);
const sea = buildTerrain(scene, city, batches);
const signs = buildBuildings(city, batches);
buildProps(city, batches, signs);
const signals = buildSignals(scene, city, batches);
batches.finish();
const physics = createPhysics(city), player = createPlayer(scene, city, physics);
const traffic = createTraffic(scene, city, physics), pedestrians = createPedestrians(scene, city, physics);
const sky = buildSky(scene), rig = createFollowCamera(city), audio = createAudio();
const showcase = new THREE.PerspectiveCamera(58, 1, .1, 1220);
const input = createInput(canvas), hud = createHud(), map = createMinimap(city);
const wanted = createWanted(), effects = createEffects(scene, seed);
const police = createPolice(scene, city, physics, wanted, audio);
const projectiles = createProjectiles(scene, physics, effects, audio, wanted, pedestrians, police, seed);
const dialogue = createDialogue();
const progress = { mission: 0, seconds: 0, completed: [] };
const missions = createMissions({ scene, city, physics, player, wanted, dialogue, hud, input, projectiles,
  onChange(index, completed) { progress.mission = index; progress.completed = completed; } });
projectiles.setMissionCombat(missions);
map.markers.police = police.blips;
map.markers.mission = missions.getHUDInfo();
wanted.subscribe(level => {
  hud.toast(level ? `Civic Guard alert · ${level} / 5` : 'Heat cleared');
  if (level) audio.wanted();
});
let mode = 'start', accumulator = 0, previous = 0, worldTime = 0, streetTime = 0, frames = 0, district;
let displayedCar = null, doorPrompt = null;
let damage = 0, damageAngle = 0, exhaust = 0, recovery = 0;

function onHit(source) {
  const p = player.state.position;
  damage = 1; damageAngle = Math.atan2(source.x - p.x, p.z - source.z) - rig.yaw;
}

function resetStreetLife(position) {
  streetTime = 0; displayedCar = null; doorPrompt = null;
  damage = exhaust = recovery = 0;
  wanted.reset(); police.reset(); projectiles.reset(); effects.reset();
  traffic.reset(position); pedestrians.reset(position); signals(0);
}

function updateStreetLife(dt, camera) {
  streetTime += dt;
  const { position, vehicle } = player.state;
  traffic.update(dt, position, camera, streetTime, vehicle, audio);
  const knocked = pedestrians.update(dt, position, camera, vehicle, streetTime, wanted.state.level);
  if (knocked) wanted.crime('vehicle-hit', 23 * knocked, position);
  if (mode === 'play') wanted.update(dt, police.update(dt, player.state, projectiles, onHit), position);
}

function updateVehicleEffects(dt) {
  const state = player.state;
  exhaust -= dt;
  for (const car of physics.vehicles) {
    if (!car.active) continue;
    const { x, y, z } = car.position;
    if (car.impact) {
      if (car === state.vehicle || Math.hypot(x - state.position.x, z - state.position.z) < 22) {
        effects.impact(x, y + .58, z); audio.crash();
      }
      if (car === state.vehicle && car.impact.police) wanted.crime('cruiser-damage', 13, state.position);
      car.impact = null;
    }
    if (!car.health && !car.destroyed) {
      if (car === state.vehicle) { car.speed = 0; if (!player.exit()) state.health = 0; else state.health = Math.max(0, state.health - 24); }
      effects.explosion(x, y + .73, z); audio.explosion(); car.destroy();
    } else if (exhaust <= 0) {
      if (car.health < 48) effects.smoke(x + car.footprint.s * car.spec.length * .32, y + car.spec.sill, z - car.footprint.c * car.spec.length * .32, true);
      if (car.skid > .23 && car === state.vehicle) {
        const { c, s } = car.footprint, a = car.spec.length * .30, b = car.spec.width * .41;
        effects.smoke(x - s * a, y + .24, z + c * a, false);
        effects.skid(x - s * a + c * b, y, z + c * a + s * b, car.heading);
        effects.skid(x - s * a - c * b, y, z + c * a - s * b, car.heading);
      }
    }
  }
  if (exhaust <= 0) {
    exhaust = .105;
    if (state.onFoot && state.grounded && state.velocity.lengthSq() > 35 && !city.isOnRoad(state.position.x, state.position.z)) effects.dust(state.position.x, state.position.y + .05, state.position.z);
  }
}

function updatePlayer(dt, controls = input) {
  const state = player.state;
  if (state.health <= 0) {
    if (!recovery) { missions.failMission('Mars is down'); hud.toast('Down · Returning to Palma street clinic'); player.setDown(true); }
    recovery += dt;
    if (recovery > 2.5) {
      const fee = Math.min(60, state.cash);
      player.respawn(); resetStreetLife(state.position); rig.reset(state.heading);
      hud.toast(`Palma street clinic · Hospital fee $${fee} · Heat cleared`);
    }
    return;
  }
  const fire = input.pressed('fire') || input.active('fire');
  projectiles.ammo.aiming = !state.vehicle && input.active('aim');
  if (state.vehicle) {
    if (input.pressed('horn')) audio.horn();
    if (input.pressed('exit')) {
      if (player.exit()) audio.door();
      else hud.toast(Math.abs(state.vehicle.speed) > DRIVE.exitSpeed ? 'Slow down to get out' : 'No room to get out');
    }
  } else if (input.pressed('interact')) {
    const car = traffic.nearestDoor(state.position.x, state.position.z);
    if (car) {
      const driver = player.enter(car);
      traffic.claim(car);
      if (driver?.kind === 'ambient') wanted.crime('car-theft', 16, state.position);
      if (driver?.kind === 'ambient') pedestrians.eject(car, driver, player.findExit());
      audio.door();
    }
  }
  player.update(dt, controls, rig.yaw, audio, projectiles.ammo.aiming || fire);
  if (fire) projectiles.shoot(rig.camera, state);
  if (input.pressed('reload')) projectiles.reload();
  const cash = projectiles.update(dt, state);
  if (cash) hud.toast(`Cash recovered · $${cash}`);
}

function updateDoorPrompt(state) {
  if (state.vehicle) {
    hud.interaction(Math.abs(state.vehicle.speed) <= DRIVE.exitSpeed ? 'E  ·  Exit vehicle' : null);
    return;
  }
  const car = traffic.nearestDoor(state.position.x, state.position.z);
  if (car !== displayedCar) {
    displayedCar = car;
    doorPrompt = car ? `E  ·  ${car.driver ? 'Take' : 'Enter'} ${car.spec.name}` : null;
  }
  hud.interaction(doorPrompt);
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight || 1;
  renderer.setSize(w, h, false);
  for (const camera of [rig.camera, showcase]) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
function quality(key) {
  const preset = QUALITY[key];
  renderer.shadowMap.enabled = !!preset.shadow;
  renderer.setPixelRatio(Math.min(devicePixelRatio, preset.ratio));
  sky.quality(preset.shadow);
  resize();
}
function setMode(next) {
  mode = next; accumulator = 0; input.clear();
  if (mode !== 'play') input.release();
  if (mode !== 'play') audio.update(null, false);
  if (mode !== 'play') audio.siren(null);
  hud.visible(mode === 'play'); menus.show(mode, mode === 'play' ? null : readSlot());
  if (mode === 'pause') menus.missionLog(missions, player.state);
  if (mode === 'play') canvas.focus({ preventScroll: true });
}
function restart(capture) {
     progress.mission = 0; progress.seconds = 0; district = undefined;
    player.reset(); rig.reset(player.state.heading);
    resetStreetLife(player.state.position);
    missions.reset();
    setMode('play');
    if (capture) audio.unlock();
    missions.offer();
  }
  function load() {
  const data = readSlot();
  if (!data) { menus.slot(null); menus.message('No readable save was found.'); return; }
  if (data.seed !== seed) {
    const url = new URL(location.href);
    url.searchParams.set('seed', data.seed); url.searchParams.set('shot', 'continue');
    location.assign(url); return;
  }
  const { bounds } = city;
  if (data.x < bounds.west || data.x > bounds.east || data.z < bounds.north || data.z > bounds.south ||
    physics.circleBlocked(data.x, physics.groundAt(data.x, data.z), data.z, PLAYER.radius, 1.65, null, false)) {
    menus.message('The save location is outside the playable city.'); return;
  }
player.reset(data);
    resetStreetLife(player.state.position);
    if (physics.circleBlocked(data.x, player.state.position.y, data.z, PLAYER.radius)) player.reset();
    Object.assign(player.state, { cash: data.cash, reputation: data.reputation, health: data.health, armour: data.armour });
    missions.load(data.story);
    if (data.wanted && Number.isFinite(data.wanted.heat) && data.wanted.heat > 0) {
      const position = Number.isFinite(data.wanted.x) && Number.isFinite(data.wanted.z) ? data.wanted : player.state.position;
      wanted.crime('restored-pursuit', Math.min(100, data.wanted.heat), position);
    }
    if (data.ammo) {
      projectiles.ammo.current = Math.max(0, Math.min(12, Math.floor(data.ammo.current) || 0));
      projectiles.ammo.reserve = Math.max(0, Math.min(144, Math.floor(data.ammo.reserve) || 0));
    }
    progress.mission = data.mission; progress.seconds = data.seconds; district = undefined;
    rig.reset(data.heading); setMode('play'); hud.toast('Local save loaded');
    if (missions.state === 'offered') missions.offer();
  }
const menus = createMenus({
    newGame: () => restart(true), restart: () => restart(true),
    resume: () => { setMode('play'); input.capture(); audio.unlock(); },
    save() {
      const state = player.state, safe = state.vehicle ? player.findExit() ?? city.spawnPoints[0] : state.position;
      const ok = writeSlot(city, state, progress, safe, missions.save(), wanted.state, projectiles.ammo);
      menus.slot(readSlot()); menus.message(ok ? 'Saved on this browser.' : 'Local storage is unavailable.');
    },
    load: () => { audio.unlock(); load(); }, quality, sensitivity: value => { rig.sensitivity = value; }, mute: audio.mute,
    jobs: () => menus.missionLog(missions, player.state),
    startMission: () => {
      setMode('play'); audio.unlock();
      if (missions.state !== 'active') missions.offer();
    }
  }, initialQuality);

window.addEventListener('resize', resize);
canvas.addEventListener('click', () => { if (mode === 'play' && !dialogue.active) { input.capture(); audio.unlock(); } });
hud.wanted(0); hud.interaction(null);
  quality(initialQuality);
  resetStreetLife(player.state.position);
  setMode('start');
if (shot === 'continue') {
  const url = new URL(location.href);
  url.searchParams.delete('shot'); history.replaceState(null, '', url);
  if (readSlot()?.seed === seed) load();
} else if (shot === 'play') restart(false);

// Normal play and deterministic captures share the same simulation and HUD paths.
function simulate(dt, controls = input) {
  updatePlayer(dt, controls); updateStreetLife(dt, rig.camera);
  updateVehicleEffects(dt); effects.update(dt);
  damage = Math.max(0, damage - dt * 2.65);
  missions.update(dt); progress.seconds += dt;
}
function presentHud(now) {
  const state = player.state, key = city.districtAt(state.position.x, state.position.z);
  district = key; hud.mission(missions.getHUDInfo(), now);
  if (dialogue.active) { hud.interaction(null); audio.update(null, false); }
  else { updateDoorPrompt(state); audio.update(state.vehicle); }
  police.updateAudio(); hud.wanted(wanted.state.level); hud.searching(wanted.state);
  hud.damageDirection(damage, damageAngle); hud.ammo(projectiles.ammo, !!state.vehicle);
  hud.update(state, key); hud.lockHint(input.locked()); map.draw(state, now, traffic, wanted.state);
}
function render(now) {
  requestAnimationFrame(render);
  const dt = previous ? Math.min((now - previous) / 1000, .10) : STEP;
  previous = now; worldTime += dt;
  if (input.pressed('pause') && !dialogue.active) {
    if (mode === 'play') setMode('pause');
    else if (mode === 'pause') setMode('play');
  }
  let camera = rig.camera;
  if (mode === 'start') {
    camera = showcase;
    const drift = Math.sin(worldTime * .17);
    showcase.position.set(-35 + drift * 3.3, 15.6 + drift, 99 - drift * 5.2);
    showcase.lookAt(12, 9, -5);
    accumulator += dt;
    while (accumulator >= STEP) { updateStreetLife(STEP, showcase); accumulator -= STEP; }
    pedestrians.render(); signals(streetTime);
  } else {
    if (mode === 'play') {
      dialogue.update(dt);
      if (!dialogue.active) rig.read(input);
      if (input.pressed('map')) map.toggle();
      accumulator += dt;
      let ticked = false;
      while (accumulator >= STEP) {
        if (dialogue.active) { accumulator = 0; input.clear(); break; }
        simulate(STEP);
        ticked = true;
        accumulator -= STEP;
        input.endStep();
      }
      if (ticked) { pedestrians.render(); signals(streetTime); }
      presentHud(now);
    }
    rig.update(dt, player.state.vehicle?.seat ?? player.state.position, player.state.vehicle, projectiles.ammo.aiming);
  }
  sea(worldTime);
  sky.update(camera, player.state.position);
  renderer.render(scene, camera);
  frames++;
}

window.sunburn = Object.freeze({ seed, shot, city, player: player.state, camera: rig, map, progress, hud, traffic, pedestrians, police, wanted, projectiles, missions, dialogue,
  get mode() { return mode; }, get frames() { return frames; },
  get drawCalls() { return renderer.info.render.calls; },
  get triangles() { return renderer.info.render.triangles; },
  start: () => restart(false), setTime: sky.setTime,
  spawn(index) {
    const point = city.spawnPoints[index];
    if (point) { player.reset(point); rig.reset(point.heading); }
  },
});
if (SHOT_NAMES.includes(shot)) {
  runShot(shot, { city, player, traffic, pedestrians, police, wanted, missions, dialogue, rig, sky,
    start() { player.reset(); resetStreetLife(player.state.position); missions.reset(); setMode('play'); },
    resetStreetLife, simulate,
    render(time) {
      pedestrians.render(); signals(streetTime); presentHud(time * 1000);
      sea(time); sky.update(rig.camera, player.state.position); renderer.render(scene, rig.camera); frames++;
    } });
} else requestAnimationFrame(render);
