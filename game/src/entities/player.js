import * as T from 'three';
import { PLAYER } from '../config.js';
const limbBox = new T.BoxGeometry();
// Shared character builder also supplies the bounded pedestrian pool.
export function createCharacter(scene, jacket = 0xf47168, skin = 0xb97958) {
  const root = new T.Group(), limbs = [];
  function piece(color, x, y, z, w, h, d, parent = root) {
    const mesh = new T.Mesh(limbBox, new T.MeshStandardMaterial({ color, roughness: .85 })); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  piece(jacket, 0, 1.15, 0, .5, .57, .28);
  piece(0xffdc9e, 0, .96, -.15, .45, .06, .035);
  piece(skin, 0, 1.64, 0, .3, .39, .29);
  piece(0x302630, 0, 1.84, .025, .34, .15, .33);
  piece(0x302630, -.17, 1.62, .1, .12, .45, .18);
  piece(0x302630, 0, 1.65, -.153, .25, .06, .04);
  for (let i = 0; i < 4; i++) {
    const leg = i < 2, pivot = new T.Group(), side = i % 2 ? 1 : -1;
    pivot.position.set(side * (leg ? .13 : .33), leg ? .88 : 1.36, 0); root.add(pivot);
    piece(leg ? 0x304854 : jacket, 0, leg ? -.39 : -.25, 0, leg ? .19 : .15, leg ? .76 : .5, .21, pivot);
    if (leg) piece(0xffe4bf, 0, -.81, -.05, .22, .12, .34, pivot);
    else piece(skin, 0, -.52, 0, .14, .15, .17, pivot);
    limbs.push(pivot);
  }
  scene.add(root); return { root, limbs };
}
export function createPlayer(scene, city, physics) {
  const doll = createCharacter(scene), root = doll.root, exitPoint = new T.Vector3();
  const state = { position: root.position, velocity: new T.Vector3(), heading: 0, health: 100, armour: 0, cash: 240, reputation: 0, onFoot: true, inVehicle: false, grounded: true, phase: 0, vehicle: null };
  function reset(spawn = city.spawnPoints[0]) {
    state.vehicle?.exit(); state.vehicle = null; state.position.set(spawn.x, city.groundAt(spawn.x, spawn.z), spawn.z); state.heading = spawn.heading || 0;
    state.velocity.set(0, 0, 0); state.health = 100; state.armour = 0; state.cash = 240; state.reputation = 0; state.onFoot = state.grounded = root.visible = true; state.inVehicle = false; root.rotation.set(0, -state.heading, 0);
  }
  function findExit() {
    const car = state.vehicle; if (!car) return null;
    for (let side = -1; side <= 1; side += 2) {
      const x = car.position.x + Math.cos(car.heading) * side * (car.spec.width / 2 + .8), z = car.position.z + Math.sin(car.heading) * side * (car.spec.width / 2 + .8);
      if (!physics.circleBlocked(x, car.position.y, z, .4, 1.7, car)) return exitPoint.set(x, city.groundAt(x, z), z);
    }
    return null;
  }
  const api = { root, state, reset, findExit,
    enter(car) { if (!car?.active || !car.health) return null; const old = car.enter(state); state.vehicle = car; state.inVehicle = true; state.onFoot = false; root.visible = false; state.position.copy(car.seat); return old; },
    exit() { const car = state.vehicle; if (!car || Math.abs(car.speed) > 4 || !findExit()) return false; car.exit(); state.vehicle = null; state.position.copy(exitPoint); state.inVehicle = false; state.onFoot = root.visible = true; return true; },
    addRewards(cash, reputation) { state.cash += Math.max(0, cash); state.reputation += Math.max(0, reputation); state.armour = Math.min(100, state.armour + 20); },
    respawn() { const money = Math.max(0, state.cash - 60), reputation = state.reputation; reset(); state.cash = money; state.reputation = reputation; },
    setDown(value) { if (state.onFoot) root.rotation.z = value ? 1.5 : 0; },
    update(dt, input, yaw, audio, aiming = false) {
      if (state.vehicle) { state.vehicle.drive(dt, input.driving(), physics); state.position.copy(state.vehicle.seat); state.heading = state.vehicle.heading; return; }
      const move = input.movement(), scale = 1 / Math.max(1, Math.hypot(move.x, move.z));
      const pace = input.active('sprint') ? PLAYER.sprint : PLAYER.walk;
      const dx = (move.x * Math.cos(yaw) + move.z * Math.sin(yaw)) * scale, dz = (move.x * Math.sin(yaw) - move.z * Math.cos(yaw)) * scale;
      state.velocity.x += (dx * pace - state.velocity.x) * Math.min(1, dt * 14); state.velocity.z += (dz * pace - state.velocity.z) * Math.min(1, dt * 14);
      if (state.grounded && input.pressed('jump')) { state.velocity.y = 6; state.grounded = false; }
      state.velocity.y -= 19 * dt;
      physics.stepCircle(state.position, state.velocity.x * dt, state.velocity.z * dt, .38, 1.7);
      state.position.y += state.velocity.y * dt;
      const floor = city.groundAt(state.position.x, state.position.z);
      if (state.position.y <= floor) { state.position.y = floor; state.velocity.y = 0; state.grounded = true; }
      const speed = Math.hypot(state.velocity.x, state.velocity.z);
      if (aiming) state.heading = yaw; else if (speed > .15) { const desired = Math.atan2(state.velocity.x, -state.velocity.z); state.heading += Math.atan2(Math.sin(desired - state.heading), Math.cos(desired - state.heading)) * Math.min(1, dt * 12); }
      root.rotation.y = -state.heading; state.phase += speed * dt * 1.8;
      for (let n = 0; n < 4; n++) doll.limbs[n].rotation.x = Math.sin(state.phase + (n % 2 ? Math.PI : 0)) * Math.min(.7, speed * .09) * (n < 2 ? 1 : -1);
      if (aiming) doll.limbs[3].rotation.x = -1.3;
    },
  };
  reset(); return api;
}
