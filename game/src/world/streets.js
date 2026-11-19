import { STREET_LIFE as S, WORLD as W } from '../config.js';

export function signalPhase(junction, seconds) {
  const span = S.green + S.allRed;
  const t = (seconds + junction.id * 2.7) % (span * 2);
  if (t < S.green) return 0; // East/west.
  if (t >= span && t < span + S.green) return 1; // North/south.
  return -1;
}

// Each junction has a walking node in each corner. Edges join the sides of blocks
// and cross the street at the painted stripes, never through the intersection center.
export function createSidewalkGraph(city) {
  const nodes = [], edges = [], inset = W.road * .5 + S.sidewalkInset;
  const corner = (id, sx, sz) => id * 4 + Number(sx > 0) + 2 * Number(sz > 0);
  function connect(a, b, junction = null, axis = -1) {
    const from = nodes[a], to = nodes[b];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const edge = { id: edges.length, from, to, length, junction, axis };
    edges.push(edge); from.links.push(edge); to.links.push(edge);
  }
  for (const j of city.intersections) for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    nodes.push({ x: j.x + sx * inset, z: j.z + sz * inset, links: [] });
  }
  for (const j of city.intersections) {
    if (j.z > W.north) connect(corner(j.id, -1, -1), corner(j.id, 1, -1), j, 0);
    if (j.z < city.south) connect(corner(j.id, -1, 1), corner(j.id, 1, 1), j, 0);
    if (j.x > 0) connect(corner(j.id, -1, -1), corner(j.id, -1, 1), j, 1);
    if (j.x < city.east) connect(corner(j.id, 1, -1), corner(j.id, 1, 1), j, 1);
  }
  for (const road of city.roads) {
    for (const side of [-1, 1]) {
      if (road.ax === road.bx) connect(corner(road.from, side, 1), corner(road.to, side, -1));
      else connect(corner(road.from, 1, side), corner(road.to, -1, side));
    }
  }
  return { nodes, edges, sidewalks: edges.filter(edge => !edge.junction) };
}

export function canRecycle(camera, x, z, focus, far, near = S.near) {
  const dx = x - focus.x, dz = z - focus.z, d2 = dx * dx + dz * dz;
  if (d2 > far * far) return true;
  if (d2 < near * near) return false;
  // Camera's backward basis is matrix column 2. Require objects to be well behind it.
  const m = camera.matrixWorld.elements;
  return (x - m[12]) * m[8] + (z - m[14]) * m[10] > 12;
}
