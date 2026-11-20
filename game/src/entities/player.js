import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Mesh, MeshStandardMaterial, Group, Vector3 } from 'three';
import { PLAYER as P, DRIVE } from '../config.js';
const cube = new BoxGeometry(), rounded = new IcosahedronGeometry(1, 1), tapered = new CylinderGeometry(.83, 1, 1, 8);
const exits = [-1, 1, -2, 2, -3, 3], damping = (rate, dt) => 1 - Math.exp(-rate * dt);
function buildMars(scene) {
  const root = new Group(), body = new Group(), colors = {}, arms = [], elbows = [], legs = [], knees = [];
  for (const name of Object.keys(P.colors)) colors[name] = new MeshStandardMaterial({ color: P.colors[name], roughness: .86 });
  function piece(parent, shape, color, x, y, z, w, h, d) { const mesh = new Mesh(shape, colors[color]); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; parent.add(mesh); return mesh; }
  function joint(parent, x, y, z) { const group = new Group(); group.position.set(x, y, z); parent.add(group); return group; }
  root.add(body); scene.add(root);
  piece(body, tapered, 'jacket', 0, 1.24, 0, .255, .52, .15).rotation.z = Math.PI;
  piece(body, cube, 'shirt', 0, 1.25, -.138, .09, .42, .028); piece(body, cube, 'trim', 0, 1.03, -.002, .4, .058, .285);
  piece(body, tapered, 'pants', 0, .94, .014, .199, .18, .139); piece(body, tapered, 'skin', 0, 1.53, -.007, .075, .15, .071);
  piece(body, rounded, 'skin', 0, 1.68, -.021, .137, .175, .129); piece(body, rounded, 'hair', 0, 1.744, .021, .145, .128, .139); piece(body, rounded, 'hair', -.017, 1.665, .15, .081, .09, .096);
  for (const side of [-1, 1]) piece(body, cube, 'trim', side * .135, 1.647, -.015, .023, .049, .024);
  piece(body, cube, 'bag', .02, 1.23, .206, .36, .33, .16).rotation.z = -.11; piece(body, cube, 'stripe', .024, 1.245, .291, .29, .045, .013).rotation.z = -.11;
  piece(body, cube, 'bag', -.151, 1.379, .138, .062, .25, .056).rotation.z = -.27;
  for (const side of [-1, 1]) {
    const shoulder = joint(body, side * .253, 1.43, 0), elbow = joint(shoulder, .001, -.255, 0);
    piece(shoulder, tapered, 'jacket', 0, -.133, 0, .081, .29, .085); piece(shoulder, cube, 'trim', side * .013, -.237, 0, .131, .055, .134);
    piece(elbow, tapered, 'skin', 0, -.108, 0, .054, .22, .056); piece(elbow, rounded, 'skin', 0, -.235, 0, .061, .073, .063);
    shoulder.rotation.z = side * .14; arms.push(shoulder); elbows.push(elbow);
    const hip = joint(body, side * .111, .93, .009), knee = joint(hip, 0, -.421, 0);
    piece(hip, tapered, 'pants', 0, -.21, 0, .102, .43, .108); piece(knee, tapered, 'pants', 0, -.19, 0, .081, .4, .085);
    piece(knee, cube, 'shoes', 0, -.431, -.052, .165, .12, .274); piece(knee, cube, 'stripe', 0, -.474, -.052, .169, .037, .279); legs.push(hip); knees.push(knee);
  }
  return { root, body, arms, elbows, legs, knees };
}
export function createPlayer(scene, city, physics) {
  const { root, body, arms, elbows, legs, knees } = buildMars(scene);
  const state = { position: root.position, velocity: new Vector3(), heading: 0, health: P.health, armour: P.armour, cash: P.cash, reputation: 0,
    onFoot: true, inVehicle: false, grounded: true, phase: 0, vehicle: null };
  const exitPoint = new Vector3(); let stride = 0, footDistance = 0;
  function animate(dt, sprint, easing = damping(12, dt)) {
    body.position.y = state.grounded ? Math.abs(Math.sin(state.phase)) * .048 * stride : .04;
    body.rotation.x += ((state.grounded ? -stride * (sprint ? .24 : .09) : -.15) - body.rotation.x) * easing;
    for (let i = 0; i < 2; i++) {
      const wave = Math.sin(state.phase + i * Math.PI);
      legs[i].rotation.x = state.grounded ? wave * stride * (sprint ? .84 : .53) : i ? -.36 : .54;
      knees[i].rotation.x = state.grounded ? -Math.max(0, -wave) * stride * (sprint ? 1.05 : .52) : -.62;
      arms[i].rotation.x = state.grounded ? -wave * stride * (sprint ? .79 : .43) : -.32; elbows[i].rotation.x = .12 + stride * (sprint ? .9 : .32);
    }
  }
  function reset(spawn = city.spawnPoints[0]) {
    state.vehicle?.exit(); state.vehicle = null; state.position.set(spawn.x, physics.groundAt(spawn.x, spawn.z), spawn.z); state.heading = spawn.heading ?? 0; state.velocity.set(0, 0, 0);
    state.phase = stride = footDistance = 0; state.health = P.health; state.armour = P.armour; state.cash = P.cash; state.reputation = 0;
    state.grounded = state.onFoot = root.visible = true; state.inVehicle = false; root.rotation.y = -state.heading; body.rotation.set(0, 0, 0); animate(0, false, 1);
  }
  function seat() {
    const car = state.vehicle; root.position.copy(car.seat); root.position.y -= 1.04; root.rotation.y = -car.heading; state.heading = car.heading;
    state.velocity.set(car.velocity.x, 0, car.velocity.y); body.position.y = 0; body.rotation.x = .1;
    for (let i = 0; i < 2; i++) { legs[i].rotation.x = 1.35; knees[i].rotation.x = -1.3; arms[i].rotation.x = .77 + car.steering * (i ? 1 : -1); elbows[i].rotation.x = .52; }
  }
  function findExit() {
    const car = state.vehicle; if (!car) return null; const { c, s } = car.footprint;
    for (let i = 0; i < exits.length; i++) {
      const side = exits[i], magnitude = Math.abs(side), lateral = side * (car.spec.width / 2 + P.radius + .29) * (magnitude === 1 ? 1 : .5), along = magnitude === 2 ? car.spec.length * .4 : magnitude === 3 ? -car.spec.length * .45 : 0;
      const x = car.position.x + c * lateral - s * along, z = car.position.z + s * lateral + c * along, y = physics.groundAt(x, z);
      if (!physics.circleBlocked(x, y, z, P.radius)) return exitPoint.set(x, y, z);
    }
    return null;
  }
  reset();
  return {
    root, state, reset, findExit,
    enter(car) {
      if (!car?.active || car.destroyed || car.health <= 0) return null;
      if (state.vehicle && state.vehicle !== car) state.vehicle.exit();
      const previous = car.enter(state); state.vehicle = car; state.onFoot = false; state.inVehicle = state.grounded = true; seat(); return previous;
    },
    exit() {
      const car = state.vehicle; if (!car || Math.abs(car.speed) > DRIVE.exitSpeed || !findExit()) return false;
      car.exit(); state.vehicle = null; state.position.copy(exitPoint); state.velocity.set(0, 0, 0); state.onFoot = state.grounded = true; state.inVehicle = false;
      stride = footDistance = 0; animate(0, false, 1); return true;
    },
    addRewards(cash, reputation) { state.cash += Math.max(0, cash); state.reputation += Math.max(0, reputation); },
    respawn() { const cash = Math.max(0, state.cash - 60), reputation = state.reputation; reset(); state.cash = cash; state.reputation = reputation; },
    setDown(down) { body.rotation.z = down && state.onFoot ? 1.46 : 0; },
    update(dt, input, yaw, audio, aiming = false) {
      if (state.vehicle) { state.vehicle.drive(dt, input.driving(), physics); seat(); return; }
      const p = state.position, v = state.velocity, move = input.movement(), normal = 1 / (Math.hypot(move.x, move.z) || 1), sin = Math.sin(yaw), cos = Math.cos(yaw);
      const mx = (move.x * cos + move.z * sin) * normal, mz = (move.x * sin - move.z * cos) * normal, sprint = input.active('sprint'), pace = sprint ? P.sprint : P.walk, easing = damping(state.grounded ? P.response : P.airResponse, dt);
      v.x += (mx * pace - v.x) * easing; v.z += (mz * pace - v.z) * easing;
      if (input.pressed('jump') && state.grounded) { v.y = P.jump; state.grounded = false; }
      v.y -= dt * P.gravity; const collision = physics.stepCircle(p, v.x * dt, v.z * dt, P.radius, 1.65);
      if (collision & 1) v.x = 0; if (collision & 2) v.z = 0;
      const floor = physics.groundAt(p.x, p.z);
      if (p.y + v.y * dt <= floor || state.grounded && floor - p.y <= P.step) { p.y = floor; v.y = 0; state.grounded = true; } else { p.y += v.y * dt; state.grounded = false; }
      const speed = Math.hypot(v.x, v.z); if (aiming) state.heading = yaw;
      if (speed > .18) {
        const turn = Math.atan2(v.x, -v.z) - state.heading; if (!aiming) state.heading += Math.atan2(Math.sin(turn), Math.cos(turn)) * damping(P.turn, dt);
        state.phase = (state.phase + speed * dt * (sprint ? 1.46 : 1.88)) % (Math.PI * 2);
        if (state.grounded) { footDistance += speed * dt; if (footDistance >= (sprint ? 1.46 : .98)) { footDistance = 0; audio.footstep(sprint); } }
      }
      stride += (Math.min(1, speed / (pace * .86)) - stride) * damping(12, dt); root.rotation.y = -state.heading; animate(dt, sprint);
      if (aiming) { arms[1].rotation.x = 1.3; elbows[1].rotation.x = .27; }
    },
  };
}
