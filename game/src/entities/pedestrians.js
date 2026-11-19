import * as THREE from 'three';
import { STREET_LIFE as S } from '../config.js';
import { makeRng } from '../rng.js';
import { circleVsFootprint } from '../systems/physics.js';
import { createSidewalkGraph, signalPhase, canRecycle } from '../world/streets.js';

const shirts = [0xfc856a, 0x36a799, 0xffc057, 0x9e79ab, 0xd3e0cb, 0x538fc4, 0xe25a7d];
const pants = [0x293b54, 0x596e70, 0xebc4a7, 0x6b5360];
const skin = [0xa46044, 0xe2ac7f, 0x784538, 0xc18464, 0xecb69b];

export function createPedestrians(scene, city, physics) {
  const graph = createSidewalkGraph(city), walkers = [];
  let rng = makeRng(`${city.seed}:walkers`), scan = 0, driverIndex = 0;
  const threat = { x: 0, z: 0, time: 0 };
  const mat = new THREE.MeshStandardMaterial({ roughness: .86 });
  const trunk = new THREE.CylinderGeometry(.73, 1, 1, 6), cube = new THREE.BoxGeometry();
  const head = new THREE.IcosahedronGeometry(1, 1);
  const count = S.walkers + S.driverPool;
  const body = new THREE.InstancedMesh(trunk, mat, count);
  const faces = new THREE.InstancedMesh(head, mat, count * 2);
  const limbs = new THREE.InstancedMesh(cube, mat, count * 4);
  for (const mesh of [body, faces, limbs]) {
    mesh.frustumCulled = false; mesh.castShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  }
  const anchor = new THREE.Object3D(), part = new THREE.Object3D(), matrix = new THREE.Matrix4(), tint = new THREE.Color();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const palette = makeRng(`${city.seed}:clothes`);
  for (let id = 0; id < count; id++) {
    const person = { id, position: new THREE.Vector3(), heading: 0, phase: 0, stride: 0,
      height: palette.range(.87, 1.14), width: palette.range(.82, 1.18), speed: 0, active: false,
      edge: null, from: null, to: null, mode: 'walk', flee: 0, down: 0, noticed: false,
      awayX: 0, awayZ: 0, blocked: 0, generation: 0, health: 100 };
    walkers.push(person);
    body.setColorAt(id, tint.set(palette.pick(shirts)));
    const complexion = palette.pick(skin), trousers = palette.pick(pants);
    faces.setColorAt(id * 2, tint.set(complexion)); faces.setColorAt(id * 2 + 1, tint.set(palette.pick([0x2d2530, 0x46302d, 0x835742, 0xd2ab6d])));
    for (let i = 0; i < 4; i++) limbs.setColorAt(id * 4 + i, tint.set(i < 2 ? trousers : complexion));
  }
  function put(mesh, index, x, y, z, w, h, d, swing = 0) {
    part.position.set(x, y, z); part.scale.set(w, h, d); part.rotation.set(swing, 0, 0);
    part.updateMatrix(); mesh.setMatrixAt(index, matrix.multiplyMatrices(anchor.matrix, part.matrix));
  }
  function drawPerson(p) {
    const { id, position } = p;
    if (!p.active) {
      body.setMatrixAt(id, hidden);
      for (let i = 0; i < 2; i++) faces.setMatrixAt(id * 2 + i, hidden);
      for (let i = 0; i < 4; i++) limbs.setMatrixAt(id * 4 + i, hidden);
      return;
    }
    const sway = Math.sin(p.phase) * p.stride, prone = p.mode === 'down';
    anchor.position.copy(position);
    anchor.position.y += prone ? .24 : .035 * Math.abs(sway);
    anchor.rotation.set(prone ? -Math.PI / 2 : p.mode === 'flee' ? -.18 : 0, -p.heading, 0, 'YXZ');
    anchor.scale.set(p.width, p.height, p.width); anchor.updateMatrix();
    put(body, id, 0, 1.08, 0, .223, .55, .137, Math.PI);
    put(faces, id * 2, 0, 1.53, 0, .123, .157, .119);
    put(faces, id * 2 + 1, 0, 1.599, .024, .127, .105, .115);
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1, swing = side * sway;
      put(limbs, id * 4 + i, side * .108, .43, -swing * .24, .157, .85, .18, -swing * .73);
      put(limbs, id * 4 + i + 2, side * .245, 1.00, swing * .19, .107, .55, .117, swing * .8);
    }
  }
  function spawn(p, focus, camera, initial) {
    const sides = graph.sidewalks, start = rng.int(0, sides.length - 1);
    for (let i = 0; i < sides.length; i++) {
      const e = sides[(start + i) % sides.length], t = rng.range(.1, .9);
      const x = e.from.x + (e.to.x - e.from.x) * t, z = e.from.z + (e.to.z - e.from.z) * t;
      const dist = Math.hypot(x - focus.x, z - focus.z), y = physics.groundAt(x, z);
      if (dist < (initial ? 5 : S.near) || dist > (initial ? 125 : S.far + 12) ||
        (!initial && !canRecycle(camera, x, z, focus, 135)) || physics.circleBlocked(x, y, z, .29)) continue;
      const flip = rng.next() < .5;
      p.position.set(x, y, z); p.edge = e; p.from = flip ? e.to : e.from; p.to = flip ? e.from : e.to;
      p.heading = Math.atan2(p.to.x - x, z - p.to.z); p.speed = rng.range(...S.pedestrianSpeed);
      p.active = true; p.mode = 'walk'; p.noticed = false; p.flee = p.down = p.blocked = p.stride = 0;
      p.phase = rng.range(0, Math.PI * 2); p.generation++; p.health = 100;
      return;
    }
    p.active = false;
  }
  function chooseTurn(p) {
    const node = p.to, links = node.links, start = rng.int(0, links.length - 1);
    for (let i = 0; i < links.length; i++) {
      const edge = links[(start + i) % links.length];
      if (edge === p.edge && links.length > 1) continue;
      p.edge = edge; p.from = node; p.to = edge.from === node ? edge.to : edge.from;
      return;
    }
  }
  function nearestSidewalk(p) {
    let best = Infinity, selected = null, bestX = 0, bestZ = 0;
    for (const e of graph.sidewalks) {
      const x = Math.max(Math.min(e.from.x, e.to.x), Math.min(Math.max(e.from.x, e.to.x), p.position.x));
      const z = Math.max(Math.min(e.from.z, e.to.z), Math.min(Math.max(e.from.z, e.to.z), p.position.z));
      const d = (x - p.position.x) ** 2 + (z - p.position.z) ** 2;
      if (d < best) { best = d; selected = e; bestX = x; bestZ = z; }
    }
    p.edge = selected; p.from = selected.from; p.to = selected.to; p.awayX = bestX; p.awayZ = bestZ; p.mode = 'return';
  }
  function startFlee(p, x, z, seconds) {
    if (p.mode === 'down') return;
    p.mode = 'flee'; p.flee = seconds; p.awayX = x; p.awayZ = z;
  }
  function updateWalker(p, dt, focus, playerCar, seconds, heat) {
    const pos = p.position;
    p.noticed = !playerCar && Math.hypot(pos.x - focus.x, pos.z - focus.z) < 3.5;
    if (p.mode !== 'down' && playerCar && Math.abs(playerCar.speed) > 3 &&
      circleVsFootprint(pos.x, pos.z, .28, playerCar.footprint)) {
      p.mode = 'down'; p.down = 2.6; p.heading = playerCar.heading; p.stride = 0;
      return 1;
    }
    if (p.mode === 'down') {
      if (!p.health) return 0;
      p.stride = 0; p.down -= dt;
      if (p.down <= 0) startFleeAfterFall(p, playerCar, focus);
      return 0;
    }
    if (threat.time > 0 && Math.hypot(pos.x - threat.x, pos.z - threat.z) < S.earshot) startFlee(p, threat.x, threat.z, 3);
    if (heat >= 2 && Math.hypot(pos.x - focus.x, pos.z - focus.z) < 9 + heat * 2) startFlee(p, focus.x, focus.z, 2.2);
    for (const car of physics.vehicles) {
      if (!car.active || Math.abs(car.speed) < S.carThreatSpeed) continue;
      const x = pos.x - car.position.x, z = pos.z - car.position.z;
      if (x * x + z * z >= S.fearRange ** 2 || Math.abs(x * car.footprint.c + z * car.footprint.s) > 2.6) continue;
      if ((x * car.footprint.s - z * car.footprint.c) * Math.sign(car.speed) > -1) startFlee(p, car.position.x, car.position.z, 1.8);
    }
    let dx = 0, dz = 0, speed = p.speed;
    if (p.mode === 'flee') {
      p.flee -= dt;
      if (p.flee <= 0) nearestSidewalk(p);
      else { dx = pos.x - p.awayX; dz = pos.z - p.awayZ; speed = 4.15; }
    }
    if (p.mode === 'return') {
      dx = p.awayX - pos.x; dz = p.awayZ - pos.z;
      if (Math.hypot(dx, dz) < .08) p.mode = 'walk';
    }
    if (p.mode === 'walk') {
      dx = p.to.x - pos.x; dz = p.to.z - pos.z;
      if (Math.hypot(dx, dz) < .075) { chooseTurn(p); dx = p.to.x - pos.x; dz = p.to.z - pos.z; }
      if (p.edge.junction && Math.hypot(p.from.x - pos.x, p.from.z - pos.z) < .18 &&
        signalPhase(p.edge.junction, seconds) !== p.edge.axis) { dx = dz = 0; }
      if (p.noticed) speed *= .64;
    }
    const length = Math.hypot(dx, dz);
    if (length > .001) {
      const move = Math.min(length, dt * speed), heading = Math.atan2(dx, -dz), oldX = pos.x, oldZ = pos.z;
      const bad = physics.stepCircle(pos, dx / length * move, dz / length * move, .27, 1.65);
      const travel = Math.hypot(pos.x - oldX, pos.z - oldZ);
      p.blocked = travel < move * .35 ? p.blocked + dt : 0;
      if (bad && p.blocked > .6) {
        p.blocked = 0;
        if (p.mode === 'walk') { const tmp = p.from; p.from = p.to; p.to = tmp; }
        if (p.mode === 'flee') { p.awayX = pos.x + dz; p.awayZ = pos.z - dx; }
      }
      p.heading += Math.atan2(Math.sin(heading - p.heading), Math.cos(heading - p.heading)) * Math.min(1, dt * 12);
      p.phase = (p.phase + travel * 5.4) % (Math.PI * 2);
      p.stride += (Math.min(1.2, travel / dt * .48) - p.stride) * Math.min(1, dt * 14);
      pos.y = physics.groundAt(pos.x, pos.z);
    } else p.stride *= 1 - dt * 9;
    return 0;
  }
  function startFleeAfterFall(p, car, focus) {
    p.mode = 'walk'; const away = car?.position ?? focus; startFlee(p, away.x, away.z, 2);
  }
  return {
    graph, walkers,
    reset(focus) {
      rng = makeRng(`${city.seed}:walkers`); driverIndex = scan = threat.time = 0;
      for (const p of walkers) {
        p.generation = 0; p.active = false;
        if (p.id < S.walkers) spawn(p, focus, null, true);
      }
      this.render();
    },
    eject(car, driver, exitPoint) {
      const p = walkers[S.walkers + driverIndex++ % S.driverPool];
      const { position: pos } = car;
      const sign = exitPoint ? -Math.sign((exitPoint.x - pos.x) * car.footprint.c + (exitPoint.z - pos.z) * car.footprint.s) : 1;
      const gap = car.spec.width / 2 + .63;
      let x = pos.x + sign * car.footprint.c * gap, z = pos.z + sign * car.footprint.s * gap;
      if (physics.circleBlocked(x, physics.groundAt(x, z), z, .29)) {
        x = exitPoint?.x ?? pos.x - sign * car.footprint.c * gap; z = exitPoint?.z ?? pos.z - sign * car.footprint.s * gap;
      }
      if (physics.circleBlocked(x, physics.groundAt(x, z), z, .29)) return;
      p.position.set(x, physics.groundAt(x, z), z); p.active = true; p.mode = 'walk'; p.generation++; p.health = 100;
      p.speed = 1.55; p.blocked = 0; p.heading = car.heading; p.stride = p.phase = 0;
      startFlee(p, pos.x, pos.z, 3.6);
    },
    hearGunfire(x, z) { threat.x = x; threat.z = z; threat.time = .18; },
    hit(p, damage, source) {
      p.health = Math.max(0, p.health - damage);
      if (!p.health) { p.mode = 'down'; p.stride = 0; return true; }
      p.mode = 'walk'; startFlee(p, source.x, source.z, 3.4); return false;
    },
    update(dt, focus, camera, playerCar, seconds, heat = 0) {
      threat.time = Math.max(0, threat.time - dt);
      scan -= dt; let knocked = 0;
      for (const p of walkers) {
        if (scan <= 0 && (!p.active || canRecycle(camera, p.position.x, p.position.z, focus, 186, 143))) {
          if (p.id < S.walkers) spawn(p, focus, camera, false);
          else p.active = false;
        }
        if (p.active) knocked += updateWalker(p, dt, focus, playerCar, seconds, heat);
      }
      if (scan <= 0) scan = .70;
      return knocked;
    },
    render() {
      for (const person of walkers) drawPerson(person);
      body.instanceMatrix.needsUpdate = faces.instanceMatrix.needsUpdate = limbs.instanceMatrix.needsUpdate = true;
    },
  };
}
