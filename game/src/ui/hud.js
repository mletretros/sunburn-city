import { DISTRICTS } from '../config.js';

export function createHud() {
  const byId = id => document.getElementById(id);
  const root = byId('hud'), cash = byId('cash'), district = byId('district'), zone = byId('zone');
  const health = byId('health'), armour = byId('armour'), stars = byId('stars');
  const weapon = byId('weapon'), ammo = byId('ammo'), objective = byId('objective'), wantedState = byId('wanted-state'), damage = byId('damage');
  const reticle = byId('reticle');
  const prompt = byId('interact'), driving = byId('driving'), speed = byId('speed'), notice = byId('toast'), hint = byId('lock-hint');
  const gear = byId('gear'), carName = byId('car-name'), carHealth = byId('car-health'), condition = byId('car-condition');
  const money = new Intl.NumberFormat('en-US'), prior = {};
  const missionLabel = byId('mission-label'), objectiveSub = byId('objective-sub'), reputation = byId('reputation');
  const completeCard = byId('mission-complete');
  let missionDue = 0, completeEnd = 0;
  let toastEnd = 0;
  const bar = (element, value) => { element.style.width = `${value}%`; element.parentElement.setAttribute('aria-valuenow', value); };
return {
      visible(show) { root.hidden = !show; },
     lockHint(locked) {
      if (locked === prior.locked) return;
      prior.locked = locked; hint.textContent = locked ? 'ESC RELEASE  /  P PAUSE' : 'CLICK WORLD TO LOOK  /  P PAUSE';
    },
    interaction(text) {
      if (prior.prompt === text) return;
      prior.prompt = text; prompt.hidden = !text; if (text) prompt.textContent = text;
    },
    equipment(name, count) { weapon.textContent = name; ammo.textContent = count; },
    wanted(value) {
      if (value === prior.wanted) return;
      prior.wanted = value; stars.setAttribute('aria-label', `Wanted level ${value} of 5`);
      for (let i = 0; i < stars.children.length; i++) stars.children[i].textContent = i < value ? '★' : '☆';
    },
    searching(state) {
      const status = state.level ? state.searching ? 'SEARCHING' : 'IN PURSUIT' : '';
      if (prior.status !== status) { prior.status = status; wantedState.hidden = !status; wantedState.textContent = status; }
      if (state.pulse || prior.pulse) {
        stars.style.textShadow = state.pulse ? `0 0 ${Math.round(state.pulse * 18)}px #ff686c` : '';
        prior.pulse = state.pulse;
      }
    },
    damageDirection(value, angle) {
      if (value === prior.damage && angle === prior.angle) return;
      prior.damage = value; prior.angle = angle;
      damage.style.opacity = value; damage.style.setProperty('--bearing', `${angle}rad`);
    },
    ammo(state, driving) {
      const reload = !!state.reloading;
      if (prior.current !== state.current || prior.reserve !== state.reserve || prior.reload !== reload || prior.holster !== driving) {
        prior.current = state.current; prior.reserve = state.reserve; prior.reload = reload; prior.holster = driving;
        weapon.textContent = driving ? 'Holstered' : 'Palma .12';
        ammo.textContent = driving ? '—' : reload ? 'RELOADING' : !state.current && state.reserve ? 'R · RELOAD' : `${state.current} / ${state.reserve}`;
      }
      if (prior.aim !== state.aiming) { prior.aim = state.aiming; reticle.hidden = !state.aiming; }
    },
    toast(text) { notice.textContent = text; notice.hidden = false; toastEnd = performance.now() + 3200; },
    update(state, key) {
      if (prior.cash !== state.cash) { prior.cash = state.cash; cash.textContent = `$${money.format(state.cash)}`; }
      if (prior.rep !== state.reputation) { prior.rep = state.reputation; reputation.textContent = `${state.reputation} REP`; }
      if (prior.health !== state.health) { prior.health = state.health; bar(health, state.health); }
      if (prior.armour !== state.armour) { prior.armour = state.armour; bar(armour, state.armour); }
      if (prior.district !== key) {
        prior.district = key; const value = DISTRICTS[key];
        district.textContent = value.name; zone.textContent = `DISTRICT / ${value.zone}`;
        district.style.setProperty('--district', value.tint);
      }
      if (prior.driving !== state.inVehicle) { prior.driving = state.inVehicle; driving.hidden = !state.inVehicle; }
      const car = state.vehicle;
      if (car) {
        const kmh = Math.round(Math.abs(car.speed) * 3.6);
        if (kmh !== prior.speed) { prior.speed = kmh; speed.textContent = String(kmh).padStart(2, '0'); }
        if (prior.gear !== car.gear) { prior.gear = car.gear; gear.textContent = car.gear; }
        if (prior.carName !== car.spec.name) { prior.carName = car.spec.name; carName.textContent = car.spec.name; }
        if (prior.carHealth !== car.health) { prior.carHealth = car.health; bar(carHealth, car.health); condition.textContent = `${car.health}%`; }
      }
      if (toastEnd && performance.now() >= toastEnd) { toastEnd = 0; notice.hidden = true; }
      if (completeEnd && performance.now() >= completeEnd) { completeEnd = 0; completeCard.hidden = true; }
    },
    mission(info, now) {
      if (now < missionDue) return;
      missionDue = now + 100;
      const label = info.active ? `${info.step}/${info.total} · ${info.name}` : info.name;
      if (prior.label !== label) { prior.label = label; missionLabel.textContent = label; }
      if (prior.objective !== info.objective) { prior.objective = info.objective; objective.textContent = info.objective; }
      const detail = info.active ? `${Math.round(info.distance)} m to waypoint${info.timer !== null ? ` · ${Math.ceil(info.timer)}s remaining` : ''}${info.counter ? ` · ${info.counter}` : ''}` : 'P · Job list / save';
      if (prior.detail !== detail) { prior.detail = detail; objectiveSub.textContent = detail; }
    },
    missionComplete(job) {
      completeCard.querySelector('strong').textContent = job.name;
      completeCard.querySelector('span').textContent = `+$${money.format(job.rewards.cash)} · +${job.rewards.reputation} REP · +20 armour`;
      completeCard.hidden = false; completeEnd = performance.now() + 6500;
    },
  };
}
