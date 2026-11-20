import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three';
import { makeRng } from '../rng.js';
function texture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; draw(canvas.getContext('2d'));
  const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.anisotropy = 4; return map;
}
const fill = (pen, color, x, y, w, h) => { pen.fillStyle = color; pen.fillRect(x, y, w, h); };
export function windowTexture(columns, floors, seed, facade) {
  const random = makeRng(seed), glass = facade === 'glass', shades = ['#8099a9', '#596d80', '#a9c9cb', '#789cae'];
  return texture(columns * 32, floors * 32, pen => {
    fill(pen, glass ? '#cbd9df' : '#fff5ed', 0, 0, columns * 32, floors * 32);
    for (let r = 0; r < floors; r++) for (let c = 0; c < columns; c++) {
      const x = c * 32, y = r * 32, reflection = pen.createLinearGradient(x, y, x + 12, y + 25);
      reflection.addColorStop(0, random.pick(shades)); reflection.addColorStop(1, random.next() < .1 ? '#deb997' : '#2e465a');
      fill(pen, '#a0aab0', x + 2, y + 3, 28, 24); fill(pen, reflection, x + (glass ? 2 : 5), y + 4, glass ? 28 : 22, 21);
      fill(pen, '#d8e1df', x + 15, y + 4, 1.6, 22); fill(pen, '#ffffff35', x + 6, y + 9, 7, 1); fill(pen, '#fff', x + 4, y + 26, 24, 2);
    }
  });
}
export const ADS = [
  ['SALT / FM', '97.3 • THE COAST IS CLEAR', '#102e42', '#91ffdf', '#ff806c'],
  ['TIDELINE', 'SURF SUPPLY • PALMA STRIP', '#f9bc82', '#172c40', '#e55b63'],
  ['PINK MOTEL', 'VACANCY • POOL • ICE', '#502e58', '#ffe6a5', '#fe8184'],
  ['SODA CLUB', 'MANDARIN AFTER DARK', '#135a58', '#fff0b9', '#ff9669'],
  ['MARÉ LATE', 'COFFEE UNTIL THE SUN COMES UP', '#732e48', '#ffebbe', '#ffaa91'],
].map(([title, sub, bg, ink, hot]) => ({ title, sub, bg, ink, hot }));
export function signMaterial({ title, sub, bg, ink, hot }) {
  const map = texture(512, 192, pen => {
    fill(pen, bg, 0, 0, 512, 192); pen.save(); pen.beginPath(); pen.rect(12, 12, 95, 168); pen.clip();
    pen.beginPath(); pen.arc(66, 88, 62, 0, Math.PI * 2); pen.fillStyle = hot; pen.fill();
    for (let i = 0; i < 6; i++) fill(pen, bg, 4, 92 + i * 12, 112, 3 + i * 12 / 14);
    pen.restore(); pen.strokeStyle = ink; pen.lineWidth = 2; pen.strokeRect(7, 7, 498, 178);
    pen.fillStyle = ink; pen.font = 'italic 900 65px Arial, sans-serif'; pen.fillText(title, 121, 106, 370);
    pen.fillRect(125, 123, 353, 2); pen.font = 'bold 23px monospace'; pen.fillText(sub, 126, 151, 348);
  });
  return new MeshBasicMaterial({ map });
}
