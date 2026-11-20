import * as T from 'three';
import { signalPhase } from './streets.js';
export function buildSignals(scene, city, structures) {
  const lamps = [], red = new T.MeshBasicMaterial({ color: 0xff6b6b }), green = new T.MeshBasicMaterial({ color: 0x7fffd0 });
  const sphere = new T.SphereGeometry(.17, 6, 4);
  for (const node of city.intersections) {
    structures.box(0x344750, node.x + 8.8, 2.1, node.z - 8.8, .13, 4.2, .13);
    structures.box(0x253642, node.x + 8.8, 4.1, node.z - 8.8, .45, .85, .4);
    const lamp = new T.Mesh(sphere, green); lamp.position.set(node.x + 8.8, 4.2, node.z - 8.53); scene.add(lamp); lamps.push(lamp);
  }
  return elapsed => { for (let n = 0; n < lamps.length; n++) lamps[n].material = signalPhase(city.intersections[n], elapsed) === 1 ? green : red; };
}
