import { DISTRICTS, WORLD as W } from '../config.js';

export function createMinimap(city) {
  const canvas = document.getElementById('minimap'), ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas'), ink = layer.getContext('2d');
  const originX = Math.floor(city.bounds.west - 50), originZ = city.bounds.north - 50;
  const texels = 2, dim = canvas.width, center = dim / 2;
  layer.width = (city.bounds.east + 50 - originX) * texels;
  layer.height = (city.bounds.south + 50 - originZ) * texels;
  ink.scale(texels, texels); ink.translate(-originX, -originZ);
  ink.fillStyle = '#182c3a'; ink.fillRect(originX, originZ, layer.width / texels, layer.height / texels);
  ink.fillStyle = '#21616b'; ink.fillRect(originX, originZ, W.shore - originX, layer.height / texels);
  ink.fillStyle = '#ae8c70'; ink.fillRect(W.shore, originZ, W.boardwalk - W.shore, layer.height / texels);
  for (const block of city.blocks) {
    ink.globalAlpha = .58; ink.fillStyle = block.park ? '#4e9571' : DISTRICTS[block.district].tint;
    ink.fillRect(block.x - block.side / 2, block.z - block.side / 2, block.side, block.side);
  }
  ink.globalAlpha = 1; ink.fillStyle = '#293d48';
  for (const lot of city.lots) ink.fillRect(lot.x - lot.width / 2, lot.z - lot.depth / 2, lot.width, lot.depth);
  ink.beginPath(); ink.lineWidth = 1.15; ink.strokeStyle = '#8997a3';
  for (const road of city.roads) { ink.moveTo(road.ax, road.az); ink.lineTo(road.bx, road.bz); }
  ink.stroke();

let due = 0, expanded = false;
  const markers = { police: [], objectives: [], mission: null, missionArea: null };
  function dot(px, py, color, size) {
      if (Math.hypot(px - center, py - center) > center - size) return;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
    }
  function line(x1, y1, x2, y2) {
    if (Math.hypot(x1 - center, y1 - center) > center || Math.hypot(x2 - center, y2 - center) > center) return;
    ctx.beginPath(); ctx.strokeStyle = '#fff8cc'; ctx.lineWidth = 1.5; ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  return {
    markers,
    toggle() { expanded = !expanded; canvas.classList.toggle('expanded', expanded); due = 0; },
    draw(player, now, traffic, wanted) {
      if (now < due) return;
      due = now + 50;
      const radius = expanded ? 133 : 74, scale = center / radius;
      const x = player.position.x, z = player.position.z;
      ctx.save(); ctx.clearRect(0, 0, dim, dim);
      ctx.beginPath(); ctx.arc(center, center, center - 1, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#183241'; ctx.fillRect(0, 0, dim, dim);
      ctx.drawImage(layer, center + (originX - x) * scale, center + (originZ - z) * scale,
        layer.width * scale / texels, layer.height * scale / texels);
      if (markers.mission?.active && markers.mission.marker) {
        const target = markers.mission.marker;
        const dx = target.x - x;
        const dz = target.z - z;
        const dist = Math.hypot(dx, dz);
        const clamp = Math.min(scale, (center - 13) / (dist || 1));
        const bx = center + dx * clamp, bz = center + dz * clamp;
        const area = markers.mission.area;
        if (area) {
          ctx.beginPath(); ctx.arc(center + (area.x - x) * scale, center + (area.z - z) * scale, area.radius * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#ffd18c18'; ctx.strokeStyle = '#ffd18c'; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
        }
        line(center, center, bx, bz);
        ctx.save(); ctx.translate(bx, bz); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#ffd18c'; ctx.strokeStyle = '#17232d'; ctx.lineWidth = 2;
        ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); ctx.restore();
      }
      for (const marker of markers.objectives) dot(center + (marker.x - x) * scale, center + (marker.z - z) * scale, '#ffcc87', 5);
      if (wanted?.level) {
        // Keep the dispatch area readable during pursuit as well as a lost-sight search.
        {
          ctx.strokeStyle = wanted.searching ? '#ff7476bb' : '#ff747677'; ctx.fillStyle = '#ff697922'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(center + (wanted.x - x) * scale, center + (wanted.z - z) * scale, (29 + wanted.level * 6) * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        for (const marker of markers.police) dot(center + (marker.x - x) * scale, center + (marker.z - z) * scale, '#ff647f', 5);
      }
      if (traffic) for (const car of traffic.fleet) {
        if (!car.active || car.police || car === player.vehicle) continue;
        const own = car === traffic.owned || (!traffic.owned && car === traffic.starter);
        dot(center + (car.position.x - x) * scale, center + (car.position.z - z) * scale, own ? '#8dfce4' : '#d1dafa', own ? 5 : 2.8);
      }
      ctx.save(); ctx.translate(center, center); ctx.rotate(player.heading);
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(10, 11); ctx.lineTo(0, 6); ctx.lineTo(-10, 11); ctx.closePath();
      ctx.lineWidth = 3; ctx.strokeStyle = '#1b2834'; ctx.stroke(); ctx.fillStyle = '#ffdb9b'; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#141e2a'; ctx.beginPath(); ctx.arc(center, 22, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff1d7'; ctx.textAlign = 'center'; ctx.font = 'bold 19px monospace'; ctx.fillText('N', center, 29);
      ctx.restore();
    },
  };
}
