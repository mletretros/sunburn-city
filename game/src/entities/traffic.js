import { DRIVE, STREET_LIFE as S, WORLD as W } from '../config.js';
import { makeRng } from '../rng.js';
import { signalPhase, canRecycle } from '../world/streets.js';
import { setFootprint } from '../systems/physics.js';
import { CAR_PAINT, VEHICLES, createVehicle } from './vehicle.js';
const STOP = W.cell - S.stop, yaw = (x, z) => Math.atan2(x, -z);
function roadRoutes(city) {
  return city.lanes.map(lane => {
    const end = city.intersections[lane.to], onward = [];
    for (const road of end.roads) for (const id of city.roads[road].lanes) if (city.lanes[id].from === end.id && city.lanes[id].to !== lane.from) onward.push(id);
    return { lane, end, onward, dx: (lane.bx - lane.ax) / W.cell, dz: (lane.bz - lane.az) / W.cell };
  });
}
export function createTraffic(scene, city, physics) {
  const routes = roadRoutes(city), actors = [], fleet = physics.vehicles, reservations = Array(city.intersections.length).fill(null), shape = {}, walker = { active: false, x: 0, z: 0 };
  const starterDriver = { kind: 'ambient', id: 'starter' }, starter = createVehicle(scene, VEHICLES[1], CAR_PAINT[0]); fleet.push(starter);
  for (let i = 0; i < S.cars; i++) {
    const car = createVehicle(scene, VEHICLES[i % VEHICLES.length], CAR_PAINT[(5 * i + 1) % CAR_PAINT.length]); fleet.push(car);
    actors.push({ car, route: null, next: null, t: 0, curve: 0, waiting: 0, horn: 0, cruise: 12,
      cx: 0, cz: 0, qx: 0, qz: 0, ex: 0, ez: 0, length: 0, driver: { kind: 'ambient', id: i } });
  }
  let random = makeRng(`${city.seed}:traffic`), owned = null, recycleDue = 0;
  function release(actor) { if (actor.route && reservations[actor.route.end.id] === actor) reservations[actor.route.end.id] = null; }
  function spawn(actor, focus, camera, initial) {
    const first = random.int(0, routes.length - 1);
    for (let attempt = 0; attempt < routes.length; attempt++) {
      const route = routes[(first + attempt * 13) % routes.length], t = random.range(S.stop + 1.5, STOP - 1), x = route.lane.ax + route.dx * t, z = route.lane.az + route.dz * t, distance = Math.hypot(x - focus.x, z - focus.z);
      if (distance < (initial ? 12 : S.near) || distance > (initial ? 165 : S.far + 42)) continue;
      if (!initial && !canRecycle(camera, x, z, focus, S.visibleRange)) continue;
      const heading = yaw(route.dx, route.dz), car = actor.car;
      setFootprint(shape, x, z, heading, car.spec.width, car.spec.length + 6); if (physics.vehicleContact(shape, car)) continue;
      actor.route = route; actor.next = null; actor.t = t; actor.curve = actor.waiting = actor.horn = 0; actor.cruise = random.range(...S.streetSpeed);
      car.active = car.ambient = true; car.driver = actor.driver; car.place(x, 0, z, heading); car.speed = actor.cruise * .66; return true;
    }
    return false;
  }
  function turn(actor, next) {
    const route = actor.route; actor.next = next; actor.curve = 0;
    actor.cx = route.lane.ax + route.dx * STOP; actor.cz = route.lane.az + route.dz * STOP; actor.ex = next.lane.ax + next.dx * S.stop; actor.ez = next.lane.az + next.dz * S.stop;
    const straight = route.dx === next.dx && route.dz === next.dz;
    actor.qx = straight ? (actor.cx + actor.ex) / 2 : route.dx ? actor.ex : actor.cx; actor.qz = straight ? (actor.cz + actor.ez) / 2 : route.dz ? actor.ez : actor.cz;
    actor.length = straight ? 2 * S.stop : .81 * (Math.hypot(actor.qx - actor.cx, actor.qz - actor.cz) + Math.hypot(actor.ex - actor.qx, actor.ez - actor.qz)); reservations[route.end.id] = actor;
  }
  function clearance(car, dx, dz) {
    let gap = Infinity;
    for (let i = 0; i < fleet.length; i++) {
      const other = fleet[i]; if (other === car || !other.active) continue;
      const x = other.position.x - car.position.x, z = other.position.z - car.position.z, ahead = x * dx + z * dz;
      if (ahead <= 0 || ahead > 23 || Math.abs(x * dz - z * dx) > 1.45 + other.spec.width * .32) continue;
      const alignment = Math.abs(other.footprint.s * dx - other.footprint.c * dz), extent = other.spec.length * alignment + other.spec.width * (1 - alignment);
      gap = Math.min(gap, ahead - (car.spec.length + extent) / 2);
    }
    if (walker.active) { const x = walker.x - car.position.x, z = walker.z - car.position.z, ahead = x * dx + z * dz; if (ahead > 0 && ahead < 16 && Math.abs(x * dz - z * dx) < car.spec.width * .59) gap = Math.min(gap, ahead - car.spec.length / 2); }
    return gap;
  }
  function tick(actor, dt, seconds, playerCar, audio) {
    const { car, route } = actor; if (!car.active || !car.ambient || !route || !car.health) return;
    let dx = car.footprint.s, dz = -car.footprint.c, desired = actor.next ? 7.5 : actor.cruise;
    const gap = clearance(car, dx, dz);
    if (!actor.next) desired = Math.min(desired, Math.sqrt(18 * Math.max(0, STOP - actor.t)));
    if (gap < 18) desired = Math.min(desired, Math.max(0, (gap - 1.1) * 1.8)); if (car.health < 100) desired *= .6 + .4 * car.health / 100;
    actor.horn = Math.max(0, actor.horn - dt); if (playerCar && !actor.horn && gap < 4.8 && playerCar.position.distanceTo(car.position) < 9) { audio.horn(.17, 270); actor.horn = 3.5; }
    car.braked = desired < car.speed - .4; car.speed += Math.sign(desired - car.speed) * Math.min(Math.abs(desired - car.speed), (desired < car.speed ? 12 : 4.5) * dt);
    let x, z, nextT = actor.t, nextCurve = actor.curve;
    if (actor.next) {
      nextCurve = Math.min(1, actor.curve + car.speed * dt / actor.length); const t = nextCurve, u = 1 - t;
      x = u * u * actor.cx + 2 * u * t * actor.qx + t * t * actor.ex; z = u * u * actor.cz + 2 * u * t * actor.qz + t * t * actor.ez;
      dx = u * (actor.qx - actor.cx) + t * (actor.ex - actor.qx); dz = u * (actor.qz - actor.cz) + t * (actor.ez - actor.qz);
    } else { nextT = Math.min(STOP, actor.t + car.speed * dt); dx = route.dx; dz = route.dz; x = route.lane.ax + dx * nextT; z = route.lane.az + dz * nextT; }
    const heading = yaw(dx, dz); setFootprint(shape, x, z, heading, car.spec.width, car.spec.length);
    const pedestrianAhead = walker.active && Math.hypot(walker.x - x, walker.z - z) < car.spec.length * .56 && Math.abs((walker.x - x) * shape.c + (walker.z - z) * shape.s) < shape.w + .25;
    if (physics.vehicleContact(shape, car) || physics.staticVehicleBlocked(shape, 0, car.spec.roof) || pedestrianAhead) { car.speed = 0; car.animate(dt); return; }
    const error = heading - car.heading; car.steering = Math.max(-.49, Math.min(.49, Math.atan2(Math.sin(error), Math.cos(error)) * 8)); car.position.set(x, 0, z); car.heading = heading; car.animate(dt); actor.t = nextT; actor.curve = nextCurve;
    if (actor.next && nextCurve >= 1) { release(actor); actor.route = actor.next; actor.next = null; actor.t = S.stop; actor.waiting = 0; }
    else if (!actor.next && nextT >= STOP - .035) {
      actor.t = STOP; actor.waiting += dt;
      if (car.speed >= .35 || actor.waiting <= .35 || reservations[route.end.id] || signalPhase(route.end, seconds) !== Number(route.dz !== 0)) return;
      const first = random.int(0, route.onward.length - 1);
      for (let i = 0; i < route.onward.length; i++) {
        const next = routes[route.onward[(first + i) % route.onward.length]];
        if (playerCar && Math.hypot(playerCar.position.x - route.end.x, playerCar.position.z - route.end.z) < 3.4) continue;
        setFootprint(shape, next.lane.ax + next.dx * (S.stop + 3), next.lane.az + next.dz * (S.stop + 3), yaw(next.dx, next.dz), car.spec.width + .25, car.spec.length + 3);
        if (!physics.vehicleContact(shape, car)) { turn(actor, next); break; }
      }
    }
  }
  return {
    fleet, actors, starter, get owned() { return owned; },
    reset(focus) {
      random = makeRng(`${city.seed}:traffic`); reservations.fill(null); recycleDue = 0; owned = null;
      for (const actor of actors) { actor.car.active = actor.car.ambient = false; actor.car.driver = null; actor.car.animate(0); actor.route = actor.next = null; }
      starter.active = true; starter.ambient = false; starter.driver = starterDriver; starter.place(DRIVE.starter.x, 0, DRIVE.starter.z, DRIVE.starter.heading);
      for (const actor of actors) spawn(actor, focus, null, true);
    },
    claim(car) { for (let i = 0; i < actors.length; i++) if (actors[i].car === car) { release(actors[i]); break; } car.ambient = false; owned = car; },
    nearestDoor(x, z) {
      let nearest = null, distance = DRIVE.reach;
      for (let i = 0; i < fleet.length; i++) { const car = fleet[i]; if (!car.active || car.police || !car.health || Math.abs(car.speed) >= DRIVE.exitSpeed) continue; const gap = car.doorDistance(x, z); if (gap < distance) { distance = gap; nearest = car; } }
      return nearest;
    },
    update(dt, focus, camera, seconds, playerCar, audio) {
      walker.active = !playerCar; walker.x = focus.x; walker.z = focus.z;
      for (let i = 0; i < actors.length; i++) tick(actors[i], dt, seconds, playerCar, audio);
      recycleDue -= dt; if (recycleDue > 0) return; recycleDue = .62;
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i], car = actor.car;
        if (car === owned || car === playerCar || car.active && !canRecycle(camera, car.position.x, car.position.z, focus, S.far, S.visibleRange + 8)) continue;
        release(actor); car.active = car.ambient = false; car.driver = null; car.animate(0); spawn(actor, focus, camera, false);
      }
    },
  };
}
