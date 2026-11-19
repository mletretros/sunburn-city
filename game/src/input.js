export const ACTIONS = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], interact: ['KeyE'], aim: ['Mouse2'],
  handbrake: ['Space'], horn: ['KeyH'], map: ['KeyM'], pause: ['Escape', 'KeyP'],
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], steerLeft: ['KeyA', 'ArrowLeft'], steerRight: ['KeyD', 'ArrowRight'], exit: ['KeyE'], reload: ['KeyR'], fire: ['Mouse0', 'KeyF'],
};

export function createInput(canvas) {
  const held = new Set(), edges = new Set();
  const reserved = new Set(Object.values(ACTIONS).flat());
  const mouse = { x: 0, y: 0 }, move = { x: 0, z: 0 };
  const drive = { throttle: false, brake: false, steer: 0, handbrake: false };
  const locked = () => document.pointerLockElement === canvas;
  function clear() { held.clear(); edges.clear(); mouse.x = mouse.y = 0; }
  function down(code) { if (!held.has(code)) edges.add(code); held.add(code); }
  window.addEventListener('keydown', event => {
    if (!reserved.has(event.code) || event.target.matches?.('button, input, select')) return;
    event.preventDefault();
    if (!event.repeat) down(event.code);
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', clear);
  document.addEventListener('pointerlockchange', clear);
  document.addEventListener('mousemove', event => {
    if (locked()) { mouse.x += event.movementX; mouse.y += event.movementY; }
  });
  canvas.addEventListener('mousedown', event => { if (locked()) down(`Mouse${event.button}`); });
  window.addEventListener('mouseup', event => held.delete(`Mouse${event.button}`));
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  const active = action => ACTIONS[action].some(code => held.has(code));
  return {
    active, locked, clear,
    pressed(action) {
      let found = false;
      for (const code of ACTIONS[action]) if (edges.delete(code)) found = true;
      return found;
    },
    endStep() { edges.clear(); },
    movement() {
      move.x = Number(active('right')) - Number(active('left'));
      move.z = Number(active('forward')) - Number(active('back'));
      return move;
    },
    driving() {
      drive.throttle = active('throttle'); drive.brake = active('brake'); drive.handbrake = active('handbrake');
      drive.steer = Number(active('steerRight')) - Number(active('steerLeft'));
      return drive;
    },
    readMouse(into) { into.x = mouse.x; into.y = mouse.y; mouse.x = mouse.y = 0; },
    capture() {
      if (locked()) return;
      try { canvas.requestPointerLock()?.catch(() => {}); } catch { /* keyboard still works */ }
    },
    release() { if (locked()) document.exitPointerLock(); clear(); },
  };
}
