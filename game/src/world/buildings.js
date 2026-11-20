import { PlaneGeometry, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { PALETTE as C } from '../config.js';
import { makeRng } from '../rng.js';
import { ADS, signMaterial, windowTexture } from './textures.js';
export function buildBuildings(city, batch) {
  const random = makeRng(`${city.seed}:architecture`), { box, put, boxGeometry } = batch;
  const plane = new PlaneGeometry(), glow = new MeshBasicMaterial();
  const windows = [
    new MeshStandardMaterial({ map: windowTexture(4, 3, `${city.seed}:hotel`, 'stucco'), roughness: .78 }),
    new MeshStandardMaterial({ map: windowTexture(5, 7, `${city.seed}:tower`, 'glass'), roughness: .52 }),
    new MeshStandardMaterial({ map: windowTexture(3, 2, `${city.seed}:house`, 'stucco'), roughness: .81 }),
  ];
  const signs = ADS.map(signMaterial);
  function storeys(x, z, w, d, bottom, height, tint, style) {
    box(tint, x, bottom + height / 2, z, w, height, d);
    const floors = Math.max(1, Math.round(height / (style === 1 ? 19 : 11)));
    for (let floor = 0; floor < floors; floor++) {
      const y = bottom + height * (floor + .5) / floors;
      for (const side of [-1, 1]) {
        put(plane, windows[style], tint, x, y, z + side * (d / 2 + .016), w - .55, height / floors - .13, 1, 0, side > 0 ? 0 : Math.PI, 0, false);
        put(plane, windows[style], tint, x + side * (w / 2 + .016), y, z, d - .55, height / floors - .13, 1, 0, side * Math.PI / 2, 0, false);
      }
    }
    box(C.cream, x, bottom + height - .02, z, w + .56, .25, d + .56);
  }
  for (const lot of city.lots) {
    const { x, z, width: w, depth: d, height: h, district, color } = lot;
    const tower = district === 'neon', industrial = district === 'dock', retail = district === 'palma' || tower;
    const base = retail ? 3.45 : industrial ? 4.2 : 1.15;
    box(color, x, (base + .14) / 2, z, w, base, d);
    if (tower && h > 32) {
      const podium = base + h * .21, crown = podium + (h - podium) * .82;
      storeys(x, z, w, d, base, podium - base, color, 1); storeys(x, z, w * .81, d * .84, podium, crown - podium, color, 1);
      storeys(x + w * .045, z, w * .65, d * .68, crown, h - crown, color, 1);
      box(C.iron, x + w * .05, h + .62, z, w * .26, 1.35, d * .35);
      if (h > 65) batch.beam(C.iron, x, h + .8, z, x, h + 8.6, z, .2);
    } else {
      storeys(x, z, w, d, base, h - base, color, retail ? 0 : 2);
      box(industrial ? C.iron : C.pavement, x, h + .16, z, w * .91, .35, d * .92);
      for (let unit = 0; unit < (industrial ? 4 : 2); unit++) {
        const ux = x + w * random.range(-.3, .32), uz = z + d * random.range(-.32, .32);
        box(0x9d9e99, ux, h + .52, uz, 1.6, .7, 1.15); box(C.iron, ux, h + .89, uz, 1.2, .06, .81);
      }
    }
    const west = lot.frontage === 'west', side = lot.frontage === 'south' ? 1 : -1;
    const heading = west ? -Math.PI / 2 : side > 0 ? 0 : Math.PI, span = west ? d : w;
    const fx = west ? x - w / 2 : x, fz = west ? z : z + side * d / 2, sin = Math.sin(heading), cos = Math.cos(heading);
    function detail(tint, u, y, n, width, height, depth, shadow = true) { box(tint, fx + cos * u + sin * n, y, fz - sin * u + cos * n, width, height, depth, heading, shadow); }
    function overlay(geometry, material, tint, u, y, n, width, height, depth) { put(geometry, material, tint, fx + cos * u + sin * n, y, fz - sin * u + cos * n, width, height, depth, 0, heading, 0, false); }
    if (retail) {
      const stripe = random.pick([C.teal, C.coral, 0x7467a2, 0xefa556]), panes = Math.max(1, Math.floor(span / 2.15)), pitch = (span - 1) / panes;
      for (let i = 0; i < panes; i++) {
        const u = (i - (panes - 1) / 2) * pitch;
        detail(C.glass, u, 1.61, .025, pitch - .14, 2.43, .085); detail(0x71979c, u, 2.64, .077, pitch - .18, .2, .016, false); detail(C.cream, u + .23, 1.36, .085, .11, .25, .05, false);
      }
      detail(stripe, 0, 3.08, .68, span + .3, .23, 1.48);
      for (let u = -span / 2 + .18; u < span / 2; u += .8) detail(C.cream, u, 3.08, .75, .34, .245, 1.37);
      overlay(boxGeometry, glow, stripe, 0, 3, 1.43, span, .055, .07);
      const ad = west && z > 43 && z < 95 ? 1 : random.int(0, signs.length - 1), width = west ? 7.1 : 5.4;
      overlay(plane, signs[ad], 0xffffff, 0, 4.36, .12, width, width * .375, 1);
      if (west) { detail(stripe, span * .39, 6.7, .18, .62, 4.65, .36); overlay(boxGeometry, glow, stripe, span * .39, 6.7, .385, .22, 4.25, .06); }
    } else if (industrial) {
      for (let u = -span / 3; u <= span / 3 + .01; u += span / 3) {
        detail(C.iron, u, 1.95, .06, span * .22, 3.6, .16);
        for (let y = .48; y < 3.6; y += .25) detail(0x78888a, u, y, .15, span * .21, .05, .03, false);
      }
    } else {
      detail(C.glass, 0, 1.31, .03, 1.23, 2.35, .12); detail(C.curb, 0, .12, .48, 2.6, .24, .95); detail(color, 0, 2.56, .47, 3.4, .17, 1.1);
    }
  }
  return signs;
}
