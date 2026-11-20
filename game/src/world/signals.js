import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D } from 'three';
import { WORLD, PALETTE } from '../config.js';
import { signalPhase } from './streets.js';
const approaches = [[1, -1, 1, 0], [-1, 1, -1, 0], [-1, -1, 0, -1], [1, 1, 0, 1]];
export function buildSignals(scene, { intersections }, structures) {
  const lamps = new InstancedMesh(new BoxGeometry(.16, .16, .055), new MeshBasicMaterial(), intersections.length * 12);
  const pose = new Object3D(), offset = WORLD.road / 2 + .53, phases = new Int8Array(intersections.length).fill(-2);
  const dark = new Color(0x44404b), red = new Color(0xff554d), amber = new Color(0xffba50), green = new Color(0x68ffbe);
  for (const junction of intersections) {
    let index = junction.id * 12;
    for (const [dx, dz, nx, nz] of approaches) {
      const x = junction.x + dx * offset, z = junction.z + dz * offset, yaw = Math.atan2(nx, nz);
      structures.beam(PALETTE.iron, x, .14, z, x, 4.56, z, .16);
      structures.box(PALETTE.iron, x + nx * .13, 4.02, z + nz * .13, .34, .94, .22, yaw); pose.rotation.y = yaw;
      for (let lamp = 0; lamp < 3; lamp++) {
        pose.position.set(x + nx * .245, 4.32 - lamp * .3, z + nz * .245); pose.updateMatrix(); lamps.setMatrixAt(index, pose.matrix); lamps.setColorAt(index++, dark);
      }
    }
  }
  lamps.computeBoundingSphere(); scene.add(lamps);
  return seconds => {
    let changed = false;
    for (let i = 0; i < intersections.length; i++) {
      const junction = intersections[i], phase = signalPhase(junction, seconds);
      if (phases[junction.id] === phase) continue;
      phases[junction.id] = phase; changed = true; let index = junction.id * 12;
      for (let head = 0; head < 4; head++) {
        const open = phase === (head >> 1);
        lamps.setColorAt(index++, open ? dark : red); lamps.setColorAt(index++, phase === -1 ? amber : dark); lamps.setColorAt(index++, open ? green : dark);
      }
    }
    if (changed) lamps.instanceColor.needsUpdate = true;
  };
}
