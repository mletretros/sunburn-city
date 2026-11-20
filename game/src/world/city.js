import { WORLD, DISTRICTS } from '../config.js';
import { makeRng } from '../rng.js';
export function createCity(seed) {
  const W = WORLD, dice = makeRng(seed + '/architecture');
  const city = { seed, east: W.columns * W.cell, south: W.north + W.rows * W.cell,
    blocks: [], lots: [], roads: [], lanes: [], intersections: [], colliders: [], spawnPoints: [] };
  city.bounds = { west: -41, east: city.east + 24, north: W.north - 24, south: city.south + 24 };
  function districtAt(x, z) {
    const col = Math.max(0, Math.floor(x / 58)), row = Math.max(0, Math.floor((z + 406) / 58));
    if (col === 0) return 'palma';
    if (row < 2 && col < 4) return 'dock';
    if (col >= 6 || row >= 8 && col >= 3) return 'causeway';
    return col < 5 && row < 7 ? 'neon' : 'coral';
  }
  city.districtAt = districtAt;
  city.isOnRoad = (x, z) => Math.abs(x - Math.round(x / 58) * 58) < 7.5 || Math.abs(z - Math.round(z / 58) * 58) < 7.5;
  city.groundAt = (x, z) => x < -7.5 || !city.isOnRoad(x, z) ? .16 : .02;
  city.addCollider = (x, z, w, d, h, base = 0) => {
    const wall = { minX: x - w * .5, maxX: x + w * .5, minZ: z - d * .5, maxZ: z + d * .5, minY: base, maxY: base + h };
    city.colliders.push(wall); return wall;
  };
  for (let row = 0; row <= 9; row++) for (let col = 0; col <= 7; col++) city.intersections.push({ id: row * 8 + col, x: col * 58, z: -406 + row * 58, roads: [] });
  function link(first, second) {
    const a = city.intersections[first], b = city.intersections[second];
    const avenue = { id: city.roads.length, from: first, to: second, ax: a.x, az: a.z, bx: b.x, bz: b.z, width: 15, lanes: [] };
    city.roads.push(avenue); a.roads.push(avenue.id); b.roads.push(avenue.id);
    const ux = (b.x - a.x) / 58, uz = (b.z - a.z) / 58;
    for (let n = 0; n < 2; n++) {
      const dir = n ? -1 : 1, start = n ? b : a, end = n ? a : b;
      avenue.lanes.push(city.lanes.length);
      city.lanes.push({ id: city.lanes.length, road: avenue.id, from: start.id, to: end.id, ax: start.x - uz * 3.3 * dir, az: start.z + ux * 3.3 * dir, bx: end.x - uz * 3.3 * dir, bz: end.z + ux * 3.3 * dir });
    }
  }
  for (let n = 0; n < 80; n++) { if (n % 8 < 7) link(n, n + 1); if (n < 72) link(n, n + 8); }
  for (let row = 0; row < 9; row++) for (let col = 0; col < 7; col++) {
    const x = col * 58 + 29, z = row * 58 - 377, district = districtAt(x, z), palette = DISTRICTS[district];
    const block = { id: city.blocks.length, c: col, r: row, x, z, district, side: 43, park: col === 1 && row === 7, lots: [] };
    city.blocks.push(block);
    if (block.park) continue;
    for (let k = 0; k < 4; k++) {
      const plot = { id: city.lots.length, block: block.id, district, x: x + (k % 2 ? 10 : -10), z: z + (k < 2 ? -10 : 10),
        width: dice.range(14, 18), depth: dice.range(14, 18), height: dice.range(palette.height[0], palette.height[1]), color: dice.pick(palette.colors), frontage: col === 0 ? 'west' : 'north' };
      plot.collider = city.addCollider(plot.x, plot.z, plot.width, plot.depth, plot.height);
      block.lots.push(plot); city.lots.push(plot);
    }
  }
  city.spawnPoints.push({ ...W.spawn, district: 'palma' }, { x: 58, z: -90, heading: 0, district: 'neon' }, { x: 116, z: -348, heading: 0, district: 'dock' }, { x: 290, z: -58, heading: 0, district: 'coral' }, { x: 406, z: 58, heading: 0, district: 'causeway' });
  city.blocked = (x, y, z, radius) => {
    for (let n = 0; n < city.colliders.length; n++) {
      const b = city.colliders[n];
      if (y < b.maxY && y + 1.7 > b.minY && x + radius > b.minX && x - radius < b.maxX && z + radius > b.minZ && z - radius < b.maxZ) return true;
    }
    return false;
  };
  city.nearestRoadPoint = (x, z) => {
    let chosen = null, best = Infinity, px = 0, pz = 0;
    for (const road of city.roads) {
      const cx = Math.max(road.ax, Math.min(x, road.bx)), cz = Math.max(road.az, Math.min(z, road.bz)), distance = Math.hypot(x - cx, z - cz);
      if (distance < best) { best = distance; chosen = road; px = cx; pz = cz; }
    }
    return { x: px, z: pz, road: chosen, distance: best };
  };
  return city;
}
