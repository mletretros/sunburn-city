import { makeRng } from '../rng.js';
import { createVehicle, VEHICLES, CAR_PAINT } from './vehicle.js';
export function createTraffic(scene, city, physics) {
  const random = makeRng(city.seed + '/drivers'), fleet = [], actors = [];
  let owned = null;
  const starter = createVehicle(scene, VEHICLES[5], 0xe8ad44); fleet.push(starter); physics.vehicles.push(starter);
  for (let n = 0; n < 22; n++) {
    const car = createVehicle(scene, VEHICLES[n % 4], CAR_PAINT[n % CAR_PAINT.length]);
    physics.vehicles.push(car); fleet.push(car); actors.push({ car, route: null, t: 0, pace: random.range(6, 11), generation: 0 });
  }
  function route(actor, lane, t) {
    actor.route = lane; actor.t = t; actor.car.active = actor.car.ambient = true;
    actor.car.driver = { kind: 'ambient' }; actor.car.place(lane.ax + (lane.bx - lane.ax) * t, .03, lane.az + (lane.bz - lane.az) * t, Math.atan2(lane.bx - lane.ax, lane.az - lane.bz));
  }
  function reset(focus) {
    owned = null; starter.active = true; starter.driver = null; starter.place(-5, .03, 64, 0);
    const near = city.lanes.slice().sort((a, b) => Math.hypot(a.ax - focus.x, a.az - focus.z) - Math.hypot(b.ax - focus.x, b.az - focus.z));
    for (let n = 0; n < actors.length; n++) route(actors[n], near[(n * 3) % Math.min(near.length, 76)], .15 + (n % 4) * .19);
  }
  const api = { fleet, actors, starter, reset, get owned() { return owned; },
    claim(car) { owned = car; car.ambient = false; },
    nearestDoor(x, z) {
      let closest = null, gap = 2.7;
      for (let n = 0; n < physics.vehicles.length; n++) { const car = physics.vehicles[n]; if (!car.active || car.police || Math.abs(car.speed) >= 4) continue; const distance = car.doorDistance(x, z); if (distance < gap) { gap = distance; closest = car; } }
      return closest;
    },
    update(dt, focus, camera, seconds, playerCar) {
      for (let n = 0; n < actors.length; n++) {
        const actor = actors[n], car = actor.car; if (!car.active || !car.ambient || car === playerCar || car === owned) continue;
        let blocked = false;
        for (let j = 0; j < physics.vehicles.length; j++) {
          const other = physics.vehicles[j]; if (other === car || !other.active) continue;
          const dx = other.position.x - car.position.x, dz = other.position.z - car.position.z;
          const forward = dx * Math.sin(car.heading) - dz * Math.cos(car.heading), lateral = dx * Math.cos(car.heading) + dz * Math.sin(car.heading);
          if (forward > 0 && forward < 7 && Math.abs(lateral) < 2.3) { blocked = true; break; }
        }
        car.speed += ((blocked ? 0 : actor.pace) - car.speed) * Math.min(1, dt * 3);
        actor.t += car.speed * dt / 58;
        if (actor.t >= 1) {
          const node = city.intersections[actor.route.to], options = node.roads;
          const road = city.roads[options[(n + actor.generation++) % options.length]];
          const lane = city.lanes[road.lanes[city.lanes[road.lanes[0]].from === node.id ? 0 : 1]];
          route(actor, lane, .02);
        }
        const lane = actor.route; car.position.set(lane.ax + (lane.bx - lane.ax) * actor.t, .03, lane.az + (lane.bz - lane.az) * actor.t); car.animate(dt);
      }
    },
  };
  reset(city.spawnPoints[0]); return api;
}
