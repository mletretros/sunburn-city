export function createWanted() {
  const state = { heat: 0, level: 0, searching: false, x: 0, z: 0, pulse: 0, reason: '' };
  const listeners = new Set(); let hiddenTime = 0;
  function reconcile() {
    const rank = state.heat <= 0 ? 0 : Math.min(5, Math.ceil(state.heat / 20));
    if (rank !== state.level) { state.level = rank; listeners.forEach(fn => fn(rank)); }
  }
  return { state,
    reset() { state.heat = 0; state.searching = false; hiddenTime = 0; reconcile(); },
    crime(reason, points, location) { state.heat = Math.min(100, state.heat + points); state.reason = reason; if (location) { state.x = location.x; state.z = location.z; } hiddenTime = 0; state.searching = false; reconcile(); },
    update(dt, visible, location) {
      state.pulse = .5 + Math.sin(hiddenTime * 5) * .5;
      if (visible && state.heat) { hiddenTime = 0; state.searching = false; state.x = location.x; state.z = location.z; }
      else { hiddenTime += dt; state.searching = state.level > 0; if (hiddenTime > 7) { state.heat = Math.max(0, state.heat - dt * 2.8); reconcile(); } }
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
