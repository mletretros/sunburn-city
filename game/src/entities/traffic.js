import { DRIVE, STREET_LIFE as S, WORLD as W } from '../config.js';
import { makeRng } from '../rng.js';
import { signalPhase, canRecycle } from '../world/streets.js';
import { setFootprint } from '../systems/physics.js';
import { CAR_PAINT, VEHICLES, createVehicle } from './vehicle.js';

const angle = (x, z) => Math.atan2(x, -z);
const STOP = W.cell - S.stop;

export function createTraffic(scene, city, physics) {
  const { lanes, intersections, roads } = city;
  const routes = lanes.map(lane => {
    const end = intersections[lane.to];
    const onward = [];
    for (const roadId of end.roads) for (const id of roads[roadId].lanes) {
      if (lanes[id].from === end.id && lanes[id].to !== lane.from) onward.push(id);
    }
    return { lane, dx: (lane.bx - lane.ax) / W.cell, dz: (lane.bz - lane.az) / W.cell, end, onward };
  });
  let rng = makeRng(`${city.seed}:traffic`), owned = null, scan = 0;
  const junctionOwners = Array(intersections.length).fill(null);
  const actors = [];
  const fleet = physics.vehicles;
  const starter = createVehicle(scene, VEHICLES[1], CAR_PAINT[0]); fleet.push(starter);
  const scratch = {};
  const walkerBlock = { x: 0, z: 0, active: false };
  for (let i = 0; i < S.cars; i++) {
    const car = createVehicle(scene, VEHICLES[i % VEHICLES.length], CAR_PAINT[(i * 5 + 1) % CAR_PAINT.length]);
    fleet.push(car);
    actors.push({ car, route: null, next: null, t: 0, curve: 0, waiting: 0, horn: 0, cruise: 12,
      cx: 0, cz: 0, qx: 0, qz: 0, ex: 0, ez: 0, length: 0, driver: { kind: 'ambient', id: i } });
  }
  function releaseJunction(actor) {
    if (actor.route && junctionOwners[actor.route.end.id] === actor) junctionOwners[actor.route.end.id] = null;
  }
  function spawn(actor, focus, camera, initial) {
    const start = rng.int(0, routes.length - 1), step = 13;
    for (let i = 0; i < routes.length; i++) {
      const route = routes[(start + i * step) % routes.length];
      const t = rng.range(S.stop + 1.5, STOP - 1);
      const { lane, dx, dz } = route, x = lane.ax + dx * t, z = lane.az + dz * t;
      const dist = Math.hypot(x - focus.x, z - focus.z);
      if (dist > (initial ? 165 : S.far + 42) || dist < (initial ? 12 : S.near) ||
        (!initial && !canRecycle(camera, x, z, focus, S.visibleRange))) continue;
      const h = angle(dx, dz), car = actor.car;
      setFootprint(scratch, x, z, h, car.spec.width, car.spec.length + 6);
      if (physics.vehicleContact(scratch, car)) continue;
      actor.route = route; actor.next = null; actor.t = t; actor.curve = actor.waiting = actor.horn = 0;
      actor.cruise = rng.range(...S.streetSpeed);
      car.active = car.ambient = true; car.driver = actor.driver;
      car.place(x, 0, z, h); car.speed = actor.cruise * .66;
      return true;
    }
    return false;
  }
  function reset(focus) {
    rng = makeRng(`${city.seed}:traffic`);
    junctionOwners.fill(null); scan = 0; owned = null;
    for (const actor of actors) {
      actor.car.active = actor.car.ambient = false; actor.car.driver = null; actor.car.animate(0);
      actor.route = actor.next = null;
    }
    starter.active = true; starter.driver = { kind: 'ambient', id: 'starter' };
    starter.place(DRIVE.starter.x, 0, DRIVE.starter.z, DRIVE.starter.heading);
    for (const actor of actors) spawn(actor, focus, null, true);
  }
  function beginTurn(a, next) {
    const { route: r } = a;
    a.next = next; a.curve = 0;
    a.cx = r.lane.ax + r.dx * STOP; a.cz = r.lane.az + r.dz * STOP;
    a.ex = next.lane.ax + next.dx * S.stop; a.ez = next.lane.az + next.dz * S.stop;
    // Intersection of incoming and outgoing tangents; a straight crossing uses its midpoint.
    const straight = r.dx === next.dx && r.dz === next.dz;
    a.qx = straight ? (a.cx + a.ex) / 2 : r.dx ? a.ex : a.cx;
    a.qz = straight ? (a.cz + a.ez) / 2 : r.dz ? a.ez : a.cz;
    a.length = straight ? 2 * S.stop : .81 * (Math.hypot(a.qx - a.cx, a.qz - a.cz) + Math.hypot(a.ex - a.qx, a.ez - a.qz));
    junctionOwners[r.end.id] = a;
  }
  function gapAhead(car, dx, dz) {
    let gap = Infinity;
    for (const other of fleet) {
      if (other === car || !other.active) continue;
      const x = other.position.x - car.position.x, z = other.position.z - car.position.z;
      const forward = x * dx + z * dz;
      if (forward <= 0 || forward > 23 || Math.abs(x * dz - z * dx) > 1.45 + other.spec.width * .32) continue;
      const alignment = Math.abs(other.footprint.s * dx - other.footprint.c * dz);
      gap = Math.min(gap, forward - car.spec.length / 2 - (other.spec.length * alignment + other.spec.width * (1 - alignment)) / 2);
    }
    if (walkerBlock.active) {
      const x = walkerBlock.x - car.position.x, z = walkerBlock.z - car.position.z;
      const forward = x * dx + z * dz;
      if (forward > 0 && forward < 16 && Math.abs(x * dz - z * dx) < car.spec.width * .59) gap = Math.min(gap, forward - car.spec.length / 2);
    }
    return gap;
  }
  function updateCar(a, dt, seconds, playerCar, audio, focus) {
    const { car, route: r } = a;
    if (!car.active || !car.ambient || !r || !car.health) return;
    let dx = car.footprint.s, dz = -car.footprint.c;
    const gap = gapAhead(car, dx, dz);
    let want = a.next ? 7.5 : a.cruise;
    if (!a.next) want = Math.min(want, Math.sqrt(2 * 9 * Math.max(0, STOP - a.t)));
    if (gap < 18) want = Math.min(want, Math.max(0, (gap - 1.1) * 1.8));
    if (car.health < 100) want *= .60 + .40 * car.health / 100;
    a.horn = Math.max(0, a.horn - dt);
    if (playerCar && !a.horn && gap < 4.8 && Math.hypot(playerCar.position.x - car.position.x, playerCar.position.z - car.position.z) < 9) {
      audio.horn(.17, 270); a.horn = 3.5;
    }
    const rate = want < car.speed ? 12 : 4.5;
    car.braked = want < car.speed - .4;
    car.speed += Math.sign(want - car.speed) * Math.min(Math.abs(want - car.speed), rate * dt);
    let x, z, nextT = a.t, nextCurve = a.curve;
    if (a.next) {
      const t = nextCurve = Math.min(1, a.curve + car.speed * dt / a.length), u = 1 - t;
      x = u * u * a.cx + 2 * u * t * a.qx + t * t * a.ex;
      z = u * u * a.cz + 2 * u * t * a.qz + t * t * a.ez;
      dx = u * (a.qx - a.cx) + t * (a.ex - a.qx);
      dz = u * (a.qz - a.cz) + t * (a.ez - a.qz);
    } else {
      nextT = Math.min(STOP, a.t + car.speed * dt);
      x = r.lane.ax + r.dx * nextT; z = r.lane.az + r.dz * nextT;
      dx = r.dx; dz = r.dz;
    }
    const heading = angle(dx, dz);
    setFootprint(scratch, x, z, heading, car.spec.width, car.spec.length);
    const footInWay = walkerBlock.active && Math.hypot(walkerBlock.x - x, walkerBlock.z - z) < car.spec.length * .56 &&
      Math.abs((walkerBlock.x - x) * scratch.c + (walkerBlock.z - z) * scratch.s) < scratch.w + .25;
    if (physics.vehicleContact(scratch, car) || physics.staticVehicleBlocked(scratch, 0, car.spec.roof) || footInWay) {
      car.speed = 0; car.animate(dt); return;
    }
    car.steering = Math.max(-.49, Math.min(.49, Math.atan2(Math.sin(heading - car.heading), Math.cos(heading - car.heading)) * 8));
    car.position.set(x, 0, z); car.heading = heading; car.animate(dt);
    a.t = nextT; a.curve = nextCurve;
    if (a.next && a.curve >= 1) {
      releaseJunction(a); a.route = a.next; a.next = null; a.t = S.stop; a.waiting = 0;
    } else if (!a.next && a.t >= STOP - .035) {
      a.t = STOP; a.waiting += dt;
      if (car.speed < .35 && a.waiting > .35 && !junctionOwners[r.end.id] && signalPhase(r.end, seconds) === Number(r.dz !== 0)) {
        const start = rng.int(0, r.onward.length - 1);
        for (let i = 0; i < r.onward.length; i++) {
          const next = routes[r.onward[(start + i) % r.onward.length]];
          if (playerCar && Math.hypot(playerCar.position.x - r.end.x, playerCar.position.z - r.end.z) < 3.4) continue;
          setFootprint(scratch, next.lane.ax + next.dx * (S.stop + 3), next.lane.az + next.dz * (S.stop + 3), angle(next.dx, next.dz), car.spec.width + .25, car.spec.length + 3);
          if (!physics.vehicleContact(scratch, car)) { beginTurn(a, next); break; }
        }
      }
    }
  }
  return {
    fleet, actors, starter, reset,
    get owned() { return owned; },
    claim(car) {
      const actor = actors.find(a => a.car === car);
      if (actor) releaseJunction(actor);
      car.ambient = false; owned = car;
    },
    nearestDoor(x, z) {
      let closest = null, reach = DRIVE.reach;
      for (const car of fleet) if (car.active && !car.police && car.health && Math.abs(car.speed) < DRIVE.exitSpeed) {
        const d = car.doorDistance(x, z);
        if (d < reach) { reach = d; closest = car; }
      }
      return closest;
    },
    update(dt, focus, camera, seconds, playerCar, audio) {
      walkerBlock.active = !playerCar; walkerBlock.x = focus.x; walkerBlock.z = focus.z;
      for (const actor of actors) updateCar(actor, dt, seconds, playerCar, audio, focus);
      scan -= dt;
      if (scan > 0) return;
      scan = .62;
      for (const a of actors) {
        const car = a.car;
        if (car === owned || car === playerCar) continue;
        if (car.active && !canRecycle(camera, car.position.x, car.position.z, focus, S.far, S.visibleRange + 8)) continue;
        releaseJunction(a); car.active = car.ambient = false; car.driver = null; car.animate(0);
        spawn(a, focus, camera, false);
      }
    },
  };
}
