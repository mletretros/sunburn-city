import * as THREE from 'three';
import { PALETTE as C } from '../config.js';
import { makeRng } from '../rng.js';
import { ADS, signMaterial, windowTexture } from './textures.js';

export function buildBuildings(city, batch) {
  const rng = makeRng(`${city.seed}:architecture`);
  const { box, put } = batch;
  const plane = new THREE.PlaneGeometry();
  const bands = [
    new THREE.MeshStandardMaterial({ map: windowTexture(4, 3, `${city.seed}:hotel`, 'stucco'), roughness: .78 }),
    new THREE.MeshStandardMaterial({ map: windowTexture(5, 7, `${city.seed}:tower`, 'glass'), roughness: .52 }),
    new THREE.MeshStandardMaterial({ map: windowTexture(3, 2, `${city.seed}:house`, 'stucco'), roughness: .81 }),
  ];
  const signs = ADS.map(signMaterial);
  const neon = new THREE.MeshBasicMaterial();
  const facade = (x, z, w, d, bottom, h, color, type) => {
    box(color, x, bottom + h / 2, z, w, h, d);
    const sections = Math.max(1, Math.round(h / (type === 1 ? 19 : 11)));
    for (let floor = 0; floor < sections; floor++) {
      const y = bottom + h * (floor + .5) / sections, sy = h / sections - .13;
      for (const sign of [-1, 1]) {
        put(plane, bands[type], color, x, y, z + sign * (d / 2 + .016), w - .55, sy, 1, 0, sign === 1 ? 0 : Math.PI, 0, false);
        put(plane, bands[type], color, x + sign * (w / 2 + .016), y, z, d - .55, sy, 1, 0, sign * Math.PI / 2, 0, false);
      }
    }
    box(C.cream, x, bottom + h - .02, z, w + .56, .25, d + .56);
  };

  for (const lot of city.lots) {
    const { x, z, width: w, depth: d, height: h, district, color } = lot;
    const tower = district === 'neon', depot = district === 'dock', shop = district === 'palma' || tower;
    const base = shop ? 3.45 : (depot ? 4.2 : 1.15);
    box(color, x, (base + .14) / 2, z, w, base, d);
    if (tower && h > 32) {
      const podium = base + h * .21, top = podium + (h - podium) * .82;
      facade(x, z, w, d, base, podium - base, color, 1);
      facade(x, z, w * .81, d * .84, podium, top - podium, color, 1);
      facade(x + w * .045, z, w * .65, d * .68, top, h - top, color, 1);
      box(C.iron, x + w * .05, h + .62, z, w * .26, 1.35, d * .35);
      if (h > 65) batch.beam(C.iron, x, h + .8, z, x, h + 8.6, z, .20);
    } else {
      facade(x, z, w, d, base, h - base, color, shop ? 0 : 2);
      box(depot ? C.iron : C.pavement, x, h + .16, z, w * .91, .35, d * .92);
      for (let n = 0; n < (depot ? 4 : 2); n++) {
        const unitX = x + w * rng.range(-.30, .32), unitZ = z + d * rng.range(-.32, .32);
        box(0x9d9e99, unitX, h + .52, unitZ, 1.6, .7, 1.15);
        box(C.iron, unitX, h + .89, unitZ, 1.2, .06, .81);
      }
    }

    const west = lot.frontage === 'west', side = lot.frontage === 'south' ? 1 : -1;
    const theta = west ? -Math.PI / 2 : side === 1 ? 0 : Math.PI;
    const span = west ? d : w;
    const fx = west ? x - w / 2 : x, fz = west ? z : z + side * d / 2;
    const place = (u, y, n) => [fx + Math.cos(theta) * u + Math.sin(theta) * n, y, fz - Math.sin(theta) * u + Math.cos(theta) * n];
    if (shop) {
      const stripe = rng.pick([C.teal, C.coral, 0x7467a2, 0xefa556]);
      const panes = Math.floor(span / 2.15), pitch = (span - 1) / panes;
      for (let i = 0; i < panes; i++) {
        const u = (i - (panes - 1) / 2) * pitch;
        box(C.glass, ...place(u, 1.61, .025), pitch - .14, 2.43, .085, theta);
        box(0x71979c, ...place(u, 2.64, .077), pitch - .18, .20, .016, theta, false);
        box(C.cream, ...place(u + .23, 1.36, .085), .11, .25, .05, theta, false);
      }
      box(stripe, ...place(0, 3.08, .68), span + .3, .23, 1.48, theta);
      for (let u = -span / 2 + .18; u < span / 2; u += .8) box(C.cream, ...place(u, 3.08, .75), .34, .245, 1.37, theta);
      put(batch.boxGeometry, neon, stripe, ...place(0, 3, 1.43), span, .055, .07, 0, theta, 0, false);
      const ad = west && lot.z > 43 && lot.z < 95 ? 1 : rng.int(0, signs.length - 1);
      const signWidth = west ? 7.1 : 5.4;
      put(plane, signs[ad], 0xffffff, ...place(0, 4.36, .12), signWidth, signWidth * .375, 1, 0, theta, 0, false);
      if (west) {
        box(stripe, ...place(span * .39, 6.7, .18), .62, 4.65, .36, theta);
        put(batch.boxGeometry, neon, stripe, ...place(span * .39, 6.7, .385), .22, 4.25, .06, 0, theta, 0, false);
      }
    } else if (depot) {
      for (let u = -span / 3; u <= span / 3 + .01; u += span / 3) {
        box(C.iron, ...place(u, 1.95, .06), span * .22, 3.6, .16, theta);
        for (let y = .48; y < 3.6; y += .25) box(0x78888a, ...place(u, y, .15), span * .21, .05, .03, theta, false);
      }
    } else {
      box(C.glass, ...place(0, 1.31, .03), 1.23, 2.35, .12, theta);
      box(C.curb, ...place(0, .12, .48), 2.6, .24, .95, theta);
      box(color, ...place(0, 2.56, .47), 3.4, .17, 1.1, theta);
    }
  }
  return signs;
}
