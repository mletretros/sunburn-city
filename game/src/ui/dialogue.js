export function createDialogue() {
  const panel = document.createElement('section'); panel.id = 'dialogue-root'; panel.hidden = true;
  panel.innerHTML = '<canvas id="dialogue-portrait" width="90" height="110"></canvas><div class="dialogue-copy"><div class="micro" id="dialogue-label"></div><strong id="dialogue-name"></strong><p id="dialogue-text"></p><div class="buttons"><button id="dialogue-continue" class="primary">Continue ↗</button><button id="dialogue-skip">Skip / accept job</button></div></div>';
  document.body.appendChild(panel);
  const label = panel.querySelector('#dialogue-label'), speaker = panel.querySelector('strong'), paragraph = panel.querySelector('p'), pen = panel.querySelector('canvas').getContext('2d');
  let script = [], page = 0, done = null;
  function portrait(name) {
    pen.fillStyle = '#41616a'; pen.fillRect(0, 0, 90, 110); pen.fillStyle = '#f0bd8d'; pen.beginPath(); pen.ellipse(45, 47, 23, 30, 0, 0, 7); pen.fill();
    pen.fillStyle = name === 'Mars' ? '#ef8775' : name === 'Inez' ? '#6dc4ac' : '#dfbb7d'; pen.beginPath(); pen.ellipse(45, 112, 40, 35, 0, 0, 7); pen.fill();
    pen.fillStyle = '#302f39'; pen.fillRect(21, 19, 48, 16); pen.fillRect(27, 43, 15, 7); pen.fillRect(48, 43, 15, 7); pen.fillRect(40, 46, 12, 3);
    if (name === 'Duke') pen.fillRect(34, 63, 23, 5); pen.fillStyle = '#ffe0a7'; pen.fillRect(7, 7, 76, 2);
  }
  function display() { const line = script[page]; speaker.textContent = line.speaker; paragraph.textContent = line.text; portrait(line.speaker); }
  function close(invoke) { const callback = done; done = null; panel.hidden = true; if (invoke) callback?.(); }
  function advance() { if (panel.hidden) return; page++; if (page >= script.length) close(true); else display(); }
  panel.querySelector('#dialogue-continue').onclick = advance;
  panel.querySelector('#dialogue-skip').onclick = () => close(true);
  addEventListener('keydown', e => { if (!panel.hidden && ['Enter', 'Space', 'KeyQ'].includes(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) { if (e.code === 'KeyQ') close(true); else advance(); } } }, true);
  return { get active() { return !panel.hidden; }, advance, skip() { close(true); }, hide() { close(false); }, update(dt) {},
    show(lines, callback, title = 'INCOMING / CREW RADIO') { script = lines || []; page = 0; done = callback; label.textContent = title; if (!script.length) close(true); else { panel.hidden = false; display(); } },
  };
}
