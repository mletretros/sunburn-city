import * as THREE from 'three';
import { makeRng } from '../rng.js';
import { VEHICLES, createVehicle } from './vehicle.js';
import { setFootprint } from '../systems/physics.js';
const UNIT_COUNT = 6;
function buildOfficer(scene, geometry, materials) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  function part(shape, material, x, y, z, w, h, d) { const mesh = new THREE.Mesh(shape, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); root.add(mesh); return mesh; }
  const { box, head } = geometry, { navy, skin, badge } = materials;
  part(box, navy, 0, 1.12, 0, .39, .48, .25); part(head, skin, 0, 1.49, 0, 1, 1.12, 1); part(box, navy, 0, 1.61, -.035, .28, .09, .34); part(box, badge, -.11, 1.22, -.131, .065, .075, .018);
  const left = part(box, navy, -.115, .46, 0, .16, .88, .18), right = part(box, navy, .115, .46, 0, .16, .88, .18), arm = part(box, navy, .24, 1.2, -.16, .12, .13, .4);
  part(box, navy, -.22, 1.15, -.09, .12, .15, .27);
  return { root, left, right, arm, position: root.position, kind: 'officer', active: false, health: 100, heading: 0, timer: 0, walk: 0, hitTime: 0, coverX: 0, coverZ: 0, cover: false, aim: false };
}
export function createPolice(scene, city, physics, wanted, audio) {
  const spec = { ...VEHICLES[1], name: 'Civic Guard Cruiser', type: 'police', top: 36 }, { intersections, lanes } = city;
  const exits = intersections.map(junction => lanes.filter(lane => lane.from === junction.id));
  const geometry = { box: new THREE.BoxGeometry(), head: new THREE.IcosahedronGeometry(.14, 1) };
  const materials = { navy: new THREE.MeshStandardMaterial({ color: 0x273c58 }), skin: new THREE.MeshStandardMaterial({ color: 0xbe856a }), badge: new THREE.MeshBasicMaterial({ color: 0xffce79 }) };
  const cruisers = [], officers = [], blips = [], shape = {}, eye = new THREE.Vector3(), ray = new THREE.Vector3();
  let random, dispatch = .45, nearest = null, sirenDistance = Infinity;
  for (let i = 0; i < UNIT_COUNT; i++) {
    const car = createVehicle(scene, spec, 0xe9e5d7), cop = buildOfficer(scene, geometry, materials); car.police = true; physics.vehicles.push(car); officers.push(cop);
    const unit = { car, cop, active: false, lane: null, cooldown: 0, hold: 0, stuck: 0, block: false, controls: { throttle: true, brake: false, steer: 0, handbrake: false } }; car.driver = unit; cruisers.push(unit);
  }
  function retire(unit) { unit.active = unit.car.active = unit.cop.active = unit.cop.root.visible = false; unit.car.exit(); unit.cop.root.rotation.set(0, 0, 0); unit.cop.root.scale.set(1, 1, 1); unit.car.animate(0); unit.cooldown = 5; }
  function reset() { random = makeRng(`${city.seed}:police`); dispatch = .45; blips.length = 0; nearest = null; sirenDistance = Infinity; for (const unit of cruisers) { retire(unit); unit.cooldown = 0; } }
  function visible(from, height, to, range) {
    eye.set(from.x, from.y + height, from.z); ray.set(to.x - from.x, (to.y ?? 0) + 1 - eye.y, to.z - from.z); const distance = ray.length();
    return distance < range && physics.wallDistance(eye, ray.divideScalar(distance || 1), distance) >= distance - .06;
  }
  function dispatchUnit(unit, focus) {
    let selected = null, best = Infinity, px = 0, pz = 0, heading = 0;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i], x = lane.ax + (lane.bx - lane.ax) * .45, z = lane.az + (lane.bz - lane.az) * .45, distance = Math.hypot(x - focus.x, z - focus.z);
      if (distance < (unit === cruisers[0] ? 26 : 38) || distance > 113) continue;
      const end = intersections[lane.to], approach = ((lane.bx - lane.ax) * (focus.x - x) + (lane.bz - lane.az) * (focus.z - z)) / (58 * distance), coast = focus.x < 9 && Math.abs(x) < 6 && Math.abs(lane.bx - lane.ax) < 1;
      const score = Math.abs(distance - 43) + Math.hypot(end.x - focus.x, end.z - focus.z) * .48 - approach * 9 - (coast ? 16 : 0) + random.range(0, 6) + (city.districtAt(x, z) === city.districtAt(focus.x, focus.z) ? 4 : 0);
      if (score >= best) continue;
      const yaw = Math.atan2(lane.bx - lane.ax, lane.az - lane.bz); setFootprint(shape, x, z, yaw, spec.width, spec.length + 5);
      if (physics.vehicleContact(shape, unit.car)) continue;
      selected = lane; best = score; px = x; pz = z; heading = yaw;
    }
    if (!selected) return false;
    unit.active = unit.car.active = true; unit.car.driver = unit; unit.lane = selected; unit.hold = unit.stuck = 0; unit.block = false; unit.car.place(px, 0, pz, heading); unit.car.speed = 8; audio.radio(); return true;
  }
  function nextLane(at, previous, goal) {
    const choices = exits[at]; let selected = null, best = Infinity;
    for (let i = 0; i < choices.length; i++) { const lane = choices[i], p = intersections[lane.to], cost = Math.abs(p.x - goal.x) + Math.abs(p.z - goal.z) + (lane.to === previous ? 23 : 0); if (cost < best) { best = cost; selected = lane; } }
    return selected;
  }
  function dismount(unit, focus) {
    const { car, cop } = unit, footprint = car.footprint;
    for (let side = -1; side <= 1; side += 2) {
      const x = car.position.x + footprint.c * side * 1.58, z = car.position.z + footprint.s * side * 1.58, y = physics.groundAt(x, z);
      if (physics.circleBlocked(x, y, z, .29)) continue;
      cop.active = cop.root.visible = true; cop.position.set(x, y, z); cop.health = 100; cop.root.rotation.set(0, 0, 0); cop.root.scale.set(1, 1, 1); cop.timer = random.range(1.05, 1.65); cop.walk = cop.hitTime = 0; cop.cover = cop.aim = false;
      const dx = x - focus.x, dz = z - focus.z, length = Math.hypot(dx, dz) || 1;
      cop.coverX = car.position.x + dx / length * 2.65 + footprint.c * side * .68; cop.coverZ = car.position.z + dz / length * 2.65 + footprint.s * side * .68; car.exit(); return;
    }
  }
  function officerTick(cop, player, dt, weapons, onHit) {
    if (cop.health <= 0) return false;
    const target = player.vehicle?.position ?? player.position, p = cop.position, distance = Math.hypot(target.x - p.x, target.z - p.z), sight = visible(p, 1.45, target, 41);
    cop.timer -= dt; cop.hitTime = Math.max(0, cop.hitTime - dt); cop.cover = sight && cop.timer > .56 && Math.hypot(p.x - cop.coverX, p.z - cop.coverZ) < 4.3; cop.aim = sight && distance < 29 && !cop.cover;
    if (cop.cover || !cop.aim && distance > 9) {
      const dx = (cop.cover ? cop.coverX : target.x) - p.x, dz = (cop.cover ? cop.coverZ : target.z) - p.z, length = Math.hypot(dx, dz);
      if (length > .2) { const move = Math.min(length, dt * 3.25) / length; physics.stepCircle(p, dx * move, dz * move, .28, 1.65); p.y = physics.groundAt(p.x, p.z); cop.walk += dt * 12; }
    } else cop.walk = 0;
    cop.heading = Math.atan2(target.x - p.x, p.z - target.z); cop.root.rotation.y = -cop.heading; cop.root.rotation.z = cop.hitTime * .6; cop.root.scale.y = cop.cover ? .82 : 1;
    cop.left.rotation.x = Math.sin(cop.walk) * .42; cop.right.rotation.x = -cop.left.rotation.x; cop.arm.rotation.x = cop.aim ? 0 : -.68;
    if (cop.aim && cop.timer <= 0) { cop.timer = random.range(1.2, 1.95); if (weapons.officerShot(cop, player)) onHit(p); }
    return sight;
  }
  function pursue(unit, player, goal, level, dt) {
    const { car, controls } = unit, p = car.position; if (!car.active) return false;
    const target = player.vehicle?.position ?? player.position, distance = Math.hypot(target.x - p.x, target.z - p.z), sight = visible(p, 1.55, target, 48);
    if (!unit.cop.active && (!player.vehicle || Math.abs(player.vehicle.speed) < 2) && distance < 19 && sight && car.speed < 4.5 && !unit.block) dismount(unit, target);
    if (unit.cop.active || unit.block) { car.animate(dt); return sight; }
    const lane = unit.lane; let x = lane.bx, z = lane.bz;
    const direct = sight && distance < 33 && (level >= 3 || !player.vehicle || Math.abs(target.x - p.x) < 5 && Math.abs(lane.ax - lane.bx) < 1);
    if (direct) { x = target.x; z = target.z; }
    else if (Math.hypot(x - p.x, z - p.z) < 6 || (p.x - x) * (lane.bx - lane.ax) + (p.z - z) * (lane.bz - lane.az) > 0) {
      unit.lane = nextLane(lane.to, lane.from, goal); x = unit.lane.ax + (unit.lane.bx - unit.lane.ax) * .24; z = unit.lane.az + (unit.lane.bz - unit.lane.az) * .24;
    } else if (Math.hypot(lane.ax - p.x, lane.az - p.z) < 14) { x = lane.ax + (lane.bx - lane.ax) * .34; z = lane.az + (lane.bz - lane.az) * .34; }
    const heading = Math.atan2(x - p.x, p.z - z) - car.heading, error = Math.atan2(Math.sin(heading), Math.cos(heading)), speed = Math.abs(car.speed);
    const cap = !player.vehicle && direct && distance < 20 ? distance < 13 ? 0 : 3.8 : Math.abs(error) > .75 ? 6.2 : direct ? 15 + level * 2.7 : 14 + level * 1.4;
    if (level >= 4 && unit === cruisers[3] && !direct && Math.hypot(lane.bx - p.x, lane.bz - p.z) < 8 && distance < 58) { unit.block = true; car.exit(); return sight; }
    unit.stuck = speed < 1.4 && cap > 3 ? unit.stuck + dt : 0;
    if (unit.stuck > .95) { unit.hold = .84; unit.stuck = 0; } unit.hold = Math.max(0, unit.hold - dt);
    if (!unit.hold && !cap && speed < 1.1) { car.exit(); return sight; }
    controls.throttle = !unit.hold && (car.speed < 0 || speed < cap && cap > 0); controls.brake = unit.hold > 0 || car.speed > cap + .7; controls.steer = THREE.MathUtils.clamp(error * 2.1, -1, 1) * (unit.hold ? -1 : 1); car.drive(dt, controls, physics); return sight;
  }
  reset();
  return {
    reset, cruisers, officers, blips,
    hit(cop, damage) { cop.health = Math.max(0, cop.health - damage); cop.hitTime = .26; if (cop.health) return false; cop.root.scale.y = 1; cop.root.rotation.set(-Math.PI / 2, -cop.heading, 0, 'YXZ'); cop.position.y += .2; return true; },
    update(dt, player, weapons, onHit) {
      const level = wanted.state.level, focus = player.vehicle?.position ?? player.position; let sight = false;
      nearest = null; sirenDistance = Infinity; blips.length = 0; dispatch -= dt;
      for (let i = 0; i < cruisers.length; i++) {
        const unit = cruisers[i]; unit.cooldown -= dt;
        if (unit.active && (!level || Math.hypot(unit.car.position.x - focus.x, unit.car.position.z - focus.z) > 142 || !unit.car.active && (!unit.cop.active || unit.cop.health <= 0))) retire(unit);
        if (!unit.active && i < Math.min(UNIT_COUNT, level + Number(level >= 4)) && dispatch <= 0 && unit.cooldown <= 0 && dispatchUnit(unit, focus)) dispatch = 1.05;
        if (!unit.active) continue;
        if (unit.car.active && !unit.cop.active && pursue(unit, player, wanted.state, level, dt)) sight = true; else if (unit.car.active && unit.cop.active) unit.car.animate(dt);
        if (unit.cop.active && officerTick(unit.cop, player, dt, weapons, onHit)) sight = true;
        if (unit.car.active) { blips.push(unit.car.position); const distance = Math.hypot(unit.car.position.x - focus.x, unit.car.position.z - focus.z); if (distance < sirenDistance) { sirenDistance = distance; nearest = unit.car; } }
        if (unit.cop.active && unit.cop.health > 0) blips.push(unit.cop.position);
      }
      return sight;
    },
    updateAudio() { audio.siren(nearest, sirenDistance); },
  };
}
