export function createWanted() {
  const listeners = new Set();
  const state = { level: 0, heat: 0, searching: false, policeSight: false, x: 0, z: 0, pulse: 0 };
  let quiet = 0;
  function setLevel() {
    const next = Math.ceil(state.heat / 20);
    if (next === state.level) return;
    state.level = next; state.pulse = 1;
    for (const listener of listeners) listener(next, state);
  }
  return {
    state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    reset() { state.level = state.heat = state.pulse = quiet = 0; state.searching = state.policeSight = false; },
    crime(type, amount, position) {
      state.lastCrime = type; quiet = 0;
      state.x = position.x; state.z = position.z;
      state.heat = Math.min(100, state.heat + amount);
      setLevel();
    },
    update(dt, sight, position) {
      state.policeSight = sight; state.searching = state.level > 0 && !sight;
      state.pulse = Math.max(0, state.pulse - dt * 1.8);
      if (sight) { quiet = 0; state.x = position.x; state.z = position.z; }
      else if ((quiet += dt) > 5.5 && state.level) {
        const away = Math.hypot(position.x - state.x, position.z - state.z) > 65;
        state.heat = Math.max(0, state.heat - dt * (away ? 4.6 : 1.8)); setLevel();
      }
      if (!state.level) state.searching = false;
    },
  };
}
