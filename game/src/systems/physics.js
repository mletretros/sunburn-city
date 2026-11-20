import { Box3, Ray, Vector3 } from 'three';
import { DRIVE, WORLD } from '../config.js';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function circleVsAabb(x, z, radius, box) {
  return (x - clamp(x, box.minX, box.maxX)) ** 2 + (z - clamp(z, box.minZ, box.maxZ)) ** 2 < radius * radius;
}
export function setFootprint(out, x, z, heading, width, length) {
  out.x = x; out.z = z; out.c = Math.cos(heading); out.s = Math.sin(heading); out.w = width / 2; out.l = length / 2;
  out.ex = Math.abs(out.c) * out.w + Math.abs(out.s) * out.l;
  out.ez = Math.abs(out.s) * out.w + Math.abs(out.c) * out.l; return out;
}
export function footprintOverlap(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  if (Math.abs(dx) >= a.ex + b.ex || Math.abs(dz) >= a.ez + b.ez) return false;
  const parallel = Math.abs(a.c * b.c + a.s * b.s), cross = Math.abs(a.s * b.c - a.c * b.s);
  return Math.abs(dx * a.c + dz * a.s) < a.w + b.w * parallel + b.l * cross
    && Math.abs(-dx * a.s + dz * a.c) < a.l + b.w * cross + b.l * parallel
    && Math.abs(dx * b.c + dz * b.s) < b.w + a.w * parallel + a.l * cross
    && Math.abs(-dx * b.s + dz * b.c) < b.l + a.w * cross + a.l * parallel;
}
export function circleVsFootprint(x, z, radius, shape) {
  const dx = x - shape.x, dz = z - shape.z;
  const u = Math.max(0, Math.abs(dx * shape.c + dz * shape.s) - shape.w), v = Math.max(0, Math.abs(-dx * shape.s + dz * shape.c) - shape.l);
  return u * u + v * v < radius * radius;
}
export function createPhysics(city) {
  const cell = WORLD.cell / 2, buckets = new Map(), vehicles = [], stride = 40;
  const ray = new Ray(), volume = new Box3(), hit = new Vector3(), wall = {}, bounds = city.bounds;
  for (const box of city.colliders) for (let z = Math.floor(box.minZ / cell); z <= Math.floor(box.maxZ / cell); z++) {
    for (let x = Math.floor(box.minX / cell); x <= Math.floor(box.maxX / cell); x++) {
      const key = x + z * stride;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(box);
    }
  }
  function circleBlocked(x, y, z, radius, height = 1.65, ignore = null, includeCars = true) {
    if (x - radius < bounds.west || x + radius > bounds.east || z - radius < bounds.north || z + radius > bounds.south) return true;
    for (let iz = Math.floor((z - radius) / cell); iz <= Math.floor((z + radius) / cell); iz++) for (let ix = Math.floor((x - radius) / cell); ix <= Math.floor((x + radius) / cell); ix++) {
      const list = buckets.get(ix + iz * stride); if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const box = list[i];
        if (y < box.maxY && y + height > box.minY && circleVsAabb(x, z, radius, box)) return true;
      }
    }
    if (includeCars) for (let i = 0; i < vehicles.length; i++) {
      const car = vehicles[i];
      if (car !== ignore && car.active && y + height > car.position.y + .22 && y < car.position.y + car.spec.roof && circleVsFootprint(x, z, radius, car.footprint)) return true;
    }
    return false;
  }
  function staticVehicleBlocked(shape, y, roof) {
    if (shape.x - shape.ex < bounds.west || shape.x + shape.ex > bounds.east || shape.z - shape.ez < bounds.north || shape.z + shape.ez > bounds.south) return true;
    for (let iz = Math.floor((shape.z - shape.ez) / cell); iz <= Math.floor((shape.z + shape.ez) / cell); iz++) for (let ix = Math.floor((shape.x - shape.ex) / cell); ix <= Math.floor((shape.x + shape.ex) / cell); ix++) {
      const list = buckets.get(ix + iz * stride); if (!list) continue;
      for (let i = 0; i < list.length; i++) {
        const box = list[i]; if (y + .24 >= box.maxY || y + roof <= box.minY) continue;
        setFootprint(wall, (box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2, 0, box.maxX - box.minX, box.maxZ - box.minZ);
        if (footprintOverlap(shape, wall)) return true;
      }
    }
    return false;
  }
  return {
    vehicles, circleBlocked, staticVehicleBlocked, groundAt: city.groundAt,
    wallDistance(origin, direction, limit) {
      ray.set(origin, direction);
      for (let i = 0; i < city.colliders.length; i++) {
        const box = city.colliders[i]; volume.min.set(box.minX, box.minY, box.minZ); volume.max.set(box.maxX, box.maxY, box.maxZ);
        if (ray.intersectBox(volume, hit)) limit = Math.min(limit, origin.distanceTo(hit));
      }
      return limit;
    },
    vehicleContact(shape, ignore = null) {
      for (let i = 0; i < vehicles.length; i++) { const car = vehicles[i]; if (car !== ignore && car.active && footprintOverlap(shape, car.footprint)) return car; }
      return null;
    },
    stepCircle(position, dx, dz, radius, height, ignore = null, includeCars = true) {
      let result = 0;
      if (circleBlocked(position.x + dx, position.y, position.z, radius, height, ignore, includeCars)) result |= 1; else position.x += dx;
      if (circleBlocked(position.x, position.y, position.z + dz, radius, height, ignore, includeCars)) result |= 2; else position.z += dz;
      return result;
    },
    vehicleGround(shape, current) {
      const dx = shape.s * shape.l * .64, dz = shape.c * shape.l * .64;
      const floor = (city.groundAt(shape.x + dx, shape.z - dz) + city.groundAt(shape.x - dx, shape.z + dz)) / 2;
      return floor - current > DRIVE.kerb ? NaN : floor;
    },
  };
}
