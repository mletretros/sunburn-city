import { DISTRICTS, WORLD } from '../config.js';
const TAU = Math.PI * 2;
function paintAtlas(city) {
  const canvas = document.createElement('canvas'), x = Math.floor(city.bounds.west - 50), z = city.bounds.north - 50, width = city.bounds.east + 50 - x, height = city.bounds.south + 50 - z;
  canvas.width = width * 2; canvas.height = height * 2; const pen = canvas.getContext('2d'); pen.scale(2, 2); pen.translate(-x, -z);
  pen.fillStyle = '#182c3a'; pen.fillRect(x, z, width, height); pen.fillStyle = '#21616b'; pen.fillRect(x, z, WORLD.shore - x, height);
  pen.fillStyle = '#ae8c70'; pen.fillRect(WORLD.shore, z, WORLD.boardwalk - WORLD.shore, height); pen.globalAlpha = .58;
  for (const block of city.blocks) { pen.fillStyle = block.park ? '#4e9571' : DISTRICTS[block.district].tint; pen.fillRect(block.x - block.side / 2, block.z - block.side / 2, block.side, block.side); }
  pen.globalAlpha = 1; pen.fillStyle = '#293d48';
  for (const lot of city.lots) pen.fillRect(lot.x - lot.width / 2, lot.z - lot.depth / 2, lot.width, lot.depth);
  pen.strokeStyle = '#8997a3'; pen.lineWidth = 1.15; pen.beginPath();
  for (const road of city.roads) { pen.moveTo(road.ax, road.az); pen.lineTo(road.bx, road.bz); }
  pen.stroke(); return { canvas, x, z };
}
export function createMinimap(city) {
  const canvas = document.getElementById('minimap'), pen = canvas.getContext('2d'), atlas = paintAtlas(city), size = canvas.width, center = size / 2;
  const markers = { police: [], objectives: [], mission: null, missionArea: null }; let expanded = false, due = 0;
  function circle(x, y, radius) { pen.beginPath(); pen.arc(x, y, radius, 0, TAU); }
  function dot(x, y, color, radius) { if (Math.hypot(x - center, y - center) > center - radius) return; circle(x, y, radius); pen.fillStyle = color; pen.fill(); }
  return {
    markers,
    toggle() { expanded = !expanded; canvas.classList.toggle('expanded', expanded); due = 0; },
    draw(player, now, traffic, wanted) {
      if (now < due && due - now <= 50) return; due = now + 50; const scale = center / (expanded ? 133 : 74), { x, z } = player.position;
      pen.save(); pen.clearRect(0, 0, size, size); circle(center, center, center - 1); pen.clip(); pen.fillStyle = '#183241'; pen.fillRect(0, 0, size, size);
      pen.drawImage(atlas.canvas, center + (atlas.x - x) * scale, center + (atlas.z - z) * scale, atlas.canvas.width * scale / 2, atlas.canvas.height * scale / 2);
      const mission = markers.mission;
      if (mission?.active && mission.marker) {
        const dx = mission.marker.x - x, dz = mission.marker.z - z, clamp = Math.min(scale, (center - 13) / (Math.hypot(dx, dz) || 1)), bx = center + dx * clamp, bz = center + dz * clamp;
        if (mission.area) { const area = mission.area; circle(center + (area.x - x) * scale, center + (area.z - z) * scale, area.radius * scale); pen.fillStyle = '#ffd18c18'; pen.strokeStyle = '#ffd18c'; pen.lineWidth = 2; pen.fill(); pen.stroke(); }
        pen.beginPath(); pen.moveTo(center, center); pen.lineTo(bx, bz); pen.strokeStyle = '#fff8cc'; pen.lineWidth = 1.5; pen.stroke();
        pen.save(); pen.translate(bx, bz); pen.rotate(Math.PI / 4); pen.fillStyle = '#ffd18c'; pen.strokeStyle = '#17232d'; pen.lineWidth = 2; pen.fillRect(-5, -5, 10, 10); pen.strokeRect(-5, -5, 10, 10); pen.restore();
      }
      for (let i = 0; i < markers.objectives.length; i++) { const p = markers.objectives[i]; dot(center + (p.x - x) * scale, center + (p.z - z) * scale, '#ffcc87', 5); }
      if (wanted?.level) {
        circle(center + (wanted.x - x) * scale, center + (wanted.z - z) * scale, (29 + wanted.level * 6) * scale); pen.fillStyle = '#ff697922'; pen.strokeStyle = wanted.searching ? '#ff7476bb' : '#ff747677'; pen.lineWidth = 2; pen.fill(); pen.stroke();
        for (let i = 0; i < markers.police.length; i++) { const p = markers.police[i]; dot(center + (p.x - x) * scale, center + (p.z - z) * scale, '#ff647f', 5); }
      }
      if (traffic) for (let i = 0; i < traffic.fleet.length; i++) {
        const car = traffic.fleet[i]; if (!car.active || car.police || car === player.vehicle) continue;
        const own = car === traffic.owned || !traffic.owned && car === traffic.starter; dot(center + (car.position.x - x) * scale, center + (car.position.z - z) * scale, own ? '#8dfce4' : '#d1dafa', own ? 5 : 2.8);
      }
      pen.save(); pen.translate(center, center); pen.rotate(player.heading); pen.beginPath(); pen.moveTo(0, -13); pen.lineTo(10, 11); pen.lineTo(0, 6); pen.lineTo(-10, 11); pen.closePath();
      pen.lineWidth = 3; pen.strokeStyle = '#1b2834'; pen.fillStyle = '#ffdb9b'; pen.stroke(); pen.fill(); pen.restore();
      circle(center, 22, 15); pen.fillStyle = '#141e2a'; pen.fill(); pen.fillStyle = '#fff1d7'; pen.textAlign = 'center'; pen.font = 'bold 19px monospace'; pen.fillText('N', center, 29); pen.restore();
    },
  };
}
