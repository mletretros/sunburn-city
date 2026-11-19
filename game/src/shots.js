import { STEP } from './config.js';

export const SHOT_NAMES = Object.freeze(['cover', 'foot', 'chase', 'brief']);

// These are deterministic saved-game arrangements, not alternate renderers.
// Every actor retains its normal route, collision, animation and mission logic.
export async function runShot(name, game) {
  window.__shotReady = false;
  const { city, player, traffic, pedestrians, police, wanted, missions, dialogue, rig, sky } = game;
  game.start(); sky.setTime(name === 'chase' ? .22 : .08);
  const driving = name === 'cover' || name === 'chase';
  const origin = driving ? { x: 116, z: -172, heading: Math.PI / 2 } : { x: -10.1, z: name === 'foot' ? 52 : 59, heading: 0 };
  player.reset(origin); player.addRewards(driving ? 1450 : 350, driving ? 45 : 10);
  player.state.armour = driving ? 60 : 20;
  game.resetStreetLife(player.state.position);
  // Restore through the same validated mission runtime used by browser saves.
  missions.load(driving ? { index: 1, state: 'active', step: 0 } : { index: 0, state: 'active', step: 0 });
  let car;
  if (driving) {
    car = missions.cars[0];
    car.place(origin.x, 0, origin.z, origin.heading);
    car.driver = { kind: 'ambient', id: 'transponder-driver' };
    const driver = player.enter(car); traffic.claim(car);
    if (driver) wanted.crime('car-theft', 16, car.position);
    missions.update(STEP); // Entering the actual target car advances the steal objective.
    dialogue.skip();
    if (name === 'chase') wanted.crime('pursuit-escalation', 58, car.position);
  } else {
    traffic.starter.place(-7.3, 0, origin.z - .1, 0);
    traffic.starter.driver = null;
  }

  // Stage road users on legal graph edges, then let the normal AI move them.
  const roadZ = -174, focusX = origin.x;
  if (driving) {
    const placements = [[focusX + 24, roadZ + 3.6, 1], [focusX + 43, roadZ + 3.6, 1], [focusX + 19, roadZ - 3.6, -1], [focusX + 65, roadZ - 3.6, -1]];
    placements.forEach(([x, z, direction], i) => {
      const actor = traffic.actors[i];
      const lane = city.lanes.find(l => Math.abs(l.az - z) < .1 && Math.sign(l.bx - l.ax) === direction && x > Math.min(l.ax, l.bx) + 12 && x < Math.max(l.ax, l.bx) - 12);
      if (!lane) return;
      const end = city.intersections[lane.to];
      actor.route = { lane, dx: direction, dz: 0, end, onward: city.lanes.filter(l => l.from === lane.to && l.to !== lane.from).map(l => l.id) };
      actor.next = null; actor.t = Math.abs(x - lane.ax); actor.curve = actor.waiting = 0; actor.cruise = 10;
      actor.car.active = actor.car.ambient = true; actor.car.driver = actor.driver;
      actor.car.place(x, 0, z, direction * Math.PI / 2); actor.car.speed = 8;
    });
  }
  const edges = pedestrians.graph.sidewalks;
  const walkEdge = edges.find(e => driving
    ? Math.abs(e.from.z - (roadZ + 9.25)) < .2 && Math.abs(e.to.z - e.from.z) < .1 && Math.min(e.from.x, e.to.x) > 115 && Math.max(e.from.x, e.to.x) < 175
    : Math.abs(e.from.x + 9.25) < .1 && Math.abs(e.to.x - e.from.x) < .1 && Math.min(e.from.z, e.to.z) < 45 && Math.max(e.from.z, e.to.z) > 45);
  if (walkEdge) for (let i = 0; i < 9; i++) {
    const person = pedestrians.walkers[i], t = driving ? .12 + i * .085 : .45 + i * .05;
    person.position.set(walkEdge.from.x + (walkEdge.to.x - walkEdge.from.x) * t, .14, walkEdge.from.z + (walkEdge.to.z - walkEdge.from.z) * t);
    person.edge = walkEdge; person.from = walkEdge.from; person.to = walkEdge.to;
    person.active = true; person.mode = 'walk'; person.speed = 1.2 + i * .045;
  }
  rig.reset(origin.heading, .14);
  const idle = { movement: () => ({ x: 0, z: 0 }), driving: () => ({ throttle: false, brake: false, steer: 0, handbrake: false }), active: () => false, pressed: () => false };
  // Warm up the actual dispatch, street AI and animation clocks at 60 Hz.
  for (let tick = 0; tick < 210; tick++) {
    game.simulate(STEP, idle);
    rig.update(STEP, car?.seat ?? player.state.position, car);
  }
  if (name === 'chase') {
    const p = car.position;
    police.cruisers.filter(u => u.active).slice(0, 3).forEach((unit, i) => {
      unit.car.place(p.x - 9 - i * 7, 0, p.z + (i % 2 ? -3.2 : 2.4), Math.PI / 2);
      unit.car.speed = 17;
    });
    car.speed = 19; car.velocity.set(19, 0);
  } else if (driving) { car.speed = 12; car.velocity.set(12, 0); }
  const action = { ...idle, driving: () => ({ throttle: driving, brake: false, steer: name === 'chase' ? -.7 : 0, handbrake: name === 'chase' }) };
  for (let tick = 0; tick < (name === 'chase' ? 32 : 28); tick++) {
    game.simulate(STEP, action);
    rig.update(STEP, car?.seat ?? player.state.position, car);
  }
  if (name === 'brief') {
    // Reaching Duke's contact naturally triggers his mid-mission radio call.
    player.reset({ x: -13, z: 45.5, heading: 0 }); player.addRewards(350, 10);
    missions.update(STEP);
    dialogue.update(20);
  }
  // A composed camera still observes the same 3D world and player models.
  const p = car?.position ?? player.state.position;
  if (name === 'cover') {
    rig.camera.position.set(p.x - 9, 4.8, p.z + 7.7); rig.camera.lookAt(p.x + 10, 2, p.z - 1);
    rig.camera.fov = 59;
  } else if (name === 'chase') {
    rig.camera.position.set(p.x + 12, 6.7, p.z + 12); rig.camera.lookAt(p.x - 8, 1.2, p.z);
    rig.camera.fov = 62;
  } else {
    rig.camera.position.set(p.x - 4.8, 3.1, p.z + 7); rig.camera.lookAt(p.x + 1.7, 1.9, p.z - 13);
    rig.camera.fov = 60;
  }
  rig.camera.updateProjectionMatrix(); rig.camera.updateMatrixWorld(true);
  await document.fonts.ready;
  // Render multiple real frames before freezing; no pause screen is involved.
  for (let frame = 0; frame < 3; frame++) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    game.render(12 + frame * STEP);
  }
  window.__shotState = { name, seed: city.seed, ticks: 210 + (name === 'chase' ? 32 : 28), frames: 3, frozen: true };
  window.__shotReady = true;
}
