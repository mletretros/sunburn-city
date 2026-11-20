import * as T from 'three';
import { makeRng } from '../rng.js';
export const ADS = [
  { title: 'PALMA SOCIAL', sub: 'COFFEE / RECORDS / LATE NIGHTS', bg: '#214e57', ink: '#ffe3b1', hot: '#ff8f79' },
  { title: 'SUNSET MOTEL', sub: 'AIR COOLED • VACANCY', bg: '#f2ba9e', ink: '#334a56', hot: '#d54b71' },
  { title: 'CHROME SERPENTS', sub: 'PRIVATE SECURITY', bg: '#263c49', ink: '#cbd8d4', hot: '#fd7e8e' },
  { title: 'NEON DREAMS', sub: 'DANCE UNTIL THE TIDE TURNS', bg: '#55486c', ink: '#ffe0ad', hot: '#84eddb' },
  { title: 'INEZ AUTO', sub: 'REPAIRS • NO QUESTIONS', bg: '#22776f', ink: '#ffe7bc', hot: '#f8b768' },
];
export function windowTexture(columns, floors, seed, facade) {
  const canvas = document.createElement('canvas'); canvas.width = columns * 32; canvas.height = floors * 32;
  const ctx = canvas.getContext('2d'), random = makeRng(seed); ctx.fillStyle = facade || '#74969c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < floors; y++) for (let x = 0; x < columns; x++) {
    ctx.fillStyle = random.next() > .68 ? '#fbe6b4' : '#36566a'; ctx.fillRect(x * 32 + 6, y * 32 + 7, 20, 20);
    ctx.fillStyle = '#a5b7bc'; ctx.fillRect(x * 32 + 15, y * 32 + 7, 2, 20);
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture;
}
export function signMaterial(ad) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const pen = canvas.getContext('2d'); pen.fillStyle = ad.bg; pen.fillRect(0, 0, 1024, 256);
  pen.strokeStyle = ad.hot; pen.lineWidth = 12; pen.strokeRect(12, 12, 1000, 232);
  pen.fillStyle = ad.ink; pen.textAlign = 'center'; pen.font = '900 72px sans-serif'; pen.fillText(ad.title, 512, 125, 940);
  pen.fillStyle = ad.hot; pen.font = '25px monospace'; pen.fillText(ad.sub, 512, 193, 940);
  const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map, side: T.DoubleSide });
}
