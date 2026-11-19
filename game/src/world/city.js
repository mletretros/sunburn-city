import { WORLD as W, DISTRICTS } from '../config.js';
import { makeRng } from '../rng.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const classify = (c, r) => {
  if (r <= 1 && c <= 3) return 'dock';
  if (c === 0) return 'palma';
  if (r >= 2 && r <= 6 && c <= 4) return 'neon';
  if (c === 6 || (r === 8 && c >= 3)) return 'causeway';
  return 'coral';
};

export function createCity(seed) {
  const rng = makeRng(`${seed}:layout`);
  const blocks = [], lots = [], intersections = [], roads = [], lanes = [], colliders = [];
  const halfRoad = W.road / 2;
  const east = W.columns * W.cell, south = W.north + W.rows * W.cell;
  const bounds = { west: W.shore + 1.4, east: east + W.southMargin, north: W.north - W.southMargin, south: south + W.southMargin };
  const id = (c, r) => r * (W.columns + 1) + c;
  for (let r = 0; r <= W.rows; r++) for (let c = 0; c <= W.columns; c++) {
    intersections.push({ id: id(c, r), x: c * W.cell, z: W.north + r * W.cell, roads: [] });
  }
  function connect(a, b) {
    const from = intersections[a], to = intersections[b];
    const road = { id: roads.length, from: a, to: b, ax: from.x, az: from.z, bx: to.x, bz: to.z, width: W.road, lanes: [] };
    roads.push(road);
    from.roads.push(road.id); to.roads.push(road.id);
    const dx = (to.x - from.x) / W.cell, dz = (to.z - from.z) / W.cell;
    for (const side of [1, -1]) {
      const offset = W.road * .24 * side;
      const start = side === 1 ? from : to, end = side === 1 ? to : from;
      const lane = { id: lanes.length, road: road.id, from: start.id, to: end.id,
        ax: start.x - dz * offset, az: start.z + dx * offset, bx: end.x - dz * offset, bz: end.z + dx * offset };
      lanes.push(lane); road.lanes.push(lane.id);
    }
  }
  for (let r = 0; r <= W.rows; r++) for (let c = 0; c <= W.columns; c++) {
    if (c < W.columns) connect(id(c, r), id(c + 1, r));
    if (r < W.rows) connect(id(c, r), id(c, r + 1));
  }
  function addCollider(x, z, width, depth, height, base = 0) {
    const box = { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, minY: base, maxY: base + height };
    colliders.push(box);
    return box;
  }
  for (let r = 0; r < W.rows; r++) for (let c = 0; c < W.columns; c++) {
    const district = classify(c, r), style = DISTRICTS[district];
    const block = { id: blocks.length, c, r, district, x: (c + .5) * W.cell, z: W.north + (r + .5) * W.cell,
      side: W.cell - W.road, park: c === W.park.col && r === W.park.row, lots: [] };
    blocks.push(block);
    if (block.park) continue;
    const large = district === 'dock' || (district === 'neon' && rng.next() < .25);
    const count = large ? 1 : 2;
    const plot = (block.side - W.sidewalk * 2) / count;
    for (let i = 0; i < count; i++) for (let j = 0; j < count; j++) {
      const x = block.x + (i - (count - 1) / 2) * plot, z = block.z + (j - (count - 1) / 2) * plot;
      let height = rng.range(...style.height);
      if (district === 'neon') {
        height *= c > 2 ? .88 : 1;
        if (large) height += 20;
        if (c === 1 && r === 5 && !i && !j) height = 83;
      }
      const width = plot * rng.range(.74, .94), depth = plot * rng.range(.70, .91);
      const lot = { id: lots.length, block: block.id, district, x, z, width, depth, height,
        color: rng.pick(style.colors), frontage: c === 0 && i === 0 ? 'west' : (j === 0 ? 'north' : 'south') };
      lot.collider = addCollider(x, z, width, depth, height + .8);
      lots.push(lot); block.lots.push(lot);
    }
  }
  function districtAt(x, z) {
    return classify(clamp(Math.floor(x / W.cell), 0, W.columns - 1), clamp(Math.floor((z - W.north) / W.cell), 0, W.rows - 1));
  }
  function nearestRoadPoint(x, z) {
    let best = Infinity, nearest;
    for (const road of roads) {
      const px = clamp(x, road.ax, road.bx), pz = clamp(z, road.az, road.bz);
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < best) { best = d; nearest = { x: px, z: pz, road }; }
    }
    nearest.distance = Math.sqrt(best);
    return nearest;
  }
  function isOnRoad(x, z) {
    const dx = Math.abs(x - Math.round(x / W.cell) * W.cell);
    const dz = Math.abs(z - W.north - Math.round((z - W.north) / W.cell) * W.cell);
    return x >= -halfRoad && x <= east + halfRoad && z >= W.north - halfRoad && z <= south + halfRoad && (dx < halfRoad || dz < halfRoad);
  }
  function groundAt(x, z) {
    if (x < -halfRoad && x >= W.boardwalk - 2) return .14;
    if (isOnRoad(x, z) || x < 0 || x > east || z < W.north || z > south) return 0;
    return .14;
  }
  function blocked(x, y, z, radius) {
    for (const b of colliders) {
      if (y >= b.maxY || y + 1.65 <= b.minY) continue;
      if (x > b.minX - radius && x < b.maxX + radius && z > b.minZ - radius && z < b.maxZ + radius) return true;
    }
    return false;
  }
  const spawnPoints = [{ ...W.spawn, district: 'palma' }, ...['neon', 'dock', 'coral', 'causeway'].map(district => {
    const b = blocks.find(block => block.district === district);
    return { x: b.x, z: b.z - b.side / 2 - 2, heading: Math.PI, district };
  })];
  return { seed, bounds, east, south, blocks, lots, intersections, roads, lanes, colliders, spawnPoints,
    addCollider, districtAt, nearestRoadPoint, isOnRoad, groundAt, blocked };
}
