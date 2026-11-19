import * as THREE from 'three';
import { PALETTE, WORLD } from '../config.js';
import { signalPhase } from './streets.js';

export function buildSignals(scene, city, batch) {
  const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .16, .055), new THREE.MeshBasicMaterial(), city.intersections.length * 12);
  const pose = new THREE.Object3D(), color = new THREE.Color();
  const previous = new Int8Array(city.intersections.length).fill(-2);
  const red = 0xff554d, green = 0x68ffbe, amber = 0xffba50, dark = 0x44404b;
  const edge = WORLD.road / 2 + .53;
  for (const j of city.intersections) for (let face = 0; face < 4; face++) {
    const sx = face < 2 ? (face ? -1 : 1) : (face === 2 ? -1 : 1);
    const sz = face < 2 ? (face ? 1 : -1) : (face === 2 ? -1 : 1);
    const x = j.x + sx * edge, z = j.z + sz * edge;
    const fx = face < 2 ? sx : 0, fz = face >= 2 ? sz : 0;
    const heading = Math.atan2(fx, fz);
    batch.beam(PALETTE.iron, x, .14, z, x, 4.56, z, .16);
    batch.box(PALETTE.iron, x + fx * .13, 4.02, z + fz * .13, .34, .94, .22, heading);
    for (let lamp = 0; lamp < 3; lamp++) {
      pose.position.set(x + fx * .245, 4.32 - lamp * .30, z + fz * .245);
      pose.rotation.y = heading; pose.updateMatrix(); lamps.setMatrixAt(j.id * 12 + face * 3 + lamp, pose.matrix);
    }
  }
  scene.add(lamps);
  return seconds => {
    let changed = false;
    for (const j of city.intersections) {
      const phase = signalPhase(j, seconds);
      if (previous[j.id] === phase) continue;
      previous[j.id] = phase; changed = true;
      for (let face = 0; face < 4; face++) {
        const go = phase === Number(face >= 2), index = j.id * 12 + face * 3;
        lamps.setColorAt(index, color.set(go ? dark : red));
        lamps.setColorAt(index + 1, color.set(phase === -1 ? amber : dark));
        lamps.setColorAt(index + 2, color.set(go ? green : dark));
      }
    }
    if (changed) lamps.instanceColor.needsUpdate = true;
  };
}
