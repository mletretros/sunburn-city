import { DISTRICTS } from '../config.js';
export function createMinimap(city) {
  const canvas = document.getElementById('minimap'), pen = canvas.getContext('2d');
  const atlas = document.createElement('canvas'); atlas.width = 580; atlas.height = 680;
  const brush = atlas.getContext('2d'); brush.translate(85, 470); brush.fillStyle = '#275e65'; brush.fillRect(-85, -470, 580, 680);
  brush.fillStyle = '#c9b48b'; brush.fillRect(-43, -470, 35, 680); brush.fillStyle = '#24414c'; brush.fillRect(-8, -470, 510, 680);
  for (const block of city.blocks) { brush.fillStyle = block.park ? '#548d72' : DISTRICTS[block.district].tint; brush.globalAlpha = .55; brush.fillRect(block.x - 21.5, block.z - 21.5, 43, 43); }
  brush.globalAlpha = 1;
  for (const plot of city.lots) { brush.fillStyle = '#34515b'; brush.fillRect(plot.x - plot.width / 2, plot.z - plot.depth / 2, plot.width, plot.depth); }
  const markers = { police: [], objectives: [], mission: null, missionArea: null };
  let expanded = false;
  function dot(x, z, radius, color) { pen.beginPath(); pen.arc(x, z, radius, 0, Math.PI * 2); pen.fillStyle = color; pen.fill(); }
  return { markers,
    toggle() { expanded = !expanded; canvas.classList.toggle('expanded', expanded); },
    draw(player, now, traffic, wanted) {
      const scale = expanded ? .65 : 1.45, x = player.position.x, z = player.position.z;
      pen.clearRect(0, 0, 256, 256); pen.save(); pen.beginPath(); pen.arc(128, 128, 126, 0, Math.PI * 2); pen.clip();
      pen.fillStyle = '#24515b'; pen.fillRect(0, 0, 256, 256);
      pen.drawImage(atlas, 128 + (-85 - x) * scale, 128 + (-470 - z) * scale, 580 * scale, 680 * scale);
      if (wanted?.level) { pen.beginPath(); pen.arc(128 + (wanted.x - x) * scale, 128 + (wanted.z - z) * scale, (30 + wanted.level * 7) * scale, 0, 7); pen.fillStyle = '#ff668933'; pen.fill(); }
      const mission = markers.mission;
      if (mission?.active && mission.marker) {
        let dx = (mission.marker.x - x) * scale, dz = (mission.marker.z - z) * scale;
        const shrink = Math.min(1, 108 / Math.max(1, Math.hypot(dx, dz))); dx *= shrink; dz *= shrink;
        pen.strokeStyle = '#ffdb91'; pen.lineWidth = 2; pen.setLineDash([4, 4]); pen.beginPath(); pen.moveTo(128, 128); pen.lineTo(128 + dx, 128 + dz); pen.stroke(); pen.setLineDash([]);
        pen.save(); pen.translate(128 + dx, 128 + dz); pen.rotate(Math.PI / 4); pen.fillStyle = '#ffe49e'; pen.fillRect(-5, -5, 10, 10); pen.restore();
      }
      if (traffic) for (let n = 0; n < traffic.fleet.length; n++) { const car = traffic.fleet[n]; if (car.active && car !== player.vehicle) dot(128 + (car.position.x - x) * scale, 128 + (car.position.z - z) * scale, 2.5, car === traffic.starter ? '#92efcc' : '#d6d9d1'); }
      if (wanted?.level) for (let n = 0; n < markers.police.length; n++) { const cop = markers.police[n]; if (cop.active !== false) dot(128 + (cop.x - x) * scale, 128 + (cop.z - z) * scale, 5, '#ff7d94'); }
      pen.save(); pen.translate(128, 128); pen.rotate(player.heading); pen.beginPath(); pen.moveTo(0, -11); pen.lineTo(8, 9); pen.lineTo(0, 5); pen.lineTo(-8, 9); pen.closePath(); pen.fillStyle = '#ffe1a0'; pen.strokeStyle = '#223c49'; pen.lineWidth = 3; pen.stroke(); pen.fill(); pen.restore();
      dot(128, 19, 12, '#203b48'); pen.fillStyle = '#ffe7ba'; pen.font = 'bold 15px monospace'; pen.textAlign = 'center'; pen.fillText('N', 128, 24); pen.restore();
    },
  };
}
