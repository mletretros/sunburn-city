import { DISTRICTS } from '../config.js';
export function createHud() {
  const elements = {}, memo = {};
  for (const node of document.querySelectorAll('[id]')) elements[node.id] = node;
  let toastExpiry = 0, rewardExpiry = 0;
  function text(key, value) { if (memo[key] !== value) { memo[key] = value; elements[key].textContent = value; } }
  function bar(key, value) { const width = Math.max(0, Math.min(100, value)); if (memo[key] !== width) { memo[key] = width; elements[key].style.width = width + '%'; } }
  return {
    visible(value) { elements.hud.hidden = !value; },
    lockHint(value) { text('lock-hint', value ? 'ESC RELEASE · P PAUSE' : 'CLICK TO LOOK · WASD MOVE · P PAUSE'); },
    interaction(value) { elements.interact.hidden = !value; if (value) text('interact', value); },
    equipment(name, count) { text('weapon', name); text('ammo', count); },
    wanted(value) {
      if (memo.rank === value) return; memo.rank = value; elements.stars.setAttribute('aria-label', 'Wanted level ' + value + ' of 5');
      for (let n = 0; n < 5; n++) elements.stars.children[n].textContent = value > n ? '★' : '☆';
    },
    searching(value) { elements['wanted-state'].hidden = !value.level; text('wanted-state', value.searching ? 'SEARCHING / BREAK LINE OF SIGHT' : 'CIVIC GUARD / IN PURSUIT'); },
    damageDirection(strength, bearing) { elements.damage.style.opacity = strength; },
    ammo(value, driving) { text('weapon', driving ? 'HOLSTERED' : 'PALMA .12'); text('ammo', driving ? '—' : value.reloading ? 'RELOADING' : value.current + ' / ' + value.reserve); elements.reticle.hidden = !value.aiming; },
    toast(value) { text('toast', value); elements.toast.hidden = false; toastExpiry = performance.now() + 3500; },
    update(value, district) {
      const zone = DISTRICTS[district]; text('cash', '$' + value.cash.toLocaleString('en-US')); text('reputation', value.reputation + ' REP');
      text('district', zone.name); text('zone', 'DISTRICT / ' + zone.zone); bar('health', value.health); bar('armour', value.armour);
      elements.driving.hidden = !value.vehicle;
      if (value.vehicle) {
        const car = value.vehicle; text('speed', String(Math.round(Math.abs(car.speed) * 3.6)).padStart(2, '0')); text('gear', car.gear);
        text('car-name', car.spec.name.toUpperCase()); bar('car-health', car.health); text('car-condition', Math.round(car.health) + '% CONDITION');
      }
      const now = performance.now(); if (now > toastExpiry) elements.toast.hidden = true; if (now > rewardExpiry) elements['mission-complete'].hidden = true;
    },
    mission(info, now) {
      text('mission-label', (info.active ? 'JOB ' + info.step + '/' + info.total + ' — ' : '') + info.name);
      text('objective', info.objective);
      text('objective-sub', info.active ? Math.round(info.distance) + ' m TO WAYPOINT' + (info.timer !== null ? ' · ' + Math.ceil(info.timer) + 's' : '') + (info.counter ? ' · ' + info.counter : '') : 'P / JOBS · SAVE · SETTINGS');
    },
    missionComplete(job) {
      const card = elements['mission-complete']; card.querySelector('strong').textContent = job.name;
      card.querySelector('span').textContent = '+$' + job.rewards.cash + ' / +' + job.rewards.reputation + ' REP / +20 ARMOUR'; card.hidden = false; rewardExpiry = performance.now() + 5000;
    },
  };
}
