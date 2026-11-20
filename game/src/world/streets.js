import { WORLD, STREET_LIFE as S } from '../config.js';
const halfCycle = S.green + S.allRed, cycle = halfCycle * 2;
export function signalPhase({ id }, elapsed) {
  const tick = ((elapsed + id * 2.7) % cycle + cycle) % cycle;
  if (tick < halfCycle) return tick < S.green ? 0 : -1;
  return tick < halfCycle + S.green ? 1 : -1;
}
export function createSidewalkGraph({ intersections, roads, south, east }) {
  const nodes = [], edges = [], sidewalks = [], corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const inset = WORLD.road / 2 + S.sidewalkInset, at = (id, corner) => nodes[id * 4 + corner];
  function connect(from, to, junction = null, axis = -1) {
    const edge = { id: edges.length, from, to, junction, axis, length: Math.hypot(from.x - to.x, from.z - to.z) };
    from.links.push(edge); to.links.push(edge); edges.push(edge); if (!junction) sidewalks.push(edge);
  }
  for (const junction of intersections) for (const [x, z] of corners) nodes.push({ x: junction.x + x * inset, z: junction.z + z * inset, links: [] });
  for (const junction of intersections) {
    const { id, x, z } = junction;
    if (z > WORLD.north) connect(at(id, 0), at(id, 1), junction, 0);
    if (z < south) connect(at(id, 2), at(id, 3), junction, 0);
    if (x > 0) connect(at(id, 0), at(id, 2), junction, 1);
    if (x < east) connect(at(id, 1), at(id, 3), junction, 1);
  }
  for (const road of roads) {
    if (road.ax === road.bx) { connect(at(road.from, 2), at(road.to, 0)); connect(at(road.from, 3), at(road.to, 1)); }
    else { connect(at(road.from, 1), at(road.to, 0)); connect(at(road.from, 3), at(road.to, 2)); }
  }
  return { nodes, edges, sidewalks };
}
export function canRecycle(camera, x, z, focus, far, near = S.near) {
  const distance = (focus.x - x) ** 2 + (focus.z - z) ** 2;
  if (distance > far * far) return true;
  if (distance < near * near) return false;
  const m = camera.matrixWorld.elements;
  return (x - m[12]) * m[8] + (z - m[14]) * m[10] > 12;
}
