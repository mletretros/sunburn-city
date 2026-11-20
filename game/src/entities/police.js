import { createVehicle, VEHICLES } from './vehicle.js';
export function createPolice(scene, city, physics, wanted, audio) {
  const cruisers = [], blips = [], officers = [], controls = { throttle: true, brake: false, steer: 0, handbrake: false };
  const sightline = { x: 0, y: 0, z: 0 };
  let attackClock = 0;
  for (let n = 0; n < 5; n++) {
    const car = createVehicle(scene, VEHICLES[4], 0x283d4d); car.police = true;
    physics.vehicles.push(car); cruisers.push(car); blips.push({ x: 0, z: 0, active: false });
  }
  function reset() { for (let i = 0; i < cruisers.length; i++) { cruisers[i].active = false; cruisers[i].animate(0); blips[i].active = false; } attackClock = 0; }
  return { cruisers, cars: cruisers, blips, officers, reset,
    hit(cop, damage) { cop.health = Math.max(0, cop.health - damage); if (!cop.health && cop.destroy) cop.destroy(); return cop.health === 0; },
    update(dt, player, weapons, onHit) {
      const count = wanted.state.level ? Math.min(5, wanted.state.level + 1) : 0;
      let visible = false; attackClock += dt;
      for (let n = 0; n < cruisers.length; n++) {
        const car = cruisers[n], dot = blips[n];
        if (n >= count) { if (car.active) { car.active = false; car.animate(0); } dot.active = false; continue; }
        if (!car.active) {
          const road = city.nearestRoadPoint(player.position.x + (n % 2 ? 0 : 14), player.position.z + 28 + n * 14);
          car.active = true; car.place(road.x + (n % 2 ? -3.3 : 3.3), .03, road.z, 0); car.speed = 10;
        }
        const dx = player.position.x - car.position.x, dz = player.position.z - car.position.z, distance = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, -dz), error = Math.atan2(Math.sin(angle - car.heading), Math.cos(angle - car.heading));
        controls.steer = Math.max(-1, Math.min(1, error * 2)); controls.throttle = distance > 7; controls.brake = distance < 6 && car.speed > 2;
        car.drive(dt, controls, physics);
        sightline.x = dx / Math.max(1, distance); sightline.z = dz / Math.max(1, distance);
        if (distance < 65 && physics.wallDistance(car.seat, sightline, distance) >= distance - 1) visible = true;
        if (distance < 21 && attackClock > 1.7 && wanted.state.level >= 2) { weapons.enemyShoot?.(car.seat, player, 5); onHit?.(car.position); }
        dot.x = car.position.x; dot.z = car.position.z; dot.active = true;
      }
      if (attackClock > 1.7) attackClock = 0;
      return visible;
    },
    updateAudio() { let active = null; for (let n = 0; n < cruisers.length; n++) if (cruisers[n].active) { active = cruisers[n]; break; } audio.siren(active); },
  };
}
