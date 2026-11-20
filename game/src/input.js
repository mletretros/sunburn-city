const north = ['KeyW', 'ArrowUp'], south = ['KeyS', 'ArrowDown'];
const west = ['KeyA', 'ArrowLeft'], east = ['KeyD', 'ArrowRight'];
export const ACTIONS = {
  forward: north, back: south, left: west, right: east,
  throttle: north, brake: south, steerLeft: west, steerRight: east,
  jump: ['Space'], handbrake: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'], exit: ['KeyE'], aim: ['Mouse2'], fire: ['Mouse0', 'KeyF'],
  horn: ['KeyH'], map: ['KeyM'], pause: ['Escape', 'KeyP'], reload: ['KeyR'],
};
const recognised = new Set(Object.values(ACTIONS).flat()), none = [];
export function createInput(canvas) {
  const held = new Set(), edges = new Set();
  const movement = { x: 0, z: 0 }, driving = { throttle: false, brake: false, steer: 0, handbrake: false };
  let dx = 0, dy = 0;
  const locked = () => document.pointerLockElement === canvas;
  function clear() { held.clear(); edges.clear(); dx = dy = 0; }
  function begin(code) { if (!held.has(code)) { held.add(code); edges.add(code); } }
  function active(action) {
    for (const code of ACTIONS[action] ?? none) if (held.has(code)) return true;
    return false;
  }
  function pressed(action) {
    let found = false;
    for (const code of ACTIONS[action] ?? none) if (edges.delete(code)) found = true;
    return found;
  }
  window.addEventListener('keydown', event => {
    if (!recognised.has(event.code) || event.target?.closest?.('button,input,select,textarea,[contenteditable="true"]')) return;
    event.preventDefault(); if (!event.repeat) begin(event.code);
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  document.addEventListener('pointerlockchange', clear);
  document.addEventListener('mousemove', event => { if (locked()) { dx += event.movementX; dy += event.movementY; } });
  canvas.addEventListener('mousedown', event => { if (locked()) begin(`Mouse${event.button}`); });
  window.addEventListener('mouseup', event => held.delete(`Mouse${event.button}`));
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  return {
    active, pressed, clear, locked,
    endStep() { edges.clear(); },
    movement() { movement.x = +active('right') - active('left'); movement.z = +active('forward') - active('back'); return movement; },
    driving() {
      driving.throttle = active('throttle'); driving.brake = active('brake');
      driving.steer = +active('steerRight') - active('steerLeft'); driving.handbrake = active('handbrake'); return driving;
    },
    readMouse(out) { out.x = dx; out.y = dy; dx = dy = 0; },
    capture() { if (!locked()) { try { canvas.requestPointerLock?.()?.catch(() => {}); } catch { /* Browser requires a gesture. */ } } },
    release() { clear(); if (locked()) document.exitPointerLock(); },
  };
}
