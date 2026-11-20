import { WORLD as W, DISTRICTS } from '../config.js';
import { makeRng } from '../rng.js';
function zoneAt(c, r) {
  if (r < 2 && c < 4) return 'dock';
  if (c === 0) return 'palma';
  if (r >= 2 && r <= 6 && c <= 4) return 'neon';
  if (c === 6 || r === 8 && c >= 3) return 'causeway';
  return 'coral';
}
export function createCity(seed) {
  const random = makeRng(`${seed}:layout`);
  const blocks = [], lots = [], intersections = [], roads = [], lanes = [], colliders = [];
  const east = W.columns * W.cell, south = W.north + W.rows * W.cell, half = W.road / 2;
  const bounds = { west: W.shore + 1.4, east: east + W.southMargin, north: W.north - W.southMargin, south: south + W.southMargin };
  const nodeId = (c, r) => r * (W.columns + 1) + c;
  for (let r = 0; r <= W.rows; r++) for (let c = 0; c <= W.columns; c++) {
    intersections.push({ id: nodeId(c, r), x: c * W.cell, z: W.north + r * W.cell, roads: [] });
  }
  function connect(a, b) {
    const start = intersections[a], end = intersections[b];
    const road = { id: roads.length, from: a, to: b, ax: start.x, az: start.z, bx: end.x, bz: end.z, width: W.road, lanes: [] };
    roads.push(road); start.roads.push(road.id); end.roads.push(road.id);
    const dx = (end.x - start.x) / W.cell, dz = (end.z - start.z) / W.cell;
    for (let direction = 1; direction >= -1; direction -= 2) {
      const offset = W.road * .24 * direction, from = direction > 0 ? start : end, to = direction > 0 ? end : start;
      const lane = { id: lanes.length, road: road.id, from: from.id, to: to.id,
        ax: from.x - dz * offset, az: from.z + dx * offset, bx: to.x - dz * offset, bz: to.z + dx * offset };
      lanes.push(lane); road.lanes.push(lane.id);
    }
  }
  for (let r = 0; r <= W.rows; r++) for (let c = 0; c <= W.columns; c++) {
    if (c < W.columns) connect(nodeId(c, r), nodeId(c + 1, r));
    if (r < W.rows) connect(nodeId(c, r), nodeId(c, r + 1));
  }
  function addCollider(x, z, width, depth, height, base = 0) {
    const box = { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, minY: base, maxY: base + height };
    colliders.push(box); return box;
  }
  for (let r = 0; r < W.rows; r++) for (let c = 0; c < W.columns; c++) {
    const district = zoneAt(c, r), style = DISTRICTS[district];
    const block = { id: blocks.length, c, r, district, x: (c + .5) * W.cell, z: W.north + (r + .5) * W.cell,
      side: W.cell - W.road, park: c === W.park.col && r === W.park.row, lots: [] };
    blocks.push(block); if (block.park) continue;
    const large = district === 'dock' || district === 'neon' && random.next() < .25;
    const count = large ? 1 : 2, pitch = (block.side - W.sidewalk * 2) / count;
    for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
      const x = block.x + (i - (count - 1) / 2) * pitch, z = block.z + (j - (count - 1) / 2) * pitch;
      let height = random.range(...style.height);
      if (district === 'neon') {
        if (c > 2) height *= .88;
        if (large) height += 20;
        if (c === 1 && r === 5 && i === 0 && j === 0) height = 83;
      }
      const width = pitch * random.range(.74, .94), depth = pitch * random.range(.70, .91);
      const lot = { id: lots.length, block: block.id, district, x, z, width, depth, height,
        color: random.pick(style.colors), frontage: c === 0 && i === 0 ? 'west' : j === 0 ? 'north' : 'south' };
      lot.collider = addCollider(x, z, width, depth, height + .8); lots.push(lot); block.lots.push(lot);
    }
  }
  function districtAt(x, z) {
    return zoneAt(Math.max(0, Math.min(W.columns - 1, Math.floor(x / W.cell))), Math.max(0, Math.min(W.rows - 1, Math.floor((z - W.north) / W.cell))));
  }
  function isOnRoad(x, z) {
    if (x < -half || x > east + half || z < W.north - half || z > south + half) return false;
    return Math.abs(x - Math.round(x / W.cell) * W.cell) < half || Math.abs(z - W.north - Math.round((z - W.north) / W.cell) * W.cell) < half;
  }
  function groundAt(x, z) {
    if (x < -half && x >= W.boardwalk - 2) return .14;
    return isOnRoad(x, z) || x < 0 || x > east || z < W.north || z > south ? 0 : .14;
  }
  const spawnPoints = [{ ...W.spawn, district: 'palma' }];
  for (const district of ['neon', 'dock', 'coral', 'causeway']) {
    const block = blocks.find(item => item.district === district);
    spawnPoints.push({ x: block.x, z: block.z - block.side / 2 - 2, heading: Math.PI, district });
  }
  return {
    seed, bounds, east, south, blocks, lots, intersections, roads, lanes, colliders, spawnPoints, addCollider, districtAt, isOnRoad, groundAt,
    nearestRoadPoint(x, z) {
      const result = { x: 0, z: 0, road: null, distance: Infinity };
      for (const road of roads) {
        const px = Math.max(road.ax, Math.min(road.bx, x)), pz = Math.max(road.az, Math.min(road.bz, z)), distance = Math.hypot(px - x, pz - z);
        if (distance < result.distance) Object.assign(result, { x: px, z: pz, road, distance });
      }
      return result;
    },
    blocked(x, y, z, radius) {
      for (let i = 0; i < colliders.length; i++) {
        const b = colliders[i];
        if (y < b.maxY && y + 1.65 > b.minY && x > b.minX - radius && x < b.maxX + radius && z > b.minZ - radius && z < b.maxZ + radius) return true;
      }
      return false;
    },
  };
}
