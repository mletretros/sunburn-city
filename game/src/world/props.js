import * as T from 'three';
import { signMaterial } from './textures.js';
export function buildProps(city, batch, signs) {
  const scene = batch.scene;
  function palm(x, z, height, lean) {
    const topX = x + lean;
    batch.beam(0x9b8062, x, .1, z, topX, height, z + .5, .42);
    for (let blade = 0; blade < 7; blade++) {
      const angle = blade * Math.PI * 2 / 7;
      const ex = topX + Math.cos(angle) * 3.8, ez = z + Math.sin(angle) * 3.8;
      batch.beam(blade % 2 ? 0x3b806a : 0x5b9a75, topX, height, z + .5, ex, height - 1.15, ez, .65);
      batch.beam(0x559575, topX, height, z + .5, topX + Math.cos(angle) * 2, height + .6, z + Math.sin(angle) * 2, .55);
    }
  }
  for (let z = -418; z < 140; z += 18) { palm(-13, z, 8 + ((z + 418) % 4), .7); if (z % 3) palm(10, z, 7.5, -.8); }
  for (const b of city.blocks) if (b.park || b.c > 4) palm(b.x + 15, b.z + 14, 7, .8);
  for (const node of city.intersections) {
    batch.beam(0x364a51, node.x - 9.3, 0, node.z - 10, node.x - 9.3, 6.5, node.z - 10, .14);
    batch.box(0xffdfae, node.x - 8.8, 6.45, node.z - 10, 1.4, .15, .5);
    batch.box(0x306f6b, node.x + 10, .65, node.z + 13, .8, 1.3, .8);
  }
  // Material planes are attached by the caller after static batching.
  for (const ad of signs) {
    ad.mesh = new T.Mesh(new T.PlaneGeometry(ad.width, 2.3), signMaterial(ad.ad));
    ad.mesh.position.set(ad.x, ad.y, ad.z); ad.mesh.rotation.y = ad.yaw;
    if (scene) scene.add(ad.mesh);
  }
  return signs;
}
