import * as THREE from 'three';
import { makeRng } from '../rng.js';
import { VEHICLES, createVehicle } from './vehicle.js';
import { setFootprint } from '../systems/physics.js';

export function createPolice(scene, city, physics, wanted, audio) {
  const spec = { ...VEHICLES[1], name: 'Civic Guard Cruiser', type: 'police', top: 36 };
  const { intersections, lanes } = city;
  const exits = intersections.map(j => lanes.filter(l => l.from === j.id));
  const cruisers = [], officers = [], blips = [], shape = {};
  const direction = new THREE.Vector3(), eye = new THREE.Vector3();
  const body = new THREE.BoxGeometry(), head = new THREE.IcosahedronGeometry(.14, 1);
  const navy = new THREE.MeshStandardMaterial({ color: 0x273c58 }), skin = new THREE.MeshStandardMaterial({ color: 0xbe856a });
  const badge = new THREE.MeshBasicMaterial({ color: 0xffce79 });
  let rng, dispatch, nearest, sirenDistance;
  for (let i = 0; i < 6; i++) {
    const car = createVehicle(scene, spec, 0xe9e5d7); car.police = true; physics.vehicles.push(car);
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    const part = (geo, mat, x, y, z, w, h, d) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(w, h, d); root.add(m); return m;
    };
    part(body, navy, 0, 1.12, 0, .39, .48, .25);
    part(head, skin, 0, 1.49, 0, 1, 1.12, 1);
    part(body, navy, 0, 1.61, -.035, .28, .09, .34);
    part(body, badge, -.11, 1.22, -.131, .065, .075, .018);
    const left = part(body, navy, -.115, .46, 0, .16, .88, .18);
    const right = part(body, navy, .115, .46, 0, .16, .88, .18);
    const arm = part(body, navy, .24, 1.20, -.16, .12, .13, .40);
    part(body, navy, -.22, 1.15, -.09, .12, .15, .27);
    const cop = { root, left, right, arm, position: root.position, kind: 'officer', active: false, health: 100, heading: 0, timer: 0, walk: 0, hitTime: 0, coverX: 0, coverZ: 0, cover: false, aim: false };
    officers.push(cop);
    const unit = { car, cop, active: false, lane: null, cooldown: 0, hold: 0, stuck: 0, block: false, controls: { throttle: true, brake: false, steer: 0, handbrake: false } };
    car.driver = unit; cruisers.push(unit);
  }
  function retire(unit) {
    unit.active = unit.car.active = unit.cop.active = unit.cop.root.visible = false;
    unit.car.animate(0); unit.cooldown = 5;
  }
  function reset() {
    rng = makeRng(`${city.seed}:police`); dispatch = .45; blips.length = 0;
    for (const u of cruisers) { retire(u); u.cooldown = 0; }
  }
  reset();
  function clearSight(p, height, q, range) {
    eye.set(p.x, p.y + height, p.z); direction.set(q.x - p.x, (q.y ?? 0) + 1 - eye.y, q.z - p.z);
    const distance = direction.length();
    return distance < range && physics.wallDistance(eye, direction.divideScalar(distance || 1), distance) >= distance - .06;
  }
  function spawn(unit, p) {
    let chosen = null, bx = 0, bz = 0, heading = 0, best = Infinity;
    for (const lane of lanes) {
      const x = lane.ax + (lane.bx - lane.ax) * .45, z = lane.az + (lane.bz - lane.az) * .45;
      const distance = Math.hypot(x - p.x, z - p.z), end = intersections[lane.to];
      if (distance < (unit === cruisers[0] ? 26 : 38) || distance > 113) continue;
      const toward = ((lane.bx - lane.ax) * (p.x - x) + (lane.bz - lane.az) * (p.z - z)) / (58 * distance);
      const coastal = p.x < 9 && Math.abs(x) < 6 && Math.abs(lane.bx - lane.ax) < 1;
      const score = Math.abs(distance - 43) + Math.hypot(end.x - p.x, end.z - p.z) * .48 - toward * 9 - (coastal ? 16 : 0) + rng.range(0, 6) + (city.districtAt(x, z) === city.districtAt(p.x, p.z) ? 4 : 0);
      if (score >= best) continue;
      const h = Math.atan2(lane.bx - lane.ax, lane.az - lane.bz);
      setFootprint(shape, x, z, h, spec.width, spec.length + 5);
      if (physics.vehicleContact(shape, unit.car)) continue;
      chosen = lane; best = score; bx = x; bz = z; heading = h;
    }
    if (!chosen) return false;
    unit.active = unit.car.active = true; unit.car.driver = unit; unit.lane = chosen;
    unit.hold = unit.stuck = 0; unit.block = false;
    unit.car.place(bx, 0, bz, heading); unit.car.speed = 8;
    audio.radio(); return true;
  }
  function nextLane(at, old, target) {
    let choice = null, best = Infinity;
    for (const lane of exits[at]) {
      const p = intersections[lane.to];
      const score = Math.abs(p.x - target.x) + Math.abs(p.z - target.z) + (lane.to === old ? 23 : 0);
      if (score < best) { best = score; choice = lane; }
    }
    return choice;
  }
  function dismount(unit, p) {
    const { car, cop } = unit;
    const b = car.footprint;
    for (let side = -1; side <= 1; side += 2) {
      const x = car.position.x + b.c * side * 1.58, z = car.position.z + b.s * side * 1.58;
      const y = physics.groundAt(x, z);
      if (physics.circleBlocked(x, y, z, .29)) continue;
      cop.active = cop.root.visible = true; cop.position.set(x, y, z); cop.health = 100;
      cop.timer = rng.range(1.05, 1.65); cop.walk = cop.hitTime = 0; cop.cover = cop.aim = false;
      const u = x - p.x, v = z - p.z;
      const length = Math.hypot(u, v) || 1;
      cop.coverX = car.position.x + u / length * 2.65 + b.c * side * .68;
      cop.coverZ = car.position.z + v / length * 2.65 + b.s * side * .68;
      car.exit(); return;
    }
  }
  function updateOfficer(cop, player, dt, weapons, onHit) {
    if (cop.health <= 0) return false;
    const p = player.vehicle?.position ?? player.position, q = cop.position;
    const distance = Math.hypot(p.x - q.x, p.z - q.z);
    const sight = clearSight(q, 1.45, p, 41);
    cop.timer -= dt; cop.hitTime = Math.max(0, cop.hitTime - dt);
    cop.cover = sight && cop.timer > .56 && Math.hypot(q.x - cop.coverX, q.z - cop.coverZ) < 4.3;
    cop.aim = sight && distance < 29 && !cop.cover;
    const x = cop.cover ? cop.coverX : p.x, z = cop.cover ? cop.coverZ : p.z;
    if (cop.cover || !cop.aim && distance > 9) {
      const dx = x - q.x, dz = z - q.z, length = Math.hypot(dx, dz);
      if (length > .20) {
        const step = Math.min(length, dt * 3.25) / length;
        physics.stepCircle(q, dx * step, dz * step, .28, 1.65);
        q.y = physics.groundAt(q.x, q.z); cop.walk += dt * 12;
      }
    } else cop.walk = 0;
    cop.heading = Math.atan2(p.x - q.x, q.z - p.z); cop.root.rotation.y = -cop.heading;
    cop.root.rotation.z = cop.hitTime * .6;
    cop.root.scale.y = cop.cover ? .82 : 1;
    cop.left.rotation.x = Math.sin(cop.walk) * .42; cop.right.rotation.x = -cop.left.rotation.x;
    cop.arm.rotation.x = cop.aim ? 0 : -.68;
    if (cop.aim && cop.timer <= 0) {
      cop.timer = rng.range(1.20, 1.95);
      if (weapons.officerShot(cop, player)) onHit(q);
    }
    return sight;
  }
  function pursuit(unit, player, goal, level, dt) {
    const { car, controls } = unit, p = car.position;
    if (!car.active) return;
    const victim = player.vehicle?.position ?? player.position;
    const distance = Math.hypot(victim.x - p.x, victim.z - p.z);
    const sight = clearSight(p, 1.55, victim, 48);
    if (!unit.cop.active && (!player.vehicle || Math.abs(player.vehicle.speed) < 2) && distance < 19 && sight && car.speed < 4.5 && !unit.block) dismount(unit, victim);
    if (unit.cop.active || unit.block) { car.animate(dt); return sight; }
    const lane = unit.lane;
    let x = lane.bx, z = lane.bz;
    const direct = sight && distance < 33 && (level >= 3 || !player.vehicle || Math.abs(victim.x - p.x) < 5 && Math.abs(lane.ax - lane.bx) < 1);
    if (direct) { x = victim.x; z = victim.z; }
    else if (Math.hypot(x - p.x, z - p.z) < 6 || (p.x - x) * (lane.bx - lane.ax) + (p.z - z) * (lane.bz - lane.az) > 0) {
      unit.lane = nextLane(lane.to, lane.from, goal);
      x = unit.lane.ax + (unit.lane.bx - unit.lane.ax) * .24;
      z = unit.lane.az + (unit.lane.bz - unit.lane.az) * .24;
    } else if (Math.hypot(lane.ax - p.x, lane.az - p.z) < 14) {
      x = lane.ax + (lane.bx - lane.ax) * .34; z = lane.az + (lane.bz - lane.az) * .34;
    }
    const h = Math.atan2(x - p.x, p.z - z) - car.heading;
    const error = Math.atan2(Math.sin(h), Math.cos(h)), speed = Math.abs(car.speed);
    const cap = !player.vehicle && direct && distance < 20 ? (distance < 13 ? 0 : 3.8) : Math.abs(error) > .75 ? 6.2 : direct ? 15 + level * 2.7 : 14 + level * 1.4;
    if (level >= 4 && unit === cruisers[3] && !direct && Math.hypot(lane.bx - p.x, lane.bz - p.z) < 8 && distance < 58) {
      unit.block = true; car.exit(); return;
    }
    if (speed < 1.4 && cap > 3) unit.stuck += dt; else unit.stuck = 0;
    if (unit.stuck > .95) { unit.hold = .84; unit.stuck = 0; }
    unit.hold = Math.max(0, unit.hold - dt);
    if (!unit.hold && cap === 0 && speed < 1.1) { car.exit(); return sight; }
    controls.throttle = !unit.hold && (car.speed < 0 || speed < cap && cap > 0);
    controls.brake = unit.hold > 0 || car.speed > cap + .7;
    controls.steer = THREE.MathUtils.clamp(error * 2.1, -1, 1) * (unit.hold ? -1 : 1);
    car.drive(dt, controls, physics);
    return sight;
  }
  return {
    reset, cruisers, officers, blips,
    hit(cop, damage) {
      cop.health = Math.max(0, cop.health - damage); cop.hitTime = .26;
      if (cop.health) return false;
      cop.root.scale.y = 1; cop.root.rotation.set(-Math.PI / 2, -cop.heading, 0, 'YXZ'); cop.position.y += .20;
      return true;
    },
    update(dt, player, weapons, onHit) {
      const level = wanted.state.level, focus = player.vehicle?.position ?? player.position;
      let sight = false; nearest = null; sirenDistance = Infinity; blips.length = 0;
      dispatch -= dt;
      for (let i = 0; i < cruisers.length; i++) {
        const u = cruisers[i]; u.cooldown -= dt;
        if (u.active && (!level || Math.hypot(u.car.position.x - focus.x, u.car.position.z - focus.z) > 142 || (!u.car.active && (!u.cop.active || u.cop.health <= 0)))) retire(u);
        if (!u.active && i < Math.min(6, level + Number(level >= 4)) && dispatch <= 0 && u.cooldown <= 0 && spawn(u, focus)) dispatch = 1.05;
        if (!u.active) continue;
        if (u.car.active && !u.cop.active && pursuit(u, player, wanted.state, level, dt)) sight = true;
        else if (u.car.active && u.cop.active) u.car.animate(dt);
        if (u.cop.active && updateOfficer(u.cop, player, dt, weapons, onHit)) sight = true;
        if (u.car.active) {
          blips.push(u.car.position);
          const d = Math.hypot(u.car.position.x - focus.x, u.car.position.z - focus.z);
          if (d < sirenDistance) { sirenDistance = d; nearest = u.car; }
        }
        if (u.cop.active && u.cop.health > 0) blips.push(u.cop.position);
      }
      return sight;
    },
    updateAudio() { audio.siren(nearest, sirenDistance); },
  };
}
