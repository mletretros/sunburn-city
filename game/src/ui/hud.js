import { DISTRICTS } from '../config.js';
const ids = ['hud', 'cash', 'district', 'zone', 'health', 'armour', 'stars', 'weapon', 'ammo', 'objective', 'wanted-state', 'damage', 'reticle', 'interact', 'driving', 'speed', 'toast', 'lock-hint', 'gear', 'car-name', 'car-health', 'car-condition', 'mission-label', 'objective-sub', 'reputation', 'mission-complete'];
export function createHud() {
  const nodes = Object.fromEntries(ids.map(id => [id, document.getElementById(id)])), cache = Object.create(null), money = new Intl.NumberFormat('en-US');
  let nextMission = 0, toastUntil = 0, completeUntil = 0;
  function changed(key, value) { if (cache[key] === value) return false; cache[key] = value; return true; }
  function text(id, value) { if (changed(id, value)) nodes[id].textContent = value; }
  function hidden(id, value) { if (changed(`${id}-hidden`, value)) nodes[id].hidden = value; }
  function bar(id, value) {
    if (!changed(id, value)) return;
    const amount = Math.max(0, Math.min(100, value)); nodes[id].style.width = `${amount}%`; nodes[id].parentElement.setAttribute('aria-valuenow', amount);
  }
  return {
    visible(show) { nodes.hud.hidden = !show; },
    lockHint(locked) { text('lock-hint', locked ? 'ESC RELEASE  /  P PAUSE' : 'CLICK WORLD TO LOOK  /  P PAUSE'); },
    interaction(label) { hidden('interact', !label); if (label) text('interact', label); },
    equipment(name, count) { text('weapon', name); text('ammo', count); },
    wanted(level) {
      if (!changed('wanted-level', level)) return;
      nodes.stars.setAttribute('aria-label', `Wanted level ${level} of 5`);
      for (let i = 0; i < nodes.stars.children.length; i++) nodes.stars.children[i].textContent = i < level ? '★' : '☆';
    },
    searching(state) {
      const label = state.level ? state.searching ? 'SEARCHING' : 'IN PURSUIT' : ''; hidden('wanted-state', !label); text('wanted-state', label);
      if (changed('wanted-pulse', state.pulse)) nodes.stars.style.textShadow = state.pulse ? `0 0 ${Math.round(state.pulse * 18)}px #ff686c` : '';
    },
    damageDirection(strength, bearing) { if (changed('damage-opacity', strength)) nodes.damage.style.opacity = strength; if (changed('damage-bearing', bearing)) nodes.damage.style.setProperty('--bearing', `${bearing}rad`); },
    ammo(state, inVehicle) {
      const label = inVehicle ? '—' : state.reloading ? 'RELOADING' : !state.current && state.reserve ? 'R · RELOAD' : `${state.current} / ${state.reserve}`;
      text('weapon', inVehicle ? 'Holstered' : 'Palma .12'); text('ammo', label); hidden('reticle', !state.aiming);
    },
    toast(message) { text('toast', message); nodes.toast.hidden = false; toastUntil = performance.now() + 3200; },
    update(state, districtKey) {
      if (changed('cash-amount', state.cash)) text('cash', `$${money.format(state.cash)}`);
      if (changed('rep-amount', state.reputation)) text('reputation', `${state.reputation} REP`);
      bar('health', state.health); bar('armour', state.armour);
      if (changed('district-key', districtKey)) { const district = DISTRICTS[districtKey]; text('district', district.name); text('zone', `DISTRICT / ${district.zone}`); nodes.district.style.setProperty('--district', district.tint); }
      hidden('driving', !state.inVehicle);
      const car = state.vehicle;
      if (car) { text('speed', String(Math.round(Math.abs(car.speed) * 3.6)).padStart(2, '0')); text('gear', car.gear); text('car-name', car.spec.name); bar('car-health', car.health); text('car-condition', `${car.health}%`); }
      const now = performance.now();
      if (toastUntil && now >= toastUntil) { nodes.toast.hidden = true; toastUntil = 0; }
      if (completeUntil && now >= completeUntil) { nodes['mission-complete'].hidden = true; completeUntil = 0; }
    },
    mission(info, now) {
      if (now < nextMission && nextMission - now <= 100) return; nextMission = now + 100;
      text('mission-label', info.active ? `${info.step}/${info.total} · ${info.name}` : info.name); text('objective', info.objective);
      let sub = 'P · Job list / save';
      if (info.active) { sub = `${Math.round(info.distance)} m to waypoint`; if (info.timer !== null) sub += ` · ${Math.ceil(info.timer)}s remaining`; if (info.counter) sub += ` · ${info.counter}`; }
      text('objective-sub', sub);
    },
    missionComplete(job) {
      const card = nodes['mission-complete']; card.querySelector('strong').textContent = job.name;
      card.querySelector('span').textContent = `+$${money.format(job.rewards.cash)} · +${job.rewards.reputation} REP · +20 armour`; card.hidden = false; completeUntil = performance.now() + 6500;
    },
  };
}
