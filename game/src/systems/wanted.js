const initial = { level: 0, heat: 0, pulse: 0, x: 0, z: 0, searching: false, policeSight: false, lastCrime: null };
export function createWanted() {
  const state = { ...initial }, observers = new Set(); let unseen = 0;
  function locate(point) { state.x = point.x; state.z = point.z; unseen = 0; }
  function setHeat(points) {
    state.heat = Math.max(0, Math.min(100, points));
    const level = Math.ceil(state.heat / 20); state.searching = level > 0 && !state.policeSight;
    if (level === state.level) return;
    state.level = level; state.pulse = 1;
    for (const observer of observers) observer(level, state);
  }
  return {
    state,
    reset() { Object.assign(state, initial); unseen = 0; },
    crime(reason, points, location) {
      if (!Number.isFinite(points) || points <= 0) return;
      locate(location); state.lastCrime = reason; setHeat(state.heat + points);
    },
    update(dt, visible, location) {
      state.pulse = Math.max(0, state.pulse - dt * 1.8); state.policeSight = !!visible;
      if (visible) { locate(location); state.searching = false; return; }
      unseen += dt; state.searching = state.level > 0;
      if (!state.searching || unseen <= 5.5) return;
      const far = (location.x - state.x) ** 2 + (location.z - state.z) ** 2 > 65 * 65;
      setHeat(state.heat - dt * (far ? 4.6 : 1.8));
    },
    subscribe(observer) { observers.add(observer); return () => observers.delete(observer); },
  };
}
