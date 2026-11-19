import * as THREE from 'three';
import { PLAYER as P, DRIVE } from '../config.js';

const box = new THREE.BoxGeometry(), sphere = new THREE.IcosahedronGeometry(1, 1);
const cylinder = new THREE.CylinderGeometry(.83, 1, 1, 8);
const blend = (rate, dt) => 1 - Math.exp(-rate * dt);

const EXIT_OFFSETS = [-1, 1, -2, 2, -3, 3];

export function createPlayer(scene, city, physics) {
  const root = new THREE.Group(), body = new THREE.Group(), colors = P.colors;
  const mats = Object.fromEntries(Object.entries(colors).map(([name, color]) => [name, new THREE.MeshStandardMaterial({ color, roughness: .86 })]));
  function part(parent, geo, name, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(geo, mats[name]);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true;
    parent.add(mesh); return mesh;
  }
  function pivot(parent, x, y, z) {
    const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group); return group;
  }
  root.add(body); scene.add(root);
  part(body, cylinder, 'jacket', 0, 1.24, 0, .255, .52, .15).rotation.z = Math.PI;
  part(body, box, 'shirt', 0, 1.25, -.138, .09, .42, .028);
  part(body, box, 'trim', 0, 1.03, -.002, .40, .058, .285);
  part(body, cylinder, 'pants', 0, .94, .014, .199, .18, .139);
  part(body, cylinder, 'skin', 0, 1.53, -.007, .075, .15, .071);
  part(body, sphere, 'skin', 0, 1.68, -.021, .137, .175, .129);
  part(body, sphere, 'hair', 0, 1.744, .021, .145, .128, .139);
  part(body, sphere, 'hair', -.017, 1.665, .15, .081, .09, .096);
  for (const side of [-1, 1]) part(body, box, 'trim', side * .135, 1.647, -.015, .023, .049, .024);
  const bag = part(body, box, 'bag', .02, 1.23, .206, .36, .33, .16); bag.rotation.z = -.11;
  part(body, box, 'stripe', .024, 1.245, .291, .29, .045, .013).rotation.z = -.11;
  part(body, box, 'bag', -.151, 1.379, .138, .062, .25, .056).rotation.z = -.27;
  const arms = [], legs = [], elbows = [], knees = [];
  for (const side of [-1, 1]) {
    const arm = pivot(body, side * .253, 1.43, 0);
    part(arm, cylinder, 'jacket', 0, -.133, 0, .081, .29, .085);
    part(arm, box, 'trim', side * .013, -.237, 0, .131, .055, .134);
    const elbow = pivot(arm, .001, -.255, 0);
    part(elbow, cylinder, 'skin', 0, -.108, 0, .054, .22, .056);
    part(elbow, sphere, 'skin', 0, -.235, 0, .061, .073, .063);
    arm.rotation.z = side * .14; arms.push(arm); elbows.push(elbow);
    const leg = pivot(body, side * .111, .93, .009);
    part(leg, cylinder, 'pants', 0, -.21, 0, .102, .43, .108);
    const knee = pivot(leg, 0, -.421, 0);
    part(knee, cylinder, 'pants', 0, -.19, 0, .081, .40, .085);
    part(knee, box, 'shoes', 0, -.431, -.052, .165, .12, .274);
    part(knee, box, 'stripe', 0, -.474, -.052, .169, .037, .279);
    legs.push(leg); knees.push(knee);
  }

  const state = { position: root.position, velocity: new THREE.Vector3(), heading: 0,
    health: P.health, armour: P.armour, cash: P.cash, onFoot: true, inVehicle: false, phase: 0, grounded: true, vehicle: null, reputation: 0 };
  const exitPoint = new THREE.Vector3();
  let stride = 0, stepDist = 0;
  function reset(spawn = city.spawnPoints[0]) {
    state.vehicle?.exit(); state.vehicle = null;
    state.position.set(spawn.x, physics.groundAt(spawn.x, spawn.z), spawn.z);
    state.heading = spawn.heading; root.rotation.y = -spawn.heading;
    state.velocity.set(0, 0, 0); state.phase = 0; stride = stepDist = 0;
    state.health = P.health; state.armour = P.armour; state.cash = P.cash; state.reputation = 0;
    state.grounded = true; state.onFoot = true; state.inVehicle = false; root.visible = true;
    body.rotation.z = 0;
    pose(0, false, 1);
  }
  function pose(dt, sprint, factor = blend(12, dt)) {
    const { phase, grounded } = state;
    body.position.y = grounded ? Math.abs(Math.sin(phase)) * .048 * stride : .04;
    body.rotation.x += ((grounded ? -stride * (sprint ? .24 : .09) : -.15) - body.rotation.x) * factor;
    for (let i = 0; i < 2; i++) {
      const wave = Math.sin(phase + i * Math.PI);
      legs[i].rotation.x = grounded ? wave * stride * (sprint ? .84 : .53) : (i ? -.36 : .54);
      knees[i].rotation.x = grounded ? -Math.max(0, -wave) * stride * (sprint ? 1.05 : .52) : -.62;
      arms[i].rotation.x = grounded ? -wave * stride * (sprint ? .79 : .43) : -.32;
      elbows[i].rotation.x = .12 + stride * (sprint ? .90 : .32);
    }
  }
  function syncSeat() {
    const car = state.vehicle;
    root.position.copy(car.seat); root.position.y -= 1.04;
    state.heading = car.heading; root.rotation.y = -car.heading;
    state.velocity.set(car.velocity.x, 0, car.velocity.y);
    body.position.y = 0; body.rotation.x = .10;
    for (let i = 0; i < 2; i++) {
      legs[i].rotation.x = 1.35; knees[i].rotation.x = -1.30;
      arms[i].rotation.x = .77 + car.steering * (i ? 1 : -1); elbows[i].rotation.x = .52;
    }
  }
  function enter(car) {
    const previous = car.enter(state);
    state.vehicle = car; state.onFoot = false; state.inVehicle = true; state.grounded = true;
    syncSeat(); return previous;
  }
  function findExit() {
    const car = state.vehicle;
    if (!car) return null;
    const { c, s } = car.footprint, p = car.position;
    for (const side of EXIT_OFFSETS) {
      const lat = side * (car.spec.width / 2 + P.radius + .29) * (Math.abs(side) === 1 ? 1 : .5);
      const long = Math.abs(side) === 2 ? car.spec.length * .40 : Math.abs(side) === 3 ? -car.spec.length * .45 : 0;
      const x = p.x + c * lat - s * long, z = p.z + s * lat + c * long, y = physics.groundAt(x, z);
      if (!physics.circleBlocked(x, y, z, P.radius)) return exitPoint.set(x, y, z);
    }
    return null;
  }
  function exit() {
    if (!state.vehicle || Math.abs(state.vehicle.speed) > DRIVE.exitSpeed || !findExit()) return false;
    state.vehicle.exit(); state.vehicle = null;
    state.position.copy(exitPoint); state.velocity.set(0, 0, 0);
    state.onFoot = true; state.inVehicle = false; state.grounded = true; stride = stepDist = 0;
    pose(0, false, 1); return true;
  }
  function update(dt, input, yaw, audio, aiming = false) {
    if (state.vehicle) { state.vehicle.drive(dt, input.driving(), physics); syncSeat(); return; }
    const p = state.position, v = state.velocity, move = input.movement();
    const inv = 1 / (Math.hypot(move.x, move.z) || 1), s = Math.sin(yaw), c = Math.cos(yaw);
    const mx = (move.x * c + move.z * s) * inv, mz = (move.x * s - move.z * c) * inv;
    const sprint = input.active('sprint'), rate = sprint ? P.sprint : P.walk;
    const gain = blend(state.grounded ? P.response : P.airResponse, dt);
    v.x += (mx * rate - v.x) * gain; v.z += (mz * rate - v.z) * gain;
    if (input.pressed('jump') && state.grounded) { v.y = P.jump; state.grounded = false; }
    v.y -= P.gravity * dt;
    const hit = physics.stepCircle(p, v.x * dt, v.z * dt, P.radius, 1.65);
    if (hit & 1) v.x = 0;
    if (hit & 2) v.z = 0;
    const floor = physics.groundAt(p.x, p.z);
    if (p.y + v.y * dt <= floor || (state.grounded && floor - p.y <= P.step)) {
      p.y = floor; v.y = 0; state.grounded = true;
    } else { p.y += v.y * dt; state.grounded = false; }
    const speed = Math.hypot(v.x, v.z);
    if (aiming) state.heading = yaw;
    if (speed > .18) {
      const delta = Math.atan2(v.x, -v.z) - state.heading;
      if (!aiming) state.heading += Math.atan2(Math.sin(delta), Math.cos(delta)) * blend(P.turn, dt);
      state.phase = (state.phase + speed * dt * (sprint ? 1.46 : 1.88)) % (Math.PI * 2);
      if (state.grounded) {
        stepDist += speed * dt;
        if (stepDist >= (sprint ? 1.46 : .98)) { stepDist = 0; audio.footstep(sprint); }
      }
    }
    stride += (Math.min(1, speed / (rate * .86)) - stride) * blend(12, dt);
    root.rotation.y = -state.heading;
    pose(dt, sprint);
    if (aiming) { arms[1].rotation.x = 1.30; elbows[1].rotation.x = .27; }
  }
  function addRewards(cash, reputation) {
    state.cash += Math.max(0, cash); state.reputation += Math.max(0, reputation);
  }
  function respawn() {
    const cash = Math.max(0, state.cash - 60), reputation = state.reputation;
    // Palma's street clinic is the safe spawn; never erase earned progression on death.
    reset(city.spawnPoints[0]); state.cash = cash; state.reputation = reputation;
  }
  reset();
  return { root, state, reset, respawn, update, enter, exit, findExit, addRewards, setDown(value) { body.rotation.z = value && state.onFoot ? 1.46 : 0; } };
}
