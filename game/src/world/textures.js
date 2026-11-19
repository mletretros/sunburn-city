import * as THREE from 'three';
import { makeRng } from '../rng.js';

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function windowTexture(cols, rows, seed, type) {
  const rng = makeRng(seed);
  return canvasTexture(32 * cols, 32 * rows, (ctx, w, h) => {
    ctx.fillStyle = type === 'glass' ? '#cbd9df' : '#fff5ed'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const xx = x * 32, yy = y * 32, glass = type === 'glass';
      ctx.fillStyle = '#a0aab0'; ctx.fillRect(xx + 2, yy + 3, 28, 24);
      const g = ctx.createLinearGradient(xx, yy, xx + 12, yy + 25);
      g.addColorStop(0, rng.pick(['#8099a9', '#596d80', '#a9c9cb', '#789cae']));
      g.addColorStop(1, rng.next() < .10 ? '#deb997' : '#2e465a');
      ctx.fillStyle = g; ctx.fillRect(xx + (glass ? 2 : 5), yy + 4, glass ? 28 : 22, 21);
      ctx.fillStyle = '#d8e1df'; ctx.fillRect(xx + 15, yy + 4, 1.6, 22);
      ctx.fillStyle = '#ffffff35'; ctx.fillRect(xx + 6, yy + 9, 7, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(xx + 4, yy + 26, 24, 2);
    }
  });
}

export const ADS = [
  { title: 'SALT / FM', sub: '97.3 • THE COAST IS CLEAR', bg: '#102e42', ink: '#91ffdf', hot: '#ff806c' },
  { title: 'TIDELINE', sub: 'SURF SUPPLY • PALMA STRIP', bg: '#f9bc82', ink: '#172c40', hot: '#e55b63' },
  { title: 'PINK MOTEL', sub: 'VACANCY • POOL • ICE', bg: '#502e58', ink: '#ffe6a5', hot: '#fe8184' },
  { title: 'SODA CLUB', sub: 'MANDARIN AFTER DARK', bg: '#135a58', ink: '#fff0b9', hot: '#ff9669' },
  { title: 'MARÉ LATE', sub: 'COFFEE UNTIL THE SUN COMES UP', bg: '#732e48', ink: '#ffebbe', hot: '#ffaa91' },
];

export function signMaterial(ad) {
  const map = canvasTexture(512, 192, (ctx, w, h) => {
    ctx.fillStyle = ad.bg; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(12, 12, 95, 168); ctx.clip();
    ctx.fillStyle = ad.hot; ctx.beginPath(); ctx.arc(66, 88, 62, 0, 7); ctx.fill();
    ctx.fillStyle = ad.bg;
    for (let y = 92; y < 158; y += 12) ctx.fillRect(4, y, 112, 3 + (y - 92) / 14);
    ctx.restore();
    ctx.strokeStyle = ad.ink; ctx.lineWidth = 2; ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = ad.ink; ctx.font = 'italic 900 65px Arial, sans-serif';
    ctx.fillText(ad.title, 121, 106, 370);
    ctx.fillRect(125, 123, 353, 2);
    ctx.font = 'bold 23px monospace'; ctx.fillText(ad.sub, 126, 151, 348);
  });
  return new THREE.MeshBasicMaterial({ map });
}
