import { STEP } from './config.js';
export const SHOT_NAMES = Object.freeze(['cover', 'foot', 'chase', 'brief']);
const ROAD = -174, WARMUP = 210, FRAMES = 3;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
function stageTraffic({ city, traffic }, origin) {
  const offsets = [[24, 1], [43, 1], [19, -1], [65, -1]];
  for (let i = 0; i < offsets.length; i++) {
    const [advance, direction] = offsets[i], x = origin.x + advance, z = ROAD + 3.6 * direction;
    const lane = city.lanes.find(segment => Math.abs(segment.az - z) < .1 && Math.sign(segment.bx - segment.ax) === direction && x > Math.min(segment.ax, segment.bx) + 12 && x < Math.max(segment.ax, segment.bx) - 12);
    if (!lane) continue;
    const actor = traffic.actors[i];
    actor.route = { lane, dx: direction, dz: 0, end: city.intersections[lane.to], onward: city.lanes.filter(candidate => candidate.from === lane.to && candidate.to !== lane.from).map(candidate => candidate.id) };
    actor.next = null; actor.t = Math.abs(x - lane.ax); actor.curve = actor.waiting = 0; actor.cruise = 10;
    const car = actor.car; car.active = car.ambient = true; car.driver = actor.driver; car.place(x, 0, z, direction * Math.PI / 2); car.speed = 8;
  }
}
function stageWalkers(pedestrians, driving) {
  const sidewalk = pedestrians.graph.sidewalks.find(({ from, to }) => driving
    ? Math.abs(from.z - ROAD - 9.25) < .2 && Math.abs(to.z - from.z) < .1 && Math.min(from.x, to.x) > 115 && Math.max(from.x, to.x) < 175
    : Math.abs(from.x + 9.25) < .1 && Math.abs(to.x - from.x) < .1 && Math.min(from.z, to.z) < 45 && Math.max(from.z, to.z) > 45);
  if (!sidewalk) return;
  const { from, to } = sidewalk;
  for (let i = 0; i < 9; i++) {
    const person = pedestrians.walkers[i], fraction = driving ? .12 + i * .085 : .45 + i * .05;
    person.position.set(from.x + (to.x - from.x) * fraction, .14, from.z + (to.z - from.z) * fraction);
    person.edge = sidewalk; person.from = from; person.to = to; person.active = true; person.mode = 'walk'; person.speed = 1.2 + .045 * i;
  }
}
function compose(camera, name, { x, z }) {
  if (name === 'cover') { camera.position.set(x - 9, 4.8, z + 7.7); camera.lookAt(x + 10, 2, z - 1); camera.fov = 59; }
  else if (name === 'chase') { camera.position.set(x + 12, 6.7, z + 12); camera.lookAt(x - 8, 1.2, z); camera.fov = 62; }
  else { camera.position.set(x - 4.8, 3.1, z + 7); camera.lookAt(x + 1.7, 1.9, z - 13); camera.fov = 60; }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
export async function runShot(name, game) {
  window.__shotReady = false;
  const { city, player, traffic, pedestrians, police, wanted, missions, dialogue, rig, sky } = game;
  const chase = name === 'chase', driving = chase || name === 'cover';
  const origin = driving ? { x: 116, z: -172, heading: Math.PI / 2 } : { x: -10.1, z: name === 'foot' ? 52 : 59, heading: 0 };
  game.start(); sky.setTime(chase ? .22 : .08); player.reset(origin); player.addRewards(driving ? 1450 : 350, driving ? 45 : 10); player.state.armour = driving ? 60 : 20;
  game.resetStreetLife(player.state.position); missions.load({ index: driving ? 1 : 0, state: 'active', step: 0 });
  let car = null;
  if (driving) {
    car = missions.cars[0]; car.place(origin.x, 0, origin.z, origin.heading); car.driver = { kind: 'ambient', id: 'transponder-driver' };
    const previous = player.enter(car); traffic.claim(car); if (previous) wanted.crime('car-theft', 16, car.position); missions.update(STEP); dialogue.skip();
    if (chase) wanted.crime('pursuit-escalation', 58, car.position); stageTraffic(game, origin);
  } else { traffic.starter.place(-7.3, 0, origin.z - .1, 0); traffic.starter.driver = null; }
  stageWalkers(pedestrians, driving); rig.reset(origin.heading, .14);
  const movement = { x: 0, z: 0 }, steering = { throttle: false, brake: false, steer: 0, handbrake: false };
  const controls = { movement: () => movement, driving: () => steering, active: () => false, pressed: () => false };
  function advance(ticks) { for (let i = 0; i < ticks; i++) { game.simulate(STEP, controls); rig.update(STEP, car?.seat ?? player.state.position, car); } }
  advance(WARMUP);
  if (chase) {
    let placed = 0;
    for (const unit of police.cruisers) {
      if (!unit.active) continue;
      unit.car.place(car.position.x - 9 - placed * 7, 0, car.position.z + (placed % 2 ? -3.2 : 2.4), Math.PI / 2); unit.car.speed = 17;
      if (++placed === 3) break;
    }
  }
  if (driving) { car.speed = chase ? 19 : 12; car.velocity.set(car.speed, 0); steering.throttle = true; steering.steer = chase ? -.7 : 0; steering.handbrake = chase; }
  const actionTicks = chase ? 32 : 28; advance(actionTicks);
  if (name === 'brief') { player.reset({ x: -13, z: 45.5, heading: 0 }); player.addRewards(350, 10); missions.update(STEP); dialogue.update(20); }
  compose(rig.camera, name, car?.position ?? player.state.position); await document.fonts.ready;
  for (let frame = 0; frame < FRAMES; frame++) { await nextFrame(); game.render(12 + frame * STEP); }
  window.__shotState = { name, seed: city.seed, ticks: WARMUP + actionTicks, frames: FRAMES, frozen: true, police: police.blips.length,
    missionIndex: missions.index, objectiveStep: missions.step, markerVisible: missions.marker.visible, wanted: wanted.state.level };
  window.__shotReady = true;
}
