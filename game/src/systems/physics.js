export function circleVsAabb(x, z, radius, box) {
  const nx = Math.min(box.maxX, Math.max(box.minX, x)), nz = Math.min(box.maxZ, Math.max(box.minZ, z));
  return Math.hypot(x - nx, z - nz) < radius;
}
export function setFootprint(out, x, z, heading, width, length) {
  // This runs for every car: mutate the caller's scratch shape, never allocate.
  out.x = x; out.z = z; out.c = Math.cos(heading); out.s = Math.sin(heading); out.w = width * .5; out.l = length * .5;
  out.ex = Math.abs(out.c) * out.w + Math.abs(out.s) * out.l;
  out.ez = Math.abs(out.s) * out.w + Math.abs(out.c) * out.l;
  return out;
}
export function footprintOverlap(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const cosine = Math.abs(a.c * b.c + a.s * b.s), sine = Math.abs(a.c * b.s - a.s * b.c);
  if (Math.abs(dx * a.c + dz * a.s) > a.w + b.w * cosine + b.l * sine) return false;
  if (Math.abs(-dx * a.s + dz * a.c) > a.l + b.w * sine + b.l * cosine) return false;
  if (Math.abs(dx * b.c + dz * b.s) > b.w + a.w * cosine + a.l * sine) return false;
  return Math.abs(-dx * b.s + dz * b.c) < b.l + a.w * sine + a.l * cosine;
}
export function circleVsFootprint(x, z, radius, shape) {
  const dx = x - shape.x, dz = z - shape.z, u = Math.abs(dx * shape.c + dz * shape.s) - shape.w, v = Math.abs(-dx * shape.s + dz * shape.c) - shape.l;
  return Math.hypot(Math.max(0, u), Math.max(0, v)) < radius;
}
export function createPhysics(city) {
  const vehicles = [], boxShape = {};
  function circleBlocked(x, y, z, radius, height = 1.7, ignore = null, includeCars = true) {
    if (x < city.bounds.west + radius || x > city.bounds.east - radius || z < city.bounds.north + radius || z > city.bounds.south - radius) return true;
    for (let i = 0; i < city.colliders.length; i++) {
      const b = city.colliders[i]; if (y < b.maxY && y + height > b.minY && circleVsAabb(x, z, radius, b)) return true;
    }
    if (includeCars) for (let i = 0; i < vehicles.length; i++) { const v = vehicles[i]; if (v !== ignore && v.active && circleVsFootprint(x, z, radius, v.footprint)) return true; }
    return false;
  }
  return { vehicles, groundAt: city.groundAt, circleBlocked,
    wallDistance(origin, direction, limit) {
      for (let distance = .4; distance < limit; distance += .6) if (city.blocked(origin.x + direction.x * distance, origin.y + direction.y * distance, origin.z + direction.z * distance, .05)) return distance;
      return limit;
    },
    stepCircle(position, dx, dz, radius, height, ignore = null, includeCars = true) {
      let flags = 0;
      if (circleBlocked(position.x + dx, position.y, position.z, radius, height, ignore, includeCars)) flags |= 1; else position.x += dx;
      if (circleBlocked(position.x, position.y, position.z + dz, radius, height, ignore, includeCars)) flags |= 2; else position.z += dz;
      return flags;
    },
    staticVehicleBlocked(shape, y = 0, height = 2) {
      if (shape.x - shape.ex < city.bounds.west || shape.x + shape.ex > city.bounds.east || shape.z - shape.ez < city.bounds.north || shape.z + shape.ez > city.bounds.south) return true;
      for (let i = 0; i < city.colliders.length; i++) {
        const b = city.colliders[i];
        if (shape.x + shape.ex < b.minX || shape.x - shape.ex > b.maxX || shape.z + shape.ez < b.minZ || shape.z - shape.ez > b.maxZ) continue;
        setFootprint(boxShape, (b.minX + b.maxX) / 2, (b.minZ + b.maxZ) / 2, 0, b.maxX - b.minX, b.maxZ - b.minZ);
        if (y < b.maxY && y + height > b.minY && footprintOverlap(shape, boxShape)) return true;
      }
      return false;
    },
    vehicleContact(shape, ignore = null) { for (let i = 0; i < vehicles.length; i++) if (vehicles[i] !== ignore && vehicles[i].active && footprintOverlap(shape, vehicles[i].footprint)) return vehicles[i]; return null; },
    vehicleGround(shape, current) { return city.groundAt(shape.x, shape.z); },
  };
}
