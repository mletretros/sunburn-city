import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, DoubleSide, IcosahedronGeometry, ConeGeometry, PlaneGeometry } from 'three';
import { WORLD as W, PALETTE as C } from '../config.js';
import { makeRng } from '../rng.js';
export function buildProps(city, batch, signs) {
  const random = makeRng(`${city.seed}:streets`), { box, beam, put, paint } = batch;
  const leaf = new BufferGeometry(), a = [0, 0, 0], b = [.65, .25, .21], c = [.64, .39, 0], d = [.65, .25, -.21], tip = [1.4, .07, 0];
  leaf.setAttribute('position', new Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d, ...c, ...b, ...tip, ...c, ...tip, ...d], 3)); leaf.computeVertexNormals();
  const foliage = new MeshStandardMaterial({ side: DoubleSide, roughness: .86 });
  const crown = new IcosahedronGeometry(1, 1), umbrella = new ConeGeometry(1, 1, 10, 1, true), plane = new PlaneGeometry();
  function palm(x, z, height, base = .15) {
    const dx = random.range(-.6, .6), dz = random.range(-.6, .6);
    for (let i = 0; i < 5; i++) {
      const start = i / 5, end = (i + 1) / 5;
      beam(i % 2 ? 0xa58469 : 0x95735c, x + dx * start * start, base + height * start - .02, z + dz * start * start,
        x + dx * end * end, base + height * end + .03, z + dz * end * end, .39 - start * .18);
    }
    const angle = random.range(0, 6.28);
    for (let i = 0; i < 11; i++) {
      const upper = i > 6, size = random.range(2, 3.3) * (upper ? .76 : 1);
      put(leaf, foliage, random.pick(C.foliage), x + dx, base + height, z + dz, size, size * .8, size, 0, angle + i * 2.4, upper ? .67 : -.29);
    }
  }
  function lamp(x, z, side) {
    beam(C.iron, x, .14, z, x, 6.4, z, .17); beam(C.iron, x, 5.96, z, x + side * .86, 6.37, z, .11);
    box(C.iron, x + side * .88, 6.39, z, .73, .15, .25); box(C.cream, x + side * .91, 6.3, z, .58, .045, .2);
  }
  function bench(x, z, color) {
    for (const end of [-.89, .89]) box(C.iron, x, .38, z + end, .39, .49, .15);
    for (let i = 0; i < 4; i++) box(color, x + i * .135 - .26, .6, z, .11, .08, 2.25);
    box(color, x - .31, .95, z, .082, .31, 2.25); city.addCollider(x, z, .65, 2.25, 1.12);
  }
  for (let z = W.north + 19; z <= city.south + 14; z += 13) {
    palm(-15.3 + random.range(-.3, .4), z, random.range(5.3, 8.6));
    if (z > -286 && random.next() < .62) palm(random.range(-36, -23), z + 3.1, random.range(4.5, 7.8), 0);
    if (Math.round((z - W.north - 19) / 13) % 2 === 0) lamp(-9, z + 3, 1);
    if (Math.abs(z - 64) > 6 && random.next() < .32) bench(-13.7, z + 5, C.teal);
  }
  for (const block of city.blocks) {
    const x = block.x - block.side / 2 + 1.1, z = block.z - block.side / 2 + 1.2;
    if (block.c || block.district === 'dock') lamp(x, z + 10, -1);
    if (block.district !== 'dock') palm(x, z + random.range(4, 13), random.range(4.7, 7.7));
    if (block.r % 2 === 0) { beam(0xe65f56, x + 4, .14, z, x + 4, .8, z, .33); beam(0xf88a65, x + 3.73, .52, z, x + 4.27, .52, z, .19); }
    if (!block.park) continue;
    box(0xeaceaa, block.x, .161, block.z, block.side - 4, .04, 2.9, 0, false); box(0xeaceaa, block.x, .161, block.z, 2.9, .04, block.side - 4, 0, false);
    for (const u of [-1, 1]) for (const v of [-1, 1]) for (let i = 0; i < 5; i++) {
      const tx = block.x + u * random.range(4, 16), tz = block.z + v * random.range(4, 16), h = random.range(2.8, 5.8);
      beam(0x8b715a, tx, .14, tz, tx, h, tz, .45); put(crown, paint, random.pick(C.foliage), tx, h, tz, 2.5, 2.35, 2.55, .1, random.range(0, 6));
    }
    bench(block.x + 3.4, block.z + 7, C.coral); bench(block.x - 3.4, block.z - 7, C.teal);
  }
  for (let z = W.north + 5; z < W.north + 108; z += 11) {
    box(C.concrete, -32, .005, z, 21, .06, 11, 0, false);
    for (let row = 0; row < 2; row++) {
      const x = -37 + row * 5.5, color = random.pick([0x376c78, 0xe17458, 0xdab066, 0x669d93]), stack = random.int(1, 2);
      for (let level = 0; level < stack; level++) {
        box(color, x, 1.21 + level * 2.42, z, 3.1, 2.42, 8.9);
        for (let rib = -4.1; rib < 4.3; rib += .44) box(color, x + 1.58, 1.21 + level * 2.42, z + rib, .11, 2.22, .12);
      }
      city.addCollider(x, z, 3.1, 8.9, stack * 2.42);
    }
  }
  for (const z of [W.north + 24, W.north + 89]) {
    const x = -40;
    for (const offset of [-2.2, 2.2]) {
      beam(0xe2a358, x + offset, 0, z, x, 20, z, .63); beam(0xe2a358, x + offset, 0, z + 4, x, 20, z + 4, .63);
      beam(C.iron, x + offset, 12, z, x - offset, 6, z, .22);
    }
    box(0xe9a752, x - 7, 20, z + 2, 26, .74, .72); beam(C.iron, x, 25, z + 2, x - 17, 20.4, z + 2, .14); beam(C.iron, x - 17, 20.1, z + 2, x - 17, 7.1, z + 2, .1);
  }
  for (let z = -271; z < city.south + 15; z += 10) {
    const x = random.range(-37, -23), along = z + random.range(-3, 3), color = random.pick([C.coral, C.teal, 0xf7a842, 0xb898d1]);
    beam(C.cream, x, 0, along, x, 2.19, along, .075); put(umbrella, foliage, color, x, 2.1, along, 1.85, .61, 1.85, 0, random.range(0, 6));
    box(C.cream, x + .7, .21, along, .68, .14, 1.8, -.43); box(color, x + .7, .29, along, .56, .05, 1.62, -.43);
  }
  for (const z of [32, -101, -236]) {
    const x = -12.25;
    for (const end of [-2.1, 2.1]) beam(C.iron, x, .14, z + end, x, 2.66, z + end, .15);
    box(C.teal, x + .47, 2.66, z, 2.1, .17, 4.65); box(C.glass, x - .04, 1.68, z, .1, 1.71, 4.2);
    put(plane, signs[3], 0xffffff, x + .025, 1.8, z + .99, 1.8, .68, 1, 0, Math.PI / 2, 0, false);
    bench(x + .27, z - .65, C.cream); city.addCollider(x - .04, z, .14, 4.2, 2.64);
  }
  for (const [x, z, ad, yaw] of [[-10.7, 49, 0, .1], [29, 11, 2, -.27], [76, -94, 4, -.55], [10, -350, 1, .25]]) {
    const height = x < 0 ? 6.2 : 11.4, width = x < 0 ? 6.3 : 10.4;
    beam(C.iron, x, .12, z, x, height, z, .4); box(C.iron, x, height, z, width + .31, width * .375 + .25, .24, yaw);
    put(plane, signs[ad], 0xffffff, x + Math.sin(yaw) * .132, height, z + Math.cos(yaw) * .132, width, width * .375, 1, 0, yaw, 0, false);
  }
}
