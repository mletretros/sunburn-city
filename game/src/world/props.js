import * as THREE from 'three';
import { WORLD as W, PALETTE as C } from '../config.js';
import { makeRng } from '../rng.js';

export function buildProps(city, batch, signs) {
  const rng = makeRng(`${city.seed}:streets`);
  const { box, beam, put, paint } = batch;
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0,0, .65,.25,.21, .64,.39,0, 0,0,0, .64,.39,0, .65,.25,-.21,
    .64,.39,0, .65,.25,.21, 1.4,.07,0, .64,.39,0, 1.4,.07,0, .65,.25,-.21,
  ], 3));
  leaf.computeVertexNormals();
  const leafMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .86 });
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 10, 1, true);
  const plane = new THREE.PlaneGeometry();
  function palm(x, z, h, base = .15) {
    const dx = rng.range(-.6, .6), dz = rng.range(-.6, .6);
    for (let i = 0; i < 5; i++) {
      const a = i / 5, b = (i + 1) / 5;
      beam(i % 2 ? 0xa58469 : 0x95735c, x + dx * a * a, base + h * a - .02, z + dz * a * a,
        x + dx * b * b, base + h * b + .03, z + dz * b * b, .39 - a * .18);
    }
    const angle = rng.range(0, 6.28);
    for (let i = 0; i < 11; i++) {
      const upper = i > 6, size = rng.range(2, 3.3) * (upper ? .76 : 1);
      put(leaf, leafMat, rng.pick(C.foliage), x + dx, base + h, z + dz,
        size, size * .8, size, 0, angle + i * 2.4, upper ? .67 : -.29);
    }
  }
  function lamp(x, z, side) {
    beam(C.iron, x, .14, z, x, 6.4, z, .17);
    beam(C.iron, x, 5.96, z, x + side * .86, 6.37, z, .11);
    box(C.iron, x + side * .88, 6.39, z, .73, .15, .25);
    box(C.cream, x + side * .91, 6.30, z, .58, .045, .20);
  }
  function bench(x, z, color) {
    for (const zz of [-.89, .89]) box(C.iron, x, .38, z + zz, .39, .49, .15);
    for (let i = 0; i < 4; i++) box(color, x + i * .135 - .26, .60, z, .11, .08, 2.25);
    box(color, x - .31, .95, z, .082, .31, 2.25);
    city.addCollider(x, z, .65, 2.25, 1.12);
  }
  for (let z = W.north + 19; z <= city.south + 14; z += 13) {
    palm(-15.3 + rng.range(-.3, .4), z, rng.range(5.3, 8.6));
    if (z > -286 && rng.next() < .62) palm(rng.range(-36, -23), z + 3.1, rng.range(4.5, 7.8), 0);
    if (Math.round((z - W.north - 19) / 13) % 2 === 0) lamp(-9, z + 3, 1);
    if (Math.abs(z - 64) > 6 && rng.next() < .32) bench(-13.7, z + 5, C.teal);
  }
  for (const b of city.blocks) {
    const x = b.x - b.side / 2 + 1.1, z = b.z - b.side / 2 + 1.2;
    if (b.c || b.district === 'dock') lamp(x, z + 10, -1);
    if (b.district !== 'dock') palm(x, z + rng.range(4, 13), rng.range(4.7, 7.7));
    if (b.r % 2 === 0) {
      beam(0xe65f56, x + 4, .14, z, x + 4, .80, z, .33);
      beam(0xf88a65, x + 3.73, .52, z, x + 4.27, .52, z, .19);
    }
    if (b.park) {
      box(0xeaceaa, b.x, .161, b.z, b.side - 4, .04, 2.9, 0, false);
      box(0xeaceaa, b.x, .161, b.z, 2.9, .04, b.side - 4, 0, false);
      for (const u of [-1, 1]) for (const v of [-1, 1]) for (let i = 0; i < 5; i++) {
        const tx = b.x + u * rng.range(4, 16), tz = b.z + v * rng.range(4, 16), h = rng.range(2.8, 5.8);
        beam(0x8b715a, tx, .14, tz, tx, h, tz, .45);
        put(ball, paint, rng.pick(C.foliage), tx, h, tz, 2.5, 2.35, 2.55, .1, rng.range(0, 6));
      }
      bench(b.x + 3.4, b.z + 7, C.coral); bench(b.x - 3.4, b.z - 7, C.teal);
    }
  }

  // Harbor loading strip, separate from the public promenade.
  for (let z = W.north + 5; z < W.north + 108; z += 11) {
    box(C.concrete, -32, .005, z, 21, .06, 11, 0, false);
    for (let row = 0; row < 2; row++) {
      const x = -37 + row * 5.5, color = rng.pick([0x376c78, 0xe17458, 0xdab066, 0x669d93]);
      const stack = rng.int(1, 2);
      for (let i = 0; i < stack; i++) {
        box(color, x, 1.21 + i * 2.42, z, 3.1, 2.42, 8.9);
        for (let d = -4.1; d < 4.3; d += .44) box(color, x + 1.58, 1.21 + i * 2.42, z + d, .11, 2.22, .12);
      }
      city.addCollider(x, z, 3.1, 8.9, stack * 2.42);
    }
  }
  for (const z of [W.north + 24, W.north + 89]) {
    const x = -40;
    for (const d of [-2.2, 2.2]) {
      beam(0xe2a358, x + d, 0, z, x, 20, z, .63);
      beam(0xe2a358, x + d, 0, z + 4, x, 20, z + 4, .63);
      beam(C.iron, x + d, 12, z, x - d, 6, z, .22);
    }
    box(0xe9a752, x - 7, 20, z + 2, 26, .74, .72);
    beam(C.iron, x, 25, z + 2, x - 17, 20.4, z + 2, .14);
    beam(C.iron, x - 17, 20.1, z + 2, x - 17, 7.1, z + 2, .10);
  }
  for (let z = -271; z < city.south + 15; z += 10) {
    const x = rng.range(-37, -23), zz = z + rng.range(-3, 3), color = rng.pick([C.coral, C.teal, 0xf7a842, 0xb898d1]);
    beam(C.cream, x, 0, zz, x, 2.19, zz, .075);
    put(cone, leafMat, color, x, 2.1, zz, 1.85, .61, 1.85, 0, rng.range(0, 6));
    box(C.cream, x + .7, .21, zz, .68, .14, 1.8, -.43);
    box(color, x + .7, .29, zz, .56, .05, 1.62, -.43);
  }
  for (const z of [32, -101, -236]) {
    const x = -12.25;
    for (const offset of [-2.1, 2.1]) beam(C.iron, x, .14, z + offset, x, 2.66, z + offset, .15);
    box(C.teal, x + .47, 2.66, z, 2.1, .17, 4.65);
    box(C.glass, x - .04, 1.68, z, .1, 1.71, 4.2);
    put(plane, signs[3], 0xffffff, x + .025, 1.80, z + .99, 1.8, .68, 1, 0, Math.PI / 2, 0, false);
    bench(x + .27, z - .65, C.cream);
    city.addCollider(x - .04, z, .14, 4.2, 2.64);
  }
  for (const [x, z, ad, ry] of [[-10.7, 49, 0, .1], [29, 11, 2, -.27], [76, -94, 4, -.55], [10, -350, 1, .25]]) {
    const y = x < 0 ? 6.2 : 11.4, wide = x < 0 ? 6.3 : 10.4;
    beam(C.iron, x, .12, z, x, y, z, .4);
    box(C.iron, x, y, z, wide + .31, wide * .375 + .25, .24, ry);
    put(plane, signs[ad], 0xffffff, x + Math.sin(ry) * .132, y, z + Math.cos(ry) * .132, wide, wide * .375, 1, 0, ry, 0, false);
  }
}
