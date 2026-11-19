import { DRIVE, WORLD } from '../config.js';
import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function circleVsAabb(x, z, radius, box) {
  const dx = x - clamp(x, box.minX, box.maxX), dz = z - clamp(z, box.minZ, box.maxZ);
  return dx * dx + dz * dz < radius * radius;
}

export function setFootprint(out, x, z, heading, width, length) {
  out.x = x; out.z = z; out.c = Math.cos(heading); out.s = Math.sin(heading);
  out.w = width / 2; out.l = length / 2;
  out.ex = Math.abs(out.c) * out.w + Math.abs(out.s) * out.l;
  out.ez = Math.abs(out.s) * out.w + Math.abs(out.c) * out.l;
  return out;
}

export function footprintOverlap(a, b) {
  const x = b.x - a.x, z = b.z - a.z;
  if (Math.abs(x) >= a.ex + b.ex || Math.abs(z) >= a.ez + b.ez) return false;
  const dot = Math.abs(a.c * b.c + a.s * b.s), cross = Math.abs(a.s * b.c - a.c * b.s);
  return Math.abs(x * a.c + z * a.s) < a.w + b.w * dot + b.l * cross &&
    Math.abs(-x * a.s + z * a.c) < a.l + b.w * cross + b.l * dot &&
    Math.abs(x * b.c + z * b.s) < b.w + a.w * dot + a.l * cross &&
    Math.abs(-x * b.s + z * b.c) < b.l + a.w * cross + a.l * dot;
}

export function circleVsFootprint(x, z, radius, box) {
  const dx = x - box.x, dz = z - box.z;
  const u = Math.max(0, Math.abs(dx * box.c + dz * box.s) - box.w);
  const v = Math.max(0, Math.abs(-dx * box.s + dz * box.c) - box.l);
  return u * u + v * v < radius * radius;
}

export function createPhysics(city) {
  const span = WORLD.cell / 2, wide = 40, buckets = new Map();
  const bounds = city.bounds, vehicles = [], staticFootprint = {};
  const ray = new THREE.Ray(), volume = new THREE.Box3(), hit = new THREE.Vector3();
  function wallDistance(origin, direction, limit) {
    ray.set(origin, direction);
    for (const b of city.colliders) {
      volume.min.set(b.minX, b.minY, b.minZ); volume.max.set(b.maxX, b.maxY, b.maxZ);
      if (ray.intersectBox(volume, hit)) limit = Math.min(limit, hit.distanceTo(origin));
    }
    return limit;
  }
  for (const b of city.colliders) {
    for (let z = Math.floor(b.minZ / span); z <= Math.floor(b.maxZ / span); z++) {
      for (let x = Math.floor(b.minX / span); x <= Math.floor(b.maxX / span); x++) {
        const key = x + wide * z;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(b);
      }
    }
  }
  function circleBlocked(x, y, z, r, height = 1.65, ignore = null, includeCars = true) {
    if (x < bounds.west + r || x > bounds.east - r || z < bounds.north + r || z > bounds.south - r) return true;
    for (let iz = Math.floor((z - r) / span); iz <= Math.floor((z + r) / span); iz++) {
      for (let ix = Math.floor((x - r) / span); ix <= Math.floor((x + r) / span); ix++) {
        const bucket = buckets.get(ix + wide * iz);
        if (!bucket) continue;
        for (const b of bucket) if (y < b.maxY && y + height > b.minY && circleVsAabb(x, z, r, b)) return true;
      }
    }
    if (includeCars) for (const car of vehicles) {
      if (car !== ignore && car.active && y < car.position.y + car.spec.roof &&
        circleVsFootprint(x, z, r, car.footprint)) return true;
    }
    return false;
  }

  function staticVehicleBlocked(shape, y, roof) {
    if (shape.x - shape.ex < bounds.west || shape.x + shape.ex > bounds.east ||
      shape.z - shape.ez < bounds.north || shape.z + shape.ez > bounds.south) return true;
    for (let iz = Math.floor((shape.z - shape.ez) / span); iz <= Math.floor((shape.z + shape.ez) / span); iz++) {
      for (let ix = Math.floor((shape.x - shape.ex) / span); ix <= Math.floor((shape.x + shape.ex) / span); ix++) {
        const bucket = buckets.get(ix + wide * iz);
        if (!bucket) continue;
        for (const b of bucket) {
          if (y + .24 >= b.maxY || y + roof <= b.minY) continue;
          setFootprint(staticFootprint, (b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, 0, b.maxX - b.minX, b.maxZ - b.minZ);
          if (footprintOverlap(shape, staticFootprint)) return true;
        }
      }
    }
    return false;
  }
  function vehicleContact(shape, ignore = null) {
    for (const car of vehicles) if (car.active && car !== ignore && footprintOverlap(shape, car.footprint)) return car;
    return null;
  }
  function stepCircle(p, dx, dz, radius, height, ignore = null, includeCars = true) {
    let hit = 0;
    if (!circleBlocked(p.x + dx, p.y, p.z, radius, height, ignore, includeCars)) p.x += dx; else hit |= 1;
    if (!circleBlocked(p.x, p.y, p.z + dz, radius, height, ignore, includeCars)) p.z += dz; else hit |= 2;
    return hit;
  }
  function vehicleGround(shape, current) {
    const front = city.groundAt(shape.x + shape.s * shape.l * .64, shape.z - shape.c * shape.l * .64);
    const rear = city.groundAt(shape.x - shape.s * shape.l * .64, shape.z + shape.c * shape.l * .64);
    const target = (front + rear) * .5;
    return target - current > DRIVE.kerb ? NaN : target;
  }
  return { vehicles, wallDistance, groundAt: city.groundAt, circleBlocked, stepCircle, staticVehicleBlocked, vehicleContact, vehicleGround };
}
