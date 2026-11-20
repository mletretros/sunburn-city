// 0 opens east/west, 1 opens north/south, -1 is the clearance interval.
export function signalPhase(intersection, elapsed) {
  const clock = ((elapsed + intersection.id * 2.7) % 18 + 18) % 18;
  return clock < 8 ? 0 : clock < 9 ? -1 : clock < 17 ? 1 : -1;
}
export function createSidewalkGraph(city) {
  const nodes = [], edges = [], sidewalks = [];
  for (const point of city.intersections) for (let side = 0; side < 4; side++) nodes.push({ id: nodes.length, x: point.x + (side & 1 ? 10 : -10), z: point.z + (side & 2 ? 10 : -10), links: [] });
  function edge(a, b, junction = null, axis = -1) {
    const first = nodes[a], second = nodes[b];
    const segment = { id: edges.length, from: first, to: second, junction, axis, length: Math.hypot(first.x - second.x, first.z - second.z) };
    first.links.push(segment); second.links.push(segment); edges.push(segment); if (!junction) sidewalks.push(segment);
  }
  for (const node of city.intersections) {
    const base = node.id * 4;
    if (node.x > 0) edge(base, base + 2, node, 1);
    if (node.x < city.east) edge(base + 1, base + 3, node, 1);
    if (node.z > city.bounds?.north + 24 || node.z > -406) edge(base, base + 1, node, 0);
    if (node.z < city.south) edge(base + 2, base + 3, node, 0);
  }
  for (const road of city.roads) {
    const a = road.from * 4, b = road.to * 4, vertical = road.ax === road.bx;
    edge(a + (vertical ? 2 : 1), b);
    edge(a + 3, b + (vertical ? 1 : 2));
  }
  return { nodes, edges, sidewalks };
}
export function canRecycle(camera, x, z, focus, far, near = 30) {
  const distance = Math.hypot(focus.x - x, focus.z - z);
  if (distance > far) return true;
  if (distance < near || !camera) return false;
  const matrix = camera.matrixWorld.elements;
  return (x - matrix[12]) * matrix[8] + (z - matrix[14]) * matrix[10] > 12;
}
