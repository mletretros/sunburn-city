import * as T from 'three';
import { ADS, signMaterial, windowTexture } from './textures.js';
export function buildBuildings(city, batch) {
  const signs = [];
  const skins = [];
  for (let i = 0; i < 8; i++) skins.push(new T.MeshStandardMaterial({ map: windowTexture(3, 6, city.seed + '/windows/' + i, ['#88b7b4', '#c5a5ad', '#a5b0bd', '#cfb294'][i % 4]), roughness: .75 }));
  for (const lot of city.lots) {
    const { x, z, width: w, depth: d, height: h } = lot;
    batch.box(lot.color, x, h / 2 + .2, z, w, h, d);
    batch.box(0xffdbb3, x, h + .32, z, w + .65, .5, d + .65);
    batch.box(0x8b9394, x + w * .18, h + .95, z, w * .3, 1, d * .28);
    const skin = skins[lot.id % skins.length];
    batch.put(batch.boxGeometry, skin, 0xffffff, x, h * .55, z - d * .5 - .03, w * .87, h * .78, .035);
    batch.put(batch.boxGeometry, skin, 0xffffff, x - w * .5 - .03, h * .55, z, .035, h * .78, d * .87);
    batch.box(0x264b55, x - w / 2 - .06, 1.65, z, .06, 2.8, d * .82);
    batch.box(lot.id % 2 ? 0xf78f79 : 0x64d1bd, x - w / 2 - 1.2, 3.5, z, 2.6, .22, d + .3);
    for (let n = -1; n <= 1; n++) batch.box(0xf9d8b5, x - w / 2 - .12, 1.7, z + n * d * .27, .16, 3.3, .15);
    if (lot.id % 4 === 0 || lot.district === 'palma') signs.push({ x: x - w / 2 - .15, y: 4.9, z, yaw: -Math.PI / 2, width: d * .9, ad: ADS[lot.id % ADS.length] });
  }
  signs.scene = null;
  return signs;
}
