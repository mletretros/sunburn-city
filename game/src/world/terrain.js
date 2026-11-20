import * as T from 'three';
import { PALETTE as P } from '../config.js';
export function buildTerrain(scene, city, batch) {
  batch.box(P.sand, 180, -.6, -140, 590, 1, 720, 0, false);
  batch.box(P.pavement, 205, -.12, -145, 435, .5, 575, 0, false);
  const water = new T.Mesh(new T.PlaneGeometry(1800, 2200), new T.MeshStandardMaterial({ color: 0x2d9eaa, roughness: .25, metalness: .28 }));
  water.rotation.x = -Math.PI / 2; water.position.set(-947, -.2, -160); scene.add(water);
  batch.box(0xd2ad82, -18, .05, -140, 9, .35, 700, 0, false);
  for (let z = -465; z < 165; z += 2) batch.box(0xe3c095, -18, .26, z, 8.8, .04, .07, 0, false);
  for (const road of city.roads) {
    const horizontal = road.ax !== road.bx, x = (road.ax + road.bx) / 2, z = (road.az + road.bz) / 2;
    batch.box(P.asphalt, x, .015, z, horizontal ? 58 : 15, .07, horizontal ? 15 : 58, 0, false);
    for (let i = 12; i < 51; i += 9) batch.box(P.lane, horizontal ? road.ax + i : x, .061, horizontal ? z : road.az + i, horizontal ? 4 : .14, .013, horizontal ? .14 : 4, 0, false);
  }
  for (const block of city.blocks) {
    batch.box(block.park ? 0x77a284 : P.curb, block.x, .12, block.z, 43, .25, 43, 0, false);
    if (block.park) batch.box(0xd8c49d, block.x, .27, block.z, 4, .04, 42, 0, false);
  }
  for (const cross of city.intersections) for (let i = -3; i <= 3; i++) {
    batch.box(0xefe0bf, cross.x + i * 1.4, .075, cross.z + 9, .7, .015, 3, 0, false);
    batch.box(0xefe0bf, cross.x + 9, .075, cross.z + i * 1.4, 3, .015, .7, 0, false);
  }
  // Long bright ribbons give the sea a calm, graphic horizon.
  for (let i = 0; i < 28; i++) batch.box(0x8ad2cc, -48 - i * 8, -.12, -160, .32, .015, 900, 0, false);
  return time => { water.material.roughness = .28 + Math.sin(time * .25) * .025; };
}
