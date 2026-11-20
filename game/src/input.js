export const ACTIONS = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], steerLeft: ['KeyA', 'ArrowLeft'], steerRight: ['KeyD', 'ArrowRight'],
  jump: ['Space'], handbrake: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], interact: ['KeyE'], exit: ['KeyE'],
  fire: ['Mouse0', 'KeyF'], aim: ['Mouse2'], reload: ['KeyR'], horn: ['KeyH'], map: ['KeyM'], pause: ['KeyP', 'Escape'],
};
export function createInput(canvas) {
  const keys = new Set(), edge = new Set(), axes = { x: 0, z: 0 }, wheel = {};
  const delta = { x: 0, y: 0 };
  function down(code) { if (!keys.has(code)) edge.add(code); keys.add(code); }
  function test(set, action, consume) {
    let found = false;
    const bindings = ACTIONS[action];
    if (bindings) for (let i = 0; i < bindings.length; i++) {
      const code = bindings[i]; if (set.has(code)) { found = true; if (consume) set.delete(code); }
    }
    return found;
  }
  const controller = {
    active: action => test(keys, action, false), pressed: action => test(edge, action, true),
    clear() { keys.clear(); edge.clear(); delta.x = delta.y = 0; },
    endStep() { edge.clear(); }, locked: () => document.pointerLockElement === canvas,
    movement() { axes.x = +controller.active('right') - +controller.active('left'); axes.z = +controller.active('forward') - +controller.active('back'); return axes; },
    driving() {
      wheel.throttle = controller.active('throttle'); wheel.brake = controller.active('brake');
      wheel.handbrake = controller.active('handbrake'); wheel.steer = +controller.active('right') - +controller.active('left'); return wheel;
    },
    readMouse(out) { out.x = delta.x; out.y = delta.y; delta.x = delta.y = 0; },
    capture() { try { const promise = canvas.requestPointerLock(); promise?.catch(() => {}); } catch {} },
    release() { controller.clear(); if (controller.locked()) document.exitPointerLock(); },
  };
  addEventListener('keydown', e => { if (e.target.closest?.('button,input,select')) return; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if (!e.repeat) down(e.code); });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', controller.clear);
  addEventListener('mousemove', e => { if (controller.locked()) { delta.x += e.movementX; delta.y += e.movementY; } });
  canvas.addEventListener('mousedown', e => down('Mouse' + e.button));
  addEventListener('mouseup', e => keys.delete('Mouse' + e.button));
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  return controller;
}
