import * as THREE from 'three';
import { STREET_LIFE as S } from '../config.js';
import { makeRng } from '../rng.js';
import { circleVsFootprint } from '../systems/physics.js';
import { createSidewalkGraph, signalPhase, canRecycle } from '../world/streets.js';
const shirts = [0xfc856a, 0x36a799, 0xffc057, 0x9e79ab, 0xd3e0cb, 0x538fc4, 0xe25a7d], trousers = [0x293b54, 0x596e70, 0xebc4a7, 0x6b5360];
const skins = [0xa46044, 0xe2ac7f, 0x784538, 0xc18464, 0xecb69b], hair = [0x2d2530, 0x46302d, 0x835742, 0xd2ab6d], TAU = Math.PI * 2;
export function createPedestrians(scene, city, physics) {
  const graph = createSidewalkGraph(city), walkers = [], count = S.walkers + S.driverPool, material = new THREE.MeshStandardMaterial({ roughness: .86 });
  const torsos = new THREE.InstancedMesh(new THREE.CylinderGeometry(.73, 1, 1, 6), material, count), heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material, count * 2), limbs = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, count * 4);
  for (const mesh of [torsos, heads, limbs]) { mesh.frustumCulled = false; mesh.castShadow = true; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); }
  const base = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4(), color = new THREE.Color(), hidden = new THREE.Matrix4().makeScale(0, 0, 0), clothes = makeRng(`${city.seed}:clothes`);
  for (let id = 0; id < count; id++) {
    walkers.push({ id, position: new THREE.Vector3(), heading: 0, phase: 0, stride: 0, height: clothes.range(.87, 1.14), width: clothes.range(.82, 1.18), speed: 0, active: false,
      edge: null, from: null, to: null, mode: 'walk', flee: 0, down: 0, noticed: false, awayX: 0, awayZ: 0, blocked: 0, generation: 0, health: 100 });
    torsos.setColorAt(id, color.set(clothes.pick(shirts))); const skin = clothes.pick(skins), pants = clothes.pick(trousers);
    heads.setColorAt(id * 2, color.set(skin)); heads.setColorAt(id * 2 + 1, color.set(clothes.pick(hair)));
    for (let i = 0; i < 4; i++) limbs.setColorAt(id * 4 + i, color.set(i < 2 ? pants : skin));
  }
  const threat = { x: 0, z: 0, time: 0 }; let random = makeRng(`${city.seed}:walkers`), scan = 0, nextDriver = 0;
  function put(mesh, index, x, y, z, width, height, depth, swing = 0) {
    part.position.set(x, y, z); part.scale.set(width, height, depth); part.rotation.set(swing, 0, 0); part.updateMatrix(); mesh.setMatrixAt(index, matrix.multiplyMatrices(base.matrix, part.matrix));
  }
  function draw(person) {
    const { id, position, active } = person;
    if (!active) { torsos.setMatrixAt(id, hidden); for (let i = 0; i < 2; i++) heads.setMatrixAt(id * 2 + i, hidden); for (let i = 0; i < 4; i++) limbs.setMatrixAt(id * 4 + i, hidden); return; }
    const sway = Math.sin(person.phase) * person.stride, prone = person.mode === 'down'; base.position.copy(position); base.position.y += prone ? .24 : .035 * Math.abs(sway);
    base.rotation.set(prone ? -Math.PI / 2 : person.mode === 'flee' ? -.18 : 0, -person.heading, 0, 'YXZ'); base.scale.set(person.width, person.height, person.width); base.updateMatrix();
    put(torsos, id, 0, 1.08, 0, .223, .55, .137, Math.PI); put(heads, id * 2, 0, 1.53, 0, .123, .157, .119); put(heads, id * 2 + 1, 0, 1.599, .024, .127, .105, .115);
    for (let i = 0; i < 2; i++) { const side = i ? 1 : -1, swing = side * sway; put(limbs, id * 4 + i, side * .108, .43, -swing * .24, .157, .85, .18, -swing * .73); put(limbs, id * 4 + i + 2, side * .245, 1, swing * .19, .107, .55, .117, swing * .8); }
  }
  function render() { for (let i = 0; i < walkers.length; i++) draw(walkers[i]); torsos.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = limbs.instanceMatrix.needsUpdate = true; }
  function spawn(person, focus, camera, initial) {
    const edges = graph.sidewalks, first = random.int(0, edges.length - 1);
    for (let attempt = 0; attempt < edges.length; attempt++) {
      const edge = edges[(first + attempt) % edges.length], t = random.range(.1, .9), x = edge.from.x + (edge.to.x - edge.from.x) * t, z = edge.from.z + (edge.to.z - edge.from.z) * t, distance = Math.hypot(x - focus.x, z - focus.z), y = physics.groundAt(x, z);
      if (distance < (initial ? 5 : S.near) || distance > (initial ? 125 : S.far + 12)) continue;
      if (!initial && !canRecycle(camera, x, z, focus, 135) || physics.circleBlocked(x, y, z, .29)) continue;
      const reverse = random.next() < .5; person.position.set(x, y, z); person.edge = edge; person.from = reverse ? edge.to : edge.from; person.to = reverse ? edge.from : edge.to;
      person.heading = Math.atan2(person.to.x - x, z - person.to.z); person.speed = random.range(...S.pedestrianSpeed); person.active = true; person.mode = 'walk'; person.noticed = false;
      person.flee = person.down = person.blocked = person.stride = 0; person.phase = random.range(0, TAU); person.generation++; person.health = 100; return;
    }
    person.active = false;
  }
  function turn(person) {
    const node = person.to, links = node.links, first = random.int(0, links.length - 1);
    for (let i = 0; i < links.length; i++) { const edge = links[(first + i) % links.length]; if (edge === person.edge && links.length > 1) continue; person.edge = edge; person.from = node; person.to = edge.from === node ? edge.to : edge.from; return; }
  }
  function returnToPath(person) {
    let best = Infinity, path = null, nearestX = 0, nearestZ = 0;
    for (let i = 0; i < graph.sidewalks.length; i++) {
      const edge = graph.sidewalks[i], x = Math.max(Math.min(edge.from.x, edge.to.x), Math.min(Math.max(edge.from.x, edge.to.x), person.position.x)), z = Math.max(Math.min(edge.from.z, edge.to.z), Math.min(Math.max(edge.from.z, edge.to.z), person.position.z)), distance = (x - person.position.x) ** 2 + (z - person.position.z) ** 2;
      if (distance < best) { best = distance; path = edge; nearestX = x; nearestZ = z; }
    }
    person.edge = path; person.from = path.from; person.to = path.to; person.awayX = nearestX; person.awayZ = nearestZ; person.mode = 'return';
  }
  function flee(person, x, z, duration) { if (person.mode !== 'down') { person.mode = 'flee'; person.flee = duration; person.awayX = x; person.awayZ = z; } }
  function tick(person, dt, focus, car, seconds, heat) {
    const p = person.position; person.noticed = !car && Math.hypot(p.x - focus.x, p.z - focus.z) < 3.5;
    if (person.mode !== 'down' && car && Math.abs(car.speed) > 3 && circleVsFootprint(p.x, p.z, .28, car.footprint)) { person.mode = 'down'; person.down = 2.6; person.heading = car.heading; person.stride = 0; return 1; }
    if (person.mode === 'down') { if (!person.health) return 0; person.stride = 0; person.down -= dt; if (person.down <= 0) { person.mode = 'walk'; const source = car?.position ?? focus; flee(person, source.x, source.z, 2); } return 0; }
    if (threat.time > 0 && Math.hypot(p.x - threat.x, p.z - threat.z) < S.earshot) flee(person, threat.x, threat.z, 3);
    if (heat >= 2 && Math.hypot(p.x - focus.x, p.z - focus.z) < 9 + heat * 2) flee(person, focus.x, focus.z, 2.2);
    for (let i = 0; i < physics.vehicles.length; i++) {
      const vehicle = physics.vehicles[i]; if (!vehicle.active || Math.abs(vehicle.speed) < S.carThreatSpeed) continue;
      const x = p.x - vehicle.position.x, z = p.z - vehicle.position.z, shape = vehicle.footprint;
      if (x * x + z * z >= S.fearRange ** 2 || Math.abs(x * shape.c + z * shape.s) > 2.6) continue;
      if ((x * shape.s - z * shape.c) * Math.sign(vehicle.speed) > -1) flee(person, vehicle.position.x, vehicle.position.z, 1.8);
    }
    let dx = 0, dz = 0, speed = person.speed;
    if (person.mode === 'flee') { person.flee -= dt; if (person.flee <= 0) returnToPath(person); else { dx = p.x - person.awayX; dz = p.z - person.awayZ; speed = 4.15; } }
    if (person.mode === 'return') { dx = person.awayX - p.x; dz = person.awayZ - p.z; if (Math.hypot(dx, dz) < .08) person.mode = 'walk'; }
    if (person.mode === 'walk') {
      dx = person.to.x - p.x; dz = person.to.z - p.z; if (Math.hypot(dx, dz) < .075) { turn(person); dx = person.to.x - p.x; dz = person.to.z - p.z; }
      if (person.edge.junction && Math.hypot(person.from.x - p.x, person.from.z - p.z) < .18 && signalPhase(person.edge.junction, seconds) !== person.edge.axis) dx = dz = 0;
      if (person.noticed) speed *= .64;
    }
    const length = Math.hypot(dx, dz); if (length <= .001) { person.stride *= Math.max(0, 1 - dt * 9); return 0; }
    const movement = Math.min(length, dt * speed), heading = Math.atan2(dx, -dz), oldX = p.x, oldZ = p.z, blocked = physics.stepCircle(p, dx / length * movement, dz / length * movement, .27, 1.65), traveled = Math.hypot(p.x - oldX, p.z - oldZ);
    person.blocked = traveled < movement * .35 ? person.blocked + dt : 0;
    if (blocked && person.blocked > .6) { person.blocked = 0; if (person.mode === 'walk') { const old = person.from; person.from = person.to; person.to = old; } if (person.mode === 'flee') { person.awayX = p.x + dz; person.awayZ = p.z - dx; } }
    const delta = heading - person.heading; person.heading += Math.atan2(Math.sin(delta), Math.cos(delta)) * Math.min(1, dt * 12); person.phase = (person.phase + traveled * 5.4) % TAU;
    person.stride += (Math.min(1.2, traveled / dt * .48) - person.stride) * Math.min(1, dt * 14); p.y = physics.groundAt(p.x, p.z); return 0;
  }
  return {
    graph, walkers, render,
    reset(focus) { random = makeRng(`${city.seed}:walkers`); nextDriver = scan = threat.time = 0; for (const person of walkers) { person.generation = 0; person.active = false; person.health = 100; person.mode = 'walk'; person.noticed = false; person.flee = person.down = person.blocked = person.stride = 0; if (person.id < S.walkers) spawn(person, focus, null, true); } render(); },
    eject(car, driver, exitPoint) {
      const person = walkers[S.walkers + nextDriver++ % S.driverPool], p = car.position, shape = car.footprint, sign = exitPoint ? -Math.sign((exitPoint.x - p.x) * shape.c + (exitPoint.z - p.z) * shape.s) : 1, gap = car.spec.width / 2 + .63;
      let x = p.x + sign * shape.c * gap, z = p.z + sign * shape.s * gap;
      if (physics.circleBlocked(x, physics.groundAt(x, z), z, .29)) { x = exitPoint?.x ?? p.x - sign * shape.c * gap; z = exitPoint?.z ?? p.z - sign * shape.s * gap; }
      if (physics.circleBlocked(x, physics.groundAt(x, z), z, .29)) return;
      person.position.set(x, physics.groundAt(x, z), z); person.active = true; person.mode = 'walk'; person.generation++; person.health = 100; person.speed = 1.55; person.blocked = 0; person.heading = car.heading; person.stride = person.phase = 0; flee(person, p.x, p.z, 3.6);
    },
    hearGunfire(x, z) { threat.x = x; threat.z = z; threat.time = .18; },
    hit(person, damage, source) { person.health = Math.max(0, person.health - damage); if (!person.health) { person.mode = 'down'; person.stride = 0; return true; } person.mode = 'walk'; flee(person, source.x, source.z, 3.4); return false; },
    update(dt, focus, camera, car, seconds, heat = 0) {
      threat.time = Math.max(0, threat.time - dt); scan -= dt; let knocked = 0;
      for (let i = 0; i < walkers.length; i++) { const person = walkers[i]; if (scan <= 0 && (!person.active || canRecycle(camera, person.position.x, person.position.z, focus, 186, 143))) { if (person.id < S.walkers) spawn(person, focus, camera, false); else person.active = false; } if (person.active) knocked += tick(person, dt, focus, car, seconds, heat); }
      if (scan <= 0) scan = .7; return knocked;
    },
  };
}
